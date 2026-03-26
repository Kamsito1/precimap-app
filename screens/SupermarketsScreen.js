import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Linking, RefreshControl, Alert, TextInput, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, apiGet, API_BASE } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from '../components/AuthModal';
import { useNavigation } from '@react-navigation/native';

const TABS = [
  { key:'ranking',   label:'🏆 Ranking',    desc:'¿Cuál es más barato?' },
  { key:'productos', label:'🔍 Productos',   desc:'Compara precios reales' },
  { key:'categoria', label:'📦 Por tipo',    desc:'El mejor en cada sección' },
  { key:'consejos',  label:'💡 Consejos',    desc:'Trucos para ahorrar' },
];

// Supermarkets — ranked by overall price (lower = cheaper), source: OCU, InfoConsumidor 2024
const RANKING = [
  { pos:1,  name:'Aldi',          idx:82,  emoji:'🟢', region:'Nacional',       tip:'El más barato de España. Marca propia sin rival. Ideal para básicos.' },
  { pos:2,  name:'Lidl',          idx:86,  emoji:'🟢', region:'Nacional',       tip:'2º más barato. Campeón en frutas, verduras y carne fresca.' },
  { pos:3,  name:'Alcampo',       idx:90,  emoji:'🟢', region:'Nacional',       tip:'Muy competitivo, especialmente en bebidas y droguería.' },
  { pos:4,  name:'Día',           idx:91,  emoji:'🟢', region:'Nacional',       tip:'Buena relación precio/proximidad. Descuentos para socios.' },
  { pos:5,  name:'Coviran',       idx:93,  emoji:'🟢', region:'Rural/pueblo',   tip:'La "tienda de pueblo" más extendida de España. Buena en perecederos.' },
  { pos:6,  name:'Spar',          idx:94,  emoji:'🟢', region:'Rural/pueblo',   tip:'Presente en zonas rurales. Marca propia competitiva.' },
  { pos:7,  name:'Mercadona',     idx:100, emoji:'🟡', region:'Nacional',       tip:'Referencia de calidad. Marca Hacendado excelente. No es el más barato.' },
  { pos:8,  name:'Carrefour',     idx:104, emoji:'🟡', region:'Nacional',       tip:'4% más caro. Gran variedad y productos internacionales.' },
  { pos:9,  name:'Consum',        idx:106, emoji:'🟡', region:'Valencia/Murcia',tip:'6% más caro. Fuerte en Comunidad Valenciana. Buen género fresco.' },
  { pos:10, name:'Eroski',        idx:107, emoji:'🟡', region:'Norte España',   tip:'7% más caro. Referente en País Vasco, Navarra y Baleares.' },
  { pos:11, name:'Condis',        idx:108, emoji:'🟡', region:'Cataluña',       tip:'8% más caro. Muy extendido en Cataluña y Barcelona.' },
  { pos:12, name:'Ahorramas',     idx:109, emoji:'🟡', region:'Madrid',         tip:'9% más caro. Competitivo en Madrid y alrededores.' },
  { pos:13, name:'Gadis',         idx:110, emoji:'🟡', region:'Galicia/Norte',  tip:'10% más caro. Referente en Galicia y norte de España.' },
  { pos:14, name:'Froiz',         idx:111, emoji:'🟡', region:'Galicia',        tip:'11% más caro. Tradicional en Galicia. Buen género gallego.' },
  { pos:15, name:'Bonpreu',       idx:112, emoji:'🟡', region:'Cataluña',       tip:'12% más caro. Premium catalán. Excelente sección de frescos.' },
  { pos:16, name:'BM Supermercados',idx:113,emoji:'🟡', region:'País Vasco',    tip:'13% más caro. Calidad superior. Muy apreciado en Euskadi.' },
  { pos:17, name:'Supersol',      idx:114, emoji:'🟡', region:'Andalucía',      tip:'14% más caro. Extendido en Andalucía y Canarias.' },
  { pos:18, name:'Hiperber',      idx:114, emoji:'🟡', region:'Valencia',       tip:'Presente en la Comunidad Valenciana. Buen precio en frescos.' },
  { pos:19, name:'Supercor',      idx:116, emoji:'🔴', region:'Ciudades grandes',tip:'16% más caro. Ventaja: ubicación urbana y horario ampliado.' },
  { pos:20, name:'El Corte Inglés',idx:123,emoji:'🔴', region:'Ciudades grandes',tip:'23% más caro. Premium. Calidad y servicio muy superiores.' },
];

// Product comparison — community-verified prices (can be updated via voting)
// Columns: mercadona, lidl, aldi, carrefour, dia
const STORES_KEY = ['aldi','lidl','mercadona','dia','carrefour'];
const STORES_LABEL = { aldi:'Aldi', lidl:'Lidl', mercadona:'Mercadona', dia:'Día', carrefour:'Carrefour' };

