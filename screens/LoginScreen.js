import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { auth } from './firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  // ข้อมูลบัญชีจำลองล่าสุดสำหรับให้ผู้ใช้กดนำออกได้ตามบรีฟ
  const [savedAccount, setSavedAccount] = useState('1101403@gmail.com');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("แจ้งเตือน", "กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วนค่ะ");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setSavedAccount(email);
    } catch (error) {
      Alert.alert("เข้าสู่ระบบล้มเหลว", error.message);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !username) {
      Alert.alert("แจ้งเตือน", "กรุณากรอกข้อมูลสำคัญให้ครบถ้วนค่ะ");
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      Alert.alert("สำเร็จ", "ลงทะเบียนบัญชีไรเดอร์ RideCare เรียบร้อยแล้ว!");
    } catch (error) {
      Alert.alert("ลงทะเบียนล้มเหลว", error.message);
    }
  };

  const handleRemoveSavedAccount = () => {
    Alert.alert(
      "❌ นำบัญชีออกจากเครื่อง?",
      `คุณต้องการล้างข้อมูลการจดจำบัญชี ${savedAccount} ออกจากหน้านี้ใช่หรือไม่?`,
      [
        { text: "ยกเลิก", style: "cancel" },
        { 
          text: "ยืนยันนำออก", 
          style: "destructive", 
          onPress: () => {
            setSavedAccount(null);
            setEmail('');
            Alert.alert("สำเร็จ", "นำข้อมูลบัญชีออกจากระบบล็อกอินแล้วค่ะ");
          } 
        }
      ]
    );
  };

  if (!isSignUpMode) {
    return (
      <View style={styles.container}>
        {/* 🟢 หัวแบนเนอร์โลโก้แบบปลอดภัย: ใช้ไอคอนระบบแทนรูปภาพเพื่อป้องกันปัญหา Path พัง */}
        <View style={styles.logoHeaderContainer}>
          <Ionicons name="bicycle-outline" size={70} color="#004A32" />
          <Text style={styles.logoTextBrand}>RideCare</Text>
        </View>

        <View style={styles.formContainerCard}>
          <Text style={styles.mainTitleText}>LOG IN</Text>

          {/* ป้ายแสดงบัญชีล่าสุด พร้อมปุ่ม "นำบัญชีออก" ทำงานได้จริง */}
          {savedAccount && (
            <View style={styles.savedAccountBadgeRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Ionicons name="person-circle-outline" size={18} color="#2E5A36" style={{ marginRight: 6 }} />
                <Text style={styles.savedAccountText} numberOfLines={1}>บัญชีล่าสุด: {savedAccount}</Text>
              </View>
              <TouchableOpacity style={styles.removeAccountBtn} onPress={handleRemoveSavedAccount}>
                <Text style={styles.removeAccountBtnText}>นำบัญชีออก</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.inputLabelText}>EMAIL</Text>
          <TextInput
            style={styles.textInputStyle}
            placeholder="1101403@gmail.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.inputLabelText}>PASSWORD</Text>
          <View style={styles.passwordWrapperRow}>
            <TextInput
              style={{ flex: 1, height: '100%', paddingHorizontal: 16, fontSize: 14, color: '#2D3748' }}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secureTextEntry}
            />
            <TouchableOpacity style={{ marginRight: 12 }} onPress={() => setSecureTextEntry(!secureTextEntry)}>
              <Ionicons name={secureTextEntry ? "eye-off-outline" : "eye-outline"} size={18} color="#4A5568" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity>
            <Text style={styles.forgetPasswordText}>FORGET YOUR PASSWORD</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.primaryActionButton} onPress={handleLogin}>
            <Text style={styles.primaryActionBtnText}>LOG IN</Text>
          </TouchableOpacity>

          <View style={styles.switchModeFooterRow}>
            <Text style={styles.footerSubText}>Don't have any account? </Text>
            <TouchableOpacity onPress={() => setIsSignUpMode(true)}>
              <Text style={styles.footerLinkText}>SIGN IN</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // 📝 หน้าต่างหน้า SIGN UP
  return (
    <View style={styles.container}>
      <View style={styles.signUpHeaderBanner}>
        <TouchableOpacity style={styles.backArrowBtn} onPress={() => setIsSignUpMode(false)}>
          <Ionicons name="arrow-back" size={24} color="#004A32" />
        </TouchableOpacity>
        <Text style={styles.signUpTitleHeader}>SIGN UP</Text>
      </View>

      <View style={styles.formContainerCard}>
        <Text style={styles.inputLabelText}>USER NAME</Text>
        <TextInput style={styles.textInputStyle} placeholder="สมชาย" value={username} onChangeText={setUsername} />

        <Text style={styles.inputLabelText}>PHONE NUMBER</Text>
        <TextInput style={styles.textInputStyle} placeholder="099-xxx-xxxx" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />

        <Text style={styles.inputLabelText}>EMAIL</Text>
        <TextInput style={styles.textInputStyle} placeholder="1101403@gmail.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

        <Text style={styles.inputLabelText}>PASSWORD</Text>
        <TextInput style={styles.textInputStyle} placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry={true} />

        <TouchableOpacity style={[styles.primaryActionButton, { marginTop: 30 }]} onPress={handleSignUp}>
          <Text style={styles.primaryActionBtnText}>SIGN IN</Text>
        </TouchableOpacity>

        <View style={styles.switchModeFooterRow}>
          <Text style={styles.footerSubText}>Already have a account? </Text>
          <TouchableOpacity onPress={() => setIsSignUpMode(false)}>
            <Text style={styles.footerLinkText}>LOG IN</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  logoHeaderContainer: { backgroundColor: '#C8E6C9', height: 180, justifyContent: 'center', alignItems: 'center', borderBottomLeftRadius: 35, borderBottomRightRadius: 35, paddingTop: 20 },
  logoTextBrand: { fontSize: 22, fontWeight: 'bold', color: '#004A32', marginTop: 4 },
  
  signUpHeaderBanner: { backgroundColor: '#C8E6C9', height: 110, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
  backArrowBtn: { marginTop: 30, marginRight: 15 },
  signUpTitleHeader: { fontSize: 26, fontWeight: 'bold', color: '#004A32', marginTop: 30 },
  
  formContainerCard: { paddingHorizontal: 25, paddingTop: 15 },
  mainTitleText: { fontSize: 30, fontWeight: 'bold', color: '#000000', textAlign: 'center', marginBottom: 12 },
  inputLabelText: { fontSize: 13, fontWeight: 'bold', color: '#000000', marginTop: 12, marginBottom: 5, marginLeft: 4 },
  textInputStyle: { height: 45, borderWidth: 1.2, borderColor: '#2E5A36', borderRadius: 20, paddingHorizontal: 16, fontSize: 14, color: '#2D3748' },
  passwordWrapperRow: { flexDirection: 'row', height: 45, borderWidth: 1.2, borderColor: '#2E5A36', borderRadius: 20, alignItems: 'center' },
  forgetPasswordText: { fontSize: 11, color: '#4A5568', fontWeight: 'bold', textAlign: 'right', marginTop: 8 },
  
  savedAccountBadgeRow: { flexDirection: 'row', backgroundColor: '#EDF2F7', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 5, borderWidth: 1, borderColor: '#CBD5E0' },
  savedAccountText: { fontSize: 12, fontWeight: 'bold', color: '#2E5A36' },
  removeAccountBtn: { backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#FEB2B2', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 },
  removeAccountBtnText: { color: '#E53E3E', fontSize: 10, fontWeight: 'bold' },

  primaryActionButton: { backgroundColor: '#2E5A36', height: 46, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginTop: 25 },
  primaryActionBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  switchModeFooterRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 15 },
  footerSubText: { fontSize: 12, color: '#4A5568' },
  footerLinkText: { fontSize: 12, color: '#000000', fontWeight: 'bold' }
});