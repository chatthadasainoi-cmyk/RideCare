import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ChatScreen({
  chatMessages,
  inputText,
  setInputText,
  receiveCustomerMessage,
  scrollViewRef
}) {

  // อัปเดตให้รายการแชทเลื่อนลงมาด้านล่างสุดเสมอเมื่อมีข้อความใหม่เด้งเข้ามา
  useEffect(() => {
    if (scrollViewRef && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatMessages]);

  // ฟังก์ชันย่อยสำหรับจัดกลุ่ม Render รูปแบบกล่องแชทแต่ละประเภทตามภาพสเก็ตช์
  const renderChatItem = ({ item }) => {
    // 🚨 1. กรณีเป็นข้อความแจ้งเตือนวิกฤตระบบจากตัวเครื่อง (ความเร็วเกิน/รถเอียงล้ม)
    if (item.type === 'hazard' || item.text.includes('[CRITICAL]')) {
      return (
        <View style={styles.criticalWarningContainer}>
          <Text style={styles.criticalWarningIcon}>⚠️</Text>
          <Text style={styles.criticalWarningText}>{item.text}</Text>
        </View>
      );
    }

    // 💬 2. กรณีเป็นข้อความของลูกค้าส่งมา (แสดงกล่องแชทสีเหลืองนวลพร้อมไอคอนผู้ใช้ด้านซ้าย)
    if (item.type === 'customer' || item.type === 'buffered') {
      return (
        <View style={styles.customerMessageRow}>
          <View style={styles.avatarCircleIcon}>
            <Ionicons name="person" size={18} color="#718096" />
          </View>
          <View style={styles.customerBubbleCard}>
            <Text style={styles.customerChatText}>{item.text}</Text>
            <View style={styles.bubbleLeftTailTriangle} />
          </View>
        </View>
      );
    }

    // 👤 3. กรณีเป็นข้อความพิมพ์โต้ตอบฝั่งตัวไรเดอร์เอง (แสดงกล่องสีเขียวชิดขวา)
    return (
      <View style={styles.riderMessageRow}>
        <View style={styles.riderBubbleCard}>
          <Text style={styles.riderChatText}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.chatWrapperContainer}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      
      {/* 🟢 ส่วนหัวดีไซน์สีเขียวอ่อนโค้งมนเว้าตามภาพภาพประกอบ Sound Chat */}
      <View style={styles.soundChatHeaderBanner}>
        <View style={styles.headerFlexRow}>
          {/* ไอคอนหน้าหมี/กบน่ารักสีเหลืองครีมเด่นซ้ายมือตามดีไซน์เป้าหมาย */}
          <View style={styles.brandMascotBadgeCircle}>
            <View style={styles.mascotEarLeft} />
            <View style={styles.mascotEarRight} />
            <View style={styles.mascotInnerFaceCard}>
              <View style={styles.mascotEyeLeft} />
              <View style={styles.mascotEyeRight} />
              <View style={styles.mascotNoseCenter} />
            </View>
          </View>
          <Text style={styles.soundChatMainTitleText}>Sound Chat</Text>
        </View>
      </View>

      {/* 📜 ส่วนรายการข้อความแชทโต้ตอบ (ไหลพ่นขึ้นแบบ Real-time) */}
      <FlatList
        ref={scrollViewRef}
        data={chatMessages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderChatItem}
        contentContainerStyle={styles.chatListScrollContent}
        showsVerticalScrollIndicator={false}
      />

      {/* 📥 ส่วนแถบรับข้อมูลพิมพ์ข้อความส่งด้านล่างสุด */}
      <View style={styles.bottomInputChatBarRow}>
        <TextInput
          style={styles.chatInputTextFiled}
          placeholder="พิมพ์ข้อความ..."
          placeholderTextColor="#A0AEC0"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={receiveCustomerMessage}
        />
        <TouchableOpacity 
          style={styles.sendActionButtonCircle} 
          onPress={receiveCustomerMessage}
        >
          <Ionicons name="send" size={20} color="#2E5A36" />
        </TouchableOpacity>
      </View>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  chatWrapperContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  
  // ดีไซน์สีเขียวพาสเทลโค้งมนรับมุมล่างอย่างมีมิติ
  soundChatHeaderBanner: {
    backgroundColor: '#C8E6C9',
    height: 140,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingHorizontal: 25,
    justifyContent: 'center',
    zIndex: 10
  },
  headerFlexRow: { flexDirection: 'row', alignItems: 'center', marginTop: 25 },
  soundChatMainTitleText: { fontSize: 28, fontWeight: 'bold', color: '#2E5A36', marginLeft: 16 },
  
  // 🐻 โครงสร้างสร้างไอคอนมาสคอตหมีสลักเส้นด้วย StyleSheet 
  brandMascotBadgeCircle: { width: 75, height: 75, borderRadius: 37.5, backgroundColor: '#F0E6AD', justifyContent: 'center', alignItems: 'center', borderWidth: 2.5, borderColor: '#000000', position: 'relative' },
  mascotInnerFaceCard: { width: 52, height: 40, borderRadius: 16, borderWidth: 3, borderColor: '#000000', backgroundColor: '#F0E6AD', justifyContent: 'center', paddingHorizontal: 8 },
  mascotEarLeft: { width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: '#000000', backgroundColor: '#F0E6AD', position: 'absolute', top: 12, left: 10 },
  mascotEarRight: { width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: '#000000', backgroundColor: '#F0E6AD', position: 'absolute', top: 12, right: 10 },
  mascotEyeLeft: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#000000', position: 'absolute', left: 12, top: 14 },
  mascotEyeRight: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#000000', position: 'absolute', right: 12, top: 14 },
  mascotNoseCenter: { width: 14, height: 8, borderRadius: 4, borderWidth: 2, borderColor: '#000000', alignSelf: 'center', marginTop: 12 },

  chatListScrollContent: { paddingHorizontal: 20, paddingTop: 25, paddingBottom: 90 },

  // 🚨 สไตล์กรอบเตือนวิกฤตสีแดงตามหน้าจอตัวอย่างต้นฉบับ
  criticalWarningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E53E3E',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    alignSelf: 'center',
    width: '100%',
  },
  criticalWarningIcon: { fontSize: 16, color: '#E53E3E', marginRight: 12 },
  criticalWarningText: { fontSize: 13, fontWeight: 'bold', color: '#4A5568', flex: 1 },

  // 💬 สไตล์กล่องแชทเหลืองนวลฝั่งลูกค้าพร้อมติ่งแหลมชี้ซ้าย
  customerMessageRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, width: '80%' },
  avatarCircleIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#C8E6C9', justifyContent: 'center', alignItems: 'center', marginRight: 10, marginTop: 4 },
  customerBubbleCard: { backgroundColor: '#F0E6AD', borderRadius: 18, paddingVertical: 12, paddingHorizontal: 20, position: 'relative', minWidth: 120 },
  customerChatText: { fontSize: 16, fontWeight: 'bold', color: '#2E5A36' },
  bubbleLeftTailTriangle: { position: 'absolute', left: -8, top: 14, width: 0, height: 0, borderTopWidth: 6, borderTopColor: 'transparent', borderRightWidth: 10, borderRightColor: '#F0E6AD', borderBottomWidth: 6, borderBottomColor: 'transparent' },

  // 👤 สไตล์ฝั่งไรเดอร์โต้ตอบขวาริมหน้าจอ
  riderMessageRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 20 },
  riderBubbleCard: { backgroundColor: '#E2E8F0', borderRadius: 18, paddingVertical: 12, paddingHorizontal: 18, maxWidth: '80%' },
  riderChatText: { fontSize: 15, color: '#2D3748', fontWeight: '500' },

  // 📥 กรอบพิมพ์และส่งข้อความล่างสุดตามสไตล์ภาพสเก็ตช์
  bottomInputChatBarRow: { position: 'absolute', bottom: 75, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', zIndex: 30 },
  chatInputTextFiled: { flex: 1, backgroundColor: '#E2E8F0', height: 44, borderRadius: 22, paddingHorizontal: 20, fontSize: 14, color: '#2D3748' },
  sendActionButtonCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', marginLeft: 8 }
});