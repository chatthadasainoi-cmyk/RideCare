import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Switch,
  ScrollView,
  Image,
  Alert,
  Vibration,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Accelerometer } from 'expo-sensors';

// ─────────────────────────────────────────────
//  ค่าคงที่ปรับแต่งได้
// ─────────────────────────────────────────────
const ANGLE_THRESHOLD  = 45;   // องศาที่ถือว่า "เอียงเกิน" (ปรับได้)
const SHAKE_THRESHOLD  = 1.8;  // g-force ที่ถือว่า "เขย่า"
const SHAKE_COOLDOWN   = 1000; // ms ระหว่าง shake แต่ละครั้ง

// ─────────────────────────────────────────────
//  HazardOverlay — อิโมจิตัวใหญ่กลางจอ
// ─────────────────────────────────────────────
function HazardOverlay({ visible, onDismiss }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef(null);

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }).start();

      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();
    } else {
      if (pulseLoop.current) pulseLoop.current.stop();
      Animated.timing(scaleAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start();
    }
    return () => { if (pulseLoop.current) pulseLoop.current.stop(); };
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent>
      <View style={overlayStyles.backdrop}>
        <Animated.View style={[overlayStyles.card, { transform: [{ scale: scaleAnim }] }]}>
          <Animated.Text style={[overlayStyles.emoji, { transform: [{ scale: pulseAnim }] }]}>
            🚨
          </Animated.Text>
          <Text style={overlayStyles.title}>ตรวจพบมุมเอียงผิดปกติ!</Text>
          <Text style={overlayStyles.subtitle}>คุณยังปลอดภัยอยู่ไหม?</Text>
          <TouchableOpacity style={overlayStyles.safeButton} onPress={onDismiss}>
            <Text style={overlayStyles.safeButtonText}>✅  ฉันปลอดภัย</Text>
          </TouchableOpacity>
          <Text style={overlayStyles.hint}>หรือ เขย่าโทรศัพท์ / กดปุ่มเสียง เพื่อยืนยัน</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────
//  Hook: เขย่า + ปุ่ม Volume (Gesture Enabled)
// ─────────────────────────────────────────────
function useDismissGestures({ enabled, onDismiss }) {
  const lastShake = useRef(0);
  const accelSub  = useRef(null);

  useEffect(() => {
    if (!enabled) {
      accelSub.current?.remove();
      accelSub.current = null;
      return;
    }

    Accelerometer.setUpdateInterval(100);
    accelSub.current = Accelerometer.addListener(({ x, y, z }) => {
      const mag = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();
      if (mag > SHAKE_THRESHOLD && now - lastShake.current > SHAKE_COOLDOWN) {
        lastShake.current = now;
        onDismiss();
      }
    });

    // ── Volume button listener ──
    // Expo managed: ใช้ react-native-volume-manager (bare workflow)
    // import VolumeManager from 'react-native-volume-manager';
    // const volSub = VolumeManager.addVolumeListener(() => onDismiss());
    // return () => { volSub.remove(); accelSub.current?.remove(); };

    return () => {
      accelSub.current?.remove();
      accelSub.current = null;
    };
  }, [enabled, onDismiss]);
}

// ─────────────────────────────────────────────
//  HomeScreen
// ─────────────────────────────────────────────
export default function HomeScreen({
  isGestureEnabled,
  setIsGestureEnabled,
  handleSmartConfirmAction,
  reportHazardToMap,
  forceVoiceNotification,
  currentSpeed,
  setCurrentSpeed,
  speedLimit,
  currentRollAngle,
  handleAngleLogic,
  antiFallStatus,
  setPlatform
}) {
  const [selectedPlatform, setSelectedPlatform] = useState('Grab');
  const [isSpeedOpen, setIsSpeedOpen]           = useState(false);
  const [isGyroOpen,  setIsGyroOpen]            = useState(true);
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);

  // ── overlay state (ควบคุมที่นี่, trigger จาก slider มุมเอียง) ──
  const [showHazardOverlay, setShowHazardOverlay] = useState(false);

  const togglePlatform = (platformName) => {
    setSelectedPlatform(platformName);
    if (setPlatform) setPlatform(platformName);
  };

  // ── Slider มุมเอียง: ส่งค่าให้ handleAngleLogic (App.js) และตรวจ threshold เพื่อเปิด overlay ──
  const handleAngleWithOverlay = useCallback((val) => {
    if (handleAngleLogic) handleAngleLogic(val);
    if (Math.abs(val) >= ANGLE_THRESHOLD) {
      setShowHazardOverlay(true);
    }
  }, [handleAngleLogic]);

  // ── dismiss overlay ──
  const handleDismissOverlay = useCallback(() => {
    setShowHazardOverlay(false);
  }, []);

  // ── shake listener ปิด overlay (เปิดเฉพาะตอน overlay โชว์ + isGestureEnabled) ──
  useDismissGestures({
    enabled: showHazardOverlay && isGestureEnabled,
    onDismiss: handleDismissOverlay,
  });

  const handleEmergencyPress = () => {
    Vibration.vibrate(1500);
    if (reportHazardToMap) reportHazardToMap('emergency');
    Alert.alert(
      '🚨 EMERGENCY CALL',
      'ระบบได้รับสัญญาณฉุกเฉินแล้ว! กำลังประสานงานเรียกไรเดอร์ใกล้เคียงและหน่วยกู้ภัยในพิกัดของคุณเดินทางมาพบโดยด่วนที่สุดค่ะ',
      [{ text: 'ตกลง', style: 'cancel' }]
    );
  };

  return (
    <>
      {/* ─── Overlay ─── */}
      <HazardOverlay visible={showHazardOverlay} onDismiss={handleDismissOverlay} />

      <ScrollView style={styles.scrollContainer} contentContainerStyle={{ paddingBottom: 100 }}>

     {/* 🟢 หัวแบนเนอร์ */}
<View style={styles.headerBanner}>
  <View style={styles.headerRow}>
    <Image
      source={require('../assets/Icon2.png')}
      style={styles.logoMiniImage}
      resizeMode="contain"
    />
    <Text style={styles.headerTitleText}>Home</Text>
  </View>
</View>

        <View style={styles.mainCardBody}>

          {/* 🏍️ Rider Platform */}
          <Text style={styles.sectionMainTitle}>Rider Platform</Text>
          <View style={styles.tabToggleGroupContainer}>
            <TouchableOpacity
              style={[styles.platformTabButton, selectedPlatform === 'Grab' ? styles.tabGrabActive : styles.tabInactive]}
              onPress={() => togglePlatform('Grab')}
            >
              <Text style={[styles.tabButtonText, selectedPlatform === 'Grab' ? styles.textActiveWhite : styles.textInactiveGray]}>Grab</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.platformTabButton, selectedPlatform === 'Shopee Food' ? styles.tabShopeeActive : styles.tabInactive]}
              onPress={() => togglePlatform('Shopee Food')}
            >
              <Text style={[styles.tabButtonText, selectedPlatform === 'Shopee Food' ? styles.textActiveWhite : styles.textInactiveGray]}>Shopee Food</Text>
            </TouchableOpacity>
          </View>

          {/* 🖐️ ระบบไร้สัมผัส */}
          <View style={styles.handsFreeCardWrapper}>
            <View style={styles.handsFreeHeaderRow}>
              <Text style={styles.handsFreeTitleText}>ระบบไร้สัมผัส (Hands-Free Config)</Text>
              <Switch
                value={isGestureEnabled}
                onValueChange={(val) => setIsGestureEnabled(val)}
                trackColor={{ false: '#CBD5E0', true: '#2E5A36' }}
                thumbColor={isGestureEnabled ? '#FFFFFF' : '#F7FAFC'}
              />
            </View>
            <View style={styles.mockActionsButtonRow}>
              <TouchableOpacity
                style={styles.actionMockButton}
                onPress={() => {
                  if (forceVoiceNotification) forceVoiceNotification("ทดสอบจำลองถอดเสียงเสร็จสิ้นค่ะ");
                  if (handleSmartConfirmAction) handleSmartConfirmAction("ปุ่มกดทดสอบเสียง");
                }}
              >
                <Text style={styles.iconActionCenterText}>🔊</Text>
                <Text style={styles.labelActionCenterText}>จำลองถอดเสียง</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionMockButton, { backgroundColor: '#C8E6C9' }]}
                onPress={() => { if (handleSmartConfirmAction) handleSmartConfirmAction("หน้าจอโฮม: จำลองโบกมือสำเร็จ"); }}
              >
                <Text style={styles.iconActionCenterText}>✋</Text>
                <Text style={styles.labelActionCenterText}>จำลองโบกมือ</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 📍 แจ้งภัยด่วน */}
          <View style={styles.hazardMainCardBox}>
            <Text style={styles.hazardSectionTitleText}>แจ้งภัยด่วน (ลงพิกัดแผนที่ GPS อัตโนมัติ)</Text>
            <View style={styles.hazardGridButtonWrapper}>
              <TouchableOpacity style={[styles.hazardGridItemButton, { borderColor: '#ECC94B' }]} onPress={() => reportHazardToMap('ถนนลื่น')}>
                <Text style={styles.hazardIconText}>⚠️</Text>
                <Text style={[styles.hazardLabelText, { color: '#D69E2E' }]}>ถนนลื่น</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.hazardGridItemButton, { borderColor: '#E53E3E' }]} onPress={() => reportHazardToMap('จุดอุบัติเหตุ')}>
                <Text style={styles.hazardIconText}>🚨</Text>
                <Text style={[styles.hazardLabelText, { color: '#E53E3E' }]}>จุดอุบัติเหตุ</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.hazardGridButtonWrapper}>
              <TouchableOpacity style={[styles.hazardGridItemButton, { borderColor: '#4299E1' }]} onPress={() => reportHazardToMap('การจราจรติดขัด')}>
                <Text style={styles.hazardIconText}>🚙</Text>
                <Text style={[styles.hazardLabelText, { color: '#3182CE' }]}>การจราจรติดขัด</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.hazardGridItemButton, { borderColor: '#FEB2B2', backgroundColor: '#FFF5F5' }]} onPress={handleEmergencyPress}>
                <Text style={styles.hazardIconText}>🆘</Text>
                <Text style={[styles.hazardLabelText, { color: '#C53030' }]}>ฉุกเฉิน</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 🛡️ ระบบความปลอดภัย */}
          <Text style={styles.securityMainHeadingText}>ระบบความปลอดภัย</Text>

          {/* Accordion 1: ความเร็ว */}
          <View style={styles.accordionContainerCard}>
            <TouchableOpacity style={styles.accordionHeaderClickable} onPress={() => setIsSpeedOpen(!isSpeedOpen)}>
              <Text style={styles.accordionTitleLabelText}>ตรวจความเร็วรถจักรยานยนต์</Text>
              <Text style={styles.accordionArrowIndicatorText}>{isSpeedOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {isSpeedOpen && (
              <View style={styles.accordionContentDataBox}>
                <Text style={styles.realtimeDataHighlightText}>ความเร็วปัจจุบัน: {currentSpeed} km/h</Text>
                <Text style={styles.realtimeSubtextDesc}>ขีดจำกัดความเร็วตั้งไว้ที่: {speedLimit} km/h</Text>
                <Slider
                  style={{ width: '100%', height: 40, marginTop: 10 }}
                  minimumValue={0}
                  maximumValue={120}
                  step={1}
                  value={currentSpeed}
                  onValueChange={(val) => setCurrentSpeed(val)}
                  minimumTrackTintColor="#2E5A36"
                  maximumTrackTintColor="#CBD5E0"
                  thumbTintColor="#2E5A36"
                />
              </View>
            )}
          </View>

          {/* Accordion 2: มุมเอียง — ใช้ handleAngleWithOverlay */}
          <View style={styles.accordionContainerCard}>
            <TouchableOpacity style={styles.accordionHeaderClickable} onPress={() => setIsGyroOpen(!isGyroOpen)}>
              <Text style={styles.accordionTitleLabelText}>ตรวจมุมเอียงของรถจักรยานยนต์</Text>
              <Text style={styles.accordionArrowIndicatorText}>{isGyroOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {isGyroOpen && (
              <View style={styles.accordionContentDataBox}>
                <Text style={styles.gyroSensorLabelSubText}>เซนเซอร์ไจโรและการเอียงของรถ</Text>
                <Text style={styles.gyroBigDegreeNumberText}>{currentRollAngle}</Text>
                <Text style={styles.antiFallStatusIndicatorText}>{antiFallStatus}</Text>
                <Slider
                  style={{ width: '100%', height: 40, marginTop: 15 }}
                  minimumValue={-90}
                  maximumValue={90}
                  step={1}
                  value={currentRollAngle}
                  onValueChange={handleAngleWithOverlay}   // ← เปลี่ยนตรงนี้
                  minimumTrackTintColor="#A5D6A7"
                  maximumTrackTintColor="#CBD5E0"
                  thumbTintColor="#718096"
                />
              </View>
            )}
          </View>

        </View>
      </ScrollView>
    </>
  );
}

