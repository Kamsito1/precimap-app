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

// OCU data - Estudio Anual 2024
const RANKING = [
  { pos:1,  name:'Mercadona',     idx:100, emoji:'🟢', tip:'Referencia nacional. Mejor en limpieza (Bosque Verde) e higiene.' },
  { pos:2,  name:'Alcampo',       idx:96,  emoji:'🟢', tip:'4% más barato. Imbatible en bebidas y droguería.' },
  { pos:3,  name:'Lidl',          idx:93,  emoji:'🟢', tip:'7% más barato. Campeón en frutas, verduras y carne fresca.' },
  { pos:4,  name:'Aldi',          idx:91,  emoji:'🟢', tip:'El más barato. Marca propia sin rival para básicos.' },
  { pos:5,  name:'Día',           idx:95,  emoji:'🟡', tip:'5% más barato pero calidad inferior en frescos.' },
  { pos:6,  name:'Carrefour',     idx:103, emoji:'🟡', tip:'3% más caro. Gran variedad y productos internacionales.' },
  { pos:7,  name:'Eroski',        idx:107, emoji:'🟡', tip:'7% más caro. Fuerte en País Vasco y Navarra.' },
  { pos:8,  name:'Consum',        idx:108, emoji:'🟡', tip:'8% más caro. Referente en Comunidad Valenciana.' },
  { pos:9,  name:'Supercor',      idx:115, emoji:'🔴', tip:'15% más caro. Ventaja: ubicación urbana y horario.' },
  { pos:10, name:'El Corte Inglés',idx:122,emoji:'🔴', tip:'22% más caro. Premium. Calidad y servicio superiores.' },
];

// Product comparison data (updated periodically)
const PRODUCTOS = [
  { name:'Leche entera 1L',         cat:'lácteos',  mercadona:0.72, lidl:0.67, aldi:0.65, carrefour:0.85, best:'Aldi' },
  { name:'Aceite oliva virgen 1L',   cat:'aceites',  mercadona:5.49, lidl:4.99, aldi:4.85, carrefour:5.79, best:'Aldi' },
  { name:'Pasta espaguetis 500g',    cat:'básicos',  mercadona:0.55, lidl:0.45, aldi:0.39, carrefour:0.65, best:'Aldi' },
  { name:'Arroz largo 1kg',          cat:'básicos',  mercadona:0.85, lidl:0.72, aldi:0.69, carrefour:0.99, best:'Aldi' },
  { name:'Pechuga pollo 1kg',        cat:'carne',    mercadona:5.20, lidl:4.49, aldi:4.65, carrefour:5.89, best:'Lidl' },
  { name:'Pan de molde 450g',        cat:'panadería',mercadona:0.95, lidl:0.85, aldi:0.79, carrefour:1.15, best:'Aldi' },
  { name:'Yogur natural x8',         cat:'lácteos',  mercadona:1.25, lidl:1.05, aldi:0.99, carrefour:1.45, best:'Aldi' },
  { name:'Detergente 40 lavados',    cat:'limpieza', mercadona:3.95, lidl:4.29, aldi:4.10, carrefour:5.99, best:'Mercadona' },
  { name:'Agua mineral 6×1.5L',      cat:'bebidas',  mercadona:1.99, lidl:1.69, aldi:1.55, carrefour:2.29, best:'Aldi' },
  { name:'Tomates triturados 400g',  cat:'conservas',mercadona:0.55, lidl:0.49, aldi:0.45, carrefour:0.69, best:'Aldi' },
  { name:'Huevos L x12',             cat:'huevos',   mercadona:2.15, lidl:1.99, aldi:1.89, carrefour:2.45, best:'Aldi' },
  { name:'Mantequilla 250g',         cat:'lácteos',  mercadona:1.85, lidl:1.65, aldi:1.55, carrefour:2.10, best:'Aldi' },
  { name:'Jabón líquido manos 500ml',cat:'higiene',  mercadona:1.20, lidl:1.35, aldi:1.10, carrefour:1.65, best:'Aldi' },
  { name:'Cereales corn flakes 500g',cat:'desayuno', mercadona:1.45, lidl:1.25, aldi:1.15, carrefour:1.89, best:'Aldi' },
  { name:'Zumo naranja 1L',          cat:'bebidas',  mercadona:1.55, lidl:1.45, aldi:1.35, carrefour:1.79, best:'Aldi' },
  { name:'Papel higiénico x12',      cat:'higiene',  mercadona:3.10, lidl:2.89, aldi:2.75, carrefour:3.99, best:'Aldi' },
  { name:'Café molido 250g',         cat:'café',     mercadona:2.45, lidl:2.25, aldi:2.15, carrefour:2.89, best:'Aldi' },
  { name:'Atún en lata x3',          cat:'conservas',mercadona:1.85, lidl:1.65, aldi:1.55, carrefour:2.15, best:'Aldi' },
  { name:'Plátanos 1kg',             cat:'fruta',    mercadona:1.89, lidl:1.29, aldi:1.45, carrefour:1.99, best:'Lidl' },
  { name:'Manzanas 1kg',             cat:'fruta',    mercadona:1.99, lidl:1.49, aldi:1.59, carrefour:2.29, best:'Lidl' },
];

