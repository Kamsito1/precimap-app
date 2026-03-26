import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../utils';
import BanksScreen from './BanksScreen';
import SupermarketsScreen from './SupermarketsScreen';

const SUBTABS = [
  { key: 'super',   label: '🛒 Supermercados' },
  { key: 'bancos',  label: '🏦 Bancos' },
];

export default function AhorroScreen() {
  const [sub, setSub] = useState('super');
  // Track which screens have been visited (lazy mount)
  const [visited, setVisited] = useState({ super: true, bancos: false });

  const switchTab = useCallback((key) => {
    setSub(key);
    setVisited(v => ({ ...v, [key]: true }));
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Sub-tab selector — handles safe area top */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: COLORS.bg2, borderBottomWidth: 0.5, borderBottomColor: COLORS.border }}>
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

      {/* Lazy-mounted screens — only render when first visited */}
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
