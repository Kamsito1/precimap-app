import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Linking, RefreshControl, ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, apiGet, apiPost } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from '../components/AuthModal';

// ─── CURATED BANK OFFERS ─────────────────────────────────────────────────────
// ⚠️  Actualizado: marzo 2025. Verifica condiciones en la web oficial antes de contratar.
// Las TAE y bonos pueden cambiar. Los enlaces de referido generan comisión para PreciMap.
const BANK_OFFERS = [
  {
    id:'trade_republic', category:'inversion', hot:true,
    bank:'Trade Republic', logo:'🟢',
    title:'4% anual en efectivo + acciones sin comisión',
    highlight:'Hasta 4% sobre efectivo sin límite + acción gratis',
    conditions:['Abrir cuenta gratis en 10 min','Depósito mínimo: cualquier cantidad','4% anual automático sobre el saldo en efectivo','Acciones y ETFs sin comisión de compraventa','Regulado por BaFin (Alemania)'],
    bonus_label:'🎁 Acción gratis al registrarte',
    url:'https://ref.trade.re/jaxg0qyx',
    referral_note:'⭐ Enlace de referido — los dos ganamos una acción gratis',
    is_referral:true, last_checked:'mar 2025',
    color:'#0ADB83', emoji:'📈',
  },
  {
    id:'evo_banco', category:'cuenta',
    bank:'EVO Banco', logo:'🔵',
    title:'Cuenta Inteligente — 2,85% TAE sin condiciones',
    highlight:'2,85% TAE automático sobre todo el saldo',
    conditions:['Sin nómina ni recibos domiciliados','Sin comisiones de ningún tipo','Interés abonado mensualmente','Tarjeta de débito gratuita','Hasta 30.000€ con máximo rendimiento'],
    bonus_label:'Sin condiciones',
    url:'https://www.evobanco.com/cuenta-inteligente/',
    is_referral:false, last_checked:'mar 2025',
    color:'#0066CC', emoji:'💳',
  },
  {
    id:'openbank', category:'cuenta',
    bank:'Openbank (Santander)', logo:'🔴',
    title:'Cuenta Bienvenida — hasta 200€ de regalo',
    highlight:'200€ por nómina de 1.000€+ durante 12 meses',
    conditions:['Nómina mínima 1.000€/mes','Mantenerla al menos 12 meses','Sin comisiones de mantenimiento','Tarjeta de débito gratis','Bono recibido en 3 meses'],
    bonus_label:'Hasta 200€',
    url:'https://www.openbank.es/',
    is_referral:false, last_checked:'mar 2025',
    warning:'⚠️ Verifica si la promoción sigue activa en la web oficial',
    color:'#EC0000', emoji:'🎁',
  },
  {
    id:'myinvestor', category:'inversion',
    bank:'MyInvestor', logo:'🟣',
    title:'Cuenta remunerada 2,5% TAE + fondos indexados',
    highlight:'La mejor plataforma de inversión pasiva en España',
    conditions:['Sin comisión de custodia','Fondos indexados Vanguard, iShares desde 10€','Cuenta remunerada automática','Carteras gestionadas desde 150€','Sin permanencia'],
    bonus_label:'Sin comisiones de custodia',
    url:'https://www.myinvestor.es/',
    is_referral:false, last_checked:'mar 2025',
    color:'#6B46C1', emoji:'💹',
  },
  {
    id:'revolut', category:'cuenta',
    bank:'Revolut', logo:'🖤',
    title:'Cuenta Revolut — hasta 4,25% en ahorros',
    highlight:'Transferencias gratis al instante + cambio de divisa sin comisión',
    conditions:['Cuenta gratis','Hasta 4,25% en cuentas ahorro (plan Metal)','Cambio de divisa al tipo interbancario','Gastos por el mundo sin comisión','Plan Standard gratuito disponible'],
    bonus_label:'Mes gratis de Premium con referido',
    url:'https://revolut.com/es/',
    referral_note:'⭐ Usa el código de tu banco actual para conseguir beneficios — o el de un amigo con Revolut',
    is_referral:false, last_checked:'mar 2025',
    color:'#191C1F', emoji:'💳',
  },
  {
    id:'ing_naranja', category:'cuenta',
    bank:'ING', logo:'🟠',
    title:'Cuenta Nómina ING — 0 comisiones garantizadas',
    highlight:'Sin comisiones aunque no uses la cuenta',
    conditions:['Nómina o pensión de cualquier importe','Sin comisiones garantizadas por contrato','Tarjeta de débito y crédito gratis','Hipoteca naranja con condiciones especiales'],
    bonus_label:'Sin comisiones siempre',
    url:'https://www.ing.es/cuenta-nomina/',
    is_referral:false, last_checked:'mar 2025',
    color:'#FF6200', emoji:'🍊',
  },
  {
    id:'cetelem', category:'hipoteca',
    bank:'Cetelem / BNP Paribas', logo:'🟠',
    title:'Préstamo personal desde 5,90% TIN',
    highlight:'Aprobación online en 24h, sin comisión de apertura',
    conditions:['Desde 1.000€ hasta 75.000€','Hasta 10 años de plazo','Sin comisión de apertura','Respuesta en 24 horas','100% online'],
    bonus_label:'Sin comisión apertura',
    url:'https://www.cetelem.es/prestamos-personales/',
    is_referral:false, last_checked:'mar 2025',
    color:'#F97316', emoji:'🏦',
  },
];