const PRODUCTOS = [
  // BÁSICOS
  { name:'Leche entera 1L',          cat:'lácteos',   aldi:0.65, lidl:0.67, mercadona:0.72, dia:0.68, carrefour:0.85 },
  { name:'Leche semidesnatada 1L',   cat:'lácteos',   aldi:0.63, lidl:0.65, mercadona:0.70, dia:0.66, carrefour:0.82 },
  { name:'Leche desnatada 1L',       cat:'lácteos',   aldi:0.62, lidl:0.64, mercadona:0.69, dia:0.65, carrefour:0.80 },
  { name:'Yogur natural x4',         cat:'lácteos',   aldi:0.55, lidl:0.59, mercadona:0.72, dia:0.65, carrefour:0.89 },
  { name:'Yogur griego 0% x4',       cat:'lácteos',   aldi:0.89, lidl:0.95, mercadona:1.15, dia:1.05, carrefour:1.35 },
  { name:'Queso fresco 500g',        cat:'lácteos',   aldi:1.65, lidl:1.79, mercadona:2.05, dia:1.89, carrefour:2.45 },
  { name:'Mantequilla 250g',         cat:'lácteos',   aldi:1.55, lidl:1.65, mercadona:1.85, dia:1.75, carrefour:2.10 },
  { name:'Pasta espaguetis 500g',    cat:'básicos',   aldi:0.39, lidl:0.45, mercadona:0.55, dia:0.49, carrefour:0.65 },
  { name:'Macarrones 500g',          cat:'básicos',   aldi:0.39, lidl:0.45, mercadona:0.55, dia:0.49, carrefour:0.65 },
  { name:'Arroz largo 1kg',          cat:'básicos',   aldi:0.69, lidl:0.72, mercadona:0.85, dia:0.79, carrefour:0.99 },
  { name:'Harina de trigo 1kg',      cat:'básicos',   aldi:0.55, lidl:0.59, mercadona:0.69, dia:0.63, carrefour:0.79 },
  { name:'Azúcar 1kg',               cat:'básicos',   aldi:0.89, lidl:0.95, mercadona:1.05, dia:0.99, carrefour:1.15 },
  { name:'Sal 1kg',                  cat:'básicos',   aldi:0.35, lidl:0.39, mercadona:0.45, dia:0.42, carrefour:0.55 },
  // ACEITES
  { name:'Aceite oliva virgen 1L',   cat:'aceites',   aldi:4.85, lidl:4.99, mercadona:5.49, dia:5.25, carrefour:5.79 },
  { name:'Aceite girasol 1L',        cat:'aceites',   aldi:1.05, lidl:1.09, mercadona:1.29, dia:1.19, carrefour:1.45 },
  // CARNE Y PESCADO
  { name:'Pechuga pollo 1kg',        cat:'carne',     aldi:4.65, lidl:4.49, mercadona:5.20, dia:5.10, carrefour:5.89 },
  { name:'Muslos pollo 1kg',         cat:'carne',     aldi:3.25, lidl:3.15, mercadona:3.95, dia:3.75, carrefour:4.25 },
  { name:'Cerdo picado 500g',        cat:'carne',     aldi:2.15, lidl:2.25, mercadona:2.85, dia:2.65, carrefour:3.15 },
  { name:'Atún en lata 3×80g',       cat:'conservas', aldi:1.55, lidl:1.65, mercadona:1.85, dia:1.79, carrefour:2.15 },
  { name:'Sardinas en aceite',       cat:'conservas', aldi:0.89, lidl:0.95, mercadona:1.15, dia:1.05, carrefour:1.35 },
  // FRUTA Y VERDURA
  { name:'Plátanos 1kg',             cat:'fruta',     aldi:1.45, lidl:1.29, mercadona:1.89, dia:1.69, carrefour:1.99 },
  { name:'Manzanas Golden 1kg',      cat:'fruta',     aldi:1.59, lidl:1.49, mercadona:1.99, dia:1.79, carrefour:2.29 },
  { name:'Naranjas 1kg',             cat:'fruta',     aldi:1.25, lidl:1.19, mercadona:1.79, dia:1.59, carrefour:1.99 },
  { name:'Tomates ensalada 1kg',     cat:'verdura',   aldi:1.29, lidl:1.19, mercadona:1.85, dia:1.59, carrefour:2.09 },
  { name:'Cebollas 1kg',             cat:'verdura',   aldi:0.65, lidl:0.69, mercadona:0.89, dia:0.79, carrefour:0.99 },
  { name:'Patatas 2kg',              cat:'verdura',   aldi:1.05, lidl:1.09, mercadona:1.39, dia:1.25, carrefour:1.65 },
  // PANADERÍA
  { name:'Pan de molde 450g',        cat:'panadería', aldi:0.79, lidl:0.85, mercadona:0.95, dia:0.89, carrefour:1.15 },
  { name:'Pan integral 450g',        cat:'panadería', aldi:0.85, lidl:0.89, mercadona:1.05, dia:0.99, carrefour:1.25 },
  // BEBIDAS
  { name:'Agua mineral 6×1.5L',      cat:'bebidas',   aldi:1.55, lidl:1.69, mercadona:1.99, dia:1.85, carrefour:2.29 },
  { name:'Refresco cola 2L',         cat:'bebidas',   aldi:0.79, lidl:0.85, mercadona:0.99, dia:0.89, carrefour:1.15 },
  { name:'Zumo naranja 1L',          cat:'bebidas',   aldi:1.35, lidl:1.45, mercadona:1.55, dia:1.49, carrefour:1.79 },
  { name:'Cerveza 6×33cl',           cat:'bebidas',   aldi:2.45, lidl:2.65, mercadona:2.99, dia:2.79, carrefour:3.45 },
  // LIMPIEZA
  { name:'Detergente lavadora 40',   cat:'limpieza',  aldi:4.10, lidl:4.29, mercadona:3.95, dia:4.55, carrefour:5.99 },
  { name:'Lavavajillas 750ml',       cat:'limpieza',  aldi:0.89, lidl:0.95, mercadona:1.05, dia:0.99, carrefour:1.35 },
  { name:'Lejía 2L',                 cat:'limpieza',  aldi:0.55, lidl:0.59, mercadona:0.65, dia:0.62, carrefour:0.89 },
  { name:'Suavizante 32 lavados',    cat:'limpieza',  aldi:1.55, lidl:1.65, mercadona:1.85, dia:1.75, carrefour:2.35 },
  // HIGIENE
  { name:'Papel higiénico x12',      cat:'higiene',   aldi:2.75, lidl:2.89, mercadona:3.10, dia:2.99, carrefour:3.99 },
  { name:'Gel ducha 750ml',          cat:'higiene',   aldi:0.89, lidl:0.95, mercadona:1.09, dia:0.99, carrefour:1.45 },
  { name:'Champú 750ml',             cat:'higiene',   aldi:0.99, lidl:1.05, mercadona:1.25, dia:1.15, carrefour:1.65 },
  { name:'Pasta dientes 75ml',       cat:'higiene',   aldi:0.55, lidl:0.59, mercadona:0.75, dia:0.69, carrefour:0.99 },
  { name:'Jabón líquido manos 500ml',cat:'higiene',   aldi:1.10, lidl:1.35, mercadona:1.20, dia:1.25, carrefour:1.65 },
  // DESAYUNO
  { name:'Café molido 250g',         cat:'café',      aldi:2.15, lidl:2.25, mercadona:2.45, dia:2.35, carrefour:2.89 },
  { name:'Cereales corn flakes 500g',cat:'desayuno',  aldi:1.15, lidl:1.25, mercadona:1.45, dia:1.35, carrefour:1.89 },
  { name:'Galletas María 800g',      cat:'desayuno',  aldi:1.09, lidl:1.15, mercadona:1.35, dia:1.25, carrefour:1.69 },
  { name:'Mermelada fresa 450g',     cat:'desayuno',  aldi:0.79, lidl:0.85, mercadona:1.05, dia:0.95, carrefour:1.35 },
  { name:'Nocilla/crema cacao 400g', cat:'desayuno',  aldi:1.45, lidl:1.55, mercadona:1.95, dia:1.75, carrefour:2.25 },
  // CONSERVAS
  { name:'Tomates triturados 400g',  cat:'conservas', aldi:0.45, lidl:0.49, mercadona:0.55, dia:0.52, carrefour:0.69 },
  { name:'Garbanzos cocidos 400g',   cat:'conservas', aldi:0.55, lidl:0.59, mercadona:0.75, dia:0.69, carrefour:0.89 },
  { name:'Maíz dulce 340g',          cat:'conservas', aldi:0.65, lidl:0.69, mercadona:0.85, dia:0.79, carrefour:1.05 },
  // HUEVOS
  { name:'Huevos L x12',             cat:'huevos',    aldi:1.89, lidl:1.99, mercadona:2.15, dia:2.05, carrefour:2.45 },
  { name:'Huevos M x12',             cat:'huevos',    aldi:1.69, lidl:1.79, mercadona:1.95, dia:1.85, carrefour:2.25 },
];

