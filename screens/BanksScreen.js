import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, openURL } from '../utils';

// ─── BANCOS — Solo admin puede modificar esta lista ─────────────────────────
const BANK_OFFERS = [
  {
    id: 'trade_republic',
    bank: 'Trade Republic',
    logo: '🟢',
    color: '#0ADB83',
    emoji: '📈',
    hot: true,
    category: 'inversion',
    title: '4% anual en efectivo + acciones sin comisión',
    highlight: 'Hasta 4% sobre efectivo sin límite + acción gratis al registrarte',
    conditions: [
      'Abrir cuenta gratis en 10 min',
      'Depósito mínimo: cualquier cantidad',
      '4% anual automático sobre el saldo en efectivo',
      'Acciones y ETFs sin comisión de compraventa',
      'Regulado por BaFin (Alemania)',
    ],
    bonus_label: '🎁 Acción gratis al registrarte',
    url: 'https://refnocode.trade.re/0kbf1xcq',
    is_referral: true,
    referral_note: '⭐ Enlace de referido — los dos ganamos una acción gratis',
    last_checked: 'mar 2025',
    cta: 'Abrir cuenta gratis',
    referral_type: 'link',
  },
  {
    id: 'bbva',
    bank: 'BBVA',
    logo: '🔵',
    color: '#004B9E',
    emoji: '🏦',
    hot: false,
    category: 'cuenta',
    title: 'Cuenta Online BBVA — sin comisiones + hasta 300€ de bienvenida',
    highlight: 'Cuenta sin comisiones con código amigo: hasta 300€ de regalo',
    conditions: [
      'Sin comisiones de mantenimiento ni administración',
      'Tarjeta de débito gratuita',
      'Hasta 300€ de bienvenida con código amigo',
      'Pagos y transferencias inmediatas gratis',
      'App valorada con 4,8/5 en App Store',
    ],
    bonus_label: '💰 Código amigo: 14D400110DACFB',
    url: 'https://www.bbva.es/personas/productos/cuentas/cuenta-online.html',
    is_referral: true,
    referral_note: '💙 Usa el código amigo al registrarte para conseguir el bono de bienvenida',
    referral_code: '14D400110DACFB',
    last_checked: 'mar 2025',
    cta: 'Abrir cuenta BBVA',
    referral_type: 'code',
  },
  {
    id: 'myinvestor',
    bank: 'MyInvestor',
    logo: '🟣',
    color: '#6D28D9',
    emoji: '📊',
    hot: true,
    category: 'inversion',
    title: 'Cuenta remunerada al 4.50% TAE + inversión sin comisión',
    highlight: 'Hasta 4.50% TAE en cuenta remunerada + fondos indexados desde 10€',
    conditions: [
      'Cuenta remunerada al 4.50% TAE sin permanencia',
      'Fondos indexados (Vanguard, iShares) sin comisión de custodia',
      'Planes de pensiones y carteras indexadas',
      'Sin comisiones de mantenimiento',
      'Respaldado por Andbank — regulado por el BdE',
    ],
    bonus_label: '🎁 Código promocional: UNHO5',
    url: 'https://newapp.myinvestor.es/do/signup?promotionalCode=UNHO5',
    is_referral: true,
    referral_note: '🟣 Usa el código promocional UNHO5 al registrarte',
    referral_code: 'UNHO5',
    last_checked: 'mar 2026',
    cta: 'Abrir cuenta MyInvestor',
    referral_type: 'code',
  },
  {
    id: 'revolut',
    bank: 'Revolut',
    logo: '🖤',
    color: '#191C1F',
    emoji: '💳',
    hot: false,
    category: 'cuenta',
    title: 'Revolut — sin comisiones en divisas + hasta 4% en ahorro',
    highlight: 'Ideal para viajes y compras internacionales sin comisión de cambio',
    conditions: [
      'Sin comisiones en pagos en divisa extranjera (hasta 1.000€/mes en plan gratuito)',
      'Cambio de divisa al tipo de mercado real',
      'Hasta 4% anual en cuenta de ahorro (plan premium)',
      'Tarjeta virtual instantánea, tarjeta física disponible',
      'Transferencias internacionales baratas (SWIFT)',
    ],
    bonus_label: '🎁 Enlace de referido',
    url: 'https://revolut.com/referral/?referral-code=juananmpu9&geo-redirect',
    is_referral: true,
    referral_note: '🖤 Regístrate con mi enlace y los dos obtenemos beneficios',
    last_checked: 'mar 2026',
    cta: 'Abrir cuenta Revolut',
    referral_type: 'link',
  },
];

