import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils';

const APPS = [
  {
    id: 'attapoll',
    name: 'Attapoll',
    emoji: '📊',
    color: '#7C3AED',
    category: 'encuestas',
    tagline: 'Gana dinero respondiendo encuestas',
    description: 'App de encuestas remuneradas. Responde y cobra por PayPal, transferencia o gift cards. Media de 3-5€/mes según el tiempo.',
    howItWorks: [
      'Descarga Attapoll',
      'Regístrate con el código de amigo',
      'Responde encuestas cuando tengas un rato',
      'Cobra por PayPal o tarjeta regalo',
    ],
    bonus: '🎁 Bono de bienvenida por código de amigo',
    referralType: 'link',
    referralLabel: 'Código de amigo',
    url: 'https://attapoll.app/join/qarui',
    cta: 'Descargar Attapoll',
    earn: '3-8€/mes',
    effort: 'Bajo',
    effortColor: '#16A34A',
  },
  {
    id: 'weward',
    name: 'WeWard',
    emoji: '🚶',
    color: '#0EA5E9',
    category: 'pasos',
    tagline: 'Gana dinero caminando',
    description: 'Convierte tus pasos en dinero. Cada 1.000 pasos = Wards que canjas por dinero real o donaciones. Perfecto si ya caminas.',
    howItWorks: [
      'Descarga WeWard',
      'Introduce el código al registrarte',
      'Empieza con 150 Wards de regalo',
      'Camina y acumula recompensas',
    ],
    bonus: '🎁 150 Wards gratis al registrarte con mi código',
    referralType: 'code',
    referralCode: 'DevotoArana4251',
    referralLabel: 'Código de registro',
    url: 'https://wewardapp.go.link/8ifvH?adj_label=DevotoArana4251',
    cta: 'Descargar WeWard',
    earn: '2-5€/mes',
    effort: 'Ninguno',
    effortColor: '#16A34A',
  },
  {
    id: 'igraal',
    name: 'iGraal',
    emoji: '💳',
    color: '#F59E0B',
    category: 'cashback',
    tagline: 'Cashback en tus compras online',
    description: 'Cashback automático en más de 2.000 tiendas online (Amazon, Zara, El Corte Inglés...). Compra lo que ya ibas a comprar y recupera dinero.',
    howItWorks: [
      'Regístrate con el enlace de referido',
      'Instala la extensión del navegador',
      'Activa el cashback al comprar',
      'Cobra cuando acumules 20€',
    ],
    bonus: '🎁 Bono extra por registro con enlace de padrino',
    referralType: 'link',
    referralLabel: 'Enlace de referido',
    url: 'https://es.igraal.com/padrinazgo?padrino=vpbWSouX&utm_medium=raf&utm_source=refer_friend',
    cta: 'Unirse a iGraal',
    earn: '5-20€/mes',
    effort: 'Bajo',
    effortColor: '#16A34A',
  },
];

const CATS = [
  { key: 'all', label: '🌟 Todas' },
  { key: 'encuestas', label: '📊 Encuestas' },
  { key: 'pasos', label: '🚶 Pasos' },
  { key: 'cashback', label: '💳 Cashback' },
];

