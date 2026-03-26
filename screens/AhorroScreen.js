import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, apiGet } from '../utils';
import BanksScreen from './BanksScreen';
import SupermarketsScreen from './SupermarketsScreen';

const SUBTABS = [
  { key: 'super',  label: '🛒 Supermercados' },
  { key: 'bancos', label: '🏦 Bancos' },
];

const FALLBACK_TIPS = [
  '💡 Aldi es un 22% más barato que Mercadona en media',
  '💡 Trade Republic da 3.62% TAE en cuenta remunerada',
  '💡 Con Revolut ahorras comisiones en divisas',
  '💡 Comprar en Lidl ahorra ~35€/mes en una familia',
  '💡 El depósito de Bankinter da 3.75% TAE garantizado',
];

export default function AhorroScreen() {
  const [sub, setSub] = useState('super');
  const [visited, setVisited] = useState({ super: true, bancos: false });
  const [tips, setTips] = useState(FALLBACK_TIPS);
  const [tipIdx, setTipIdx] = useState(Math.floor(Math.random() * FALLBACK_TIPS.length));

  // Load tips from server
  useEffect(() => {
    apiGet('/api/tips').then(t => {
      if (Array.isArray(t) && t.length > 0) {
        const mapped = t.map(item => `${item.emoji} ${item.title} — ${item.saves}`);
        setTips(mapped);
        setTipIdx(Math.floor(Math.random() * mapped.length));
      }
    }).catch(() => {});
  }, []);

  // Rotate tip every 8 seconds
  useEffect(() => {
    const id = setInterval(() => setTipIdx(i => (i + 1) % tips.length), 8000);
    return () => clearInterval(id);
  }, [tips]);

  const switchTab = useCallback((key) => {
    setSub(key);
    setVisited(v => ({ ...v, [key]: true }));
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: COLORS.bg2, borderBottomWidth: 0.5, borderBottomColor: COLORS.border }}>
        {/* Rotating tip bar — fed from /api/tips */}
        <View style={{ backgroundColor: COLORS.primaryLight, paddingHorizontal: 14, paddingVertical: 7 }}>
          <Text style={{ fontSize: 12, color: COLORS.primaryDark, fontWeight: '500' }} numberOfLines={1}>
            {tips[tipIdx]}
          </Text>
        </View>
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

      {visited.super && (
        <View style={{ flex: 1, display: sub === 'super' ? 'flex' : 'none' }}>
          <SupermarketsScreen embedded />
        </View>
      )}
      {visited.bancos && (
        <View style={{ flex: 1, display: sub === 'bancos' ? 'flex' : 'none' }}>
          <BanksScreen embedded />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  subTabRow:   { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  subTab:      { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: COLORS.bg3, borderWidth: 1.5, borderColor: COLORS.border },
  subTabOn:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  subTabTxt:   { fontSize: 13, fontWeight: '600', color: COLORS.text2 },
  subTabTxtOn: { color: '#fff', fontWeight: '700' },
});
