// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 🔥 รหัส Config ที่ดึงมาจาก Firebase Console ของคุณ
const firebaseConfig = {
  apiKey: "AIzaSyAHB-W4hXNSiFDDUPTvWBtqLpyJAxwV2vI",
  authDomain: "hackathon34-9740e.firebaseapp.com",
  projectId: "hackathon34-9740e",
  storageBucket: "hackathon34-9740e.firebasestorage.app",
  messagingSenderId: "543858516107",
  appId: "1:543858516107:web:8021cff3e197f89ae6348e",
  measurementId: "G-MQVK1T2DTJ"
};

// 1️⃣ เริ่มต้นทำงาน Firebase Core Engine
const app = initializeApp(firebaseConfig);

// 2️⃣ เริ่มต้นทำงานระบบสมาชิก (จำการล็อกอินผ่าน AsyncStorage เพื่อไม่ให้หลุดตอนเปิดแอปใหม่)
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// 3️⃣ เริ่มต้นทำงานฐานข้อมูลเก็บสถิติความเร็ว Firestore Cloud
const db = getFirestore(app);

// ส่งออกตัวแปรเพื่อให้ไฟล์ App.js เรียกไปใช้งานต่อได้
export { auth, db };