import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Vibration, ActivityIndicator, ScrollView, Modal, Animated, Easing } from 'react-native';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { DeviceMotion, Accelerometer } from 'expo-sensors';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';

import { auth, db } from './screens/firebaseConfig'; 
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';

import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';
import MapScreen from './screens/MapScreen';
import SettingScreen from './screens/SettingScreen';

const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';
const BACKGROUND_SAFETY_FETCH_TASK = 'BACKGROUND_SAFETY_FETCH_TASK';

let globalCurrentSpeed = 35;
let globalSpeedLimit = 50;
let globalIsVoiceEnabled = true;
let globalUserUid = null;


// ─── HazardOverlay ───────────────────────────────────────────
function HazardOverlay({ visible, onDismiss }) {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const pulseLoop = React.useRef(null);
  const lastShake = React.useRef(0);

  // Animation pulse
  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
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

  // เขย่าโทรศัพท์ → ปิด overlay
  React.useEffect(() => {
    if (!visible) return;
    Accelerometer.setUpdateInterval(100);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const mag = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();
      if (mag > 1.8 && now - lastShake.current > 1000) {
        lastShake.current = now;
        onDismiss();
      }
    });
    return () => sub.remove();
  }, [visible, onDismiss]);

  // กดปุ่ม Volume → ปิด overlay
  React.useEffect(() => {
    if (!visible || !VolumeManager) return;
    try {
      VolumeManager.showNativeVolumeUI({ enabled: false });
      const volSub = VolumeManager.addVolumeListener(() => onDismiss());
      return () => volSub.remove();
    } catch (e) {}
  }, [visible, onDismiss]);

  if (!visible) return null;
  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent>
      <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.65)', justifyContent:'center', alignItems:'center' }}>
        <Animated.View style={{ backgroundColor:'#FFFFFF', borderRadius:32, paddingVertical:36, paddingHorizontal:32, alignItems:'center', width:'82%', elevation:12, transform:[{scale:scaleAnim}] }}>
          <Animated.Text style={{ fontSize:100, marginBottom:16, transform:[{scale:pulseAnim}] }}>🚨</Animated.Text>
          <Text style={{ fontSize:20, fontWeight:'bold', color:'#C53030', textAlign:'center', marginBottom:6 }}>ตรวจพบมุมเอียงผิดปกติ!</Text>
          <Text style={{ fontSize:15, color:'#4A5568', textAlign:'center', marginBottom:24 }}>คุณยังปลอดภัยอยู่ไหม?</Text>
          <TouchableOpacity onPress={onDismiss} style={{ backgroundColor:'#2E5A36', borderRadius:20, paddingVertical:12, paddingHorizontal:32, marginBottom:14 }}>
            <Text style={{ color:'#FFFFFF', fontSize:16, fontWeight:'bold' }}>✅  ฉันปลอดภัย</Text>
          </TouchableOpacity>
          <Text style={{ fontSize:11, color:'#A0AEC0', textAlign:'center' }}>หรือ เขย่าโทรศัพท์ / กดปุ่มเสียง เพื่อยืนยัน</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}
// ─────────────────────────────────────────────────────────────

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) { console.error("Background Location Error: - App.js:99", error); return; }
  if (data) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      const bgLocation = locations[0];
      const speedKmH = Math.round((bgLocation.coords.speed || 0) * 3.6);
      globalCurrentSpeed = speedKmH > 0 ? speedKmH : globalCurrentSpeed;
      if (globalCurrentSpeed > globalSpeedLimit && globalIsVoiceEnabled) {
        try {
          await Speech.stop();
          await Speech.speak(`แจ้งเตือนเบื้องหลัง! ความเร็วของคุณเกินกำหนด ขับขี่อยู่ที่ ${globalCurrentSpeed} กิโลเมตรต่อชั่วโมงค่ะ`, { language: 'th-TH' });
        } catch (speechError) { console.log("Speech Background Error: - App.js:110", speechError); }
        if (globalUserUid) {
          try {
            await addDoc(collection(db, "speed_logs"), {
              userId: globalUserUid, speed: globalCurrentSpeed, speedLimit: globalSpeedLimit,
              latitude: bgLocation.coords.latitude, longitude: bgLocation.coords.longitude,
              timestamp: new Date().toISOString()
            });
          } catch (dbError) { console.warn("Firebase Background Logging: - App.js:118", dbError.message); }
        }
      }
    }
  }
});

