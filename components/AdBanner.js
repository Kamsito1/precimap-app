import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, openURL } from '../utils';

// ─── CONFIGURACIÓN ADMOB ──────────────────────────────────────────────────────
// PASO 1: Crea cuenta en https://admob.google.com
// PASO 2: Añade tu app iOS y crea un Ad Unit tipo "Banner"
// PASO 3: Pega tus IDs aquí abajo
// PASO 4: Añade react-native-google-mobile-ads al proyecto (ver instrucciones abajo)
//
// MIENTRAS NO TENGAS ADMOB CONFIGURADO: se muestran banners propios (referidos)
// que ya generan algo de ingreso por comisión de afiliado.
// Cuando AdMob esté listo, los banners nativos de Google reemplazan estos.

const ADMOB_CONFIGURED = false; // ← Cambia a true cuando instales react-native-google-mobile-ads

// Tus IDs de AdMob (YA CONFIGURADOS):
const ADMOB_IOS_APP_ID = 'ca-app-pub-4854549477350471~3682160177';
const ADMOB_IOS_BANNER_ID = 'ca-app-pub-4854549477350471/8971947621';
// const ADMOB_ANDROID_BANNER_ID = ''; // Añadir cuando crees la versión Android

// ─── BANNERS PROPIOS (referidos) — funcionan desde el día 1 ──────────────────
// Mientras configuras AdMob, estos banners muestran tus enlaces de referido
// y generan comisiones por registro/compra
const OWN_ADS = [
  {
    id: 'trade_republic',
    text: '📈 Trade Republic: 4% anual + acción gratis',
    cta: 'Abrir cuenta',
    url: 'https://refnocode.trade.re/0kbf1xcq',
    bg: '#0ADB83',
  },
  {
    id: 'myinvestor',
    text: '🟣 MyInvestor: 4.50% TAE · Código UNHO5',
    cta: 'Ver',
    url: 'https://newapp.myinvestor.es/do/signup?promotionalCode=UNHO5',
    bg: '#6D28D9',
  },
  {
    id: 'bbva',
    text: '🏦 BBVA: sin comisiones + hasta 300€ bono',
    cta: 'Abrir',
    url: 'https://www.bbva.es/personas/productos/cuentas/cuenta-online.html',
    bg: '#004B9E',
  },
  {
    id: 'revolut',
    text: '💳 Revolut: 0 comisiones en divisas · Viaja barato',
    cta: 'Abrir',
    url: 'https://revolut.com/referral/?referral-code=juananmpu9&geo-redirect',
    bg: '#191C1F',
  },
  {
    id: 'igraal',
    text: '💰 iGraal: cashback en Amazon, Zara y 2000+ tiendas',
    cta: 'Unirse',
    url: 'https://es.igraal.com/padrinazgo?padrino=vpbWSouX',
    bg: '#F59E0B',
  },
  {
    id: 'attapoll',
    text: '📊 Attapoll: gana 3-8€/mes con encuestas',
    cta: 'Probar',
    url: 'https://attapoll.app/join/qarui',
    bg: '#7C3AED',
  },
  {
    id: 'weward',
    text: '🚶 WeWard: gana dinero caminando · 150 Wards gratis',
    cta: 'Descargar',
    url: 'https://wewardapp.go.link/8ifvH?adj_label=DevotoArana4251',
    bg: '#0EA5E9',
  },
];

/**
 * AdBanner — Banner publicitario no intrusivo
 * 
 * Dos modos:
 * 1. ADMOB_CONFIGURED=false → muestra banners propios (referidos) con X para cerrar
 * 2. ADMOB_CONFIGURED=true  → muestra banner nativo de Google AdMob
 * 
 * Comportamiento:
 * - Aparece al fondo de pantallas seleccionadas
 * - El usuario puede cerrarlo con la X (se oculta 5 min y vuelve)
 * - No es popup, no bloquea nada, no interrumpe
 * - Se muestra cada ~2s delay para no molestar al abrir pantalla
 * 
 * Props:
 *   screen: string — para analytics futuras
 *   style: object — estilos extra
 */
