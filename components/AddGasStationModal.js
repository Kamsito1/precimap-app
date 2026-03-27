import React, { useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { COLORS, apiPost } from '../utils';

export default function AddGasStationModal({ visible, onClose, onSuccess }) {
  const [name,    setName]    = useState('');
  const [address, setAddress] = useState('');
  const [city,    setCity]    = useState('');
  const [lat,     setLat]     = useState('');
  const [lng,     setLng]     = useState('');
  const [loading, setLoading] = useState(false);
  const [locating,setLocating]= useState(false);
  const [error,   setError]   = useState('');

  async function getGPS() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return Alert.alert('Permiso denegado', 'Necesitamos acceso a tu ubicación.');
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLat(loc.coords.latitude.toFixed(6));
      setLng(loc.coords.longitude.toFixed(6));
      // Reverse geocode for address hint
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        if (geo[0]) {
          if (geo[0].street) setAddress(geo[0].street + (geo[0].streetNumber ? ' ' + geo[0].streetNumber : ''));
          if (geo[0].city) setCity(geo[0].city);
        }
      } catch(_) {}
    } catch(_) { Alert.alert('Error', 'No se pudo obtener la ubicación.'); }
    finally { setLocating(false); }
  }

  async function submit() {
    setError('');
    if (!name.trim()) return setError('El nombre es obligatorio');
    if (!lat || !lng) return setError('La ubicación GPS es obligatoria');
    setLoading(true);
    try {
      const res = await apiPost('/api/places', {
        name: name.trim(), category: 'gasolinera',
        lat: parseFloat(lat), lng: parseFloat(lng),
        address: address.trim(), city: city.trim(),
      });
      if (res.error) return setError(res.error);
      setName(''); setAddress(''); setCity(''); setLat(''); setLng(''); setError('');
      onSuccess?.();
    } catch(_) { setError('Error de conexión'); }
    finally { setLoading(false); }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>
        <View style={s.wrap}>
          <View style={s.header}>
            <Text style={s.title}>⛽ Añadir gasolinera</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}><Ionicons name="close" size={20} color={COLORS.text2}/></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
            <View style={s.infoBanner}>
              <Ionicons name="information-circle-outline" size={15} color={COLORS.primary}/>
              <Text style={s.infoTxt}>Añade gasolineras que no aparecen en el mapa. La comunidad verificará la información. +5 puntos al añadir.</Text>
            </View>

            <Text style={s.label}>Nombre *</Text>
            <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Ej: Repsol Córdoba Norte" placeholderTextColor={COLORS.text3}/>

            <TouchableOpacity style={[s.gpsBtn, (lat&&lng) && s.gpsBtnOn]} onPress={getGPS} disabled={locating}>
              {locating
                ? <ActivityIndicator size="small" color={COLORS.primary}/>
                : <Ionicons name={(lat&&lng)?'checkmark-circle':'locate-outline'} size={18} color={(lat&&lng)?COLORS.success:COLORS.primary}/>
              }
              <Text style={[s.gpsTxt,(lat&&lng)&&{color:COLORS.success}]}>
                {(lat&&lng) ? `📍 GPS: ${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}` : 'Obtener ubicación GPS (requerido)'}
              </Text>
            </TouchableOpacity>

            <Text style={s.label}>Dirección</Text>
            <TextInput style={s.input} value={address} onChangeText={setAddress} placeholder="Calle y número" placeholderTextColor={COLORS.text3}/>

            <Text style={s.label}>Ciudad</Text>
            <TextInput style={s.input} value={city} onChangeText={setCity} placeholder="Ej: Córdoba" placeholderTextColor={COLORS.text3}/>

            {error ? <View style={s.errBox}><Text style={s.errTxt}>{error}</Text></View> : null}

            <TouchableOpacity style={[s.submitBtn, loading&&{opacity:0.7}]} onPress={submit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff"/> : <Text style={s.submitTxt}>Añadir gasolinera (+5 pts)</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap:{flex:1,backgroundColor:COLORS.bg2},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:16,borderBottomWidth:0.5,borderBottomColor:COLORS.border},
  title:{fontSize:18,fontWeight:'700',color:COLORS.text},
  closeBtn:{width:32,height:32,borderRadius:16,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'},
  body:{padding:16,paddingBottom:60},
  infoBanner:{flexDirection:'row',gap:8,alignItems:'flex-start',backgroundColor:COLORS.primaryLight,borderRadius:12,padding:12,marginBottom:16},
  infoTxt:{flex:1,fontSize:13,color:COLORS.primary,lineHeight:18},
  label:{fontSize:13,fontWeight:'600',color:COLORS.text,marginBottom:6,marginTop:12},
  input:{backgroundColor:COLORS.bg3,borderRadius:12,borderWidth:1.5,borderColor:COLORS.border,paddingHorizontal:14,paddingVertical:12,fontSize:15,color:COLORS.text},
  gpsBtn:{flexDirection:'row',alignItems:'center',gap:10,backgroundColor:COLORS.primaryLight,borderRadius:12,padding:14,borderWidth:1.5,borderColor:COLORS.primary,marginVertical:12},
  gpsBtnOn:{backgroundColor:COLORS.successLight,borderColor:COLORS.success},
  gpsTxt:{flex:1,fontSize:13,color:COLORS.primary,fontWeight:'500'},
  errBox:{backgroundColor:COLORS.dangerLight,borderRadius:10,padding:12,marginBottom:12},
  errTxt:{color:COLORS.danger,fontSize:13},
  submitBtn:{backgroundColor:COLORS.primary,borderRadius:14,padding:16,alignItems:'center',marginTop:8},
  submitTxt:{color:'#fff',fontWeight:'700',fontSize:16},
});