const CATS_PROD = ['todos','básicos','lácteos','carne','fruta','bebidas','conservas','limpieza','higiene','panadería','desayuno','aceites','café','huevos'];

const CONSEJOS = [
  { emoji:'💡', title:'Combina supermercados', desc:'Frescos en Lidl, secos en Aldi, limpieza en Mercadona. Ahorro del 20-25% sobre comprar todo en uno.' },
  { emoji:'🥦', title:'Frutas y verduras en Lidl o mercado local', desc:'Lidl tiene la carne y fruta más baratas. El mercado local puede ser aún más barato y de más calidad.' },
  { emoji:'🧹', title:'Limpieza en Mercadona', desc:'Bosque Verde (marca blanca) es la mejor relación calidad/precio en España. Más barato que las marcas.' },
  { emoji:'📱', title:'Usa las apps de descuentos', desc:'Lidl Plus, Alcampo app y Carrefour app tienen descuentos exclusivos semanales del 20-40%.' },
  { emoji:'🕐', title:'Compra a última hora', desc:'Muchos supermercados reducen hasta el 50% los productos próximos a caducar a partir de las 20h.' },
  { emoji:'🛒', title:'Lista de la compra fija', desc:'Tener una lista fija y comparar precios entre cadenas te puede ahorrar 30-50€ al mes.' },
  { emoji:'📦', title:'Marca blanca siempre primero', desc:'En básicos (arroz, pasta, leche, aceite) la diferencia de calidad es mínima pero el ahorro es del 40-60%.' },
  { emoji:'🔄', title:'Aprovecha ofertas "3x2"', desc:'Solo si son productos que consumirías de todas formas. Nunca compres más de lo que vas a usar.' },
];