const CATEGORIES = [
  { key:'all',       label:'Todos',    emoji:'🏦' },
  { key:'cuenta',    label:'Cuentas',  emoji:'💳' },
  { key:'inversion', label:'Inversión',emoji:'📈' },
  { key:'hipoteca',  label:'Préstamos',emoji:'🏠' },
];

export default function BanksScreen({ embedded = false }) {
  const Wrapper = embedded ? View : SafeAreaView;
  const wrapperProps = embedded ? {style:{flex:1}} : {style:s.safe, edges:['top']};
  const { isLoggedIn } = useAuth();
  const [cat, setCat]           = useState('all');
  const [votes, setVotes]       = useState({});
  const [showAuth, setShowAuth] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [calcAmount, setCalcAmount] = useState('10000');
  const [calcMonths, setCalcMonths] = useState('12');

  const filtered = cat === 'all' ? BANK_OFFERS : BANK_OFFERS.filter(o => o.category === cat);
  const hot = BANK_OFFERS.find(o => o.hot);

  async function handleVote(offerId) {
    if (!isLoggedIn) { setShowAuth(true); return; }
    // Toggle local vote for immediate feedback
    setVotes(v => ({ ...v, [offerId]: !v[offerId] }));
    // Report to backend (non-blocking)
    apiPost(`/api/banks/${offerId}/vote`, { vote: votes[offerId] ? -1 : 1 }).catch(() => {});
  }

  return (
    <Wrapper {...wrapperProps}>
      <View style={s.header}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.title}>🏦 Bancos y Finanzas</Text>
            <Text style={s.sub}>Las mejores ofertas actuales</Text>
            <Text style={s.updated}>Actualizado: marzo 2025 · Verifica condiciones antes de contratar</Text>
          </View>
          <TouchableOpacity style={s.calcBtn} onPress={() => setShowCalc(true)}>
            <Text style={{fontSize:16}}>🧮</Text>
            <Text style={s.calcBtnTxt}>Calcular ahorro</Text>
          </TouchableOpacity>
        </View>

        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingHorizontal:12,gap:6,paddingBottom:10}}>
          {CATEGORIES.map(c => (
            <TouchableOpacity key={c.key} style={[s.catBtn, cat===c.key&&s.catBtnOn]} onPress={()=>setCat(c.key)}>
              <Text style={s.catEmoji}>{c.emoji}</Text>
              <Text style={[s.catTxt, cat===c.key&&{color:'#fff',fontWeight:'700'}]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{padding:14,gap:12,paddingBottom:100}} showsVerticalScrollIndicator={false}>

        {/* HOT PICK banner */}
        {(cat==='all'||cat==='inversion') && hot && (
          <TouchableOpacity style={[s.hotCard, {borderColor:hot.color}]} onPress={()=>Linking.openURL(hot.url)} activeOpacity={0.85}>
            <View style={[s.hotBadge, {backgroundColor:hot.color}]}>
              <Text style={s.hotBadgeTxt}>⭐ RECOMENDADO</Text>
            </View>
            <View style={s.hotBody}>
              <Text style={s.hotLogo}>{hot.logo}</Text>
              <View style={{flex:1}}>
                <Text style={s.hotBank}>{hot.bank}</Text>
                <Text style={s.hotTitle}>{hot.title}</Text>
                <Text style={s.hotHighlight}>{hot.highlight}</Text>
                {hot.is_referral && (
                  <View style={s.referralNote}>
                    <Ionicons name="gift-outline" size={13} color={hot.color}/>
                    <Text style={[s.referralTxt, {color:hot.color}]}>{hot.referral_note}</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={[s.hotCta, {backgroundColor:hot.color}]}>
              <Text style={s.hotCtaTxt}>Abrir cuenta gratis</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff"/>
            </View>
          </TouchableOpacity>
        )}

        {/* Cards */}
        {filtered.filter(o=>!o.hot||(cat!=='all'&&cat!=='inversion')).map(offer => (
          <View key={offer.id} style={s.card}>
            <View style={s.cardHeader}>
              <Text style={{fontSize:26}}>{offer.logo}</Text>
              <View style={{flex:1}}>
                <View style={{flexDirection:'row',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                  <Text style={s.cardBank}>{offer.bank}</Text>
                  {offer.last_checked && (
                    <Text style={{fontSize:9,color:COLORS.text3,backgroundColor:COLORS.bg3,borderRadius:4,paddingHorizontal:5,paddingVertical:1}}>
                      ✓ {offer.last_checked}
                    </Text>
                  )}
                </View>
                <Text style={s.cardTitle}>{offer.title}</Text>
              </View>
              <View style={[s.bonusBadge, {backgroundColor:offer.color+'22'}]}>
                <Text style={[s.bonusTxt, {color:offer.color}]}>{offer.emoji}</Text>
              </View>
            </View>

            <View style={s.highlightRow}>
              <Ionicons name="star" size={13} color={COLORS.warning}/>
              <Text style={s.highlightTxt}>{offer.highlight}</Text>
            </View>

            {offer.warning && (
              <View style={{flexDirection:'row',gap:6,alignItems:'flex-start',backgroundColor:'#FEF3C7',borderRadius:8,padding:8,marginBottom:8}}>
                <Text style={{fontSize:12,color:'#92400E',flex:1}}>{offer.warning}</Text>
              </View>
            )}

            <View style={s.conditionsList}>
              {offer.conditions.map(c => (
                <View key={c} style={s.conditionRow}>
                  <Ionicons name="checkmark-circle" size={14} color={COLORS.success}/>
                  <Text style={s.conditionTxt}>{c}</Text>
                </View>
              ))}
            </View>

            {offer.is_referral && (
              <View style={s.referralBanner}>
                <Ionicons name="gift" size={14} color="#7C3AED"/>
                <Text style={s.referralBannerTxt}>{offer.referral_note}</Text>
              </View>
            )}

            <TouchableOpacity style={[s.ctaBtn, {backgroundColor:offer.color}]} onPress={()=>Linking.openURL(offer.url)}>
              <Text style={s.ctaBtnTxt}>{offer.bonus_label}</Text>
              <Ionicons name="arrow-forward" size={15} color="#fff"/>
            </TouchableOpacity>
          </View>
        ))}

        {/* Disclaimer */}
        <View style={s.disclaimer}>
          <Ionicons name="information-circle-outline" size={14} color={COLORS.text3}/>
          <Text style={s.disclaimerTxt}>
            Las condiciones pueden variar. Comprueba siempre las condiciones actuales en la web del banco antes de contratar. Algunos enlaces son de referido.
          </Text>
        </View>

      </ScrollView>
      <AuthModal visible={showAuth} onClose={() => setShowAuth(false)}/>

      {/* Calculadora de ahorro */}
      <Modal visible={showCalc} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCalc(false)}>
        <View style={{flex:1, backgroundColor:COLORS.bg2}}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:16,borderBottomWidth:0.5,borderBottomColor:COLORS.border}}>
            <Text style={{fontSize:18,fontWeight:'700',color:COLORS.text}}>🧮 Calculadora de ahorro</Text>
            <TouchableOpacity onPress={() => setShowCalc(false)} style={{width:32,height:32,borderRadius:16,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'}}>
              <Ionicons name="close" size={20} color={COLORS.text2}/>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{padding:20,gap:16}}>
            <Text style={{fontSize:13,color:COLORS.text2,lineHeight:20}}>
              Calcula cuánto ganarías poniendo tu dinero en cuentas remuneradas.
            </Text>
            <View>
              <Text style={{fontSize:13,fontWeight:'600',color:COLORS.text,marginBottom:8}}>Cantidad a depositar (€)</Text>
              <TextInput
                style={{backgroundColor:COLORS.bg3,borderRadius:12,borderWidth:1.5,borderColor:COLORS.border,paddingHorizontal:14,paddingVertical:13,fontSize:22,fontWeight:'700',color:COLORS.text}}
                value={calcAmount} onChangeText={setCalcAmount}
                keyboardType="numeric" placeholder="10000"/>
            </View>
            <View>
              <Text style={{fontSize:13,fontWeight:'600',color:COLORS.text,marginBottom:8}}>Plazo (meses)</Text>
              <View style={{flexDirection:'row',gap:8}}>
                {['3','6','12','24'].map(m => (
                  <TouchableOpacity key={m}
                    style={{flex:1,paddingVertical:10,borderRadius:10,borderWidth:1.5,alignItems:'center',
                      borderColor: calcMonths===m ? COLORS.primary : COLORS.border,
                      backgroundColor: calcMonths===m ? COLORS.primaryLight : COLORS.bg3}}
                    onPress={() => setCalcMonths(m)}>
                    <Text style={{fontWeight:'700',color: calcMonths===m ? COLORS.primary : COLORS.text2}}>{m}m</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Results */}
            {[
              { bank:'Trade Republic', tae:4.00,   color:'#0ADB83' },
              { bank:'EVO Banco',       tae:2.85,   color:'#0066CC' },
              { bank:'MyInvestor',      tae:2.50,   color:'#6B46C1' },
              { bank:'ING',             tae:0,      color:'#FF6200', note:'Sin interés — sin comisiones' },
            ].map(({ bank, tae, color, note }) => {
              const amount  = parseFloat(calcAmount) || 0;
              const months  = parseInt(calcMonths)   || 12;
              const earned  = amount * (tae / 100) * (months / 12);
              return (
                <View key={bank} style={{backgroundColor:COLORS.bg,borderRadius:14,padding:14,borderWidth:1,borderColor:color+'33'}}>
                  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                    <Text style={{fontSize:15,fontWeight:'700',color:COLORS.text}}>{bank}</Text>
                    <Text style={{fontSize:13,fontWeight:'600',color:color}}>{tae > 0 ? `${tae}% TAE` : note}</Text>
                  </View>
                  {tae > 0 ? (
                    <>
                      <Text style={{fontSize:28,fontWeight:'800',color:color}}>+{earned.toFixed(2)}€</Text>
                      <Text style={{fontSize:12,color:COLORS.text3,marginTop:2}}>
                        en {months} meses con {amount.toLocaleString('es-ES')}€
                      </Text>
                    </>
                  ) : (
                    <Text style={{fontSize:13,color:COLORS.text3}}>0€ de intereses · pero cero comisiones garantizadas</Text>
                  )}
                </View>
              );
            })}
            <View style={{backgroundColor:'#FFFBEB',borderRadius:12,padding:12,flexDirection:'row',gap:8}}>
              <Text>⚠️</Text>
              <Text style={{flex:1,fontSize:11,color:'#92400E',lineHeight:17}}>
                Cálculo orientativo. El TAE puede variar. Consulta las condiciones actuales en la web de cada entidad antes de contratar.
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </Wrapper>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:COLORS.bg},
  header:{backgroundColor:COLORS.bg2,borderBottomWidth:0.5,borderBottomColor:COLORS.border},
  headerRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',paddingHorizontal:16,paddingTop:14,paddingBottom:10},
  title:{fontSize:22,fontWeight:'700',color:COLORS.text},
  sub:{fontSize:12,color:COLORS.text3,marginTop:1},
  updated:{fontSize:10,color:COLORS.text3,marginTop:3,fontStyle:'italic'},
  calcBtn:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:COLORS.warningLight,borderRadius:10,paddingHorizontal:10,paddingVertical:6,borderWidth:1,borderColor:COLORS.warning,marginTop:6},
  calcBtnTxt:{fontSize:12,fontWeight:'700',color:COLORS.warning},
  catBtn:{flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:14,paddingVertical:7,borderRadius:99,borderWidth:1.5,borderColor:COLORS.border,backgroundColor:COLORS.bg},
  catBtnOn:{backgroundColor:COLORS.primary,borderColor:COLORS.primary},
  catEmoji:{fontSize:14},
  catTxt:{fontSize:13,color:COLORS.text2},
  // Hot card
  hotCard:{backgroundColor:COLORS.bg2,borderRadius:18,borderWidth:2,overflow:'hidden',shadowColor:'#000',shadowOffset:{width:0,height:4},shadowOpacity:0.12,shadowRadius:12,elevation:6},
  hotBadge:{paddingHorizontal:14,paddingVertical:7,alignItems:'center'},
  hotBadgeTxt:{fontSize:12,fontWeight:'800',color:'#fff',letterSpacing:0.5},
  hotBody:{flexDirection:'row',gap:14,padding:16,alignItems:'flex-start'},
  hotLogo:{fontSize:36},
  hotBank:{fontSize:12,color:COLORS.text3,fontWeight:'600'},
  hotTitle:{fontSize:16,fontWeight:'700',color:COLORS.text,marginTop:2,marginBottom:4},
  hotHighlight:{fontSize:13,color:COLORS.text2,lineHeight:18},
  referralNote:{flexDirection:'row',alignItems:'center',gap:5,marginTop:8},
  referralTxt:{fontSize:12,fontWeight:'600'},
  hotCta:{margin:14,marginTop:0,borderRadius:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,padding:14},
  hotCtaTxt:{color:'#fff',fontWeight:'700',fontSize:15},
  // Regular card
  card:{backgroundColor:COLORS.bg2,borderRadius:16,borderWidth:0.5,borderColor:COLORS.border,padding:16,shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.05,shadowRadius:4,elevation:1},
  cardHeader:{flexDirection:'row',gap:12,alignItems:'flex-start',marginBottom:10},
  cardBank:{fontSize:12,color:COLORS.text3,fontWeight:'600'},
  cardTitle:{fontSize:15,fontWeight:'700',color:COLORS.text,marginTop:2},
  bonusBadge:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center'},
  bonusTxt:{fontSize:20},
  highlightRow:{flexDirection:'row',alignItems:'flex-start',gap:6,backgroundColor:COLORS.warningLight,borderRadius:8,padding:10,marginBottom:10},
  highlightTxt:{flex:1,fontSize:13,color:COLORS.warning,fontWeight:'600',lineHeight:18},
  conditionsList:{gap:6,marginBottom:12},
  conditionRow:{flexDirection:'row',alignItems:'flex-start',gap:8},
  conditionTxt:{flex:1,fontSize:13,color:COLORS.text,lineHeight:18},
  referralBanner:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'#F5F3FF',borderRadius:10,padding:10,marginBottom:10,borderWidth:1,borderColor:'#DDD6FE'},
  referralBannerTxt:{flex:1,fontSize:12,color:'#7C3AED',fontWeight:'500',lineHeight:17},
  ctaBtn:{borderRadius:12,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,padding:13},
  ctaBtnTxt:{color:'#fff',fontWeight:'700',fontSize:14},
  disclaimer:{flexDirection:'row',gap:8,backgroundColor:COLORS.bg2,borderRadius:10,padding:12,borderWidth:0.5,borderColor:COLORS.border},
  disclaimerTxt:{flex:1,fontSize:11,color:COLORS.text3,lineHeight:16},
});