export default function AdBanner({ screen = 'unknown', style }) {
  const [visible, setVisible] = useState(true);
  const [adIdx, setAdIdx] = useState(() => Math.floor(Math.random() * OWN_ADS.length));
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const hideTimerRef = useRef(null);

  // Fade in after 2s delay
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 500, useNativeDriver: true,
      }).start();
    }, 2000);
    return () => clearTimeout(t);
  }, []);

  // Rotate own ads every 25s
  useEffect(() => {
    if (ADMOB_CONFIGURED) return;
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      setAdIdx(i => (i + 1) % OWN_ADS.length);
    }, 25000);
    return () => clearInterval(interval);
  }, []);

  function dismiss() {
    Animated.timing(fadeAnim, {
      toValue: 0, duration: 300, useNativeDriver: true,
    }).start(() => setVisible(false));
    // Re-show after 5 minutes
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setVisible(true);
      setAdIdx(i => (i + 1) % OWN_ADS.length);
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 400, useNativeDriver: true,
      }).start();
    }, 5 * 60 * 1000);
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearTimeout(hideTimerRef.current);
  }, []);

  if (!visible) return null;

  // ── MODE 1: AdMob nativo (cuando esté configurado) ──
  // TODO: Cuando tengas los IDs de AdMob, descomenta esto:
  // if (ADMOB_CONFIGURED) {
  //   const { BannerAd, BannerAdSize, TestIds } = require('react-native-google-mobile-ads');
  //   const adUnitId = __DEV__
  //     ? TestIds.ADAPTIVE_BANNER
  //     : Platform.select({
  //         ios: ADMOB_IOS_BANNER_ID,
  //         android: ADMOB_ANDROID_BANNER_ID,
  //       });
  //   return (
  //     <View style={[s.admobWrap, style]}>
  //       <BannerAd unitId={adUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
  //         requestOptions={{ requestNonPersonalizedAdsOnly: true }}/>
  //     </View>
  //   );
  // }

  // ── MODE 2: Banners propios (referidos) — funciona desde el día 1 ──
  const ad = OWN_ADS[adIdx % OWN_ADS.length];
  if (!ad) return null;

  return (
    <Animated.View style={[s.container, { backgroundColor: ad.bg, opacity: fadeAnim }, style]}>
      <TouchableOpacity style={s.content} onPress={() => openURL(ad.url)} activeOpacity={0.85}>
        <Text style={s.text} numberOfLines={1}>{ad.text}</Text>
        <View style={s.ctaBtn}>
          <Text style={s.ctaTxt}>{ad.cta}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={s.closeBtn} onPress={dismiss}
        hitSlop={{top:12,bottom:12,left:12,right:12}}>
        <Ionicons name="close" size={13} color="rgba(255,255,255,0.7)"/>
      </TouchableOpacity>
      <Text style={s.adLabel}>Anuncio</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, marginHorizontal: 12, marginBottom: 6,
    paddingLeft: 12, paddingRight: 6, paddingVertical: 9,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  content: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  text: {
    flex: 1, fontSize: 12, fontWeight: '600', color: '#fff',
    lineHeight: 16,
  },
  ctaBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  ctaTxt: {
    fontSize: 11, fontWeight: '700', color: '#fff',
  },
  closeBtn: {
    padding: 6,
  },
  adLabel: {
    position: 'absolute', top: 2, right: 6,
    fontSize: 7, color: 'rgba(255,255,255,0.4)',
    fontWeight: '600', letterSpacing: 0.3,
  },
  admobWrap: {
    alignItems: 'center', marginHorizontal: 12,
    marginBottom: 6, overflow: 'hidden', borderRadius: 8,
  },
});