const BY_CAT = {
  frescos:      { winner:'Lidl',      runner_up:'Mercadona', note:'Mejor precio en frutas, verduras y carne' },
  marca_blanca: { winner:'Aldi',      runner_up:'Lidl',      note:'Marca propia más barata de España' },
  bebidas:      { winner:'Alcampo',   runner_up:'Aldi',      note:'Mejor precio en agua, refrescos y zumos' },
  limpieza:     { winner:'Mercadona', runner_up:'Aldi',      note:'Mejor relación calidad/precio con Bosque Verde' },
  higiene:      { winner:'Mercadona', runner_up:'Alcampo',   note:'Mejor marca blanca de higiene personal' },
  pescado:      { winner:'Mercadona', runner_up:'Lidl',      note:'Mejor precio y calidad en pescadería' },
  lacteos:      { winner:'Aldi',      runner_up:'Lidl',      note:'Leche y yogures más baratos' },
};

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
  const [refreshing, setRefreshing] = useState(false);
  const [showAuth, setShowAuth]   = useState(false);
  const [priceHistory, setPriceHistory] = useState({}); // { productName: [{date,price}] }
  const [selectedProd, setSelectedProd] = useState(null);

  useEffect(() => { loadCommunity(); loadPriceHistory(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); loadCommunity(); loadPriceHistory(); }, []);

  async function loadPriceHistory() {
    try {
      // Load history from Mercadona (place_id=1) as reference
      const data = await apiGet('/api/places/1/price-history') || {};
      if (data.history) setPriceHistory(data.history);
    } catch {}
  }

  async function loadCommunity() {
    try {
      // Load user-reported supermarket prices from the Map
      const data = await apiGet('/api/places?cat=supermercado&sort=price') || [];
      setCommunity(data);
    } catch {}
    finally { setRefreshing(false); }
  }

  const filteredProds = PRODUCTOS.filter(p => {
    const matchCat = catFilter === 'todos' || p.cat === catFilter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  }).sort((a,b) => {
    // Sort by savings potential (descending)
    const savA = parseFloat(savings(a));
    const savB = parseFloat(savings(b));
    return savB - savA;
  });

  const savings = (p) => {
    const prices = [p.mercadona, p.lidl, p.aldi, p.carrefour].filter(Boolean);
    const min = Math.min(...prices), max = Math.max(...prices);
    return ((max - min) / max * 100).toFixed(0);
  };

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
          <View style={s.ocuBadge}>
            <Ionicons name="shield-checkmark" size={13} color={COLORS.primary}/>
            <Text style={s.ocuTxt}>Fuente: OCU Estudio Anual 2024 · 140 productos · Actualizado nov 2024</Text>
            <TouchableOpacity onPress={()=>Linking.openURL('https://www.ocu.org/alimentacion/supermercados')}>
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
                <Text style={s.rankName}>{r.name}</Text>
                <Text style={s.rankTip} numberOfLines={2}>{r.tip}</Text>
              </View>
              <View style={{alignItems:'flex-end'}}>
                <Text style={[s.rankIdx,{color: r.idx<100?COLORS.success:r.idx===100?COLORS.text2:r.idx<110?COLORS.warning:COLORS.danger}]}>
                  {r.idx}
                </Text>
                <Text style={{fontSize:9,color:COLORS.text3}}>índice</Text>
              </View>
            </View>
          ))}
          {/* Community prices */}
          {community.length > 0 && <>
            <Text style={s.sectionTitle}>📍 Supermercados reportados por la comunidad</Text>
            {community.map(p => (
              <View key={p.id} style={s.communityRow}>
                <View style={s.communityDot}/>
                <View style={{flex:1}}>
                  <Text style={s.communityName}>{p.name}</Text>
                  <Text style={s.communityCity}>{p.city}</Text>
                </View>
                {p.minPrice && <Text style={s.communityPrice}>desde {p.minPrice.toFixed(2)}€</Text>}
              </View>
            ))}
          </>}
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
          {/* Table header */}
          <View style={s.tableHeader}>
            <Text style={[s.tableHCell,{flex:2}]}>Producto</Text>
            <Text style={s.tableHCell}>Merc.</Text>
            <Text style={s.tableHCell}>Lidl</Text>
            <Text style={s.tableHCell}>Aldi</Text>
            <Text style={s.tableHCell}>Carr.</Text>
          </View>
          {filteredProds.length === 0
            ? <Text style={{textAlign:'center',color:COLORS.text3,padding:30,fontSize:14}}>No se encontraron productos con "{search}"</Text>
            : filteredProds.map(p => (
              <TouchableOpacity key={p.name} style={s.tableRow} onPress={() => priceHistory[p.name] ? setSelectedProd(p) : null} activeOpacity={priceHistory[p.name] ? 0.7 : 1}>
                <View style={{flex:2,paddingRight:4}}>
                  <Text style={s.prodName} numberOfLines={2}>{p.name}</Text>
                  <View style={{flexDirection:'row',alignItems:'center',gap:4,marginTop:2}}>
                    <Text style={{fontSize:9,backgroundColor:'#DCFCE7',color:'#166534',borderRadius:4,paddingHorizontal:4,paddingVertical:1,fontWeight:'700'}}>
                      🏆 {p.best}
                    </Text>
                    <Text style={{fontSize:9,color:COLORS.text3}}>-{savings(p)}% ahorro</Text>
                    {/* Price trend from history */}
                    {priceHistory[p.name] && (() => {
                      const hist = priceHistory[p.name];
                      if (hist.length < 2) return null;
                      const last = hist[hist.length-1].price;
                      const prev = hist[hist.length-2].price;
                      const diff = last - prev;
                      if (Math.abs(diff) < 0.01) return null;
                      return (
                        <Text style={{fontSize:9, color: diff > 0 ? COLORS.danger : COLORS.success, fontWeight:'700'}}>
                          {diff > 0 ? '↑' : '↓'}{Math.abs(diff).toFixed(2)}€
                        </Text>
                      );
                    })()}
                  </View>
                </View>
                {[['mercadona',p.mercadona],['lidl',p.lidl],['aldi',p.aldi],['carrefour',p.carrefour]].map(([store,price])=>{
                  const isMin = price === Math.min(p.mercadona,p.lidl,p.aldi,p.carrefour);
                  return (
                    <Text key={store} style={[s.tableCell, isMin && s.tableCellBest]}>
                      {price?.toFixed(2)}€
                    </Text>
                  );
                })}
              </View>
            </TouchableOpacity>
          ))
        }
          <View style={s.disclaimer}>
            <Text style={s.disclaimerTxt}>ℹ️ Precios orientativos octubre 2024. Pueden variar por zona y oferta.</Text>
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
                    <Text style={{fontSize:12,color:COLORS.success}}>🟢 Min: {minP.toFixed(2)}€</Text>
                    <Text style={{fontSize:12,color:COLORS.text2}}>Avg: {(prices.reduce((a,b)=>a+b,0)/prices.length).toFixed(2)}€</Text>
                    <Text style={{fontSize:12,color:COLORS.danger}}>🔴 Max: {maxP.toFixed(2)}€</Text>
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
  tableHeader:{flexDirection:'row',backgroundColor:COLORS.bg3,paddingHorizontal:14,paddingVertical:8,borderBottomWidth:0.5,borderBottomColor:COLORS.border},
  tableHCell:{flex:1,fontSize:11,fontWeight:'700',color:COLORS.text3,textAlign:'center'},
  tableRow:{flexDirection:'row',alignItems:'center',paddingHorizontal:14,paddingVertical:10,borderBottomWidth:0.5,borderBottomColor:COLORS.border,backgroundColor:COLORS.bg2},
  prodName:{fontSize:13,fontWeight:'600',color:COLORS.text},
  tableCell:{flex:1,fontSize:13,color:COLORS.text2,textAlign:'center'},
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
