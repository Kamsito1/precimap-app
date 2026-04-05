/**
 * CarPlayScreen — Driving mode (in-app fallback when not connected to car)
 * Also serves as preview of what CarPlay shows
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Linking, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, apiGet, distanceKm, openURL } from '../utils';

const FUEL_TYPES = [
  {key:'g95',label:'Gasolina 95',color:'#3B82F6'},
  {key:'diesel',label:'Diésel',color:'#F59E0B'},
  {key:'g98',label:'Gasolina 98',color:'#8B5CF6'},
  {key:'glp',label:'GLP',color:'#10B981'},
];

const SEARCH_TYPES = [
  {key:'gasolina',label:'Gasolinera',icon:'speedometer-outline',color:'#3B82F6',desc:'Más barata cerca'},
  {key:'supermercado',label:'Supermercado',icon:'cart-outline',color:'#16A34A',desc:'Más cercano'},
  {key:'restaurante',label:'Restaurante',icon:'restaurant-outline',color:'#DC2626',desc:'Donde comer'},
  {key:'farmacia',label:'Farmacia',icon:'medkit-outline',color:'#7C3AED',desc:'Más cercana'},
];

export default function CarPlayScreen() {
  const [step, setStep] = useState(0);
  const [searchType, setSearchType] = useState(null);
  const [result, setResult] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userLoc, setUserLoc] = useState(null);
  const [locStatus, setLocStatus] = useState('checking');

  useEffect(() => { getLocation(); }, []);

  async function getLocation() {
    try {
      const Location = require('expo-location');
      const {status} = await Location.requestForegroundPermissionsAsync();
      if (status==='granted') {
        const loc = await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});
        if (loc?.coords) { setUserLoc({lat:loc.coords.latitude,lng:loc.coords.longitude}); setLocStatus('ok'); }
        else setLocStatus('error');
      } else setLocStatus('denied');
    } catch(_) { setLocStatus('error'); }
  }

  function navigateTo(lat, lng, name) {
    if (!lat||!lng) return;
    const url = Platform.OS==='ios'
      ? `maps://maps.apple.com/?daddr=${lat},${lng}&q=${encodeURIComponent(name||'')}`
      : `geo:${lat},${lng}?q=${encodeURIComponent(name||'')}`;
    Linking.openURL(url).catch(()=>openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`));
  }

  async function searchNearest(type, fuel) {
    setLoading(true); setResults([]);
    try {
      if (!userLoc) { setLoading(false); return; }
      if (type==='gasolina') {
        const data = await apiGet(`/api/gasolineras?lat=${userLoc.lat}&lng=${userLoc.lng}&radius=15`) || [];
        const filtered = fuel ? data.filter(s=>s.prices?.[fuel]>0) : data;
        const sorted = filtered.map(s=>({...s,_dist:distanceKm(userLoc.lat,userLoc.lng,s.lat,s.lng),
          _price:fuel?s.prices[fuel]:(s.prices?.g95||s.prices?.diesel||999)})).sort((a,b)=>a._price-b._price);
        setResults(sorted.slice(0,5));
      } else {
        const data = await apiGet(`/api/places?cat=${type}&lat=${userLoc.lat}&lng=${userLoc.lng}&radius=10&sort=price_proximity&limit=5`) || [];
        setResults(data.map(d=>({...d,_dist:distanceKm(userLoc.lat,userLoc.lng,d.lat,d.lng)})));
      }
    } catch(_) {} finally { setLoading(false); setStep(2); }
  }

  // ── STEP 0: Main menu ──
  if (step===0) {
    return (
      <SafeAreaView style={s.safe} edges={['top','bottom']}>
        <View style={s.topBar}>
          <Ionicons name="car-outline" size={22} color={COLORS.primary}/>
          <Text style={s.topTitle}>Modo conducción</Text>
        </View>
        <View style={s.locBar}>
          <Ionicons name={locStatus==='ok'?'checkmark-circle':'alert-circle-outline'} size={14}
            color={locStatus==='ok'?COLORS.success:COLORS.warning}/>
          <Text style={s.locTxt}>{locStatus==='ok'?'Ubicación activada':locStatus==='denied'?'Activa la ubicación en Ajustes':'Obteniendo ubicación...'}</Text>
        </View>
        <Text style={s.question}>¿Qué necesitas?</Text>
        <View style={s.grid}>
          {SEARCH_TYPES.map(t=>(
            <TouchableOpacity key={t.key} style={s.bigBtn} activeOpacity={0.7}
              onPress={()=>{setSearchType(t.key);t.key==='gasolina'?setStep(1):searchNearest(t.key,null);}}>
              <View style={[s.bigIcon,{backgroundColor:t.color+'22'}]}>
                <Ionicons name={t.icon} size={36} color={t.color}/>
              </View>
              <Text style={s.bigLabel}>{t.label}</Text>
              <Text style={s.bigDesc}>{t.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  // ── STEP 1: Fuel picker ──
  if (step===1) {
    return (
      <SafeAreaView style={s.safe} edges={['top','bottom']}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={()=>setStep(0)} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.primary}/>
          </TouchableOpacity>
          <Text style={s.topTitle}>Elige carburante</Text>
        </View>
        <View style={{flex:1,justifyContent:'center',padding:20,gap:14}}>
          {FUEL_TYPES.map(f=>(
            <TouchableOpacity key={f.key} style={[s.fuelBtn,{borderColor:f.color}]} activeOpacity={0.7}
              onPress={()=>searchNearest('gasolina',f.key)}>
              <View style={[s.fuelDot,{backgroundColor:f.color}]}/>
              <Text style={s.fuelLabel}>{f.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.text3}/>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  // ── STEP 2: Results ──
  return (
    <SafeAreaView style={s.safe} edges={['top','bottom']}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={()=>setStep(0)} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.primary}/>
        </TouchableOpacity>
        <Text style={s.topTitle}>Resultados</Text>
      </View>
      {loading ? (
        <View style={{flex:1,alignItems:'center',justifyContent:'center',gap:12}}>
          <ActivityIndicator size="large" color={COLORS.primary}/>
          <Text style={{fontSize:16,color:COLORS.text2}}>Buscando cerca de ti...</Text>
        </View>
      ) : results.length===0 ? (
        <View style={{flex:1,alignItems:'center',justifyContent:'center',gap:12}}>
          <Ionicons name="search-outline" size={40} color={COLORS.text3}/>
          <Text style={{fontSize:16,fontWeight:'700',color:COLORS.text}}>Sin resultados cerca</Text>
          <TouchableOpacity style={s.retryBtn} onPress={()=>setStep(0)}>
            <Text style={{color:'#fff',fontWeight:'700',fontSize:15}}>Volver</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{padding:16,gap:12}}>
          {results.map((r,i)=>{
            const name = r.name&&r.name===r.name.toUpperCase()?r.name.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()):r.name||'Sin nombre';
            const dist = r._dist?(r._dist<1?`${Math.round(r._dist*1000)}m`:`${r._dist.toFixed(1)}km`):'';
            const price = r._price?`${r._price.toFixed(3)}€/L`:(r.repPrice?`${r.repPrice.toFixed(2)}€`:'');
            return (
              <TouchableOpacity key={r.id||i} style={s.resultCard} activeOpacity={0.7}
                onPress={()=>navigateTo(r.lat,r.lng,name)}>
                <View style={[s.resultPos,{backgroundColor:i===0?COLORS.primary+'22':COLORS.bg3}]}>
                  <Text style={[s.resultNum,{color:i===0?COLORS.primary:COLORS.text3}]}>{i+1}</Text>
                </View>
                <View style={{flex:1}}>
                  <Text style={s.resultName} numberOfLines={1}>{name}</Text>
                  <Text style={s.resultDist}>{dist}{r.city?` · ${r.city}`:''}</Text>
                </View>
                {price?<Text style={s.resultPrice}>{price}</Text>:null}
                <Ionicons name="navigate" size={22} color={COLORS.primary}/>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:COLORS.bg},
  topBar:{flexDirection:'row',alignItems:'center',gap:10,padding:16,backgroundColor:COLORS.bg2,borderBottomWidth:0.5,borderBottomColor:COLORS.border},
  topTitle:{fontSize:18,fontWeight:'800',color:COLORS.text},
  backBtn:{width:36,height:36,borderRadius:18,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'},
  locBar:{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:16,paddingVertical:8,backgroundColor:COLORS.bg2},
  locTxt:{fontSize:12,color:COLORS.text3},
  question:{fontSize:22,fontWeight:'800',color:COLORS.text,textAlign:'center',marginTop:24,marginBottom:16},
  grid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:14,paddingHorizontal:16},
  bigBtn:{width:'45%',backgroundColor:COLORS.bg2,borderRadius:18,padding:16,alignItems:'center',borderWidth:1,borderColor:COLORS.border,
    shadowColor:'#000',shadowOpacity:0.06,shadowRadius:8,elevation:3},
  bigIcon:{width:64,height:64,borderRadius:16,alignItems:'center',justifyContent:'center',marginBottom:8},
  bigLabel:{fontSize:15,fontWeight:'700',color:COLORS.text},
  bigDesc:{fontSize:11,color:COLORS.text3,marginTop:2,textAlign:'center'},
  fuelBtn:{flexDirection:'row',alignItems:'center',gap:14,backgroundColor:COLORS.bg2,borderRadius:16,padding:18,borderWidth:2},
  fuelDot:{width:16,height:16,borderRadius:8},
  fuelLabel:{flex:1,fontSize:18,fontWeight:'700',color:COLORS.text},
  retryBtn:{backgroundColor:COLORS.primary,borderRadius:14,paddingHorizontal:24,paddingVertical:12,marginTop:8},
  resultCard:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:COLORS.bg2,borderRadius:16,padding:14,borderWidth:0.5,borderColor:COLORS.border},
  resultPos:{width:32,height:32,borderRadius:16,alignItems:'center',justifyContent:'center'},
  resultNum:{fontSize:14,fontWeight:'800'},
  resultName:{fontSize:15,fontWeight:'700',color:COLORS.text},
  resultDist:{fontSize:12,color:COLORS.text3,marginTop:1},
  resultPrice:{fontSize:16,fontWeight:'800',color:COLORS.primary,marginRight:4},
});
