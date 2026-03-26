import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, apiGet, openURL } from '../utils';
import BanksScreen from './BanksScreen';
import SupermarketsScreen from './SupermarketsScreen';
import FlightSearchScreen from './FlightSearchScreen';
import AppsScreen from './AppsScreen';

const SUBTABS = [
  { key: 'super',    label: '🛒 Supermercados' },
  { key: 'gimnasio', label: '💪 Gimnasios' },
  { key: 'vuelos',   label: '✈️ Vuelos' },
  { key: 'bancos',   label: '🏦 Bancos' },
  { key: 'apps',     label: '💰 Apps' },
];

const FALLBACK_TIPS = [
  '💡 Aldi es un 22% más barato que Mercadona en media',
  '💡 Trade Republic da un 4% TAE sin condiciones',
  '💡 Con Revolut ahorras comisiones en divisas',
  '💡 Comprar en Lidl ahorra ~35€/mes en una familia',
  '💡 Tarifa nocturna de luz: ahorra un 30%',
  '💡 Vuelos baratos: búscalos en martes o miércoles',
];

export default function AhorroScreen() {
  const [sub, setSub] = useState('super');
  const [visited, setVisited] = useState({ super: true, vuelos: false, bancos: false, apps: false, gimnasio: false });
  const [tips, setTips] = useState(FALLBACK_TIPS);
  const [tipIdx, setTipIdx] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let cancelled = false;
    apiGet('/api/tips').then(t => {
      if (cancelled) return;
      if (Array.isArray(t) && t.length > 0) {
        const mapped = t.map(item => `${item.emoji || '💡'} ${item.title} — ${item.saves}`);
        setTips(mapped);
        setTipIdx(0);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!tips || tips.length === 0) return;
    const id = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
      setTipIdx(i => (i + 1) % tips.length);
    }, 6000);
    return () => clearInterval(id);
  }, [tips, fadeAnim]);

  const switchTab = useCallback((key) => {
    setSub(key);
    setVisited(v => ({ ...v, [key]: true }));
  }, []);

  const currentTip = (tips && tips.length > 0) ? (tips[tipIdx] || tips[0]) : '💡 Ahorra con PreciMap';

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Header fijo */}
      <SafeAreaView edges={['top']} style={s.header}>
        <Animated.View style={[s.tipBar, { opacity: fadeAnim }]}>
          <Text style={s.tipTxt} numberOfLines={1}>{currentTip}</Text>
        </Animated.View>
        <View style={s.subTabRow}>
          {SUBTABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[s.subTab, sub === t.key && s.subTabOn]}
              onPress={() => switchTab(t.key)}>
              <Text style={[s.subTabTxt, sub === t.key && s.subTabTxtOn]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      {/* Contenido con keep-alive para no recargar al cambiar tab */}
      <View style={{ flex: 1 }}>
        {visited.super && (
          <View style={{ flex: 1, display: sub === 'super' ? 'flex' : 'none' }}>
            <SupermarketsScreen embedded />
          </View>
        )}
        {visited.vuelos && (
          <View style={{ flex: 1, display: sub === 'vuelos' ? 'flex' : 'none' }}>
            <FlightSearchScreen embedded />
          </View>
        )}
        {visited.bancos && (
          <View style={{ flex: 1, display: sub === 'bancos' ? 'flex' : 'none' }}>
            <BanksScreen embedded />
          </View>
        )}
        {visited.apps && (
          <View style={{ flex: 1, display: sub === 'apps' ? 'flex' : 'none' }}>
            <AppsScreen embedded />
          </View>
        )}
        {visited.gimnasio && (
          <View style={{ flex: 1, display: sub === 'gimnasio' ? 'flex' : 'none' }}>
            <GymScreen />
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header:      { backgroundColor: COLORS.bg2, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  tipBar:      { backgroundColor: COLORS.primaryLight, paddingHorizontal: 14, paddingVertical: 8 },
  tipTxt:      { fontSize: 12, color: COLORS.primaryDark, fontWeight: '600' },
  subTabRow:   { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  subTab:      { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: COLORS.bg3, borderWidth: 1.5, borderColor: COLORS.border },
  subTabOn:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  subTabTxt:   { fontSize: 13, fontWeight: '600', color: COLORS.text2 },
  subTabTxtOn: { color: '#fff', fontWeight: '700' },
});

// ─── GymScreen embebido ────────────────────────────────────────────────────────
const GYM_REF = 30; // media España cuota mensual ~30€
const CITIES_GYM = ['Toda España','Madrid','Barcelona','Sevilla','Valencia','Bilbao','Zaragoza','Málaga','Córdoba'];

function GymScreen() {
  const [gyms, setGyms]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity]       = useState('');
  const [sort, setSort]       = useState('price');

  useEffect(() => { load(); }, [city]);

  async function load() {
    setLoading(true);
    try {
      let url = `/api/places?cat=gimnasio&sort=${sort}`;
      if (city) url += `&city=${encodeURIComponent(city)}`;
      const data = await apiGet(url);
      setGyms(Array.isArray(data) ? data : []);
    } catch {} finally { setLoading(false); }
  }

  const badge = (price) => {
    if (!price) return null;
    if (price < GYM_REF * 0.8)  return { label:'🟢 Barato',   bg:'#DCFCE7', color:'#16A34A' };
    if (price > GYM_REF * 1.2)  return { label:'🔴 Caro',     bg:'#FEE2E2', color:'#DC2626' };
    return                              { label:'🟡 Medio',    bg:'#FEF9C3', color:'#CA8A04' };
  };

  return (
    <View style={{ flex:1, backgroundColor: COLORS.bg }}>
      {/* Header info */}
      <View style={{ backgroundColor:'#EDE9FE', margin:12, borderRadius:12, padding:12, flexDirection:'row', gap:10, alignItems:'center' }}>
        <Text style={{ fontSize:24 }}>💪</Text>
        <View style={{ flex:1 }}>
          <Text style={{ fontSize:13, fontWeight:'700', color:'#4C1D95' }}>Gimnasios más baratos de España</Text>
          <Text style={{ fontSize:11, color:'#6D28D9', marginTop:2 }}>Ordenados por cuota mensual · media ~30€/mes</Text>
        </View>
      </View>

      {/* City filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal:12, gap:8, paddingBottom:8 }}>
        {CITIES_GYM.map(c => {
          const active = (c === 'Toda España' ? '' : c) === city;
          return (
            <TouchableOpacity key={c}
              style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:99, borderWidth:1.5,
                borderColor: active ? '#7C3AED' : COLORS.border,
                backgroundColor: active ? '#EDE9FE' : COLORS.bg2 }}
              onPress={() => setCity(c === 'Toda España' ? '' : c)}>
              <Text style={{ fontSize:12, fontWeight:'700', color: active ? '#7C3AED' : COLORS.text2 }}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading
        ? <ActivityIndicator color="#7C3AED" style={{ marginTop:40 }} />
        : gyms.length === 0
          ? <View style={{ alignItems:'center', paddingTop:60, gap:8 }}>
              <Text style={{ fontSize:32 }}>💪</Text>
              <Text style={{ fontSize:15, color:COLORS.text2, fontWeight:'600' }}>Sin gimnasios en {city||'España'}</Text>
            </View>
          : <FlatList
              data={gyms}
              keyExtractor={g => String(g.id)}
              contentContainerStyle={{ padding:12, gap:10, paddingBottom:100 }}
              renderItem={({ item: g, index }) => {
                const b = badge(g.repPrice);
                return (
                  <View style={{ backgroundColor:COLORS.bg2, borderRadius:14, padding:14, borderWidth:1, borderColor:COLORS.border, flexDirection:'row', alignItems:'center', gap:12 }}>
                    <View style={{ width:40, height:40, borderRadius:10, backgroundColor:'#EDE9FE', alignItems:'center', justifyContent:'center' }}>
                      <Text style={{ fontSize:22 }}>💪</Text>
                    </View>
                    <View style={{ flex:1 }}>
                      <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:3 }}>
                        <Text style={{ fontSize:11, fontWeight:'700', color:COLORS.text3 }}>#{index+1}</Text>
                        {b && <View style={{ backgroundColor:b.bg, borderRadius:6, paddingHorizontal:6, paddingVertical:1 }}>
                          <Text style={{ fontSize:10, fontWeight:'700', color:b.color }}>{b.label}</Text>
                        </View>}
                      </View>
                      <Text style={{ fontSize:15, fontWeight:'700', color:COLORS.text }} numberOfLines={1}>{g.name}</Text>
                      <Text style={{ fontSize:11, color:COLORS.text3, marginTop:2 }}>📍 {g.city || 'España'}</Text>
                    </View>
                    <View style={{ alignItems:'flex-end' }}>
                      {g.repPrice
                        ? <><Text style={{ fontSize:20, fontWeight:'800', color:'#7C3AED' }}>{g.repPrice.toFixed(2)}€</Text>
                            <Text style={{ fontSize:10, color:COLORS.text3 }}>/mes</Text></>
                        : <Text style={{ fontSize:12, color:COLORS.text3 }}>Sin precio</Text>}
                    </View>
                  </View>
                );
              }}
            />
      }
    </View>
  );
}
