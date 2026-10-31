import React from 'react';
import { StyleSheet, View, Text, Linking, Platform } from 'react-native'; // ✨ เพิ่ม Linking
import MapView, { Marker } from 'react-native-maps';

export default function MapScreen({ mapRegion, pinnedHazards }) {

  // ฟังก์ชันเปิด Google Maps
  const openInGoogleMaps = (lat, lng) => {
    // สร้าง URL สำหรับเปิดแผนที่
    const url = Platform.select({
      ios: `maps://app?daddr=${lat},${lng}`,
      android: `google.navigation:q=${lat},${lng}`
    });

    Linking.openURL(url).catch(() => {
      // ถ้าเปิดแอปไม่ได้ ให้ลองเปิดผ่าน Browser
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
    });
  };

  return (
    <View style={styles.container}>
      <MapView style={styles.map} region={mapRegion} showsUserLocation={true}>
        
        {pinnedHazards && pinnedHazards.map((hazard, index) => (
          <Marker
            key={hazard.id || index}
            coordinate={{ latitude: hazard.latitude, longitude: hazard.longitude }}
            title={hazard.title || "จุดอันตราย"}
            pinColor="red"
            // ✨ เพิ่มการกดปุ่มที่ Marker เพื่อเปิด Google Maps
            onCalloutPress={() => openInGoogleMaps(hazard.latitude, hazard.longitude)}
          />
        ))}
      </MapView>

      <View style={styles.floatingInfoBox}>
        <Text style={styles.infoText}>📍 กดที่หมุดเพื่อเปิด Google Maps</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
  floatingInfoBox: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#004A32'
  },
  infoText: { fontWeight: 'bold', color: '#004A32' }
});