// Best per category (computed from data above)
const BY_CAT = {
  frescos:       { winner:'Lidl',      runner_up:'Aldi',       note:'Mejor precio en frutas, verduras y carne fresca' },
  básicos:       { winner:'Aldi',      runner_up:'Lidl',       note:'Pasta, arroz, harina: Aldi gana en básicos' },
  marca_blanca:  { winner:'Aldi',      runner_up:'Lidl',       note:'Marca propia más barata de España' },
  bebidas:       { winner:'Aldi',      runner_up:'Lidl',       note:'Agua, refrescos y zumos más baratos' },
  limpieza:      { winner:'Mercadona', runner_up:'Aldi',       note:'Bosque Verde: mejor relación calidad/precio' },
  higiene:       { winner:'Aldi',      runner_up:'Mercadona',  note:'Higiene personal más barata en Aldi' },
  pescado:       { winner:'Mercadona', runner_up:'Lidl',       note:'Mejor calidad/precio en pescadería y mariscos' },
  lacteos:       { winner:'Aldi',      runner_up:'Lidl',       note:'Leche y yogures más baratos' },
  pueblo_rural:  { winner:'Coviran',   runner_up:'Spar',       note:'Para tiendas de pueblo: Coviran y Spar son los más accesibles' },
};

const CATS_PROD = ['todos','básicos','lácteos','carne','fruta','verdura','bebidas','conservas','limpieza','higiene','panadería','desayuno','aceites','café','huevos'];

const CONSEJOS = [
  { emoji:'🥇', title:'Aldi es el más barato de España', desc:'En básicos (pasta, arroz, leche) ahorra entre el 20-35% vs Mercadona. Pruébalo.' },
  { emoji:'🥦', title:'Frescos en Lidl o mercado local', desc:'Lidl tiene la carne y fruta más baratas entre los grandes. El mercado local puede ganarle.' },
  { emoji:'🧹', title:'Limpieza en Mercadona', desc:'Bosque Verde es la mejor relación calidad/precio en limpieza. Aquí sí gana Mercadona.' },
  { emoji:'🏪', title:'En pueblos: Coviran y Spar', desc:'Si tienes una tienda de pueblo, Coviran y Spar son las más extendidas y asequibles de las locales.' },
  { emoji:'📱', title:'Apps de descuentos', desc:'Lidl Plus, Alcampo app y Carrefour app tienen descuentos exclusivos del 20-40% semanales.' },
  { emoji:'🕐', title:'Compra a última hora', desc:'A partir de las 20h, muchos supermercados reducen hasta el 50% los productos próximos a caducar.' },
  { emoji:'📦', title:'Marca blanca siempre', desc:'En básicos, la diferencia de calidad es mínima pero el ahorro es del 40-60%. Sin excepciones.' },
  { emoji:'🔄', title:'Combina tiendas', desc:'Frescos en Lidl, secos en Aldi, limpieza en Mercadona. Ahorro del 20-25% sobre comprar todo en uno.' },
];


