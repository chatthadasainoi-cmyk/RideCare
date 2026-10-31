import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from './firebaseConfig'; // ✨ ตรวจสอบให้แน่ใจว่า import db มาด้วย
import { signOut } from 'firebase/auth';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'; // ✨ นำเข้าฟังก์ชันจัดการ Firestore

export default function SettingScreen({
  isSystemActive, setIsSystemActive,
  isVoiceEnabled, setIsVoiceEnabled,
  isVibrationEnabled, setIsVibrationEnabled,
  isGestureEnabled, setIsGestureEnabled,
  user
}) {

  // ✨ ฟังก์ชันสำหรับล้างข้อมูลหมุดทั้งหมดใน Firestore
  const handleClearAllHazards = async () => {
    Alert.alert(
      "🧹 ยืนยันการล้างข้อมูลทั้งหมด",
      "คุณแน่ใจหรือไม่ที่จะลบพิกัดจุดเสี่ยงทั้งหมดบนคลาวด์? การกระทำนี้ไม่สามารถย้อนกลับได้",
      [
        { text: "ยกเลิก", style: "cancel" },
        { 
          text: "ลบข้อมูลทั้งหมด", 
          style: "destructive", 
          onPress: async () => {
            try {
              // ดึงข้อมูลทั้งหมดจาก collection hazard_reports
              const querySnapshot = await getDocs(collection(db, "hazard_reports"));
              
              // วนลูปเพื่อลบทีละ document
              querySnapshot.forEach(async (document) => {
                await deleteDoc(doc(db, "hazard_reports", document.id));
              });

              Alert.alert("สำเร็จ", "ลบพิกัดจุดเสี่ยงบนคลาวด์เรียบร้อยแล้ว");
            } catch (error) {
              console.error("Error clearing hazards: - SettingScreen.js:46", error);
              Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถลบข้อมูลได้: " + error.message);
            }
          } 
        }
      ]
    );
  };

  const handleLogoutPress = () => {
    Alert.alert(
      "🚪 ออกจากระบบ",
      "คุณต้องการออกจากระบบบัญชีใช่หรือไม่?",
      [
        { text: "ยกเลิก", style: "cancel" },
        { text: "ออกจากระบบ", style: "destructive", onPress: () => signOut(auth) }
      ]
    );
  };

  return (
    <ScrollView style={styles.settingMainContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.settingHeaderBanner}>
        <View style={styles.headerFlexRow}>
          <Text style={styles.settingMainTitleText}>Setting</Text>
          <Ionicons name="settings-outline" size={26} color="#2E5A36" style={styles.headerSettingIcon} />
        </View>
      </View>

      <View style={styles.menuItemsGroupList}>
        <View style={styles.userProfileCard}>
          <View style={styles.profileHeaderRow}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={18} color="#2E5A36" />
            </View>
            <View style={styles.profileInfoColumn}>
              <Text style={styles.profileLabel}>บัญชีผู้ใช้งาน</Text>
              <Text style={styles.profileEmailText} numberOfLines={1}>{user?.email}</Text>
              <Text style={styles.profileUidText} numberOfLines={1}>UID: {user?.uid}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutMiniButton} onPress={handleLogoutPress}>
            <Ionicons name="log-out-outline" size={14} color="#E53E3E" style={{ marginRight: 4 }} />
            <Text style={styles.logoutMiniButtonText}>ออกจากระบบ</Text>
          </TouchableOpacity>
        </View>

        {/* สวิตช์ควบคุมต่างๆ */}
        <View style={styles.settingControlCardRow}>
          <View style={styles.infoTextColumn}>
            <Text style={styles.menuTitleTextText}>ระบบตรวจจับ Gyroscope</Text>
            <Text style={styles.menuSubDescriptionText}>เปิด-ปิดเซนเซอร์วัดมุมเอียงและการล้มคว่ำของรถ</Text>
          </View>
          <Switch trackColor={{ false: "#E2E8F0", true: "#C8E6C9" }} thumbColor={isSystemActive ? "#2E5A36" : "#A0AEC0"} onValueChange={setIsSystemActive} value={isSystemActive} />
        </View>

        <View style={styles.settingControlCardRow}>
          <View style={styles.infoTextColumn}>
            <Text style={styles.menuTitleTextText}>ระบบแจ้งเตือนด้วยเสียง AI</Text>
            <Text style={styles.menuSubDescriptionText}>ส่งเสียงพูดเตือนความเร็วและแจ้งภัยสตรีมสด</Text>
          </View>
          <Switch trackColor={{ false: "#E2E8F0", true: "#C8E6C9" }} thumbColor={isVoiceEnabled ? "#2E5A36" : "#A0AEC0"} onValueChange={setIsVoiceEnabled} value={isVoiceEnabled} />
        </View>

        <View style={styles.settingControlCardRow}>
          <View style={styles.infoTextColumn}>
            <Text style={styles.menuTitleTextText}>ระบบสั่นเตือนภัยของโทรศัพท์</Text>
            <Text style={styles.menuSubDescriptionText}>เปิดสัญญาณสั่นเมื่อขับขี่เร็วเกินกำหนด</Text>
          </View>
          <Switch trackColor={{ false: "#E2E8F0", true: "#C8E6C9" }} thumbColor={isVibrationEnabled ? "#2E5A36" : "#A0AEC0"} onValueChange={setIsVibrationEnabled} value={isVibrationEnabled} />
        </View>

        <View style={styles.settingControlCardRow}>
          <View style={styles.infoTextColumn}>
            <Text style={styles.menuTitleTextText}>ระบบตรวจจับท่าทางและปุ่มเสียง</Text>
            <Text style={styles.menuSubDescriptionText}>ใช้การเขย่าเครื่องหรือกดปุ่ม Volume แทนการสัมผัสจอ</Text>
          </View>
          <Switch trackColor={{ false: "#E2E8F0", true: "#C8E6C9" }} thumbColor={isGestureEnabled ? "#2E5A36" : "#A0AEC0"} onValueChange={setIsGestureEnabled} value={isGestureEnabled} />
        </View>

        {/* ปุ่มล้างข้อมูลที่เชื่อมต่อกับฟังก์ชันใหม่ */}
        <TouchableOpacity style={styles.dangerZoneClearButton} onPress={handleClearAllHazards}>
          <Ionicons name="trash-bin-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.clearButtonTextLabel}>ล้างข้อมูลพิกัดจุดเสี่ยงบนคลาวด์</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  settingMainContainer: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  settingHeaderBanner: { 
    backgroundColor: '#C8E6C9', 
    height: 120, 
    borderBottomLeftRadius: 35, 
    borderBottomRightRadius: 35, 
    paddingHorizontal: 25, 
    justifyContent: 'center' 
  },
  headerFlexRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 20 
  },
  settingMainTitleText: { 
    fontSize: 26, 
    fontWeight: 'bold', 
    color: '#2E5A36' 
  },
  headerSettingIcon: { 
    marginLeft: 8, 
    marginTop: 2 
  },
  menuItemsGroupList: { 
    paddingHorizontal: 20, 
    paddingTop: 20, 
    paddingBottom: 120 // เพิ่ม Padding ด้านล่างหลบแถบเมนู Navigator
  },
  
  // 👤 สไตล์การ์ดข้อมูลบัญชีผู้ใช้งาน (ย้ายขึ้นมาด้านบนสุด)
  userProfileCard: {
    backgroundColor: '#F7FAFC',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  profileHeaderRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  avatarCircle: { 
    width: 36, height: 36, 
    borderRadius: 18, 
    backgroundColor: '#E8F5E9', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  profileInfoColumn: { 
    flex: 1 
  },
  profileLabel: { 
    fontSize: 11, 
    color: '#718096', 
    fontWeight: 'bold' 
  },
  profileEmailText: { 
    fontSize: 15, 
    fontWeight: 'bold', 
    color: '#2D3748', 
    marginTop: 1 
  },
  profileUidText: { 
    fontSize: 10, 
    color: '#A0AEC0', 
    marginTop: 1 
  },
  logoutMiniButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#FFFFFF', 
    borderWidth: 1, 
    borderColor: '#FEB2B2', 
    borderRadius: 12, 
    paddingVertical: 6 
  },
  logoutMiniButtonText: { 
    color: '#E53E3E', 
    fontSize: 12, 
    fontWeight: 'bold' 
  },

  // สไตล์กล่องเมนูการตั้งค่า (อิงตามรูปแบบโค้งมนสไตล์พาสเทลในภาพ)
  settingControlCardRow: { 
    flexDirection: 'row', 
    backgroundColor: '#EBF4FA', // สีฟ้าครามพาสเทลนุ่มนวลตาตามภาพจริง
    borderRadius: 24, 
    paddingVertical: 16, 
    paddingHorizontal: 20, 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1
  },
  infoTextColumn: { 
    flex: 0.8 
  },
  menuTitleTextText: { 
    fontSize: 15, 
    fontWeight: 'bold', 
    color: '#1B4D3E', // สีเขียวเข้มสไตล์ฟอนต์ดั้งเดิม
    marginBottom: 4 
  },
  menuSubDescriptionText: { 
    fontSize: 11, 
    color: '#718096', 
    lineHeight: 14 
  },
  dangerZoneClearButton: { 
    flexDirection: 'row', 
    backgroundColor: '#FF2E44', // สีแดงสดตามภาพ 1000020293.jpg
    borderRadius: 24, 
    paddingVertical: 14, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  clearButtonTextLabel: { 
    color: '#FFFFFF', 
    fontSize: 15, 
    fontWeight: 'bold' 
  }
});