// ─────────────────────────────────────────────
//  Overlay Styles
// ─────────────────────────────────────────────
const overlayStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    paddingVertical: 36,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '82%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  emoji: {
    fontSize: 100,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#C53030',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#4A5568',
    textAlign: 'center',
    marginBottom: 24,
  },
  safeButton: {
    backgroundColor: '#2E5A36',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginBottom: 14,
  },
  safeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  hint: {
    fontSize: 11,
    color: '#A0AEC0',
    textAlign: 'center',
    lineHeight: 16,
  },
});

// ─────────────────────────────────────────────
//  Styles ต้นฉบับ (ไม่แก้ไข)
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  scrollContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  headerBanner: {
    backgroundColor: '#C8E6C9',
    height: 150,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    paddingHorizontal: 24,
    paddingTop: 55,
  },
  headerRow: { flexDirection: '', alignItems: 'center' },
  logoMiniImage: { width: 70, height: '', marginRight: 12 },
  headerTitleText: { fontSize: 32, fontWeight: 'bold', color: '#2E5A36' },

  mainCardBody: { paddingHorizontal: 20, paddingTop: 25 },
  sectionMainTitle: { fontSize: 16, fontWeight: 'bold', color: '#2E5A36', textAlign: 'center', marginBottom: 12 },

  tabToggleGroupContainer: { flexDirection: 'row', height: 46, borderRadius: 23, backgroundColor: '#E2E8F0', overflow: 'hidden', marginBottom: 20 },
  platformTabButton: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabGrabActive: { backgroundColor: '#00B050' },
  tabShopeeActive: { backgroundColor: '#FF5722' },
  tabInactive: { backgroundColor: 'transparent' },
  tabButtonText: { fontSize: 15, fontWeight: 'bold' },
  textActiveWhite: { color: '#FFFFFF' },
  textInactiveGray: { color: '#718096' },

  handsFreeCardWrapper: { borderWidth: 1.5, borderColor: '#346A41', borderRadius: 18, padding: 14, marginBottom: 20 },
  handsFreeHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  handsFreeTitleText: { fontSize: 13, fontWeight: 'bold', color: '#346A41' },
  mockActionsButtonRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionMockButton: { flex: 0.48, backgroundColor: '#2E5A36', borderRadius: 20, height: 40, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  iconActionCenterText: { fontSize: 15, marginRight: 6, color: '#FFFFFF' },
  labelActionCenterText: { fontSize: 11, fontWeight: 'bold', color: '#2D3748' },

  hazardMainCardBox: { borderWidth: 1.5, borderColor: '#346A41', borderRadius: 18, padding: 14, marginBottom: 22 },
  hazardSectionTitleText: { fontSize: 13, fontWeight: 'bold', color: '#346A41', textAlign: 'center', marginBottom: 14 },
  hazardGridButtonWrapper: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  hazardGridItemButton: { flex: 0.48, borderWidth: 1.5, borderRadius: 22, height: 44, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  hazardIconText: { fontSize: 16, marginRight: 8 },
  hazardLabelText: { fontSize: 12, fontWeight: 'bold' },

  securityMainHeadingText: { fontSize: 14, fontWeight: 'bold', color: '#346A41', textAlign: 'center', marginBottom: 14 },
  accordionContainerCard: { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#346A41', borderRadius: 22, overflow: 'hidden', marginBottom: 12 },
  accordionHeaderClickable: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 46, paddingHorizontal: 20, backgroundColor: '#FFFFFF' },
  accordionTitleLabelText: { fontSize: 13, fontWeight: 'bold', color: '#4A5568' },
  accordionArrowIndicatorText: { fontSize: 12, color: '#718096' },

  accordionContentDataBox: { paddingHorizontal: 20, paddingBottom: 18, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#E2E8F0', alignItems: 'center', backgroundColor: '#F7FAFC' },
  realtimeDataHighlightText: { fontSize: 16, fontWeight: 'bold', color: '#2E5A36' },
  realtimeSubtextDesc: { fontSize: 12, color: '#718096', marginTop: 2 },
  gyroSensorLabelSubText: { fontSize: 11, fontWeight: 'bold', color: '#718096', marginTop: 4 },
  gyroBigDegreeNumberText: { fontSize: 38, fontWeight: 'bold', color: '#2D3748', marginVertical: 4 },
  antiFallStatusIndicatorText: { fontSize: 11, fontWeight: 'bold', color: '#2E5A36' },
});