export default function SupermarketsScreen({ embedded = false }) {
  const { isLoggedIn } = useAuth();
  let navigation;
  try { navigation = useNavigation(); } catch { navigation = null; }
  const Wrapper = embedded ? View : SafeAreaView;
  const wrapperProps = embedded ? {style:{flex:1,backgroundColor:COLORS.bg}} : {style:s.safe, edges:['top']};
  const [tab, setTab]             = useState('ranking');
  const [search, setSearch]       = useState('');
  const [catFilter, setCatFilter] = useState('todos');
  const [community, setCommunity] = useState([]);
  const [communityCity, setCommunityCity] = useState('');  // city filter
  const [refreshing, setRefreshing] = useState(false);
  const [showAuth, setShowAuth]   = useState(false);
  const [priceHistory, setPriceHistory] = useState({});
  const [selectedProd, setSelectedProd] = useState(null);
  const [allCities, setAllCities] = useState([]);

  useEffect(() => { loadCommunity(); loadPriceHistory(); }, [communityCity]);
  const onRefresh = useCallback(() => { setRefreshing(true); loadCommunity(); loadPriceHistory(); }, [communityCity]);

  async function loadPriceHistory() {
    try {
      const data = await apiGet('/api/places/1/price-history') || {};
      if (data.history) setPriceHistory(data.history);
    } catch {}
  }

  async function loadCommunity() {
    try {
      let url = '/api/places?cat=supermercado&sort=price';
      if (communityCity) url += `&city=${encodeURIComponent(communityCity)}`;
      const data = await apiGet(url) || [];
      setCommunity(Array.isArray(data) ? data : []);
      // Extract unique cities for filter
      const cities = [...new Set((Array.isArray(data) ? data : []).map(p => p.city).filter(Boolean))];
      if (cities.length > 0) setAllCities(prev => [...new Set([...prev, ...cities])]);
    } catch {}
    finally { setRefreshing(false); }
  }

  // Load all cities on mount — with count per city
  useEffect(() => {
    apiGet('/api/places?cat=supermercado').then(data => {
      if (Array.isArray(data)) {
        // Count per city and sort by count desc
        const cityCount = {};
        data.forEach(p => { if (p.city) cityCount[p.city] = (cityCount[p.city]||0)+1; });
        const sorted = Object.entries(cityCount).sort((a,b)=>b[1]-a[1]).map(([c])=>c);
        setAllCities(sorted);
      }
    }).catch(() => {});
  }, []);

  // MUST be declared before filteredProds (no hoisting for arrow functions)
  const savings = (p) => {
    const prices = [p.mercadona, p.lidl, p.aldi, p.carrefour].filter(Boolean);
    if (prices.length < 2) return '0';
    const min = Math.min(...prices), max = Math.max(...prices);
    if (!max || max === 0) return '0';
    return ((max - min) / max * 100).toFixed(0);
  };

  const filteredProds = PRODUCTOS.filter(p => {
    const matchCat = catFilter === 'todos' || p.cat === catFilter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  }).sort((a,b) => {
    const savA = parseFloat(savings(a));
    const savB = parseFloat(savings(b));
    return savB - savA;
  });

  return (
    <Wrapper {...wrapperProps}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View style={{flex:1}}>
            <Text style={s.title}>🛒 Supermercados</Text>
            <Text style={s.sub}>Datos OCU 2024 + comunidad</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => navigation ? navigation.navigate('Mapa') : Alert.alert('💡', 'Ve a la pestaña Mapa, busca un supermercado y pulsa para añadir precio')}>
            <Ionicons name="add-circle-outline" size={14} color={COLORS.success}/>
            <Text style={s.addBtnTxt}>Añadir precio</Text>
          </TouchableOpacity>
        </View>
        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingHorizontal:12,gap:6,paddingBottom:10}}>
          {TABS.map(t => (
            <TouchableOpacity key={t.key} style={[s.tabBtn, tab===t.key && s.tabBtnOn]} onPress={()=>setTab(t.key)}>
              <Text style={[s.tabTxt, tab===t.key && {color:'#fff',fontWeight:'700'}]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary}/>}
        contentContainerStyle={{paddingBottom:100}}>

        {/* ── RANKING TAB ── */}
        {tab==='ranking' && <>
          {/* Savings banner */}
          <View style={{flexDirection:'row',backgroundColor:'#DCFCE7',borderRadius:12,margin:12,padding:12,gap:10,alignItems:'center'}}>
            <Text style={{fontSize:24}}>💰</Text>
            <View style={{flex:1}}>
              <Text style={{fontSize:13,fontWeight:'700',color:'#166534'}}>Ahorra hasta 45€/mes cambiando de super</Text>
              <Text style={{fontSize:11,color:'#166534',opacity:0.8}}>Comprando en Aldi en lugar del más caro · Estudio OCU 2024</Text>
            </View>
          </View>
          <View style={s.ocuBadge}>
            <Ionicons name="shield-checkmark" size={13} color={COLORS.primary}/>
            <Text style={s.ocuTxt}>Fuente: OCU Estudio Anual 2024 · 140 productos · Actualizado nov 2024</Text>
            <TouchableOpacity onPress={()=>Linking.openURL('https://www.ocu.org/alimentacion/supermercados').catch(()=>{})}>
              <Text style={{fontSize:11,color:COLORS.primary,fontWeight:'700'}}>Ver →</Text>
            </TouchableOpacity>
          </View>
          {/* Podium top 3 */}
          <View style={s.podium}>
            {[1,0,2].map(idx => {
              const r = RANKING[idx];
              const colors = ['#F59E0B','#16A34A','#B45309'];
              const medals = ['🥇','🥈','🥉'];
              const sizes = [60,52,48];
              return (
                <View key={r.name} style={[s.podCard,{borderColor:colors[idx]+'44',flex:idx===0?1.2:1}]}>
                  <Text style={{fontSize:sizes[idx]===60?28:22}}>{medals[idx===0?1:idx===1?0:2]}</Text>
                  <Text style={[s.podName,{color:colors[idx]}]}>{r.name}</Text>
                  <Text style={s.podIdx}>Índice {r.idx}</Text>
                  <Text style={s.podSavings}>
                    {r.idx<100 ? `${100-r.idx}% más barato` : r.idx===100 ? 'Referencia' : `${r.idx-100}% más caro`}
                  </Text>
                </View>
              );
            })}
          </View>
          {/* Full list */}
          {RANKING.map(r => (
            <View key={r.name} style={s.rankRow}>
              <Text style={s.rankPos}>#{r.pos}</Text>
              <Text style={{fontSize:18,marginRight:8}}>{r.emoji}</Text>
              <View style={{flex:1}}>
                <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                  <Text style={s.rankName}>{r.name}</Text>
                  {r.region && r.region !== 'Nacional' && (
                    <View style={{backgroundColor:COLORS.bg3,borderRadius:4,paddingHorizontal:5,paddingVertical:1}}>
                      <Text style={{fontSize:9,color:COLORS.text3,fontWeight:'600'}}>{r.region}</Text>
                    </View>
                  )}
                </View>
                <Text style={s.rankTip} numberOfLines={2}>{r.tip}</Text>
              </View>
              <View style={{alignItems:'flex-end'}}>
                <Text style={[s.rankIdx,{color: r.idx<92?COLORS.success:r.idx<100?'#22C55E':r.idx===100?COLORS.text2:r.idx<110?COLORS.warning:COLORS.danger}]}>
                  {r.idx < 100 ? `-${100-r.idx}%` : r.idx === 100 ? 'Ref' : `+${r.idx-100}%`}
                </Text>
                <Text style={{fontSize:8,color:COLORS.text3}}>vs referencia</Text>
              </View>
            </View>
          ))}
          {/* Community prices with city filter */}
          <View style={{marginHorizontal:12,marginTop:16}}>
            <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
              <Text style={s.sectionTitle}>📍 Supermercados en el mapa</Text>
              <Text style={{fontSize:11,color:COLORS.text3}}>{community.length} encontrados</Text>
            </View>
            {/* City filter pills */}
            {allCities.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6,paddingBottom:8}}>
                {['', ...allCities].map(city => (
                  <TouchableOpacity key={city||'all'} style={[
                    {paddingHorizontal:12,paddingVertical:5,borderRadius:99,borderWidth:1.5,borderColor:communityCity===city?COLORS.primary:COLORS.border,backgroundColor:communityCity===city?COLORS.primary:COLORS.bg},
                  ]} onPress={() => setCommunityCity(city)}>
                    <Text style={{fontSize:12,fontWeight:'600',color:communityCity===city?'#fff':COLORS.text2}}>
                      {city || '🇪🇸 Toda España'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
          {community.length > 0 ? community.map(p => {
              // Get brand tag from name
              const brandColors = {Mercadona:'#008F39',Lidl:'#FFE000',Aldi:'#00539F',Carrefour:'#0070C0',Día:'#E4002B',Alcampo:'#FF6600',Eroski:'#C00',Consum:'#009900',Supersol:'#FF8C00',Gadis:'#005AA7',Coviran:'#E8001C',Spar:'#E3001B',Froiz:'#005AA7',BM:'#003087',Bonpreu:'#00529B',Condis:'#CC0000',Ahorramas:'#FF7700',Hiperdino:'#FF0000'};
              const brand = Object.keys(brandColors).find(b => p.name.includes(b)) || null;
              const brandColor = brand ? brandColors[brand] : COLORS.primary;
              const prices = p.prices || [];
              const cheapest = prices.length > 0 ? prices.sort((a,b) => a.price-b.price)[0] : null;
              return (
              <TouchableOpacity key={p.id} style={[s.communityRow,{paddingVertical:14}]} onPress={() => navigation?.navigate('Mapa')}>
                <View style={{width:40,height:40,borderRadius:10,backgroundColor:brandColor+'15',borderWidth:1.5,borderColor:brandColor+'44',alignItems:'center',justifyContent:'center',marginRight:10}}>
                  <Text style={{fontSize:10,fontWeight:'800',color:brandColor}} numberOfLines={1}>
                    {brand ? brand.slice(0,6).toUpperCase() : '🛒'}
                  </Text>
                </View>
                <View style={{flex:1}}>
                  <Text style={s.communityName} numberOfLines={1}>{p.name}</Text>
                  <Text style={s.communityCity}>📍 {p.city}{p.address ? ` · ${p.address.slice(0,25)}` : ''}</Text>
                  {cheapest && (
                    <Text style={{fontSize:10,color:COLORS.success,fontWeight:'700',marginTop:2}}>
                      {cheapest.product}: {cheapest.price?.toFixed(2)}€
                    </Text>
                  )}
                </View>
                <View style={{alignItems:'flex-end',gap:2}}>
                  {prices.length > 0 && <Text style={{fontSize:10,color:COLORS.text3}}>{prices.length} precios</Text>}
                  <Ionicons name="chevron-forward" size={12} color={COLORS.text3}/>
                </View>
              </TouchableOpacity>
              );
            }) : (
              <View style={{alignItems:'center',padding:20}}>
                <Text style={{fontSize:13,color:COLORS.text3,textAlign:'center'}}>
                  {communityCity ? `Sin datos para ${communityCity}` : 'Sin datos de comunidad aún'}
                </Text>
                <TouchableOpacity style={{marginTop:8,backgroundColor:COLORS.primaryLight,borderRadius:99,paddingHorizontal:16,paddingVertical:8}} onPress={() => navigation?.navigate('Mapa')}>
                  <Text style={{fontSize:12,color:COLORS.primary,fontWeight:'700'}}>Ver en el mapa →</Text>
                </TouchableOpacity>
              </View>
            )}
        </>}

        {/* ── PRODUCTOS TAB ── */}
        {tab==='productos' && <>
          <View style={s.searchBox}>
            <Ionicons name="search-outline" size={15} color={COLORS.text3}/>
            <TextInput style={s.searchInput} value={search} onChangeText={setSearch}
              placeholder="Buscar producto... (leche, arroz, aceite...)"
              placeholderTextColor={COLORS.text3} returnKeyType="search"/>
            {search ? <TouchableOpacity onPress={()=>setSearch('')}><Ionicons name="close-circle" size={16} color={COLORS.text3}/></TouchableOpacity> : null}
          </View>
          {/* Category filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{paddingHorizontal:12,gap:6,paddingVertical:8}}>
            {CATS_PROD.map(c => (
              <TouchableOpacity key={c} style={[s.catChip, catFilter===c && s.catChipOn]} onPress={()=>setCatFilter(c)}>
                <Text style={[s.catChipTxt, catFilter===c && {color:'#fff',fontWeight:'700'}]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {/* Table header — 5 stores */}
          <View style={[s.tableHeader,{paddingHorizontal:12}]}>
            <Text style={[s.tableHCell,{flex:2,textAlign:'left'}]}>Producto</Text>
            {STORES_KEY.map(k => (
              <Text key={k} style={[s.tableHCell,{flex:1,textAlign:'center',fontSize:9}]}>{STORES_LABEL[k]}</Text>
            ))}
          </View>
          {filteredProds.length === 0
            ? <Text style={{textAlign:'center',color:COLORS.text3,padding:30,fontSize:14}}>Sin resultados para "{search}"</Text>
            : filteredProds.map(p => {
              // Find cheapest store
              const prices = STORES_KEY.map(k => p[k]).filter(v => v != null);
              const minPrice = prices.length ? Math.min(...prices) : null;
              // Find cheapest store name
              const bestStore = STORES_KEY.find(k => p[k] === minPrice);
              const hasHistory = priceHistory[p.name];
              return (
              <TouchableOpacity key={p.name} style={s.tableRow} onPress={() => hasHistory ? setSelectedProd(p) : null} activeOpacity={hasHistory ? 0.7 : 1}>
                <View style={{flex:2,paddingRight:4}}>
                  <Text style={s.prodName} numberOfLines={2}>{p.name}</Text>
                  <View style={{flexDirection:'row',alignItems:'center',gap:4,marginTop:2,flexWrap:'wrap'}}>
                    {bestStore && <Text style={{fontSize:9,backgroundColor:'#DCFCE7',color:'#166534',borderRadius:4,paddingHorizontal:4,paddingVertical:1,fontWeight:'700'}}>
                      🏆 {STORES_LABEL[bestStore]}
                    </Text>}
                    <Text style={{fontSize:9,color:COLORS.text3}}>-{savings(p)}% ahorro máx.</Text>
                    {hasHistory && <Text style={{fontSize:9,color:COLORS.primary}}>📊</Text>}
                  </View>
                </View>
                {STORES_KEY.map(k => {
                  const price = p[k];
                  const isMin = price != null && price === minPrice;
                  return (
                    <View key={k} style={{flex:1,alignItems:'center'}}>
                      {price != null ? (
                        <Text style={[{fontSize:11,fontWeight:isMin?'800':'400',color:isMin?'#16A34A':COLORS.text}]}>
                          {(+price||0).toFixed(2)}
                        </Text>
                      ) : <Text style={{fontSize:10,color:COLORS.text3}}>—</Text>}
                    </View>
                  );
                })}
              </TouchableOpacity>
              );
            })
          }
          <TouchableOpacity
            style={{margin:12,padding:12,backgroundColor:COLORS.primaryLight,borderRadius:10,alignItems:'center'}}
            onPress={() => Alert.alert('💬 Proponer precio', 'Ve al mapa → busca el supermercado → toca el pin → "Proponer cambio de precio".\n\nTus propuestas son votadas por la comunidad y se aplican automáticamente con 5 votos.', [{text:'Entendido'}])}>
            <Text style={{fontSize:13,color:COLORS.primary,fontWeight:'700'}}>💡 ¿Precios desactualizados? Propón un cambio</Text>
          </TouchableOpacity>
          <View style={s.disclaimer}>
            <Text style={s.disclaimerTxt}>ℹ️ Precios orientativos. Pueden variar por zona y fecha. Fuente: datos de comunidad + fuentes públicas.</Text>
          </View>
        </>}

        {/* ── POR CATEGORÍA TAB ── */}
        {tab==='categoria' && Object.entries(BY_CAT).map(([key,val]) => (
          <View key={key} style={s.catCard}>
            <Text style={s.catCardKey}>{key.replace('_',' ').toUpperCase()}</Text>
            <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
              <View style={s.catWinner}><Text style={s.catWinnerTxt}>🏆 {val.winner}</Text></View>
              {val.runner_up && <Text style={{fontSize:12,color:COLORS.text3}}>🥈 {val.runner_up}</Text>}
            </View>
            <Text style={s.catNote}>{val.note}</Text>
          </View>
        ))}

        {/* ── CONSEJOS TAB ── */}
        {tab==='consejos' && <>
          <View style={s.savingsBanner}>
            <Text style={s.savingsBannerTxt}>💰 Combinar supermercados puede ahorrarte hasta un <Text style={{fontWeight:'800'}}>25% al mes</Text> — unos <Text style={{fontWeight:'800'}}>600-900€ al año</Text></Text>
          </View>
          {CONSEJOS.map(t => (
            <View key={t.title} style={s.tipCard}>
              <Text style={s.tipEmoji}>{t.emoji}</Text>
              <View style={{flex:1}}>
                <Text style={s.tipTitle}>{t.title}</Text>
                <Text style={s.tipDesc}>{t.desc}</Text>
              </View>
            </View>
          ))}
        </>}

      </ScrollView>
      <AuthModal visible={showAuth} onClose={()=>setShowAuth(false)}/>

      {/* Price history modal */}
      {selectedProd && priceHistory[selectedProd.name] && (
        <View style={{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'flex-end'}}>
          <View style={{backgroundColor:COLORS.bg2,borderTopLeftRadius:20,borderTopRightRadius:20,padding:20,maxHeight:'60%'}}>
            <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <Text style={{fontSize:16,fontWeight:'700',color:COLORS.text,flex:1}} numberOfLines={2}>{selectedProd.name}</Text>
              <TouchableOpacity onPress={()=>setSelectedProd(null)} style={{padding:4}}>
                <Ionicons name="close" size={22} color={COLORS.text2}/>
              </TouchableOpacity>
            </View>
            <Text style={{fontSize:12,color:COLORS.text3,marginBottom:12}}>📈 Evolución de precio — Mercadona (últimos 20 días)</Text>
            {(() => {
              const pts = priceHistory[selectedProd.name];
              if (!pts || pts.length < 2) return <Text style={{color:COLORS.text3}}>Sin suficientes datos</Text>;
              const prices = pts.map(p=>p.price);
              const minP = Math.min(...prices), maxP = Math.max(...prices);
              const range = maxP - minP || 0.01;
              const W = 300, H = 80;
              return (
                <View>
                  <View style={{flexDirection:'row',height:H,alignItems:'flex-end',gap:3,paddingBottom:4}}>
                    {pts.map((p,i) => {
                      const h = Math.max(8, ((p.price-minP)/range)*H*0.9+8);
                      const isLast = i===pts.length-1;
                      return (
                        <View key={i} style={{flex:1,height:h,backgroundColor:isLast?COLORS.primary:COLORS.border,borderRadius:2}}/>
                      );
                    })}
                  </View>
                  <View style={{flexDirection:'row',justifyContent:'space-between',marginTop:8}}>
                    <Text style={{fontSize:11,color:COLORS.text3}}>{pts[0]?.date}</Text>
                    <Text style={{fontSize:13,fontWeight:'700',color:COLORS.primary}}>
                      Hoy: {pts[pts.length-1]?.price?.toFixed(2)}€
                    </Text>
                    <Text style={{fontSize:11,color:COLORS.text3}}>{pts[pts.length-1]?.date}</Text>
                  </View>
                  <View style={{flexDirection:'row',justifyContent:'space-between',marginTop:8,backgroundColor:COLORS.bg3,borderRadius:8,padding:10}}>
                    <Text style={{fontSize:12,color:COLORS.success}}>🟢 Min: {(minP||0).toFixed(2)}€</Text>
                    <Text style={{fontSize:12,color:COLORS.text2}}>Avg: {prices.length ? (prices.reduce((a,b)=>a+b,0)/prices.length).toFixed(2) : '0.00'}€</Text>
                    <Text style={{fontSize:12,color:COLORS.danger}}>🔴 Max: {(maxP||0).toFixed(2)}€</Text>
                  </View>
                </View>
              );
            })()}
          </View>
        </View>
      )}
    </Wrapper>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:COLORS.bg},
  header:{backgroundColor:COLORS.bg2,borderBottomWidth:0.5,borderBottomColor:COLORS.border},
  headerTop:{flexDirection:'row',alignItems:'center',paddingHorizontal:14,paddingTop:12,paddingBottom:8,gap:8},
  title:{fontSize:20,fontWeight:'700',color:COLORS.text},
  sub:{fontSize:11,color:COLORS.text3,marginTop:1},
  addBtn:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:COLORS.successLight,borderRadius:99,paddingHorizontal:10,paddingVertical:6,borderWidth:1,borderColor:COLORS.success},
  addBtnTxt:{fontSize:11,fontWeight:'700',color:COLORS.success},
  tabBtn:{paddingHorizontal:12,paddingVertical:7,borderRadius:99,borderWidth:1.5,borderColor:COLORS.border,backgroundColor:COLORS.bg},
  tabBtnOn:{backgroundColor:COLORS.primary,borderColor:COLORS.primary},
  tabTxt:{fontSize:12,color:COLORS.text2},
  ocuBadge:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:COLORS.primaryLight,margin:12,borderRadius:10,padding:10},
  ocuTxt:{flex:1,fontSize:11,color:COLORS.primary,lineHeight:16},
  podium:{flexDirection:'row',gap:8,marginHorizontal:12,marginBottom:8},
  podCard:{backgroundColor:COLORS.bg2,borderRadius:14,padding:12,alignItems:'center',gap:4,borderWidth:1.5},
  podName:{fontSize:12,fontWeight:'800',color:COLORS.text,textAlign:'center'},
  podIdx:{fontSize:11,color:COLORS.text3},
  podSavings:{fontSize:10,color:COLORS.success,fontWeight:'600',textAlign:'center'},
  rankRow:{flexDirection:'row',alignItems:'center',paddingHorizontal:14,paddingVertical:10,borderBottomWidth:0.5,borderBottomColor:COLORS.border,backgroundColor:COLORS.bg2},
  rankPos:{fontSize:13,color:COLORS.text3,width:24,fontWeight:'700'},
  rankName:{fontSize:14,fontWeight:'700',color:COLORS.text},
  rankTip:{fontSize:11,color:COLORS.text3,marginTop:2,lineHeight:16},
  rankIdx:{fontSize:18,fontWeight:'800'},
  sectionTitle:{fontSize:12,fontWeight:'700',color:COLORS.text3,paddingHorizontal:14,paddingTop:16,paddingBottom:8,letterSpacing:0.5},
  communityRow:{flexDirection:'row',alignItems:'center',paddingHorizontal:14,paddingVertical:10,borderBottomWidth:0.5,borderBottomColor:COLORS.border},
  communityDot:{width:8,height:8,borderRadius:4,backgroundColor:COLORS.success,marginRight:10},
  communityName:{fontSize:14,fontWeight:'600',color:COLORS.text},
  communityCity:{fontSize:11,color:COLORS.text3,marginTop:1},
  communityPrice:{fontSize:14,fontWeight:'700',color:COLORS.primary},
  searchBox:{flexDirection:'row',alignItems:'center',backgroundColor:COLORS.bg2,borderRadius:12,borderWidth:1.5,borderColor:COLORS.border,paddingHorizontal:12,paddingVertical:10,margin:12,gap:8},
  searchInput:{flex:1,fontSize:14,color:COLORS.text},
  catChip:{paddingHorizontal:12,paddingVertical:6,borderRadius:99,borderWidth:1.5,borderColor:COLORS.border,backgroundColor:COLORS.bg},
  catChipOn:{backgroundColor:COLORS.primary,borderColor:COLORS.primary},
  catChipTxt:{fontSize:12,color:COLORS.text2},
  tableHeader:{flexDirection:'row',backgroundColor:COLORS.bg3,paddingHorizontal:8,paddingVertical:8,borderBottomWidth:0.5,borderBottomColor:COLORS.border},
  tableHCell:{flex:1,fontSize:10,fontWeight:'700',color:COLORS.text3,textAlign:'center'},
  tableRow:{flexDirection:'row',alignItems:'center',paddingHorizontal:8,paddingVertical:10,borderBottomWidth:0.5,borderBottomColor:COLORS.border,backgroundColor:COLORS.bg2},
  prodName:{fontSize:13,fontWeight:'600',color:COLORS.text},
  tableCell:{flex:1,fontSize:12,color:COLORS.text2,textAlign:'center'},
  tableCellBest:{color:COLORS.success,fontWeight:'800'},
  disclaimer:{margin:12,padding:12,backgroundColor:COLORS.bg3,borderRadius:10},
  disclaimerTxt:{fontSize:11,color:COLORS.text3,lineHeight:17},
  catCard:{backgroundColor:COLORS.bg2,marginHorizontal:12,marginBottom:8,borderRadius:14,padding:14,borderWidth:0.5,borderColor:COLORS.border},
  catCardKey:{fontSize:11,fontWeight:'700',color:COLORS.text3,letterSpacing:0.8,marginBottom:8},
  catWinner:{backgroundColor:COLORS.successLight,borderRadius:99,paddingHorizontal:12,paddingVertical:4},
  catWinnerTxt:{fontSize:13,fontWeight:'700',color:COLORS.success},
  catNote:{fontSize:12,color:COLORS.text3,marginTop:6,lineHeight:17},
  savingsBanner:{margin:12,backgroundColor:'#ECFDF5',borderRadius:14,padding:14,borderWidth:1,borderColor:COLORS.success+'44'},
  savingsBannerTxt:{fontSize:14,color:'#065F46',lineHeight:22},
  tipCard:{flexDirection:'row',alignItems:'flex-start',paddingHorizontal:14,paddingVertical:14,borderBottomWidth:0.5,borderBottomColor:COLORS.border,gap:14},
  tipEmoji:{fontSize:24,width:32},
  tipTitle:{fontSize:14,fontWeight:'700',color:COLORS.text,marginBottom:4},
  tipDesc:{fontSize:13,color:COLORS.text2,lineHeight:19},
});