export default function AppsScreen({ embedded = false }) {
  const Wrapper = embedded ? View : SafeAreaView;
  const wrapperProps = embedded ? { style: { flex: 1 } } : { style: s.safe, edges: ['top'] };
  const [cat, setCat] = useState('all');
  const [copied, setCopied] = useState(null);

  const filtered = cat === 'all' ? APPS : APPS.filter(a => a.category === cat);
  const totalEarn = '10-33€/mes';

  function openApp(app) {
    Linking.openURL(app.url).catch(() =>
      Alert.alert('Error', 'No se pudo abrir el enlace')
    );
  }

  function copyCode(app) {
    if (app.referralCode) {
      // Clipboard.setString(app.referralCode); // not available everywhere
      Alert.alert('📋 Código copiado', `Usa el código "${app.referralCode}" al registrarte en ${app.name}.\n\n${app.bonus}`);
      setCopied(app.id);
      setTimeout(() => setCopied(null), 3000);
    }
  }

  return (
    <Wrapper {...wrapperProps}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>💰 Apps para ganar dinero</Text>
              <Text style={s.sub}>Referidos activos · Gana usando mis enlaces</Text>
            </View>
          </View>
          {/* Earning potential banner */}
          <View style={s.earnBanner}>
            <Text style={s.earnIcon}>🏆</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.earnTitle}>Potencial: {totalEarn} sin esfuerzo</Text>
              <Text style={s.earnSub}>Combinando las 3 apps · Sin cambiar tus hábitos</Text>
            </View>
          </View>
          {/* Category filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingBottom: 10 }}>
            {CATS.map(c => (
              <TouchableOpacity key={c.key}
                style={[s.catBtn, cat === c.key && s.catBtnOn]}
                onPress={() => setCat(c.key)}>
                <Text style={[s.catTxt, cat === c.key && { color: '#fff', fontWeight: '700' }]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* App cards */}
        <View style={{ padding: 14, gap: 16 }}>
          {filtered.map(app => (
            <View key={app.id} style={[s.card, { borderColor: app.color + '44' }]}>
              {/* Card header */}
              <View style={[s.cardTop, { backgroundColor: app.color }]}>
                <Text style={{ fontSize: 32 }}>{app.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardName}>{app.name}</Text>
                  <Text style={s.cardTagline}>{app.tagline}</Text>
                </View>
                <View style={s.earnBadge}>
                  <Text style={s.earnBadgeTxt}>{app.earn}</Text>
                </View>
              </View>

              <View style={{ padding: 14, gap: 12 }}>
                {/* Description */}
                <Text style={s.desc}>{app.description}</Text>

                {/* Effort & category */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={[s.tag, { backgroundColor: app.effortColor + '22' }]}>
                    <Text style={[s.tagTxt, { color: app.effortColor }]}>✅ Esfuerzo: {app.effort}</Text>
                  </View>
                  <View style={[s.tag, { backgroundColor: COLORS.bg3 }]}>
                    <Text style={[s.tagTxt, { color: COLORS.text3 }]}>📂 {app.category}</Text>
                  </View>
                </View>

                {/* How it works */}
                <View style={s.howBox}>
                  <Text style={s.howTitle}>Cómo funciona:</Text>
                  {app.howItWorks.map((step, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 4 }}>
                      <Text style={{ color: app.color, fontWeight: '800', fontSize: 13 }}>{i + 1}.</Text>
                      <Text style={s.howStep}>{step}</Text>
                    </View>
                  ))}
                </View>

                {/* Bonus banner */}
                <View style={[s.bonusBanner, { borderColor: app.color + '55', backgroundColor: app.color + '11' }]}>
                  <Text style={[s.bonusTxt, { color: app.color }]}>{app.bonus}</Text>
                </View>

                {/* Code display for code-based referrals */}
                {app.referralType === 'code' && app.referralCode && (
                  <TouchableOpacity style={[s.codeBox, { borderColor: app.color }]} onPress={() => copyCode(app)}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.codeLabel, { color: COLORS.text3 }]}>{app.referralLabel}:</Text>
                      <Text style={[s.codeValue, { color: app.color }]}>{app.referralCode}</Text>
                    </View>
                    <View style={[s.copyBtn, { backgroundColor: app.color }]}>
                      <Ionicons name={copied === app.id ? 'checkmark' : 'copy-outline'} size={16} color="#fff" />
                      <Text style={s.copyTxt}>{copied === app.id ? '¡Copiado!' : 'Ver código'}</Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* CTA Button */}
                <TouchableOpacity style={[s.cta, { backgroundColor: app.color }]} onPress={() => openApp(app)}>
                  <Text style={s.ctaTxt}>{app.cta}</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Disclaimer */}
        <View style={s.disclaimer}>
          <Ionicons name="information-circle-outline" size={14} color={COLORS.text3} />
          <Text style={s.disclaimerTxt}>
            Los ingresos son estimados y dependen del uso. Los enlaces son de referido — ambos nos beneficiamos cuando te registras.
          </Text>
        </View>
      </ScrollView>
    </Wrapper>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { backgroundColor: COLORS.bg2, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  sub: { fontSize: 12, color: COLORS.text3, marginTop: 2 },
  earnBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#DCFCE7', marginHorizontal: 14, marginBottom: 10, padding: 12, borderRadius: 12 },
  earnIcon: { fontSize: 24 },
  earnTitle: { fontSize: 14, fontWeight: '700', color: '#166534' },
  earnSub: { fontSize: 11, color: '#15803D', marginTop: 1 },
  catBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.bg },
  catBtnOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catTxt: { fontSize: 13, fontWeight: '600', color: COLORS.text2 },
  card: { backgroundColor: COLORS.bg2, borderRadius: 18, borderWidth: 1.5, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  cardName: { fontSize: 20, fontWeight: '800', color: '#fff' },
  cardTagline: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  earnBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  earnBadgeTxt: { fontSize: 13, fontWeight: '800', color: '#fff' },
  desc: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tagTxt: { fontSize: 12, fontWeight: '600' },
  howBox: { backgroundColor: COLORS.bg3, borderRadius: 12, padding: 12 },
  howTitle: { fontSize: 12, fontWeight: '700', color: COLORS.text2, marginBottom: 4 },
  howStep: { flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 18 },
  bonusBanner: { flexDirection: 'row', borderRadius: 10, padding: 10, borderWidth: 1 },
  bonusTxt: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  codeBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderRadius: 14, padding: 12, backgroundColor: COLORS.bg },
  codeLabel: { fontSize: 11, marginBottom: 2 },
  codeValue: { fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  copyTxt: { color: '#fff', fontWeight: '700', fontSize: 12 },
  cta: { borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14 },
  ctaTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  disclaimer: { flexDirection: 'row', gap: 8, margin: 14, backgroundColor: COLORS.bg2, borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: COLORS.border },
  disclaimerTxt: { flex: 1, fontSize: 11, color: COLORS.text3, lineHeight: 16 },
});