export default function BanksScreen({ embedded = false }) {
  const Wrapper = embedded ? View : SafeAreaView;
  const wrapperProps = embedded ? {style:{flex:1}} : {style:s.safe, edges:['top']};
  const [showCalc, setShowCalc] = useState(false);
  const [calcAmount, setCalcAmount] = useState('10000');
  const [calcMonths, setCalcMonths] = useState('12');
  const [copiedCode, setCopiedCode] = useState(false);

  function copyCode(code) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    Alert.alert('✅ Copiado', `Código "${code}" copiado. Pégalo al registrarte en BBVA.`);
  }

  return (
    <Wrapper {...wrapperProps}>
      <View style={s.header}>
        <View style={s.headerRow}>
          <View style={{flex:1}}>
            <Text style={s.title}>🏦 Bancos y Finanzas</Text>
            <Text style={s.sub}>Las mejores ofertas con referido</Text>
          </View>
          <TouchableOpacity style={s.calcBtn} onPress={() => setShowCalc(true)}>
            <Text style={{fontSize:16}}>🧮</Text>
            <Text style={s.calcBtnTxt}>Calcular ahorro</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{padding:14,gap:14,paddingBottom:100}} showsVerticalScrollIndicator={false}>

        {BANK_OFFERS.map(offer => (
          <View key={offer.id} style={[s.card, offer.hot && {borderColor: offer.color, borderWidth:2}]}>
            {offer.hot && (
              <View style={[s.hotBadge, {backgroundColor: offer.color}]}>
                <Text style={s.hotBadgeTxt}>⭐ RECOMENDADO</Text>
              </View>
            )}
            <View style={s.cardHeader}>
              <Text style={{fontSize:32}}>{offer.logo}</Text>
              <View style={{flex:1}}>
                <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                  <Text style={s.cardBank}>{offer.bank}</Text>
                  <Text style={{fontSize:9,color:COLORS.text3,backgroundColor:COLORS.bg3,borderRadius:4,paddingHorizontal:5,paddingVertical:1}}>
                    ✓ {offer.last_checked}
                  </Text>
                </View>
                <Text style={s.cardTitle}>{offer.title}</Text>
              </View>
            </View>

            <View style={s.highlightRow}>
              <Ionicons name="star" size={13} color="#F59E0B"/>
              <Text style={s.highlightTxt}>{offer.highlight}</Text>
            </View>

            <View style={s.conditionsList}>
              {offer.conditions.map(c => (
                <View key={c} style={s.conditionRow}>
                  <Ionicons name="checkmark-circle" size={14} color={COLORS.success}/>
                  <Text style={s.conditionTxt}>{c}</Text>
                </View>
              ))}
            </View>

            {/* Referral banner */}
            {offer.is_referral && (
              <View style={[s.referralBanner, {borderColor: offer.color+'44', backgroundColor: offer.color+'11'}]}>
                <Ionicons name="gift" size={14} color={offer.color}/>
                <Text style={[s.referralBannerTxt, {color: offer.color}]}>{offer.referral_note}</Text>
              </View>
            )}

            {/* Code copy button for BBVA */}
            {offer.referral_type === 'code' && offer.referral_code && (
              <TouchableOpacity style={[s.codeRow, {borderColor: offer.color}]}
                onPress={() => copyCode(offer.referral_code)}>
                <View style={{flex:1}}>
                  <Text style={{fontSize:11,color:COLORS.text3,marginBottom:2}}>Código amigo:</Text>
                  <Text style={{fontSize:18,fontWeight:'800',color: offer.color, letterSpacing:2}}>{offer.referral_code}</Text>
                </View>
                <View style={[s.copyBtn, {backgroundColor: offer.color}]}>
                  <Ionicons name={copiedCode?'checkmark':'copy-outline'} size={16} color="#fff"/>
                  <Text style={{color:'#fff',fontWeight:'700',fontSize:12}}>{copiedCode?'¡Copiado!':'Copiar'}</Text>
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[s.ctaBtn, {backgroundColor: offer.color}]}
              onPress={() => openURL(offer.url)}>
              <Text style={s.ctaBtnTxt}>{offer.cta}</Text>
              <Ionicons name="arrow-forward" size={15} color="#fff"/>
            </TouchableOpacity>
          </View>
        ))}

        <View style={s.disclaimer}>
          <Ionicons name="information-circle-outline" size={14} color={COLORS.text3}/>
          <Text style={s.disclaimerTxt}>
            Condiciones actualizadas mar 2026. Comprueba siempre las condiciones en la web oficial antes de contratar. Los enlaces y códigos son de referido.
          </Text>
        </View>

      </ScrollView>

      {/* Calculadora */}
      <Modal visible={showCalc} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCalc(false)}>
        <View style={{flex:1, backgroundColor:COLORS.bg2}}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:16,borderBottomWidth:0.5,borderBottomColor:COLORS.border}}>
            <Text style={{fontSize:18,fontWeight:'700',color:COLORS.text}}>🧮 Calculadora de ahorro</Text>
            <TouchableOpacity onPress={() => setShowCalc(false)} style={{width:32,height:32,borderRadius:16,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'}}>
              <Ionicons name="close" size={20} color={COLORS.text2}/>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{padding:20,gap:16}}>
            <View>
              <Text style={{fontSize:13,fontWeight:'600',color:COLORS.text,marginBottom:8}}>Cantidad a depositar (€)</Text>
              <TextInput
                style={{backgroundColor:COLORS.bg3,borderRadius:12,borderWidth:1.5,borderColor:COLORS.border,paddingHorizontal:14,paddingVertical:13,fontSize:22,fontWeight:'700',color:COLORS.text}}
                value={calcAmount} onChangeText={setCalcAmount} keyboardType="numeric" placeholder="10000"/>
            </View>
            <View>
              <Text style={{fontSize:13,fontWeight:'600',color:COLORS.text,marginBottom:8}}>Plazo (meses)</Text>
              <View style={{flexDirection:'row',gap:8}}>
                {['3','6','12','24'].map(m => (
                  <TouchableOpacity key={m} style={{flex:1,paddingVertical:10,borderRadius:10,borderWidth:1.5,alignItems:'center',
                    borderColor: calcMonths===m?COLORS.primary:COLORS.border,
                    backgroundColor: calcMonths===m?COLORS.primaryLight:COLORS.bg3}}
                    onPress={() => setCalcMonths(m)}>
                    <Text style={{fontWeight:'700',color: calcMonths===m?COLORS.primary:COLORS.text2}}>{m}m</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {[
              { bank:'Trade Republic', tae:4.00, color:'#0ADB83' },
              { bank:'MyInvestor',     tae:4.50, color:'#6D28D9' },
              { bank:'Revolut (premium)', tae:4.00, color:'#191C1F' },
              { bank:'BBVA (cuenta)', tae:0, color:'#004B9E', note:'Sin interés — sin comisiones + hasta 300€ bono' },
            ].map(({ bank, tae, color, note }) => {
              const amount = parseFloat(calcAmount) || 0;
              const months = parseInt(calcMonths) || 12;
              const earned = amount * (tae / 100) * (months / 12);
              return (
                <View key={bank} style={{backgroundColor:COLORS.bg,borderRadius:14,padding:14,borderWidth:1,borderColor:color+'33'}}>
                  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                    <Text style={{fontSize:15,fontWeight:'700',color:COLORS.text}}>{bank}</Text>
                    <Text style={{fontSize:13,fontWeight:'600',color}}>{tae>0?`${tae}% TAE`:note}</Text>
                  </View>
                  {tae > 0 ? (
                    <>
                      <Text style={{fontSize:28,fontWeight:'800',color}}>+{isNaN(earned)?'—':earned.toFixed(2)}€</Text>
                      <Text style={{fontSize:12,color:COLORS.text3,marginTop:2}}>en {months} meses con {amount.toLocaleString('es-ES')}€</Text>
                    </>
                  ) : (
                    <Text style={{fontSize:13,color:COLORS.text3}}>0€ intereses · pero 0 comisiones + bono bienvenida</Text>
                  )}
                </View>
              );
            })}
            <View style={{backgroundColor:'#FFFBEB',borderRadius:12,padding:12,flexDirection:'row',gap:8}}>
              <Text>⚠️</Text>
              <Text style={{flex:1,fontSize:11,color:'#92400E',lineHeight:17}}>Cálculo orientativo. El TAE puede variar. Consulta las condiciones actuales en la web de cada entidad antes de contratar.</Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </Wrapper>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:COLORS.bg},
  header:{backgroundColor:COLORS.bg2,borderBottomWidth:0.5,borderBottomColor:COLORS.border,paddingBottom:10},
  headerRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:16,paddingTop:14,paddingBottom:4},
  title:{fontSize:22,fontWeight:'700',color:COLORS.text},
  sub:{fontSize:12,color:COLORS.text3,marginTop:1},
  calcBtn:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:COLORS.warningLight,borderRadius:10,paddingHorizontal:10,paddingVertical:6,borderWidth:1,borderColor:COLORS.warning},
  calcBtnTxt:{fontSize:12,fontWeight:'700',color:COLORS.warning},
  card:{backgroundColor:COLORS.bg2,borderRadius:18,borderWidth:0.5,borderColor:COLORS.border,overflow:'hidden',shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.08,shadowRadius:8,elevation:3},
  hotBadge:{paddingHorizontal:14,paddingVertical:8,alignItems:'center'},
  hotBadgeTxt:{fontSize:12,fontWeight:'800',color:'#fff',letterSpacing:0.5},
  cardHeader:{flexDirection:'row',gap:12,alignItems:'flex-start',padding:16,paddingBottom:8},
  cardBank:{fontSize:12,color:COLORS.text3,fontWeight:'600'},
  cardTitle:{fontSize:15,fontWeight:'700',color:COLORS.text,marginTop:3,lineHeight:20},
  highlightRow:{flexDirection:'row',alignItems:'flex-start',gap:6,backgroundColor:COLORS.warningLight,marginHorizontal:16,borderRadius:8,padding:10,marginBottom:12},
  highlightTxt:{flex:1,fontSize:13,color:COLORS.warning,fontWeight:'600',lineHeight:18},
  conditionsList:{gap:6,paddingHorizontal:16,marginBottom:12},
  conditionRow:{flexDirection:'row',alignItems:'flex-start',gap:8},
  conditionTxt:{flex:1,fontSize:13,color:COLORS.text,lineHeight:18},
  referralBanner:{flexDirection:'row',alignItems:'center',gap:8,marginHorizontal:16,borderRadius:10,padding:10,marginBottom:10,borderWidth:1},
  referralBannerTxt:{flex:1,fontSize:12,fontWeight:'600',lineHeight:17},
  codeRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginHorizontal:16,borderRadius:12,padding:14,marginBottom:10,borderWidth:2,backgroundColor:COLORS.bg},
  copyBtn:{flexDirection:'row',alignItems:'center',gap:5,borderRadius:10,paddingHorizontal:14,paddingVertical:8},
  ctaBtn:{margin:14,marginTop:4,borderRadius:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,padding:14},
  ctaBtnTxt:{color:'#fff',fontWeight:'700',fontSize:15},
  disclaimer:{flexDirection:'row',gap:8,backgroundColor:COLORS.bg2,borderRadius:10,padding:12,borderWidth:0.5,borderColor:COLORS.border},
  disclaimerTxt:{flex:1,fontSize:11,color:COLORS.text3,lineHeight:16},
});
