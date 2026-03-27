/**
 * AhorroScreen — autocontenido, sin imports externos de otras screens.
 * Motivo: los screens externos (SupermarketsScreen, etc.) usan hooks de
 * React Navigation que crashean cuando se renderizan fuera de un Navigator.
 * Solución definitiva: todo el contenido inline, cero imports de screens.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  FlatList, ActivityIndicator, ScrollView, Alert,
  TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, apiGet, openURL, API_BASE } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from '../components/AuthModal';

const SUBTABS = [
  { key: 'super',    label: '🛒 Super' },
  { key: 'bancos',   label: '🏦 Bancos' },
  { key: 'vuelos',   label: '✈️ Vuelos' },
  { key: 'apps',     label: '💰 Apps' },
  { key: 'gimnasio', label: '💪 Gym' },
];

const FALLBACK_TIPS = [
  '💡 Aldi es un 22% más barato que Mercadona en media',
  '💡 Trade Republic da un 4% TAE sin condiciones',
  '💡 Con Revolut ahorras comisiones en divisas',
  '💡 Comprar en Lidl ahorra ~35€/mes en una familia',
  '💡 Tarifa nocturna de luz: ahorra un 30%',
];

export default function AhorroScreen() {
  const [sub, setSub] = useState('super');
  const [visited, setVisited] = useState({ super: true, bancos: false, vuelos: false, apps: false, gimnasio: false });
  const [tips, setTips] = useState(FALLBACK_TIPS);
  const [tipIdx, setTipIdx] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let cancelled = false;
    apiGet('/api/tips').then(t => {
      if (cancelled || !Array.isArray(t) || t.length === 0) return;
      setTips(t.map(item => `${item.emoji || '💡'} ${item.title} — ${item.saves}`));
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

  const currentTip = tips[tipIdx] || tips[0] || '💡 Ahorra con PreciMap';

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <SafeAreaView edges={['top']} style={s.header}>
        <Animated.View style={[s.tipBar, { opacity: fadeAnim }]}>
          <Text style={s.tipTxt} numberOfLines={1}>{currentTip}</Text>
        </Animated.View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.subTabRow}>
          {SUBTABS.map(t => (
            <TouchableOpacity key={t.key}
              style={[s.subTab, sub === t.key && s.subTabOn]}
              onPress={() => switchTab(t.key)}>
              <Text style={[s.subTabTxt, sub === t.key && s.subTabTxtOn]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>

      <View style={{ flex: 1 }}>
        {visited.super    && <View style={{ flex:1, display: sub==='super'    ? 'flex':'none' }}><SuperTab /></View>}
        {visited.bancos   && <View style={{ flex:1, display: sub==='bancos'   ? 'flex':'none' }}><BancosTab /></View>}
        {visited.vuelos   && <View style={{ flex:1, display: sub==='vuelos'   ? 'flex':'none' }}><VuelosTab /></View>}
        {visited.apps     && <View style={{ flex:1, display: sub==='apps'     ? 'flex':'none' }}><AppsTab /></View>}
        {visited.gimnasio && <View style={{ flex:1, display: sub==='gimnasio' ? 'flex':'none' }}><GymTab /></View>}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header:      { backgroundColor: COLORS.bg2, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  tipBar:      { backgroundColor: COLORS.primaryLight, paddingHorizontal: 14, paddingVertical: 8 },
  tipTxt:      { fontSize: 12, color: COLORS.primaryDark, fontWeight: '600' },
  subTabRow:   { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  subTab:      { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: COLORS.bg3, borderWidth: 1.5, borderColor: COLORS.border },
  subTabOn:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  subTabTxt:   { fontSize: 13, fontWeight: '600', color: COLORS.text2 },
  subTabTxtOn: { color: '#fff', fontWeight: '700' },
});

// ─── TAB SUPERMERCADOS ────────────────────────────────────────────────────────
const SUPERMARKET_RANKING = [
  { pos:1,  name:'Aldi',      savings:18, emoji:'🟢', tip:'El más barato de España. Marca propia sin rival.' },
  { pos:2,  name:'Lidl',      savings:15, emoji:'🟢', tip:'Calidad-precio excepcional. Productos frescos muy económicos.' },
  { pos:3,  name:'Mercadona', savings:8,  emoji:'🟡', tip:'El favorito de España. Hacendado es muy competitivo.' },
  { pos:4,  name:'Alcampo',   savings:5,  emoji:'🟡', tip:'Buenos descuentos con tarjeta de fidelidad.' },
  { pos:5,  name:'Carrefour', savings:3,  emoji:'🟡', tip:'Variedad enorme. Aprovecha las ofertas de marca blanca.' },
  { pos:6,  name:'Eroski',    savings:0,  emoji:'🟠', tip:'Cooperativa con buenas ofertas para socios.' },
  { pos:7,  name:'El Corte Inglés', savings:-5, emoji:'🔴', tip:'Calidad premium pero precio más elevado.' },
];

const PRODUCTS_DATA = [
  { cat:'🥛 Lácteos',    items:[
    { name:'Leche entera 1L',    aldi:0.65, lidl:0.68, mercadona:0.72, carrefour:0.89 },
    { name:'Yogur natural x8',   aldi:1.09, lidl:1.15, mercadona:1.35, carrefour:1.59 },
  ]},
  { cat:'🍞 Panadería',  items:[
    { name:'Pan molde 500g',     aldi:0.99, lidl:1.05, mercadona:1.15, carrefour:1.39 },
    { name:'Tostadas 500g',      aldi:1.29, lidl:1.35, mercadona:1.49, carrefour:1.79 },
  ]},
  { cat:'🛢️ Aceites',    items:[
    { name:'Aceite oliva 1L',    aldi:5.99, lidl:6.20, mercadona:6.50, carrefour:7.99 },
    { name:'Aceite girasol 1L',  aldi:1.49, lidl:1.55, mercadona:1.65, carrefour:1.99 },
  ]},
  { cat:'🧻 Hogar',      items:[
    { name:'Papel higiénico x12',aldi:3.49, lidl:3.65, mercadona:3.99, carrefour:4.79 },
    { name:'Detergente 3L',      aldi:4.99, lidl:5.20, mercadona:5.50, carrefour:6.99 },
  ]},
];

function SuperTab() {
  const [tab, setTab] = useState('ranking');
  const [community, setCommunity] = useState([]);
  const [loadingCommunity, setLoadingCommunity] = useState(false);
  const [calcItems, setCalcItems] = useState([]);
  const { isLoggedIn } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (tab === 'precios') loadCommunity();
  }, [tab]);

  async function loadCommunity() {
    setLoadingCommunity(true);
    try {
      const data = await apiGet('/api/places?cat=supermercado&sort=price&limit=20');
      setCommunity(Array.isArray(data) ? data : []);
    } catch(_) {} finally { setLoadingCommunity(false); }
  }

  const TABS_SUPER = [
    { key:'ranking',     label:'🏆 Ranking' },
    { key:'productos',   label:'🔍 Productos' },
    { key:'calculadora', label:'🧮 Calculadora' },
    { key:'consejos',    label:'💡 Consejos' },
    { key:'precios',     label:'📍 Comunidad' },
  ];

  return (
    <View style={{flex:1, backgroundColor: COLORS.bg}}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{backgroundColor:COLORS.bg2, borderBottomWidth:0.5, borderBottomColor:COLORS.border}}
        contentContainerStyle={{paddingHorizontal:10,paddingVertical:8,gap:6}}>
        {TABS_SUPER.map(t => (
          <TouchableOpacity key={t.key}
            style={{paddingHorizontal:12,paddingVertical:7,borderRadius:10,
              backgroundColor: tab===t.key ? COLORS.primary : COLORS.bg3,
              borderWidth:1, borderColor: tab===t.key ? COLORS.primary : COLORS.border}}
            onPress={() => setTab(t.key)}>
            <Text style={{fontSize:12,fontWeight:'700',color: tab===t.key?'#fff':COLORS.text2}}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {tab === 'ranking' && (
        <ScrollView contentContainerStyle={{padding:14,gap:10,paddingBottom:100}}>
          <View style={{backgroundColor:'#EFF6FF',borderRadius:12,padding:12,marginBottom:4}}>
            <Text style={{fontSize:13,fontWeight:'700',color:'#1E40AF'}}>📊 Ranking de baratura — España 2024</Text>
            <Text style={{fontSize:11,color:'#3B82F6',marginTop:3}}>Fuente: OCU 2024 · Base: cesta de 100 productos</Text>
          </View>
          {SUPERMARKET_RANKING.map(sm => (
            <View key={sm.name} style={{backgroundColor:COLORS.bg2,borderRadius:14,padding:14,borderWidth:1,borderColor:COLORS.border,flexDirection:'row',alignItems:'center',gap:12}}>
              <View style={{width:36,height:36,borderRadius:18,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'}}>
                <Text style={{fontSize:16,fontWeight:'800',color:COLORS.text}}>#{sm.pos}</Text>
              </View>
              <View style={{flex:1}}>
                <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                  <Text style={{fontSize:15,fontWeight:'700',color:COLORS.text}}>{sm.emoji} {sm.name}</Text>
                  {sm.savings > 0 && (
                    <View style={{backgroundColor:'#DCFCE7',borderRadius:6,paddingHorizontal:6,paddingVertical:2}}>
                      <Text style={{fontSize:10,fontWeight:'700',color:'#16A34A'}}>-{sm.savings}%</Text>
                    </View>
                  )}
                </View>
                <Text style={{fontSize:11,color:COLORS.text3,marginTop:3}}>{sm.tip}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {tab === 'productos' && (
        <ScrollView contentContainerStyle={{padding:14,paddingBottom:100}}>
          {PRODUCTS_DATA.map(cat => (
            <View key={cat.cat} style={{marginBottom:20}}>
              <Text style={{fontSize:15,fontWeight:'700',color:COLORS.text,marginBottom:10}}>{cat.cat}</Text>
              {cat.items.map(item => {
                const prices = [item.aldi, item.lidl, item.mercadona, item.carrefour];
                const minP = Math.min(...prices);
                return (
                  <View key={item.name} style={{backgroundColor:COLORS.bg2,borderRadius:12,padding:12,marginBottom:8,borderWidth:1,borderColor:COLORS.border}}>
                    <Text style={{fontSize:13,fontWeight:'600',color:COLORS.text,marginBottom:8}}>{item.name}</Text>
                    <View style={{flexDirection:'row',gap:6}}>
                      {[['Aldi',item.aldi],['Lidl',item.lidl],['Merc.',item.mercadona],['Carre.',item.carrefour]].map(([name,price])=>(
                        <View key={name} style={{flex:1,alignItems:'center',backgroundColor:price===minP?'#DCFCE7':COLORS.bg3,borderRadius:8,padding:6,borderWidth:price===minP?1.5:0,borderColor:'#16A34A'}}>
                          <Text style={{fontSize:9,color:COLORS.text3,marginBottom:2}}>{name}</Text>
                          <Text style={{fontSize:13,fontWeight:'700',color:price===minP?'#16A34A':COLORS.text}}>{price.toFixed(2)}€</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}

      {tab === 'calculadora' && <CalculadoraSuper />}
      {tab === 'consejos' && <ConsejosSuper />}
      {tab === 'precios' && (
        loadingCommunity
          ? <ActivityIndicator color={COLORS.primary} style={{marginTop:40}}/>
          : <FlatList
              data={community}
              keyExtractor={p => String(p.id)}
              contentContainerStyle={{padding:14,paddingBottom:100,gap:8}}
              ListEmptyComponent={<View style={{alignItems:'center',paddingTop:50}}><Text style={{fontSize:32}}>🛒</Text><Text style={{fontSize:14,color:COLORS.text2,marginTop:8}}>No hay datos de la comunidad</Text></View>}
              renderItem={({ item: p }) => (
                <View style={{backgroundColor:COLORS.bg2,borderRadius:12,padding:12,borderWidth:1,borderColor:COLORS.border,flexDirection:'row',alignItems:'center',gap:10}}>
                  <Text style={{fontSize:28}}>🏪</Text>
                  <View style={{flex:1}}>
                    <Text style={{fontSize:14,fontWeight:'700',color:COLORS.text}} numberOfLines={1}>{p.name}</Text>
                    <Text style={{fontSize:11,color:COLORS.text3}}>📍 {p.city||'España'}</Text>
                    {p.repPrice && <Text style={{fontSize:12,color:COLORS.primary,fontWeight:'600',marginTop:2}}>~{p.repPrice.toFixed(2)}€/semana</Text>}
                  </View>
                </View>
              )}
            />
      )}
      <AuthModal visible={showAuth} onClose={() => setShowAuth(false)} />
    </View>
  );
}

function CalculadoraSuper() {
  const [basket, setBasket] = useState([
    {id:1, name:'Leche 1L', qty:4, unitPrice:0.70},
    {id:2, name:'Pan molde', qty:2, unitPrice:1.10},
    {id:3, name:'Yogures x8', qty:2, unitPrice:1.29},
  ]);
  const total = basket.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const saving = total * 0.18;
  return (
    <ScrollView contentContainerStyle={{padding:14,paddingBottom:100,gap:12}}>
      <View style={{backgroundColor:'#EFF6FF',borderRadius:12,padding:12}}>
        <Text style={{fontSize:13,fontWeight:'700',color:'#1E40AF'}}>🧮 Calculadora de ahorro mensual</Text>
        <Text style={{fontSize:11,color:'#3B82F6',marginTop:2}}>Comparando Mercadona vs Aldi/Lidl</Text>
      </View>
      {basket.map((item) => (
        <View key={item.id} style={{backgroundColor:COLORS.bg2,borderRadius:12,padding:12,borderWidth:1,borderColor:COLORS.border,flexDirection:'row',alignItems:'center',gap:10}}>
          <View style={{flex:1}}>
            <Text style={{fontSize:14,fontWeight:'600',color:COLORS.text}}>{item.name}</Text>
            <Text style={{fontSize:11,color:COLORS.text3}}>{item.unitPrice.toFixed(2)}€/ud</Text>
          </View>
          <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
            <TouchableOpacity onPress={() => setBasket(b=>b.map(x=>x.id===item.id?{...x,qty:Math.max(1,x.qty-1)}:x))}
              style={{width:28,height:28,borderRadius:14,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:COLORS.border}}>
              <Text style={{fontSize:16,fontWeight:'700',color:COLORS.text}}>-</Text>
            </TouchableOpacity>
            <Text style={{fontSize:16,fontWeight:'700',color:COLORS.text,minWidth:20,textAlign:'center'}}>{item.qty}</Text>
            <TouchableOpacity onPress={() => setBasket(b=>b.map(x=>x.id===item.id?{...x,qty:x.qty+1}:x))}
              style={{width:28,height:28,borderRadius:14,backgroundColor:COLORS.primary,alignItems:'center',justifyContent:'center'}}>
              <Text style={{fontSize:16,fontWeight:'700',color:'#fff'}}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={{fontSize:14,fontWeight:'700',color:COLORS.text,minWidth:50,textAlign:'right'}}>{(item.qty*item.unitPrice).toFixed(2)}€</Text>
        </View>
      ))}
      <View style={{backgroundColor:'#DCFCE7',borderRadius:14,padding:16,gap:6}}>
        <View style={{flexDirection:'row',justifyContent:'space-between'}}>
          <Text style={{fontSize:14,color:'#16A34A'}}>Total en Mercadona:</Text>
          <Text style={{fontSize:14,fontWeight:'700',color:'#16A34A'}}>{total.toFixed(2)}€</Text>
        </View>
        <View style={{flexDirection:'row',justifyContent:'space-between'}}>
          <Text style={{fontSize:14,color:'#16A34A'}}>En Aldi/Lidl (~18% menos):</Text>
          <Text style={{fontSize:14,fontWeight:'700',color:'#16A34A'}}>{(total-saving).toFixed(2)}€</Text>
        </View>
        <View style={{height:1,backgroundColor:'#86EFAC',marginVertical:4}}/>
        <View style={{flexDirection:'row',justifyContent:'space-between'}}>
          <Text style={{fontSize:16,fontWeight:'700',color:'#15803D'}}>💰 Ahorro mensual:</Text>
          <Text style={{fontSize:20,fontWeight:'800',color:'#15803D'}}>{saving.toFixed(2)}€</Text>
        </View>
        <Text style={{fontSize:11,color:'#16A34A',textAlign:'right'}}>{(saving*12).toFixed(0)}€ al año</Text>
      </View>
    </ScrollView>
  );
}

function ConsejosSuper() {
  const tips = [
    {emoji:'🕐',tip:'Compra a última hora — descuentos en frescos hasta el 50%'},
    {emoji:'📱',tip:'Usa la app de Lidl Plus para cupones exclusivos cada semana'},
    {emoji:'🏷️',tip:'Marca blanca = misma calidad, precio hasta un 40% menor'},
    {emoji:'📅',tip:'Compra a principios de mes: más stock, más ofertas'},
    {emoji:'🛒',tip:'Haz una lista antes de ir — reduces compras impulsivas un 30%'},
    {emoji:'🌱',tip:'Los productos de temporada son más baratos y frescos'},
    {emoji:'🔄',tip:'Compara precio/kg, no precio por unidad — evita el "efecto tamaño"'},
    {emoji:'💳',tip:'Acumula puntos con tarjetas de fidelidad: Carrefour, El Corte Inglés'},
  ];
  return (
    <ScrollView contentContainerStyle={{padding:14,paddingBottom:100,gap:10}}>
      {tips.map((t,i) => (
        <View key={i} style={{backgroundColor:COLORS.bg2,borderRadius:12,padding:14,borderWidth:1,borderColor:COLORS.border,flexDirection:'row',gap:12,alignItems:'flex-start'}}>
          <Text style={{fontSize:24}}>{t.emoji}</Text>
          <Text style={{flex:1,fontSize:14,color:COLORS.text,lineHeight:20}}>{t.tip}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── TAB BANCOS ───────────────────────────────────────────────────────────────
const BANK_OFFERS = [
  { id:'trade', bank:'Trade Republic', logo:'🟢', color:'#0ADB83', hot:true,
    title:'4% anual en efectivo + acciones sin comisión',
    highlight:'Hasta 4% sobre efectivo sin límite + acción gratis al registrarte',
    conditions:['Abrir cuenta gratis en 10 min','4% anual automático sobre saldo','Acciones y ETFs sin comisión','Regulado por BaFin (Alemania)'],
    bonus:'🎁 Acción gratis al registrarte',
    url:'https://refnocode.trade.re/0kbf1xcq', cta:'Abrir cuenta gratis',
    referralNote:'⭐ Enlace de referido — los dos ganamos una acción gratis', last:'mar 2026' },
  { id:'myinvestor', bank:'MyInvestor', logo:'🟣', color:'#6D28D9', hot:true,
    title:'Cuenta remunerada al 4.50% TAE + inversión sin comisión',
    highlight:'Hasta 4.50% TAE sin permanencia + fondos indexados desde 10€',
    conditions:['4.50% TAE sin permanencia','Fondos indexados sin comisión de custodia','Sin comisiones de mantenimiento','Respaldado por Andbank — BdE'],
    bonus:'🎁 Código: UNHO5',
    url:'https://newapp.myinvestor.es/do/signup?promotionalCode=UNHO5', cta:'Abrir MyInvestor',
    code:'UNHO5', referralNote:'🟣 Usa el código UNHO5 al registrarte', last:'mar 2026' },
  { id:'bbva', bank:'BBVA', logo:'🔵', color:'#004B9E', hot:false,
    title:'Cuenta Online BBVA — sin comisiones + hasta 300€ de bienvenida',
    highlight:'Sin comisiones con código amigo: hasta 300€ de regalo',
    conditions:['Sin comisiones de mantenimiento','Tarjeta de débito gratuita','Hasta 300€ bienvenida con código amigo','App valorada 4.8/5'],
    bonus:'💰 Código: 14D400110DACFB',
    url:'https://www.bbva.es/personas/productos/cuentas/cuenta-online.html', cta:'Abrir BBVA',
    code:'14D400110DACFB', referralNote:'💙 Usa el código al registrarte para el bono', last:'mar 2026' },
  { id:'revolut', bank:'Revolut', logo:'🖤', color:'#191C1F', hot:false,
    title:'Sin comisiones en divisas + hasta 4% en ahorro',
    highlight:'Ideal para viajes: tipo de cambio real, sin comisión',
    conditions:['Sin comisión en divisas hasta 1.000€/mes','Cambio al tipo real de mercado','Tarjeta virtual instantánea','Transferencias internacionales baratas'],
    bonus:'🎁 Enlace de referido',
    url:'https://revolut.com/referral/?referral-code=juananmpu9&geo-redirect', cta:'Abrir Revolut',
    referralNote:'🖤 Regístrate con mi enlace y los dos ganamos beneficios', last:'mar 2026' },
];

function BancosTab() {
  const [copiedCode, setCopiedCode] = useState(null);
  const [showCalc, setShowCalc] = useState(false);
  const [calcAmount, setCalcAmount] = useState('10000');
  const [calcMonths, setCalcMonths] = useState('12');

  function copyCode(code) {
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 3000);
    Alert.alert('✅ Copiado', `Código "${code}" copiado. Pégalo al registrarte.`);
  }

  return (
    <View style={{flex:1}}>
      <ScrollView contentContainerStyle={{padding:14,gap:14,paddingBottom:100}}>
        <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'#FFFBEB',borderRadius:12,padding:12,borderWidth:1,borderColor:'#F59E0B'}}
          onPress={() => setShowCalc(true)}>
          <Text style={{fontSize:20}}>🧮</Text>
          <View style={{flex:1}}>
            <Text style={{fontSize:13,fontWeight:'700',color:'#92400E'}}>Calculadora de intereses</Text>
            <Text style={{fontSize:11,color:'#B45309'}}>Calcula cuánto puedes ganar en cada banco</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#B45309"/>
        </TouchableOpacity>

        {BANK_OFFERS.map(offer => (
          <View key={offer.id} style={{backgroundColor:COLORS.bg2,borderRadius:18,borderWidth:offer.hot?2:0.5,borderColor:offer.hot?offer.color:COLORS.border,overflow:'hidden'}}>
            {offer.hot && <View style={{backgroundColor:offer.color,paddingHorizontal:14,paddingVertical:8,alignItems:'center'}}><Text style={{fontSize:12,fontWeight:'800',color:'#fff'}}>⭐ RECOMENDADO</Text></View>}
            <View style={{flexDirection:'row',gap:12,alignItems:'flex-start',padding:16,paddingBottom:8}}>
              <Text style={{fontSize:32}}>{offer.logo}</Text>
              <View style={{flex:1}}>
                <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                  <Text style={{fontSize:12,color:COLORS.text3,fontWeight:'600'}}>{offer.bank}</Text>
                  <Text style={{fontSize:9,color:COLORS.text3,backgroundColor:COLORS.bg3,borderRadius:4,paddingHorizontal:5,paddingVertical:1}}>✓ {offer.last}</Text>
                </View>
                <Text style={{fontSize:15,fontWeight:'700',color:COLORS.text,marginTop:3,lineHeight:20}}>{offer.title}</Text>
              </View>
            </View>
            <View style={{flexDirection:'row',alignItems:'flex-start',gap:6,backgroundColor:'#FFFBEB',marginHorizontal:16,borderRadius:8,padding:10,marginBottom:10}}>
              <Ionicons name="star" size={13} color="#F59E0B"/>
              <Text style={{flex:1,fontSize:13,color:'#92400E',fontWeight:'600',lineHeight:18}}>{offer.highlight}</Text>
            </View>
            <View style={{gap:6,paddingHorizontal:16,marginBottom:10}}>
              {offer.conditions.map(c => (
                <View key={c} style={{flexDirection:'row',alignItems:'flex-start',gap:8}}>
                  <Ionicons name="checkmark-circle" size={14} color={COLORS.success} style={{marginTop:2}}/>
                  <Text style={{flex:1,fontSize:13,color:COLORS.text,lineHeight:18}}>{c}</Text>
                </View>
              ))}
            </View>
            <View style={{flexDirection:'row',alignItems:'center',gap:8,marginHorizontal:16,borderRadius:10,padding:10,marginBottom:10,borderWidth:1,borderColor:offer.color+'44',backgroundColor:offer.color+'11'}}>
              <Ionicons name="gift" size={14} color={offer.color}/>
              <Text style={{flex:1,fontSize:12,fontWeight:'600',color:offer.color}}>{offer.referralNote}</Text>
            </View>
            {offer.code && (
              <TouchableOpacity style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginHorizontal:16,borderRadius:12,padding:14,marginBottom:10,borderWidth:2,borderColor:offer.color,backgroundColor:COLORS.bg}}
                onPress={() => copyCode(offer.code)}>
                <View>
                  <Text style={{fontSize:11,color:COLORS.text3,marginBottom:2}}>Código amigo:</Text>
                  <Text style={{fontSize:18,fontWeight:'800',color:offer.color,letterSpacing:2}}>{offer.code}</Text>
                </View>
                <View style={{flexDirection:'row',alignItems:'center',gap:5,borderRadius:10,paddingHorizontal:14,paddingVertical:8,backgroundColor:offer.color}}>
                  <Ionicons name={copiedCode===offer.code?'checkmark':'copy-outline'} size={16} color="#fff"/>
                  <Text style={{color:'#fff',fontWeight:'700',fontSize:12}}>{copiedCode===offer.code?'¡Copiado!':'Copiar'}</Text>
                </View>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={{margin:14,marginTop:4,borderRadius:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,padding:14,backgroundColor:offer.color}}
              onPress={() => openURL(offer.url)}>
              <Text style={{color:'#fff',fontWeight:'700',fontSize:15}}>{offer.cta}</Text>
              <Ionicons name="arrow-forward" size={15} color="#fff"/>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showCalc} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCalc(false)}>
        <View style={{flex:1,backgroundColor:COLORS.bg2}}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:16,borderBottomWidth:0.5,borderBottomColor:COLORS.border}}>
            <Text style={{fontSize:18,fontWeight:'700',color:COLORS.text}}>🧮 Calculadora de ahorro</Text>
            <TouchableOpacity onPress={() => setShowCalc(false)} style={{width:32,height:32,borderRadius:16,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'}}>
              <Ionicons name="close" size={20} color={COLORS.text2}/>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{padding:20,gap:16}}>
            <View>
              <Text style={{fontSize:13,fontWeight:'600',color:COLORS.text,marginBottom:8}}>Cantidad (€)</Text>
              <TextInput style={{backgroundColor:COLORS.bg3,borderRadius:12,borderWidth:1.5,borderColor:COLORS.border,paddingHorizontal:14,paddingVertical:13,fontSize:22,fontWeight:'700',color:COLORS.text}}
                value={calcAmount} onChangeText={setCalcAmount} keyboardType="numeric" autoCorrect={false}/>
            </View>
            <View>
              <Text style={{fontSize:13,fontWeight:'600',color:COLORS.text,marginBottom:8}}>Plazo</Text>
              <View style={{flexDirection:'row',gap:8}}>
                {['3','6','12','24'].map(m => (
                  <TouchableOpacity key={m} style={{flex:1,paddingVertical:10,borderRadius:10,borderWidth:1.5,alignItems:'center',
                    borderColor:calcMonths===m?COLORS.primary:COLORS.border,backgroundColor:calcMonths===m?COLORS.primaryLight:COLORS.bg3}}
                    onPress={() => setCalcMonths(m)}>
                    <Text style={{fontWeight:'700',color:calcMonths===m?COLORS.primary:COLORS.text2}}>{m}m</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {[{bank:'Trade Republic',tae:4.0,color:'#0ADB83'},{bank:'MyInvestor',tae:4.5,color:'#6D28D9'}].map(({bank,tae,color}) => {
              const earned = (parseFloat(calcAmount)||0) * (tae/100) * (parseInt(calcMonths)||12)/12;
              return (
                <View key={bank} style={{backgroundColor:COLORS.bg,borderRadius:14,padding:14,borderWidth:1,borderColor:color+'33'}}>
                  <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:4}}>
                    <Text style={{fontSize:15,fontWeight:'700',color:COLORS.text}}>{bank}</Text>
                    <Text style={{fontSize:13,fontWeight:'600',color}}>{tae}% TAE</Text>
                  </View>
                  <Text style={{fontSize:28,fontWeight:'800',color}}>+{earned.toFixed(2)}€</Text>
                  <Text style={{fontSize:12,color:COLORS.text3,marginTop:2}}>en {calcMonths} meses</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ─── TAB VUELOS ───────────────────────────────────────────────────────────────
const AIRPORTS = [
  {code:'MAD',name:'Madrid Barajas'}, {code:'BCN',name:'Barcelona El Prat'},
  {code:'SVQ',name:'Sevilla'}, {code:'AGP',name:'Málaga'}, {code:'VLC',name:'Valencia'},
  {code:'BIO',name:'Bilbao'}, {code:'PMI',name:'Palma de Mallorca'}, {code:'LPA',name:'Las Palmas'},
  {code:'TFN',name:'Tenerife Norte'}, {code:'ALC',name:'Alicante'},
];
const DEST_POPULAR = [
  {code:'CDG',name:'París'},{code:'LHR',name:'Londres'},{code:'FCO',name:'Roma'},
  {code:'AMS',name:'Amsterdam'},{code:'LIS',name:'Lisboa'},{code:'OSL',name:'Oslo'},
  {code:'DXB',name:'Dubai'},{code:'JFK',name:'Nueva York'},{code:'CUN',name:'Cancún'},
  {code:'LIM',name:'Lima'},{code:'BOG',name:'Bogotá'},{code:'EZE',name:'Buenos Aires'},
];

function VuelosTab() {
  const [origin, setOrigin] = useState(AIRPORTS[0]);
  const [dest, setDest] = useState(null);
  const [adults, setAdults] = useState(1);
  const [picker, setPicker] = useState(null);

  function buildUrl() {
    if (!dest) return null;
    const today = new Date();
    const dep = new Date(today); dep.setDate(dep.getDate()+14);
    const ret = new Date(dep); ret.setDate(ret.getDate()+7);
    const fmt = d => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    return `https://www.google.com/travel/flights?q=vuelos+${origin.code}+${dest.code}&hl=es#flt=${origin.code}.${dest.code}.${fmt(dep)}*${dest.code}.${origin.code}.${fmt(ret)};c:EUR;e:1;sd:1;t:f;tt:o`;
  }

  const TIPS_VUELOS = [
    {e:'📅',t:'Martes y miércoles son los días más baratos para volar'},
    {e:'⏰',t:'Compra entre 6-8 semanas antes para los mejores precios'},
    {e:'🔔',t:'Activa alertas de precio en Google Flights'},
    {e:'🧳',t:'Solo equipaje de mano: hasta 50€ de ahorro por trayecto'},
    {e:'🛫',t:'Vuelos madrugada y mediodía suelen ser más baratos'},
    {e:'🔄',t:'Combina aerolíneas: ida en Vueling, vuelta en Ryanair'},
    {e:'🌍',t:'Skyscanner y Kayak comparan precios en tiempo real'},
  ];

  return (
    <ScrollView contentContainerStyle={{padding:14,paddingBottom:100,gap:14}}>
      <View style={{backgroundColor:COLORS.bg2,borderRadius:16,padding:16,borderWidth:1,borderColor:COLORS.border,gap:12}}>
        <Text style={{fontSize:16,fontWeight:'700',color:COLORS.text}}>✈️ Buscar vuelo barato</Text>
        <TouchableOpacity style={{backgroundColor:COLORS.bg3,borderRadius:12,borderWidth:1,borderColor:COLORS.border,padding:14,flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}
          onPress={() => setPicker('origin')}>
          <View>
            <Text style={{fontSize:11,color:COLORS.text3}}>Origen</Text>
            <Text style={{fontSize:16,fontWeight:'700',color:COLORS.text}}>{origin.code} — {origin.name}</Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={COLORS.text3}/>
        </TouchableOpacity>
        <TouchableOpacity style={{backgroundColor:COLORS.bg3,borderRadius:12,borderWidth:1,borderColor:dest?COLORS.primary:COLORS.border,padding:14,flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}
          onPress={() => setPicker('dest')}>
          <View>
            <Text style={{fontSize:11,color:COLORS.text3}}>Destino</Text>
            <Text style={{fontSize:16,fontWeight:'700',color:dest?COLORS.text:COLORS.text3}}>{dest ? `${dest.code} — ${dest.name}` : 'Elige destino'}</Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={COLORS.text3}/>
        </TouchableOpacity>
        <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
          <Text style={{fontSize:13,fontWeight:'600',color:COLORS.text}}>Adultos:</Text>
          {[1,2,3,4].map(n => (
            <TouchableOpacity key={n} style={{paddingHorizontal:14,paddingVertical:8,borderRadius:10,borderWidth:1.5,
              borderColor:adults===n?COLORS.primary:COLORS.border,backgroundColor:adults===n?COLORS.primaryLight:COLORS.bg3}}
              onPress={() => setAdults(n)}>
              <Text style={{fontWeight:'700',color:adults===n?COLORS.primary:COLORS.text2}}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:14,padding:15,alignItems:'center',flexDirection:'row',justifyContent:'center',gap:8,opacity:dest?1:0.5}}
          onPress={() => { const url=buildUrl(); if(url) openURL(url); else Alert.alert('Elige destino','Selecciona un destino primero'); }}
          disabled={!dest}>
          <Ionicons name="search" size={18} color="#fff"/>
          <Text style={{color:'#fff',fontWeight:'700',fontSize:15}}>Buscar en Google Flights</Text>
        </TouchableOpacity>
      </View>

      <Text style={{fontSize:14,fontWeight:'700',color:COLORS.text,marginTop:4}}>💡 Trucos para vuelos baratos</Text>
      {TIPS_VUELOS.map((t,i) => (
        <View key={i} style={{backgroundColor:COLORS.bg2,borderRadius:12,padding:12,borderWidth:1,borderColor:COLORS.border,flexDirection:'row',gap:10,alignItems:'flex-start'}}>
          <Text style={{fontSize:22}}>{t.e}</Text>
          <Text style={{flex:1,fontSize:13,color:COLORS.text,lineHeight:19}}>{t.t}</Text>
        </View>
      ))}

      <Modal visible={!!picker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPicker(null)}>
        <View style={{flex:1,backgroundColor:COLORS.bg}}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:16,borderBottomWidth:0.5,borderBottomColor:COLORS.border}}>
            <Text style={{fontSize:18,fontWeight:'700',color:COLORS.text}}>{picker==='origin'?'🛫 Origen':'🛬 Destino'}</Text>
            <TouchableOpacity onPress={() => setPicker(null)} style={{width:32,height:32,borderRadius:16,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'}}>
              <Ionicons name="close" size={20} color={COLORS.text2}/>
            </TouchableOpacity>
          </View>
          <FlatList
            data={picker==='origin' ? AIRPORTS : DEST_POPULAR}
            keyExtractor={a => a.code}
            contentContainerStyle={{padding:14,gap:8}}
            renderItem={({item:a}) => (
              <TouchableOpacity style={{backgroundColor:COLORS.bg2,borderRadius:12,padding:14,borderWidth:1,borderColor:COLORS.border,flexDirection:'row',alignItems:'center',gap:10}}
                onPress={() => { if(picker==='origin') setOrigin(a); else setDest(a); setPicker(null); }}>
                <Text style={{fontSize:15,fontWeight:'800',color:COLORS.primary,width:40}}>{a.code}</Text>
                <Text style={{fontSize:14,color:COLORS.text}}>{a.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </ScrollView>
  );
}

// ─── TAB APPS ─────────────────────────────────────────────────────────────────
const APPS_DATA = [
  { cat:'💰 Cashback y recompensas', apps:[
    { name:'iGraal', desc:'Cashback en compras online: Zara, Amazon, Booking...', earn:'Hasta 15% cashback', url:'https://es.igraal.com/padrinazgo?padrino=vpbWSouX', emoji:'🛍️', is_referral:true, referral_note:'Enlace de referido — los dos ganamos cashback extra' },
    { name:'Attapoll', desc:'Encuestas pagadas. 5 min = 0.20€. Retira desde 3€ por PayPal.', earn:'~5-15€/mes', url:'https://attapoll.app/join/qarui', emoji:'📊', is_referral:true, referral_note:'Enlace de referido' },
    { name:'WeWard', desc:'Gana puntos caminando. Canjea por vales de Amazon, Carrefour...', earn:'~5-10€/mes', url:'weward://', emoji:'🚶', code:'DevotoArana4251', is_referral:true, referral_note:'Código de invitación al registrarte' },
  ]},
  { cat:'⛽ Gasolina y transporte', apps:[
    { name:'Gasolina en PreciMap', desc:'Ya la tienes: 12.222 gasolineras en tiempo real', earn:'Hasta 44€/mes', url:null, emoji:'⛽', note:'Usa la pestaña Mapa' },
    { name:'Waze', desc:'Navegación con alertas de tráfico en tiempo real', earn:'Tiempo = dinero', url:'https://www.waze.com', emoji:'🗺️' },
  ]},
  { cat:'🛒 Compras inteligentes', apps:[
    { name:'Idealo', desc:'Comparador de precios: encuentra el más barato de internet', earn:'Ahorra 10-40%', url:'https://www.idealo.es', emoji:'🔍' },
    { name:'Too Good To Go', desc:'Bolsas sorpresa de restaurantes y tiendas a 2-4€', earn:'Hasta 70% dto.', url:'https://toogoodtogo.com', emoji:'🍱' },
    { name:'Wallapop', desc:'Segunda mano: muebles, ropa, tecnología desde 1€', earn:'Variable', url:'https://es.wallapop.com', emoji:'♻️' },
  ]},
];

function AppsTab() {
  const [copied, setCopied] = useState(null);
  function copyCode(code) {
    setCopied(code);
    setTimeout(()=>setCopied(null),3000);
    Alert.alert('✅ Copiado',`Código "${code}" copiado.`);
  }
  return (
    <ScrollView contentContainerStyle={{padding:14,paddingBottom:100,gap:16}}>
      {APPS_DATA.map(cat => (
        <View key={cat.cat}>
          <Text style={{fontSize:15,fontWeight:'700',color:COLORS.text,marginBottom:10}}>{cat.cat}</Text>
          <View style={{gap:10}}>
            {cat.apps.map(app => (
              <View key={app.name} style={{backgroundColor:COLORS.bg2,borderRadius:14,padding:14,borderWidth:1,borderColor:COLORS.border}}>
                <View style={{flexDirection:'row',gap:10,alignItems:'flex-start',marginBottom:8}}>
                  <Text style={{fontSize:28}}>{app.emoji}</Text>
                  <View style={{flex:1}}>
                    <Text style={{fontSize:15,fontWeight:'700',color:COLORS.text}}>{app.name}</Text>
                    <Text style={{fontSize:12,color:COLORS.text3,marginTop:2,lineHeight:17}}>{app.desc}</Text>
                  </View>
                  <View style={{backgroundColor:COLORS.successLight,borderRadius:8,paddingHorizontal:8,paddingVertical:4}}>
                    <Text style={{fontSize:10,fontWeight:'700',color:COLORS.success}}>{app.earn}</Text>
                  </View>
                </View>
                {app.is_referral && (
                  <View style={{backgroundColor:COLORS.primaryLight,borderRadius:8,padding:8,marginBottom:8,flexDirection:'row',gap:6}}>
                    <Ionicons name="gift" size={13} color={COLORS.primary}/>
                    <Text style={{fontSize:11,color:COLORS.primary,fontWeight:'600'}}>{app.referral_note}</Text>
                  </View>
                )}
                {app.code && (
                  <TouchableOpacity style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:COLORS.bg,borderRadius:10,padding:10,borderWidth:1.5,borderColor:COLORS.primary,marginBottom:8}}
                    onPress={() => copyCode(app.code)}>
                    <View>
                      <Text style={{fontSize:10,color:COLORS.text3}}>Código:</Text>
                      <Text style={{fontSize:16,fontWeight:'800',color:COLORS.primary}}>{app.code}</Text>
                    </View>
                    <View style={{backgroundColor:COLORS.primary,borderRadius:8,paddingHorizontal:12,paddingVertical:6,flexDirection:'row',gap:4,alignItems:'center'}}>
                      <Ionicons name={copied===app.code?'checkmark':'copy-outline'} size={14} color="#fff"/>
                      <Text style={{color:'#fff',fontWeight:'700',fontSize:12}}>{copied===app.code?'¡Copiado!':'Copiar'}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                {app.url ? (
                  <TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:12,padding:11,alignItems:'center',flexDirection:'row',justifyContent:'center',gap:6}}
                    onPress={() => openURL(app.url)}>
                    <Text style={{color:'#fff',fontWeight:'700',fontSize:13}}>Descargar / Abrir</Text>
                    <Ionicons name="arrow-forward" size={14} color="#fff"/>
                  </TouchableOpacity>
                ) : (
                  <View style={{backgroundColor:COLORS.bg3,borderRadius:12,padding:11,alignItems:'center'}}>
                    <Text style={{color:COLORS.text3,fontSize:13}}>{app.note}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── TAB GIMNASIO ─────────────────────────────────────────────────────────────
const GYM_CITIES = ['Toda España','Madrid','Barcelona','Sevilla','Valencia','Bilbao','Zaragoza','Málaga','Córdoba'];

function GymTab() {
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('');

  useEffect(() => { loadGyms(); }, [city]);

  async function loadGyms() {
    setLoading(true);
    try {
      let url = '/api/places?cat=gimnasio&sort=price';
      if (city) url += `&city=${encodeURIComponent(city)}`;
      const data = await apiGet(url);
      setGyms(Array.isArray(data) ? data : []);
    } catch(_) {} finally { setLoading(false); }
  }

  return (
    <View style={{flex:1,backgroundColor:COLORS.bg}}>
      <View style={{backgroundColor:'#EDE9FE',margin:12,borderRadius:12,padding:12,flexDirection:'row',gap:10,alignItems:'center'}}>
        <Text style={{fontSize:22}}>💪</Text>
        <View style={{flex:1}}>
          <Text style={{fontSize:13,fontWeight:'700',color:'#4C1D95'}}>Gimnasios más baratos de España</Text>
          <Text style={{fontSize:11,color:'#6D28D9',marginTop:1}}>Ordenados por cuota mensual</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexGrow:0}} contentContainerStyle={{paddingHorizontal:12,paddingBottom:10,gap:6}}>
        {GYM_CITIES.map(c => {
          const val = c==='Toda España' ? '' : c;
          const active = val===city;
          return (
            <TouchableOpacity key={c}
              style={{paddingHorizontal:10,paddingVertical:5,borderRadius:8,borderWidth:1.5,borderColor:active?'#7C3AED':COLORS.border,backgroundColor:active?'#7C3AED':COLORS.bg2}}
              onPress={() => setCity(val)}>
              <Text style={{fontSize:12,fontWeight:'700',color:active?'#fff':COLORS.text2}}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {loading
        ? <ActivityIndicator color="#7C3AED" style={{marginTop:40}}/>
        : gyms.length === 0
          ? <View style={{alignItems:'center',paddingTop:50,gap:8}}>
              <Text style={{fontSize:32}}>💪</Text>
              <Text style={{fontSize:15,color:COLORS.text2,fontWeight:'600'}}>Sin gimnasios en {city||'España'}</Text>
              <TouchableOpacity onPress={()=>setCity('')} style={{backgroundColor:COLORS.primaryLight,borderRadius:8,paddingHorizontal:14,paddingVertical:8,marginTop:8}}>
                <Text style={{fontSize:13,color:COLORS.primary,fontWeight:'700'}}>Ver toda España</Text>
              </TouchableOpacity>
            </View>
          : <FlatList
              data={gyms}
              keyExtractor={g => String(g.id)}
              contentContainerStyle={{paddingHorizontal:12,paddingBottom:100,gap:8}}
              renderItem={({item:g, index}) => (
                <View style={{backgroundColor:COLORS.bg2,borderRadius:12,padding:12,borderWidth:1,borderColor:COLORS.border,flexDirection:'row',alignItems:'center',gap:10}}>
                  <View style={{width:36,height:36,borderRadius:8,backgroundColor:'#EDE9FE',alignItems:'center',justifyContent:'center'}}>
                    <Text style={{fontSize:18}}>💪</Text>
                  </View>
                  <View style={{flex:1,minWidth:0}}>
                    <Text style={{fontSize:10,fontWeight:'700',color:COLORS.text3}}>#{index+1}</Text>
                    <Text style={{fontSize:14,fontWeight:'700',color:COLORS.text}} numberOfLines={1}>{g.name}</Text>
                    <Text style={{fontSize:11,color:COLORS.text3}}>📍 {g.city||'España'}</Text>
                  </View>
                  <View style={{alignItems:'flex-end'}}>
                    {g.repPrice
                      ? <><Text style={{fontSize:18,fontWeight:'800',color:'#7C3AED'}}>{g.repPrice.toFixed(2)}€</Text>
                          <Text style={{fontSize:10,color:COLORS.text3}}>/mes</Text></>
                      : <Text style={{fontSize:11,color:COLORS.text3}}>Sin precio</Text>}
                  </View>
                </View>
              )}
            />
      }
    </View>
  );
}
