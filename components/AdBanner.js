import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, openURL } from '../utils';

// ─── CONFIGURACIÓN ADMOB ──────────────────────────────────────────────────────
const ADMOB_CONFIGURED = false; // ← Cambia a true + rebuild cuando AdMob esté aprobado
const ADMOB_IOS_BANNER_ID = 'ca-app-pub-4854549477350471/8971947621';

// ─── BANNERS PROPIOS (referidos) ─────────────────────────────────────────────
const OWN_ADS = [
  { id:'trade_republic', text:'📈 Trade Republic: 4% anual + acción gratis', cta:'Ver', url:'https://refnocode.trade.re/0kbf1xcq', bg:'#0ADB83' },
  { id:'myinvestor', text:'🟣 MyInvestor: 4.50% TAE · Código UNHO5', cta:'Ver', url:'https://newapp.myinvestor.es/do/signup?promotionalCode=UNHO5', bg:'#6D28D9' },
  { id:'bbva', text:'🏦 BBVA: sin comisiones + hasta 300€ bono', cta:'Ver', url:'https://www.bbva.es/personas/productos/cuentas/cuenta-online.html', bg:'#004B9E' },
  { id:'revolut', text:'💳 Revolut: 0 comisiones en divisas', cta:'Ver', url:'https://revolut.com/referral/?referral-code=juananmpu9&geo-redirect', bg:'#191C1F' },
  { id:'igraal', text:'💰 iGraal: cashback en 2000+ tiendas', cta:'Ver', url:'https://es.igraal.com/padrinazgo?padrino=vpbWSouX', bg:'#F59E0B' },
  { id:'attapoll', text:'📊 Attapoll: gana 3-8€/mes con encuestas', cta:'Ver', url:'https://attapoll.app/join/qarui', bg:'#7C3AED' },
  { id:'weward', text:'🚶 WeWard: gana dinero caminando', cta:'Ver', url:'https://wewardapp.go.link/8ifvH?adj_label=DevotoArana4251', bg:'#0EA5E9' },
];

// Tiempos configurables (en ms)
const SHOW_DELAY    = 3000;    // aparece 3s después de montar la pantalla
const AUTO_HIDE     = 20000;   // se oculta SOLO después de 20s (auto-dismiss)
const COOLDOWN      = 10 * 60 * 1000; // 10 min entre apariciones tras cerrar con X
const ROTATE_EVERY  = 30000;   // cambia de anuncio cada 30s

/**
 * AdBanner — Banner NO intrusivo
 * 
 * Comportamiento (Apple-compliant):
 * 1. Aparece con delay de 3s al entrar en la pantalla
 * 2. Se auto-oculta solo tras 20s (el usuario no tiene que hacer nada)
 * 3. El usuario puede cerrarlo antes con la X
 * 4. Si cierra con X → cooldown de 10 min antes de volver a aparecer
 * 5. NO es popup, NO bloquea, NO tapa contenido, NO reaparece agresivamente
 * 6. Posición: al fondo de la pantalla, ANTES del tab bar (no encima)
 */
export default function AdBanner({ screen = 'unknown', style }) {
  const [phase, setPhase] = useState('waiting'); // waiting | showing | hidden | cooldown
  const [adIdx, setAdIdx] = useState(() => Math.floor(Math.random() * OWN_ADS.length));
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timersRef = useRef({ show: null, hide: null, cooldown: null, rotate: null });

  const clearAllTimers = useCallback(() => {
    Object.values(timersRef.current).forEach(t => clearTimeout(t));
  }, []);

  // Phase 1: Wait SHOW_DELAY, then fade in
  useEffect(() => {
    timersRef.current.show = setTimeout(() => {
      setPhase('showing');
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      // Phase 2: Auto-hide after AUTO_HIDE ms
      timersRef.current.hide = setTimeout(() => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true })
          .start(() => setPhase('hidden'));
      }, AUTO_HIDE);
    }, SHOW_DELAY);
    return clearAllTimers;
  }, []);

  // Rotate ads while showing
  useEffect(() => {
    if (phase !== 'showing' || ADMOB_CONFIGURED) return;
    timersRef.current.rotate = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
      setAdIdx(i => (i + 1) % OWN_ADS.length);
    }, ROTATE_EVERY);
    return () => clearInterval(timersRef.current.rotate);
  }, [phase]);

  // User presses X → fade out, enter cooldown
  function dismiss() {
    clearTimeout(timersRef.current.hide);
    Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true })
      .start(() => {
        setPhase('cooldown');
        // After COOLDOWN, allow showing again (but don't force it)
        timersRef.current.cooldown = setTimeout(() => {
          setPhase('waiting');
          // Show again gently after cooldown
          timersRef.current.show = setTimeout(() => {
            setPhase('showing');
            setAdIdx(i => (i + 1) % OWN_ADS.length);
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
            timersRef.current.hide = setTimeout(() => {
              Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true })
                .start(() => setPhase('hidden'));
            }, AUTO_HIDE);
          }, SHOW_DELAY);
        }, COOLDOWN);
      });
  }

  // Don't render anything if not showing
  if (phase !== 'showing') return null;
  const ad = OWN_ADS[adIdx % OWN_ADS.length];
  if (!ad) return null;

  return (
    <Animated.View style={[s.wrap, { backgroundColor: ad.bg, opacity: fadeAnim }, style]}>
      <TouchableOpacity style={s.content} onPress={() => openURL(ad.url)} activeOpacity={0.85}>
        <Text style={s.text} numberOfLines={1}>{ad.text}</Text>
        <View style={s.ctaBtn}>
          <Text style={s.ctaTxt}>{ad.cta}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={s.xBtn} onPress={dismiss} hitSlop={{top:14,bottom:14,left:14,right:14}}>
        <Ionicons name="close" size={14} color="rgba(255,255,255,0.8)"/>
      </TouchableOpacity>
      <Text style={s.label}>Anuncio</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection:'row', alignItems:'center',
    borderRadius:12, marginHorizontal:12, marginBottom:8, marginTop:4,
    paddingLeft:12, paddingRight:4, paddingVertical:10,
    shadowColor:'#000', shadowOpacity:0.1, shadowRadius:4,
    shadowOffset:{width:0,height:1}, elevation:2,
  },
  content: { flex:1, flexDirection:'row', alignItems:'center', gap:8 },
  text: { flex:1, fontSize:12, fontWeight:'600', color:'#fff', lineHeight:16 },
  ctaBtn: { backgroundColor:'rgba(255,255,255,0.25)', borderRadius:8, paddingHorizontal:10, paddingVertical:5 },
  ctaTxt: { fontSize:11, fontWeight:'700', color:'#fff' },
  xBtn: { padding:8 },
  label: { position:'absolute', top:2, right:8, fontSize:7, color:'rgba(255,255,255,0.35)', fontWeight:'600' },
});
