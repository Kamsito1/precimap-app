import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, apiGet } from '../utils';
import BanksScreen from './BanksScreen';
import SupermarketsScreen from './SupermarketsScreen';
import FlightSearchScreen from './FlightSearchScreen';

const SUBTABS = [
  { key: 'super',   label: '🛒 Supermercados' },
  { key: 'vuelos',  label: '✈️ Vuelos' },
  { key: 'bancos',  label: '🏦 Bancos' },
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
  const [visited, setVisited] = useState({ super: true, vuelos: false, bancos: false });
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