TaskManager.defineTask(BACKGROUND_SAFETY_FETCH_TASK, async () => {
  try {
    console.log("RideCare AI Background Fetch: Standby... - App.js:127");
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) { return BackgroundFetch.BackgroundFetchResult.Failed; }
});

let VolumeManager = null;
try {
  VolumeManager = require('react-native-volume-manager').VolumeManager;
} catch (error) {
  console.log("⚠️ VolumeManager ปิดการโหลด - App.js:136");
}

export default function App() {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home'); 
  const [currentMenuSection, setCurrentMenuSection] = useState('gyro'); 
  const [platform, setPlatform] = useState('Grab'); 
  const [inputText, setInputText] = useState('');
  const [currentSpeed, setCurrentSpeed] = useState(35); 
  const [speedLimit, setSpeedLimit] = useState(50); 
  const [bluetoothConnected, setBluetoothConnected] = useState(true);
  const [currentRollAngle, setCurrentRollAngle] = useState(0); 
  const [antiFallStatus, setAntiFallStatus] = useState('กำลังตรวจสอบเซนเซอร์...');
  const [isSystemActive, setIsSystemActive] = useState(true); 
  const [isGestureEnabled, setIsGestureEnabled] = useState(true); 
  const [isVibrationEnabled, setIsVibrationEnabled] = useState(true); 
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true); 
  const [location, setLocation] = useState(null); 
  const [mapRegion, setMapRegion] = useState({
    latitude: 14.8821, longitude: 102.0212, latitudeDelta: 0.015, longitudeDelta: 0.015,
  });
  const [pinnedHazards, setPinnedHazards] = useState([]);
  const [chatMessages, setChatMessages] = useState([
    { id: 1, type: 'system', text: '🎯 RIDECARE AI Core: ระบบพร้อมทำงานและเชื่อมฐานข้อมูลคลาวด์แล้วค่ะ' }
  ]);

  // ── ✨ เพิ่ม state overlay ──
  const [showHazardOverlay, setShowHazardOverlay] = useState(false);

  const messageQueue = useRef([]);
  const isSpeaking = useRef(false);
  const scrollViewRef = useRef();
  const speedWarningCooldown = useRef(false);
  const fallWarningCooldown = useRef(false);
  const gestureCooldown = useRef(false);

  const isDrivingFast = currentSpeed > 20;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      globalUserUid = currentUser ? currentUser.uid : null;
      setIsAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => { globalSpeedLimit = speedLimit; globalIsVoiceEnabled = isVoiceEnabled; }, [speedLimit, isVoiceEnabled]);
  useEffect(() => { globalCurrentSpeed = currentSpeed; }, [currentSpeed]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "hazard_reports"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cloudHazards = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        cloudHazards.push({ id: doc.id, latitude: data.latitude, longitude: data.longitude, type: data.hazardType, title: `💥 ${data.hazardType}` });
      });
      setPinnedHazards(cloudHazards);
    }, (error) => { console.log("Firebase Realtime Sync Error: - App.js:198", error.message); });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    async function initAppSystems() {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false, playsInSilentModeIOS: true, shouldDuckAndroid: true, playThroughEarpieceAndroid: false,
        });
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        let bgStatus = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus.status === 'granted') {
          await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
            accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 5,
            foregroundService: { notificationTitle: "RideCare AI Active", notificationBody: "ระบบกำลังเฝ้าระวังภัยและความเร็วรถจักรยานยนต์แบบเรียลไทม์", notificationColor: "#004A32" }
          });
          await BackgroundFetch.registerTaskAsync(BACKGROUND_SAFETY_FETCH_TASK, {
            minimumInterval: 60 * 15, stopOnTerminate: false, startOnAutomatedBackup: true,
          });
        }
        let currentLoc = await Location.getCurrentPositionAsync({});
        setLocation(currentLoc);
        setMapRegion({ latitude: currentLoc.coords.latitude, longitude: currentLoc.coords.longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 });
      } catch (error) { console.log("Init Localization Background Error: - App.js:224", error); }
    }
    initAppSystems();
    return () => {
      Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).then((started) => {
        if (started) Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      });
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let subscription, accelSubscription, volumeListener;
    async function startHardwareSystems() {
      const isAvailable = await DeviceMotion.isAvailableAsync();
      if (!isSystemActive) {
        setAntiFallStatus('❌ ปิดระบบเซนเซอร์ตรวจจับ (Gyro Disabled)');
        setCurrentRollAngle(0);
        return;
      }
      if (!isAvailable) {
        setAntiFallStatus('ไม่รองรับเซนเซอร์เอียงบนเครื่องจำลอง (เปิดใช้สไลเดอร์ทดแทน)');
        return;
      }
      DeviceMotion.setUpdateInterval(100);
      subscription = DeviceMotion.addListener((motionData) => {
        if (motionData && motionData.rotation) {
          const rollDegrees = Math.round(motionData.rotation.gamma * (180 / Math.PI));
          handleAngleLogic(rollDegrees);
        }
      });
      if (isGestureEnabled) {
        Accelerometer.setUpdateInterval(100);
        accelSubscription = Accelerometer.addListener(accelData => {
          const { x, y } = accelData;
          const accelerationForce = Math.sqrt(x * x + y * y);
          if (accelerationForce > 2.2 && !gestureCooldown.current) {
            gestureCooldown.current = true;
            handleSmartConfirmAction("เซนเซอร์เครื่องสั่น: ยืนยันรายการผ่านการเคลื่อนไหวเครื่องสำเร็จ 📳");
            setTimeout(() => { gestureCooldown.current = false; }, 3000);
          }
        });
        if (VolumeManager) {
          try {
            VolumeManager.showNativeVolumeUI({ enabled: false });
            volumeListener = VolumeManager.addVolumeListener(() => {
              if (!gestureCooldown.current) {
                gestureCooldown.current = true;
                handleSmartConfirmAction("ปุ่มข้างเครื่อง: ทำการตกลงรายการด้วยปุ่ม Volume 🔊");
                setTimeout(() => { gestureCooldown.current = false; }, 3000);
              }
            });
          } catch (err) { console.log("Volume Trigger Extension Note: - App.js:276", err); }
        }
      }
    }
    startHardwareSystems();
    return () => {
      if (subscription) subscription.remove();
      if (accelSubscription) accelSubscription.remove();
      if (volumeListener) volumeListener.remove();
    };
  }, [isSystemActive, isGestureEnabled, currentSpeed, user]);

  useEffect(() => {
    if (!isDrivingFast && messageQueue.current.length > 0 && !isSpeaking.current) { processQueue(); }
  }, [currentSpeed]);

  useEffect(() => {
    if (!user) return;
    if (currentSpeed > speedLimit && !speedWarningCooldown.current) {
      speedWarningCooldown.current = true;
      forceVoiceNotification(`⚠️ ความเร็วเกินกำหนด! ความเร็วปัจจุบันคือ ${currentSpeed} กิโลเมตรต่อชั่วโมงค่ะ`);
      if (isVibrationEnabled) Vibration.vibrate([0, 150, 100, 150]);
      try {
        addDoc(collection(db, "speed_logs"), {
          userId: user.uid, speed: currentSpeed, speedLimit: speedLimit,
          latitude: location ? location.coords.latitude : mapRegion.latitude,
          longitude: location ? location.coords.longitude : mapRegion.longitude,
          timestamp: new Date().toISOString()
        });
      } catch (e) { console.log("Foreground Log Firebase Skipped: - App.js:305", e.message); }
      setTimeout(() => { speedWarningCooldown.current = false; }, 10000);
    }
  }, [currentSpeed, speedLimit, isVibrationEnabled, user]);

  const handleAngleLogic = (rollDegrees) => {
    if (!isSystemActive) return;
    setCurrentRollAngle(rollDegrees);
    const absoluteAngle = Math.abs(rollDegrees);

    if (absoluteAngle >= 80) {
      setAntiFallStatus('⚠️ วิกฤต! รถเกิดอุบัติเหตุล้มคว่ำ (Danger)');
      setShowHazardOverlay(true);
      if (!fallWarningCooldown.current) {
        fallWarningCooldown.current = true;
        forceVoiceNotification(`อันตรายค่ะ! ตรวจพบรถเกิดมุมเอียงวิกฤต ${absoluteAngle} องศา ระบบกำลังเปิดสัญญาณฉุกเฉินกู้ภัยค่ะ!`);
        if (isVibrationEnabled) Vibration.vibrate(1500);
        setChatMessages(prev => [...prev, { id: Date.now(), type: 'hazard', text: `🚨 [CRITICAL] พบมุมอันตรายรถล้มคว่ำเฉียบพลันที่ ${absoluteAngle}°` }]);
        setTimeout(() => { fallWarningCooldown.current = false; }, 5000);
      }
    } else if (absoluteAngle > 25 && absoluteAngle < 80) {
      setAntiFallStatus('🏍️ กำลังเข้าโค้งลึก (Deep Cornering)');
    } else {
      setAntiFallStatus('🟢 ปกติ: ช่วงมุมเอียงปลอดภัย (Safe)');
    }
  };

  const handleSmartConfirmAction = (triggerSource) => {
    forceVoiceNotification("รับทราบค่ะ ทำการตอบรับรายการสำเร็จ");
    setChatMessages(prev => [...prev, { id: Date.now(), type: 'system', text: `🖐️ [SMART CONFIRM] ${triggerSource}` }]);
  };

  const triggerVoiceNotification = (text, callback) => {
    if (!isVoiceEnabled || isDrivingFast || !bluetoothConnected) { if (callback) callback(); return; }
    Speech.stop();
    Speech.speak(text, { language: 'th-TH', rate: 0.95, pitch: 1.0, onDone: callback, onError: callback });
  };

  const forceVoiceNotification = (text, callback) => {
    if (!isVoiceEnabled || !bluetoothConnected) { if (callback) callback(); return; }
    Speech.stop();
    Speech.speak(text, { language: 'th-TH', rate: 0.95, pitch: 1.0, onDone: callback, onError: callback });
  };

  const processQueue = async () => {
    if (messageQueue.current.length === 0 || isDrivingFast) { isSpeaking.current = false; return; }
    isSpeaking.current = true;
    let nextText = messageQueue.current.shift();
    if (nextText) {
      setChatMessages(prev => [...prev, { id: Date.now(), type: 'system', text: `🔊 ขับขี่ปลอดภัยขึ้น -> ถอดข้อความคิว: "${nextText}"` }]);
      triggerVoiceNotification(`ข้อความเสียงพักไว้: ${nextText}`, processQueue);
    }
  };

  const receiveCustomerMessage = () => {
    if (inputText.trim() === '') return;
    const textToSend = inputText.trim();
    if (isDrivingFast) {
      messageQueue.current.push(textToSend);
      setChatMessages(prev => [...prev, { id: Date.now(), type: 'buffered', text: `⏳ [พักเสียงในคิวความเร็วสูง] ${textToSend}` }]);
    } else {
      setChatMessages(prev => [...prev, { id: Date.now(), type: 'customer', text: textToSend }]);
      triggerVoiceNotification(`ข้อความใหม่เข้ามาจากลูกค้า: ${textToSend}`);
    }
    setInputText('');
  };

  const reportHazardToMap = async (hazardType) => {
    const lat = location ? location.coords.latitude + (Math.random() - 0.5) * 0.003 : mapRegion.latitude + (Math.random() - 0.5) * 0.003;
    const lng = location ? location.coords.longitude + (Math.random() - 0.5) * 0.003 : mapRegion.longitude + (Math.random() - 0.5) * 0.003;
    try {
      await addDoc(collection(db, "hazard_reports"), {
        reporterId: user.uid, hazardType: hazardType, latitude: lat, longitude: lng,
        status: "active", timestamp: serverTimestamp()
      });
      setChatMessages(prev => [...prev, { id: Date.now(), type: 'hazard', text: hazardType === 'emergency' ? `🚨 [CRITICAL] พิกัดฉุกเฉินเปิดสัญญาณช่วยเหลือแล้ว` : `📍 [คลาวด์อัปเดต] แจ้งจุดเสี่ยงกลุ่ม "${hazardType}" สำเร็จ` }]);
      triggerVoiceNotification(`อัปเดตรายงานความเสี่ยงจุด ${hazardType} ขึ้นสู่คลาวด์สาธารณะเรียบร้อยแล้วค่ะ`);
      setActiveTab('map');
    } catch (error) {
      Alert.alert("ขออภัยค่ะ", "ไม่สามารถส่งพิกัดรายงานได้เนื่องจากสิทธิ์เข้าถึงไม่เพียงพอ: " + error.message);
    }
  };

  const clearAllHazards = () => {
    Alert.alert("💡 ข้อมูลคลาวด์ส่วนกลาง", "ข้อมูลจุดรายงานพิกัดอันตรายแชร์ร่วมกันในฐานข้อมูลออนไลน์คลาวด์ เพื่อรักษาความปลอดภัยของกลุ่มผู้ขับขี่ในพื้นที่ร่วมกันค่ะ");
  };

  if (isAuthLoading) {
    return (
      <View style={styles.authCenterContainer}>
        <ActivityIndicator size="large" color="#004A32" />
        <Text style={{ marginTop: 12, color: '#004A32', fontWeight: 'bold' }}>กำลังเชื่อมต่อเครือข่ายความปลอดภัย RideCare...</Text>
      </View>
    );
  }

  if (!user) { return <LoginScreen />; }

  return (
    <View style={styles.mainContainer}>
      <HazardOverlay visible={showHazardOverlay} onDismiss={() => setShowHazardOverlay(false)} />
      <View style={styles.topGreenHeader} />

      {activeTab === 'home' && (
        <HomeScreen 
          isGestureEnabled={isGestureEnabled} setIsGestureEnabled={setIsGestureEnabled}
          handleSmartConfirmAction={handleSmartConfirmAction}
          reportHazardToMap={reportHazardToMap} forceVoiceNotification={forceVoiceNotification}
          isVibrationEnabled={isVibrationEnabled} currentMenuSection={currentMenuSection}
          setCurrentMenuSection={setCurrentMenuSection} currentSpeed={currentSpeed}
          setCurrentSpeed={setCurrentSpeed} speedLimit={speedLimit} currentRollAngle={currentRollAngle}
          handleAngleLogic={handleAngleLogic} isSystemActive={isSystemActive} antiFallStatus={antiFallStatus}
          setPlatform={setPlatform} triggerVoiceNotification={triggerVoiceNotification} Vibration={Vibration}
          // ── ✨ ส่ง overlay state ไปให้ HomeScreen ──
          showHazardOverlay={showHazardOverlay}
          onHazardAngleDismissed={() => setShowHazardOverlay(false)}
        />
      )}
      {activeTab === 'chat' && (
        <ChatScreen 
          isDrivingFast={isDrivingFast} chatMessages={chatMessages} inputText={inputText}
          setInputText={setInputText} receiveCustomerMessage={receiveCustomerMessage} scrollViewRef={scrollViewRef}
        />
      )}
      {activeTab === 'map' && (
        <MapScreen 
          mapRegion={mapRegion} setMapRegion={setMapRegion} location={location}
          pinnedHazards={pinnedHazards} reportHazardToMap={reportHazardToMap}
        />
      )}
      {activeTab === 'setting' && (
        <ScrollView style={{ flex: 1, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          <SettingScreen 
            isSystemActive={isSystemActive} setIsSystemActive={setIsSystemActive}
            isVoiceEnabled={isVoiceEnabled} setIsVoiceEnabled={setIsVoiceEnabled}
            isVibrationEnabled={isVibrationEnabled} setIsVibrationEnabled={setIsVibrationEnabled}
            isGestureEnabled={isGestureEnabled} setIsGestureEnabled={setIsGestureEnabled}
            pinnedHazards={pinnedHazards} clearAllHazards={clearAllHazards}
          />
        </ScrollView>
      )}

      <View style={styles.bottomTabBar}>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'home' && styles.tabItemActive]} onPress={() => setActiveTab('home')}>
          <Text style={styles.tabIcon}>🏠</Text>
          <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabLabelActive]}>หน้าแรก</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'chat' && styles.tabItemActive]} onPress={() => setActiveTab('chat')}>
          <View style={{ position: 'relative' }}>
            {messageQueue.current.length > 0 && <View style={styles.chatBadgeCount} />}
            <Text style={styles.tabIcon}>💬</Text>
          </View>
          <Text style={[styles.tabLabel, activeTab === 'chat' && styles.tabLabelActive]}>ข้อความ</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'map' && styles.tabItemActive]} onPress={() => setActiveTab('map')}>
          <Text style={styles.tabIcon}>🗺️</Text>
          <Text style={[styles.tabLabel, activeTab === 'map' && styles.tabLabelActive]}>แผนที่ ({pinnedHazards.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'setting' && styles.tabItemActive]} onPress={() => setActiveTab('setting')}>
          <Text style={styles.tabIcon}>⚙️</Text>
          <Text style={[styles.tabLabel, activeTab === 'setting' && styles.tabLabelActive]}>การตั้งค่า</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  authCenterContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7FAFC' },
  topGreenHeader: { backgroundColor: '#004A32', paddingHorizontal: 16, paddingTop: 45, paddingBottom: 16, flexDirection: 'row', alignItems: 'center' },
  searchBarContainer: { flex: 1, flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 10, height: 42, alignItems: 'center', paddingHorizontal: 12 },
  scanIcon: { fontSize: 18, marginRight: 8 },
  searchBarInput: { flex: 1 },
  searchPlaceholder: { color: '#004A32', fontSize: 12, fontWeight: 'bold' },
  bottomTabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 75, backgroundColor: '#C8E6C9', flexDirection: 'row', borderTopLeftRadius: 30, borderTopRightRadius: 30, justifyContent: 'space-around', alignItems: 'center', zIndex: 50, paddingBottom: 10, borderTopWidth: 1, borderTopColor: '#A5D6A7' },
  tabItem: { alignItems: 'center', justifyContent: 'center', flex: 1, height: '100%' },
  tabItemActive: { backgroundColor: 'rgba(255, 255, 255, 0.35)', borderRadius: 20, marginVertical: 8, marginHorizontal: 6 },
  tabIcon: { fontSize: 20, marginBottom: 2 },
  tabLabel: { fontSize: 11, color: '#4A5568', fontWeight: 'bold' },
  tabLabelActive: { color: '#004A32', fontWeight: 'bold', fontSize: 12 },
  chatBadgeCount: { position: 'absolute', top: -2, right: -4, backgroundColor: '#E53E3E', width: 9, height: 9, borderRadius: 4.5, zIndex: 20 },
  profileCloudBox: { margin: 16, padding: 16, backgroundColor: '#F7FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 20 },
  profileEmailText: { fontSize: 14, fontWeight: 'bold', color: '#2D3748', marginBottom: 4 },
  profileUidText: { fontSize: 11, color: '#718096', marginBottom: 14 },
  logoutBtn: { backgroundColor: '#E53E3E', borderRadius: 8, padding: 12, alignItems: 'center' },
  logoutBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 }
});