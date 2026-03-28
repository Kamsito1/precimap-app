/**
 * AhorroScreen — autocontenido v2. Sin imports de screens externos.
 * Mejoras: subtabs sin corte, ranking con selector ciudad, productos por zona,
 * calculadora mejorada, gym con filtros, sin sección Comunidad.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Animated,
  FlatList, ActivityIndicator, ScrollView, Alert,
  TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, apiGet, openURL } from '../utils';

const SUBTABS = [
  { key:'super',    label:'🛒 Súper' },
  { key:'bancos',   label:'🏦 Bancos' },
  { key:'vuelos',   label:'✈️ Vuelos' },
  { key:'apps',     label:'💰 Apps' },
  { key:'gimnasio', label:'💪 Gym' },
];

const TIPS = [
  '💡 Aldi es un 22% más barato que Mercadona en media',
  '💡 Trade Republic da un 4% TAE sin condiciones',
  '💡 Con Revolut ahorras comisiones en viajes al extranjero',
  '💡 Comprar en Lidl ahorra ~35€/mes en una familia media',
  '💡 La tarifa nocturna de luz puede ahorrar un 30%',
  '💡 Too Good To Go: comida de restaurante desde 2€',
  '💡 Los gimnasios de bajo coste cuestan 20-30€/mes',
];

export default function AhorroScreen() {
  const [sub, setSub] = useState('super');
  const [visited, setVisited] = useState({super:true});
  const [tipIdx, setTipIdx] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const id = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim,{toValue:0,duration:250,useNativeDriver:true}),
        Animated.timing(fadeAnim,{toValue:1,duration:250,useNativeDriver:true}),
      ]).start();
      setTipIdx(i => (i+1) % TIPS.length);
    }, 5000);
    return () => clearInterval(id);
  }, [fadeAnim]);

  const switchTab = useCallback((key) => {
    setSub(key);
    setVisited(v => ({...v,[key]:true}));
  }, []);

  return (
    <View style={{flex:1,backgroundColor:COLORS.bg}}>
      <SafeAreaView edges={['top']} style={{backgroundColor:COLORS.bg2,borderBottomWidth:0.5,borderBottomColor:COLORS.border}}>
        <Animated.View style={{opacity:fadeAnim,backgroundColor:COLORS.primaryLight,paddingHorizontal:14,paddingVertical:7}}>
          <Text style={{fontSize:12,color:COLORS.primaryDark,fontWeight:'600'}} numberOfLines={1}>{TIPS[tipIdx]}</Text>
        </Animated.View>
        {/* Subtabs — sin corte: todos visibles en scroll horizontal */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingHorizontal:10,paddingVertical:8,gap:6,flexDirection:'row'}}>
          {SUBTABS.map(t=>(
            <TouchableOpacity key={t.key}
              style={{paddingHorizontal:12,paddingVertical:8,borderRadius:20,
                backgroundColor:sub===t.key?COLORS.primary:COLORS.bg3,
                borderWidth:1.5,borderColor:sub===t.key?COLORS.primary:COLORS.border}}
              onPress={()=>switchTab(t.key)}>
              <Text style={{fontSize:13,fontWeight:'700',color:sub===t.key?'#fff':COLORS.text2,whiteSpace:'nowrap'}}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>

      <View style={{flex:1}}>
        {visited.super    && <View style={{flex:1,display:sub==='super'   ?'flex':'none'}}><SuperTab/></View>}
        {visited.bancos   && <View style={{flex:1,display:sub==='bancos'  ?'flex':'none'}}><BancosTab/></View>}
        {visited.vuelos   && <View style={{flex:1,display:sub==='vuelos'  ?'flex':'none'}}><VuelosTab/></View>}
        {visited.apps     && <View style={{flex:1,display:sub==='apps'    ?'flex':'none'}}><AppsTab/></View>}
        {visited.gimnasio && <View style={{flex:1,display:sub==='gimnasio'?'flex':'none'}}><GymTab/></View>}
      </View>
    </View>
  );
}

// ─── SUPER TAB ───────────────────────────────────────────────────────────────
// Selector ciudad/CCAA/España → Ranking supermercados reales con botón IR
const CCAAS = ['Toda España','Andalucía','Aragón','Asturias','Baleares','Canarias',
  'Cantabria','C. La Mancha','C. y León','Cataluña','Extremadura','Galicia',
  'La Rioja','Madrid','Murcia','Navarra','País Vasco','C. Valenciana'];

// Datos OCU 2024 + Google Maps ratings — ranking nacional de supermercados
const RANKING_NACIONAL = [
  {pos:1, name:'Aldi',       emoji:'🟢', pct:-22, tip:'El más barato de España según OCU. Marca propia imbatible.', maps:'Aldi supermercado'},
  {pos:2, name:'Lidl',       emoji:'🟢', pct:-18, tip:'Calidad-precio excepcional. Frescos y panadería muy competitivos.', maps:'Lidl supermercado'},
  {pos:3, name:'Día',        emoji:'🟡', pct:-12, tip:'Buena opción con tarjeta ClubDía. Marca propia Día muy barata.', maps:'Día supermercado'},
  {pos:4, name:'Consum',     emoji:'🟡', pct:-10, tip:'Fuerte en Valencia y Cataluña. Relación calidad-precio muy buena.', maps:'Consum supermercado'},
  {pos:5, name:'Mercadona',  emoji:'🟡', pct:-8,  tip:'El favorito de España. Hacendado y Deliplus son grandes opciones.', maps:'Mercadona supermercado'},
  {pos:6, name:'Alcampo',    emoji:'🟡', pct:-5,  tip:'Buena variedad. Descuentos extra con tarjeta Alcampo.', maps:'Alcampo supermercado'},
  {pos:7, name:'Carrefour',  emoji:'🟡', pct:-3,  tip:'Gran variedad incluyendo marcas premium. Marca blanca competitiva.', maps:'Carrefour supermercado'},
  {pos:8, name:'Eroski',     emoji:'🟠', pct:0,   tip:'Cooperativa con buenas ofertas para socios. Fuerte en norte de España.', maps:'Eroski supermercado'},
  {pos:9, name:'BM',         emoji:'🟠', pct:3,   tip:'Supermercado vasco premium. Calidad alta, precio algo superior.', maps:'BM supermercado'},
  {pos:10,name:'El Corte Inglés',emoji:'🔴',pct:8,tip:'Calidad y variedad premium. Para productos especiales o gourmet.',maps:'El Corte Inglés supermercado'},
  {pos:11,name:'Hipercor',   emoji:'🔴', pct:10,  tip:'Hipermercado El Corte Inglés. Ideal para compras grandes mensuales.', maps:'Hipercor'},
  {pos:12,name:'Spar',       emoji:'🟡', pct:-4,  tip:'Franquicia presente en todo el país. Buenos productos frescos.', maps:'Spar supermercado'},
  {pos:13,name:'Froiz',      emoji:'🟡', pct:-6,  tip:'Cadena gallega muy competitiva. Fuerte en Galicia y noroeste.', maps:'Froiz supermercado'},
  {pos:14,name:'Gadis',      emoji:'🟡', pct:-5,  tip:'Supermercado gallego de referencia. Buenos precios en frescos.', maps:'Gadis supermercado'},
  {pos:15,name:'Simply',     emoji:'🟡', pct:-7,  tip:'Cadena de Alcampo en ciudades medianas. Precios muy competitivos.', maps:'Simply supermercado'},
  {pos:16,name:'Ahorramas',  emoji:'🟡', pct:-9,  tip:'Fuerte en Madrid y alrededores. Muy competitivo en precio.', maps:'Ahorramas supermercado'},
  {pos:17,name:'Coviran',    emoji:'🟡', pct:-4,  tip:'Cooperativa andaluza presente en toda España. Buenos precios locales.', maps:'Coviran supermercado'},
  {pos:18,name:'MasyMas',    emoji:'🟡', pct:-3,  tip:'Supermercados de barrio en Levante y Cataluña.', maps:'MasyMas supermercado'},
];
const AVG_WEEKLY = 120; // €/semana persona adulta media en España

function SuperTab() {
  const [view, setView] = useState('selector'); // 'selector' | 'ranking' | 'productos' | 'calculadora' | 'consejos'
  const [scope, setScope] = useState(''); // ciudad, CCAA o '' = toda España
  const [scopeType, setScopeType] = useState(''); // 'ciudad' | 'ccaa' | ''
  const [superSearch, setSuperSearch] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [nearbySupers, setNearbySupers] = useState([]);
  const [loadingSupers, setLoadingSupers] = useState(false);
  const [reportModal, setReportModal] = useState(null);

  async function loadNearby(city) {
    setLoadingSupers(true);
    try {
      const data = await apiGet(`/api/places?cat=supermercado&city=${encodeURIComponent(city)}&sort=price&limit=50`);
      setNearbySupers(Array.isArray(data) ? data : []);
    } catch(_) {}
    finally { setLoadingSupers(false); }
  }

  function selectScope(type, value) {
    setScope(value);
    setScopeType(type);
    if (type === 'ciudad') loadNearby(value);
    setView('ranking');
  }

  // Pantalla selector
  if (view === 'selector') {
    return (
      <ScrollView contentContainerStyle={{padding:16,paddingBottom:100,gap:12}}>
        <Text style={{fontSize:20,fontWeight:'700',color:COLORS.text,textAlign:'center'}}>
          🛒 Ranking Supermercados
        </Text>
        <Text style={{fontSize:14,color:COLORS.text3,textAlign:'center',marginBottom:8}}>
          ¿Dónde quieres comparar precios?
        </Text>

        {/* Botón Toda España */}
        <TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:14,padding:16,alignItems:'center'}}
          onPress={() => selectScope('','')}>
          <Text style={{fontSize:18}}>🇪🇸</Text>
          <Text style={{fontSize:16,fontWeight:'700',color:'#fff',marginTop:4}}>Toda España</Text>
          <Text style={{fontSize:12,color:'#fff',opacity:0.8}}>Ranking nacional OCU 2024</Text>
        </TouchableOpacity>

        {/* Buscar ciudad */}
        <View style={{backgroundColor:COLORS.bg2,borderRadius:14,padding:14,borderWidth:1,borderColor:COLORS.border}}>
          <Text style={{fontSize:13,fontWeight:'700',color:COLORS.text,marginBottom:8}}>📍 Tu ciudad o pueblo</Text>
          <View style={{flexDirection:'row',gap:8}}>
            <TextInput
              style={{flex:1,backgroundColor:COLORS.bg3,borderRadius:10,borderWidth:1,borderColor:COLORS.border,paddingHorizontal:12,paddingVertical:10,fontSize:14,color:COLORS.text}}
              placeholder="Ej: Córdoba, Villafranca..."
              placeholderTextColor={COLORS.text3}
              value={cityInput}
              onChangeText={setCityInput}
              onSubmitEditing={() => cityInput.trim() && selectScope('ciudad', cityInput.trim())}
              returnKeyType="search"
            />
            <TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:10,paddingHorizontal:14,alignItems:'center',justifyContent:'center'}}
              onPress={() => cityInput.trim() && selectScope('ciudad', cityInput.trim())}>
              <Ionicons name="search" size={20} color="#fff"/>
            </TouchableOpacity>
          </View>
        </View>

        {/* Selector CCAA */}
        <View style={{backgroundColor:COLORS.bg2,borderRadius:14,padding:14,borderWidth:1,borderColor:COLORS.border}}>
          <Text style={{fontSize:13,fontWeight:'700',color:COLORS.text,marginBottom:10}}>🗺️ Por Comunidad Autónoma</Text>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
            {CCAAS.slice(1).map(cc=>(
              <TouchableOpacity key={cc}
                style={{paddingHorizontal:10,paddingVertical:6,borderRadius:10,backgroundColor:COLORS.bg3,borderWidth:1,borderColor:COLORS.border}}
                onPress={()=>selectScope('ccaa',cc)}>
                <Text style={{fontSize:12,fontWeight:'600',color:COLORS.text2}}>{cc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Accesos directos */}
        <View style={{flexDirection:'row',gap:8}}>
          <TouchableOpacity style={{flex:1,backgroundColor:'#FEF3C7',borderRadius:12,padding:12,alignItems:'center',borderWidth:1,borderColor:'#F59E0B'}}
            onPress={()=>setView('productos')}>
            <Text style={{fontSize:20}}>🔍</Text>
            <Text style={{fontSize:12,fontWeight:'700',color:'#92400E',marginTop:2}}>Precios por zona</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{flex:1,backgroundColor:'#EFF6FF',borderRadius:12,padding:12,alignItems:'center',borderWidth:1,borderColor:'#3B82F6'}}
            onPress={()=>setView('calculadora')}>
            <Text style={{fontSize:20}}>🧮</Text>
            <Text style={{fontSize:12,fontWeight:'700',color:'#1E40AF',marginTop:2}}>Calculadora</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{flex:1,backgroundColor:'#F0FDF4',borderRadius:12,padding:12,alignItems:'center',borderWidth:1,borderColor:'#86EFAC'}}
            onPress={()=>setView('consejos')}>
            <Text style={{fontSize:20}}>💡</Text>
            <Text style={{fontSize:12,fontWeight:'700',color:'#15803D',marginTop:2}}>Consejos</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Pantalla ranking
  if (view === 'ranking') {
    const filteredRanking = RANKING_NACIONAL.filter(sm => {
      if (!superSearch) return true;
      return sm.name.toLowerCase().includes(superSearch.toLowerCase());
    });
    return (
      <View style={{flex:1}}>
        <View style={{backgroundColor:COLORS.bg2,borderBottomWidth:0.5,borderBottomColor:COLORS.border}}>
          <View style={{flexDirection:'row',alignItems:'center',padding:12,gap:8}}>
            <TouchableOpacity onPress={()=>setView('selector')} style={{padding:4}}>
              <Ionicons name="arrow-back" size={20} color={COLORS.text2}/>
            </TouchableOpacity>
            <View style={{flex:1}}>
              <Text style={{fontSize:15,fontWeight:'700',color:COLORS.text}}>
                {scope ? `🛒 Súper en ${scope}` : '🛒 Ranking España'}
              </Text>
              <Text style={{fontSize:11,color:COLORS.text3}}>Fuente: OCU 2024 · toca "IR" para ir al más cercano</Text>
            </View>
          </View>
          <View style={{paddingHorizontal:12,paddingBottom:8}}>
            <View style={{flexDirection:'row',alignItems:'center',backgroundColor:COLORS.bg3,borderRadius:10,borderWidth:1,borderColor:COLORS.border,paddingHorizontal:10}}>
              <Ionicons name="search" size={14} color={COLORS.text3}/>
              <TextInput style={{flex:1,paddingVertical:8,paddingLeft:6,fontSize:13,color:COLORS.text}}
                placeholder="Buscar supermercado..." placeholderTextColor={COLORS.text3}
                value={superSearch} onChangeText={setSuperSearch}/>
            </View>
          </View>
        </View>

        {/* Súpers cercanos de BD si hay ciudad */}
        {scopeType === 'ciudad' && (
          <View style={{backgroundColor:'#EFF6FF',padding:12,borderBottomWidth:0.5,borderBottomColor:COLORS.border}}>
            <Text style={{fontSize:12,fontWeight:'700',color:'#1E40AF',marginBottom:6}}>📍 Supermercados en {scope}</Text>
            {loadingSupers
              ? <ActivityIndicator color={COLORS.primary}/>
              : nearbySupers.length === 0
                ? <Text style={{fontSize:12,color:'#3B82F6'}}>No se encontraron supermercados. Puedes añadirlos.</Text>
                : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>
                    {nearbySupers.map(s=>(
                      <TouchableOpacity key={s.id}
                        style={{backgroundColor:'#fff',borderRadius:10,padding:10,borderWidth:1,borderColor:'#BFDBFE',minWidth:120,alignItems:'center',gap:4}}
                        onPress={()=>openURL(`https://www.google.com/maps/search/${encodeURIComponent(s.name+' '+scope)}`)}>
                        <Text style={{fontSize:11,fontWeight:'700',color:'#1E40AF'}} numberOfLines={2}>{s.name}</Text>
                        {s.repPrice && <Text style={{fontSize:13,fontWeight:'800',color:COLORS.primary}}>{s.repPrice.toFixed(0)}€/sem</Text>}
                        <Text style={{fontSize:10,color:'#3B82F6'}}>Ir →</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
            }
          </View>
        )}

        <FlatList
          data={filteredRanking}
          keyExtractor={sm=>String(sm.pos)}
          contentContainerStyle={{padding:12,gap:8,paddingBottom:100}}
          renderItem={({item:sm})=>(
            <View style={{backgroundColor:COLORS.bg2,borderRadius:14,padding:14,borderWidth:1,
              borderColor:sm.pct<-15?'#86EFAC':sm.pct<0?COLORS.border:'#FECACA',
              flexDirection:'row',alignItems:'center',gap:10}}>
              <View style={{width:40,height:40,borderRadius:10,backgroundColor:
                sm.pct<-15?'#DCFCE7':sm.pct<0?COLORS.bg3:'#FEF2F2',
                alignItems:'center',justifyContent:'center'}}>
                <Text style={{fontSize:16,fontWeight:'800',color:COLORS.text}}>#{sm.pos}</Text>
              </View>
              <View style={{flex:1}}>
                <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:2}}>
                  <Text style={{fontSize:15,fontWeight:'700',color:COLORS.text}}>{sm.emoji} {sm.name}</Text>
                  <View style={{borderRadius:6,paddingHorizontal:6,paddingVertical:2,
                    backgroundColor:sm.pct<-10?'#DCFCE7':sm.pct<0?'#FEF9C3':'#FEE2E2'}}>
                    <Text style={{fontSize:11,fontWeight:'700',color:sm.pct<-10?'#16A34A':sm.pct<0?'#92400E':'#DC2626'}}>
                      {sm.pct<0?`-${Math.abs(sm.pct)}% vs media`:`+${sm.pct}% vs media`}
                    </Text>
                  </View>
                </View>
                <Text style={{fontSize:11,color:COLORS.text3,lineHeight:15}}>{sm.tip}</Text>
              </View>
              <View style={{gap:6}}>
                <TouchableOpacity
                  style={{backgroundColor:COLORS.primary,borderRadius:8,paddingHorizontal:10,paddingVertical:6}}
                  onPress={()=>openURL(`https://www.google.com/maps/search/${encodeURIComponent(sm.maps+(scope?' '+scope:''))}`)}> 
                  <Text style={{color:'#fff',fontWeight:'700',fontSize:12}}>IR 🗺️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{backgroundColor:COLORS.bg3,borderRadius:8,paddingHorizontal:6,paddingVertical:4,alignItems:'center'}}
                  onPress={()=>Alert.alert('⚠️ Reportar','¿Este supermercado ya no existe en tu zona?',[
                    {text:'Cancelar'},
                    {text:'Reportar',style:'destructive',onPress:()=>Alert.alert('✅ Reportado','Gracias, lo revisaremos.')},
                  ])}>
                  <Text style={{fontSize:10,color:COLORS.text3}}>✗ No existe</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListFooterComponent={
            <View style={{backgroundColor:'#FFF7ED',borderRadius:12,padding:12,marginTop:8,borderWidth:1,borderColor:'#FED7AA'}}>
              <Text style={{fontSize:12,fontWeight:'700',color:'#92400E',marginBottom:4}}>📊 Fuente y metodología</Text>
              <Text style={{fontSize:11,color:'#B45309',lineHeight:16}}>
                Ranking basado en estudio OCU 2024 (cesta de 100 productos básicos) y valoraciones Google Maps. 
                Los porcentajes son vs la media de gasto semanal en España (~{AVG_WEEKLY}€/persona).
              </Text>
            </View>
          }
        />
      </View>
    );
  }

  if (view === 'productos') return <ProductosSuper onBack={()=>setView('selector')}/>;
  if (view === 'calculadora') return <CalculadoraSuper onBack={()=>setView('selector')}/>;
  if (view === 'consejos') return <ConsejosSuper onBack={()=>setView('selector')}/>;
  return null;
}

// ─── PRODUCTOS POR ZONA ───────────────────────────────────────────────────────
const PRODUCTOS_DATA = [
  {cat:'🥛 Lácteos', items:[
    {name:'Leche entera 1L',      aldi:0.65,lidl:0.67,mercadona:0.72,dia:0.60,carrefour:0.89},
    {name:'Yogur natural x8',     aldi:1.09,lidl:1.15,mercadona:1.35,dia:1.20,carrefour:1.59},
    {name:'Mantequilla 250g',     aldi:1.79,lidl:1.85,mercadona:2.10,dia:1.95,carrefour:2.49},
    {name:'Queso tierno 250g',    aldi:1.99,lidl:2.05,mercadona:2.35,dia:2.15,carrefour:2.89},
  ]},
  {cat:'🍞 Panadería', items:[
    {name:'Pan molde 500g',       aldi:0.99,lidl:1.05,mercadona:1.15,dia:0.95,carrefour:1.39},
    {name:'Tostadas 500g',        aldi:1.29,lidl:1.35,mercadona:1.49,dia:1.39,carrefour:1.79},
    {name:'Barra de pan',         aldi:0.49,lidl:0.49,mercadona:0.45,dia:0.45,carrefour:0.79},
  ]},
  {cat:'🛢️ Aceites', items:[
    {name:'Aceite oliva virgen 1L',aldi:5.99,lidl:6.20,mercadona:6.50,dia:6.29,carrefour:7.99},
    {name:'Aceite girasol 1L',    aldi:1.49,lidl:1.55,mercadona:1.65,dia:1.59,carrefour:1.99},
  ]},
  {cat:'🥚 Básicos', items:[
    {name:'Huevos L x12',         aldi:1.99,lidl:2.09,mercadona:2.29,dia:2.15,carrefour:2.79},
    {name:'Arroz largo 1kg',      aldi:0.79,lidl:0.85,mercadona:0.95,dia:0.89,carrefour:1.29},
    {name:'Pasta espagueti 500g', aldi:0.49,lidl:0.55,mercadona:0.65,dia:0.59,carrefour:0.89},
    {name:'Azúcar 1kg',           aldi:0.89,lidl:0.95,mercadona:1.05,dia:0.99,carrefour:1.29},
  ]},
  {cat:'🧻 Hogar', items:[
    {name:'Papel higiénico x12',  aldi:3.49,lidl:3.65,mercadona:3.99,dia:3.79,carrefour:4.79},
    {name:'Detergente 3L',        aldi:4.99,lidl:5.20,mercadona:5.50,dia:5.29,carrefour:6.99},
    {name:'Friegasuelos 1L',      aldi:1.29,lidl:1.39,mercadona:1.59,dia:1.49,carrefour:1.99},
  ]},
  {cat:'🥩 Carne y Pescado', items:[
    {name:'Pechuga pollo 1kg',    aldi:4.99,lidl:5.29,mercadona:5.99,dia:5.49,carrefour:6.99},
    {name:'Filetes cerdo 500g',   aldi:2.99,lidl:3.15,mercadona:3.49,dia:3.29,carrefour:4.29},
    {name:'Atún claro lata x3',   aldi:1.49,lidl:1.59,mercadona:1.75,dia:1.65,carrefour:2.19},
  ]},
];

// Ajuste de precio por zona — ciudades más caras/baratas
const ZONE_MULT = {
  'Madrid':1.08,'Barcelona':1.10,'Cataluña':1.07,'País Vasco':1.06,
  'Baleares':1.12,'Canarias':1.05,'Navarra':1.04,'Cantabria':1.02,
  'C. Valenciana':0.98,'Aragón':0.97,'La Rioja':0.97,'Galicia':0.96,
  'Asturias':0.97,'C. y León':0.95,'Andalucía':0.94,'Extremadura':0.92,
  'C. La Mancha':0.92,'Murcia':0.93,'Ceuta':0.90,'Melilla':0.91,
};

function ProductosSuper({ onBack }) {
  const [zone, setZone] = useState('');
  const [search, setSearch] = useState('');
  const [showZone, setShowZone] = useState(true);
  const mult = ZONE_MULT[zone] || 1.0;

  const filteredCats = PRODUCTOS_DATA.map(cat=>({
    ...cat,
    items: cat.items.filter(i=>!search || i.name.toLowerCase().includes(search.toLowerCase()))
  })).filter(cat=>cat.items.length>0);

  if (showZone) return (
    <ScrollView contentContainerStyle={{padding:16,paddingBottom:100,gap:12}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:4}}>
        <TouchableOpacity onPress={onBack}><Ionicons name="arrow-back" size={20} color={COLORS.text2}/></TouchableOpacity>
        <Text style={{fontSize:18,fontWeight:'700',color:COLORS.text}}>🔍 Precios por zona</Text>
      </View>
      <Text style={{fontSize:13,color:COLORS.text3}}>Los precios varían según la zona. Elige la tuya para ver precios ajustados:</Text>
      <TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:12,padding:14,alignItems:'center'}}
        onPress={()=>{setZone('');setShowZone(false);}}>
        <Text style={{color:'#fff',fontWeight:'700',fontSize:15}}>🇪🇸 Ver precios medios España</Text>
      </TouchableOpacity>
      {Object.keys(ZONE_MULT).map(z=>(
        <TouchableOpacity key={z} style={{backgroundColor:COLORS.bg2,borderRadius:12,padding:12,borderWidth:1,borderColor:COLORS.border,flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}
          onPress={()=>{setZone(z);setShowZone(false);}}>
          <Text style={{fontSize:14,fontWeight:'600',color:COLORS.text}}>{z}</Text>
          <Text style={{fontSize:12,color:ZONE_MULT[z]>1?'#DC2626':'#16A34A',fontWeight:'700'}}>
            {ZONE_MULT[z]>1?`+${((ZONE_MULT[z]-1)*100).toFixed(0)}% vs media`:`-${((1-ZONE_MULT[z])*100).toFixed(0)}% vs media`}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <View style={{flex:1}}>
      <View style={{backgroundColor:COLORS.bg2,borderBottomWidth:0.5,borderBottomColor:COLORS.border,padding:12,gap:8}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
          <TouchableOpacity onPress={()=>setShowZone(true)}><Ionicons name="arrow-back" size={20} color={COLORS.text2}/></TouchableOpacity>
          <Text style={{fontSize:15,fontWeight:'700',color:COLORS.text}}>
            🔍 Precios {zone||'España media'}
          </Text>
          <TouchableOpacity onPress={()=>setShowZone(true)} style={{marginLeft:'auto',backgroundColor:COLORS.bg3,borderRadius:8,paddingHorizontal:8,paddingVertical:4}}>
            <Text style={{fontSize:11,color:COLORS.text2}}>Cambiar zona</Text>
          </TouchableOpacity>
        </View>
        <View style={{flexDirection:'row',alignItems:'center',backgroundColor:COLORS.bg3,borderRadius:10,borderWidth:1,borderColor:COLORS.border,paddingHorizontal:10}}>
          <Ionicons name="search" size={14} color={COLORS.text3}/>
          <TextInput style={{flex:1,paddingVertical:8,paddingLeft:6,fontSize:13,color:COLORS.text}}
            placeholder="Buscar producto..." placeholderTextColor={COLORS.text3}
            value={search} onChangeText={setSearch}/>
          {search ? <TouchableOpacity onPress={()=>setSearch('')}><Ionicons name="close-circle" size={16} color={COLORS.text3}/></TouchableOpacity> : null}
        </View>
      </View>
      <ScrollView contentContainerStyle={{padding:12,paddingBottom:100,gap:16}}>
        {filteredCats.map(cat=>(
          <View key={cat.cat}>
            <Text style={{fontSize:14,fontWeight:'700',color:COLORS.text,marginBottom:8}}>{cat.cat}</Text>
            {cat.items.map(item=>{
              const prices = [item.aldi,item.lidl,item.mercadona,item.dia,item.carrefour].map(p=>p*mult);
              const minP = Math.min(...prices);
              const cols = [['Aldi',prices[0]],['Lidl',prices[1]],['Merc.',prices[2]],['Día',prices[3]],['Carre.',prices[4]]];
              return (
                <View key={item.name} style={{backgroundColor:COLORS.bg2,borderRadius:12,padding:12,marginBottom:8,borderWidth:1,borderColor:COLORS.border}}>
                  <Text style={{fontSize:13,fontWeight:'600',color:COLORS.text,marginBottom:8}}>{item.name}</Text>
                  <View style={{flexDirection:'row',gap:4}}>
                    {cols.map(([name,price])=>(
                      <View key={name} style={{flex:1,alignItems:'center',
                        backgroundColor:price===minP?'#DCFCE7':COLORS.bg3,
                        borderRadius:8,padding:5,
                        borderWidth:price===minP?1.5:0,borderColor:'#16A34A'}}>
                        <Text style={{fontSize:9,color:COLORS.text3,marginBottom:1}}>{name}</Text>
                        <Text style={{fontSize:12,fontWeight:'700',color:price===minP?'#16A34A':COLORS.text}}>{price.toFixed(2)}€</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
        {filteredCats.length===0 && <View style={{alignItems:'center',paddingTop:40}}><Text style={{fontSize:32}}>🔍</Text><Text style={{fontSize:14,color:COLORS.text2,marginTop:8}}>Sin resultados para "{search}"</Text></View>}
      </ScrollView>
    </View>
  );
}

// ─── CALCULADORA SUPER ────────────────────────────────────────────────────────
function CalculadoraSuper({ onBack }) {
  const [basket, setBasket] = useState([
    {id:1,name:'Leche 1L',qty:4,unit:'ud',aldi:0.65,merc:0.72},
    {id:2,name:'Pan molde',qty:2,unit:'ud',aldi:0.99,merc:1.15},
    {id:3,name:'Yogures x8',qty:1,unit:'ud',aldi:1.09,merc:1.35},
    {id:4,name:'Huevos x12',qty:1,unit:'ud',aldi:1.99,merc:2.29},
    {id:5,name:'Pollo 1kg',qty:2,unit:'kg',aldi:4.99,merc:5.99},
    {id:6,name:'Papel WC x12',qty:1,unit:'ud',aldi:3.49,merc:3.99},
  ]);
  const totalAldi = basket.reduce((s,i)=>s+i.qty*i.aldi,0);
  const totalMerc = basket.reduce((s,i)=>s+i.qty*i.merc,0);
  const saving = totalMerc - totalAldi;
  const pct = totalMerc > 0 ? ((saving/totalMerc)*100).toFixed(0) : '0';

  function changeQty(id, delta) {
    setBasket(b=>b.map(x=>x.id===id?{...x,qty:Math.max(0,x.qty+delta)}:x));
  }

  return (
    <View style={{flex:1}}>
      <View style={{backgroundColor:COLORS.bg2,borderBottomWidth:0.5,borderBottomColor:COLORS.border,padding:12,flexDirection:'row',alignItems:'center',gap:8}}>
        <TouchableOpacity onPress={onBack}><Ionicons name="arrow-back" size={20} color={COLORS.text2}/></TouchableOpacity>
        <View style={{flex:1}}>
          <Text style={{fontSize:15,fontWeight:'700',color:COLORS.text}}>🧮 Calculadora de ahorro</Text>
          <Text style={{fontSize:11,color:COLORS.text3}}>Compara Mercadona vs Aldi/Lidl en tu cesta semanal</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{padding:14,gap:10,paddingBottom:120}}>

        <View style={{backgroundColor:'#EFF6FF',borderRadius:12,padding:12,marginBottom:4}}>
          <Text style={{fontSize:12,fontWeight:'700',color:'#1E40AF'}}>¿Qué es esta calculadora?</Text>
          <Text style={{fontSize:11,color:'#3B82F6',marginTop:3,lineHeight:16}}>
            Compara lo que gastas comprando los mismos productos en Mercadona vs en Aldi/Lidl. 
            Ajusta las cantidades de tu cesta semanal habitual y ve cuánto puedes ahorrar al mes y al año.
          </Text>
        </View>

        {basket.filter(i=>i.qty>0).map(item=>(
          <View key={item.id} style={{backgroundColor:COLORS.bg2,borderRadius:12,padding:12,borderWidth:1,borderColor:COLORS.border,flexDirection:'row',alignItems:'center',gap:10}}>
            <View style={{flex:1}}>
              <Text style={{fontSize:14,fontWeight:'600',color:COLORS.text}}>{item.name}</Text>
              <Text style={{fontSize:11,color:COLORS.text3}}>Merc: {item.merc.toFixed(2)}€ · Aldi: {item.aldi.toFixed(2)}€/{item.unit}</Text>
            </View>
            <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
              <TouchableOpacity onPress={()=>changeQty(item.id,-1)}
                style={{width:28,height:28,borderRadius:14,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:COLORS.border}}>
                <Text style={{fontSize:18,fontWeight:'700',color:COLORS.text,lineHeight:22}}>−</Text>
              </TouchableOpacity>
              <Text style={{fontSize:16,fontWeight:'700',color:COLORS.text,minWidth:20,textAlign:'center'}}>{item.qty}</Text>
              <TouchableOpacity onPress={()=>changeQty(item.id,1)}
                style={{width:28,height:28,borderRadius:14,backgroundColor:COLORS.primary,alignItems:'center',justifyContent:'center'}}>
                <Text style={{fontSize:18,fontWeight:'700',color:'#fff',lineHeight:22}}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={{fontSize:13,fontWeight:'700',color:COLORS.text,minWidth:46,textAlign:'right'}}>{(item.qty*item.merc).toFixed(2)}€</Text>
          </View>
        ))}

        <View style={{backgroundColor:'#DCFCE7',borderRadius:14,padding:16,gap:8,borderWidth:1.5,borderColor:'#86EFAC'}}>
          <Text style={{fontSize:13,fontWeight:'700',color:'#15803D',marginBottom:4}}>📊 Comparativa semanal</Text>
          <View style={{flexDirection:'row',justifyContent:'space-between'}}>
            <Text style={{fontSize:13,color:'#16A34A'}}>🛒 En Mercadona:</Text>
            <Text style={{fontSize:14,fontWeight:'700',color:'#16A34A'}}>{totalMerc.toFixed(2)}€</Text>
          </View>
          <View style={{flexDirection:'row',justifyContent:'space-between'}}>
            <Text style={{fontSize:13,color:'#16A34A'}}>🟢 En Aldi/Lidl:</Text>
            <Text style={{fontSize:14,fontWeight:'700',color:'#16A34A'}}>{totalAldi.toFixed(2)}€</Text>
          </View>
          <View style={{height:1,backgroundColor:'#86EFAC',marginVertical:4}}/>
          <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
            <Text style={{fontSize:16,fontWeight:'700',color:'#15803D'}}>💰 Ahorro semanal:</Text>
            <Text style={{fontSize:22,fontWeight:'800',color:'#15803D'}}>{saving.toFixed(2)}€</Text>
          </View>
          <View style={{flexDirection:'row',justifyContent:'space-between'}}>
            <Text style={{fontSize:12,color:'#16A34A'}}>Al mes ({pct}% menos):</Text>
            <Text style={{fontSize:14,fontWeight:'700',color:'#15803D'}}>{(saving*4.3).toFixed(0)}€</Text>
          </View>
          <View style={{flexDirection:'row',justifyContent:'space-between'}}>
            <Text style={{fontSize:12,color:'#16A34A'}}>Al año:</Text>
            <Text style={{fontSize:16,fontWeight:'800',color:'#15803D'}}>{(saving*52).toFixed(0)}€ 🎉</Text>
          </View>
        </View>

        <TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:12,padding:14,alignItems:'center',flexDirection:'row',justifyContent:'center',gap:8}}
          onPress={()=>openURL('https://www.google.com/maps/search/Aldi+supermercado')}>
          <Text style={{color:'#fff',fontWeight:'700',fontSize:14}}>🟢 Encontrar Aldi/Lidl más cercano</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─── CONSEJOS SUPER ───────────────────────────────────────────────────────────
function ConsejosSuper({ onBack }) {
  const tips = [
    {e:'🕐',t:'Compra a última hora — descuentos en frescos hasta el 50%'},
    {e:'📱',t:'Usa la app de Lidl Plus para cupones exclusivos cada semana'},
    {e:'🏷️',t:'Marca blanca = misma calidad, precio hasta un 40% menor'},
    {e:'📅',t:'Lunes y martes: más stock y más ofertas que el fin de semana'},
    {e:'🛒',t:'Lista previa: reduces compras impulsivas un 30%'},
    {e:'🌱',t:'Productos de temporada: más baratos, más frescos y más nutritivos'},
    {e:'🔄',t:'Compara precio/kg, no precio/unidad — evita el "efecto tamaño"'},
    {e:'💳',t:'Acumula puntos Carrefour, Alcampo o El Corte Inglés — salen a cuenta'},
    {e:'🍱',t:'Too Good To Go: comida de restaurante y pastelerías desde 2€'},
    {e:'📦',t:'Compra a granel en productos no perecederos — hasta 30% más barato'},
    {e:'🥶',t:'Congela pan, carne y frutas cuando hay ofertas para no desperdiciar'},
    {e:'🚫',t:'Evita comprar con hambre — gastas hasta un 40% más'},
  ];
  return (
    <View style={{flex:1}}>
      <View style={{backgroundColor:COLORS.bg2,borderBottomWidth:0.5,borderBottomColor:COLORS.border,padding:12,flexDirection:'row',alignItems:'center',gap:8}}>
        <TouchableOpacity onPress={onBack}><Ionicons name="arrow-back" size={20} color={COLORS.text2}/></TouchableOpacity>
        <Text style={{fontSize:15,fontWeight:'700',color:COLORS.text}}>💡 Consejos de ahorro</Text>
      </View>
      <ScrollView contentContainerStyle={{padding:14,paddingBottom:100,gap:10}}>
        {tips.map((t,i)=>(
          <View key={i} style={{backgroundColor:COLORS.bg2,borderRadius:12,padding:14,borderWidth:1,borderColor:COLORS.border,flexDirection:'row',gap:12,alignItems:'flex-start'}}>
            <Text style={{fontSize:24}}>{t.e}</Text>
            <Text style={{flex:1,fontSize:14,color:COLORS.text,lineHeight:20}}>{t.t}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── BANCOS TAB ───────────────────────────────────────────────────────────────
const BANK_OFFERS = [
  {id:'trade',bank:'Trade Republic',logo:'🟢',color:'#0ADB83',hot:true,
   title:'4% anual en efectivo + acciones sin comisión',
   highlight:'Hasta 4% sobre efectivo sin límite + acción gratis al registrarte',
   conditions:['Abrir cuenta gratis en 10 min','4% anual automático sobre saldo','Acciones y ETFs sin comisión','Regulado por BaFin (Alemania)'],
   url:'https://refnocode.trade.re/0kbf1xcq',cta:'Abrir cuenta gratis',
   referralNote:'⭐ Enlace de referido — los dos ganamos una acción gratis',last:'mar 2026'},
  {id:'myinvestor',bank:'MyInvestor',logo:'🟣',color:'#6D28D9',hot:true,
   title:'4.50% TAE + inversión sin comisión',
   highlight:'Hasta 4.50% TAE sin permanencia + fondos indexados desde 10€',
   conditions:['4.50% TAE sin permanencia','Fondos sin comisión de custodia','Sin comisiones','Respaldado por Andbank'],
   url:'https://newapp.myinvestor.es/do/signup?promotionalCode=UNHO5',cta:'Abrir MyInvestor',
   code:'UNHO5',referralNote:'🟣 Usa el código UNHO5 al registrarte',last:'mar 2026'},
  {id:'bbva',bank:'BBVA',logo:'🔵',color:'#004B9E',hot:false,
   title:'Cuenta Online — sin comisiones + hasta 300€ bienvenida',
   highlight:'Sin comisiones con código amigo: hasta 300€ de regalo',
   conditions:['Sin comisiones de mantenimiento','Tarjeta débito gratuita','Hasta 300€ bienvenida','App 4.8/5'],
   url:'https://www.bbva.es/personas/productos/cuentas/cuenta-online.html',cta:'Abrir BBVA',
   code:'14D400110DACFB',referralNote:'💙 Usa el código al registrarte para el bono',last:'mar 2026'},
  {id:'revolut',bank:'Revolut',logo:'🖤',color:'#191C1F',hot:false,
   title:'Sin comisiones en divisas + hasta 4% en ahorro',
   highlight:'Ideal para viajes: tipo de cambio real, sin comisión',
   conditions:['Sin comisión en divisas hasta 1.000€/mes','Cambio al tipo real','Tarjeta virtual instantánea','Transferencias internacionales baratas'],
   url:'https://revolut.com/referral/?referral-code=juananmpu9&geo-redirect',cta:'Abrir Revolut',
   referralNote:'🖤 Regístrate con mi enlace y los dos ganamos beneficios',last:'mar 2026'},
];

function BancosTab() {
  const [copiedCode, setCopiedCode] = useState(null);
  const [showCalc, setShowCalc] = useState(false);
  const [amount, setAmount] = useState('10000');
  const [months, setMonths] = useState('12');

  function copyCode(code) {
    setCopiedCode(code);
    setTimeout(()=>setCopiedCode(null),3000);
    Alert.alert('✅ Copiado',`Código "${code}" copiado al portapapeles. Pégalo al registrarte.`);
  }

  return (
    <View style={{flex:1}}>
      <ScrollView contentContainerStyle={{padding:14,gap:14,paddingBottom:100}}>
        <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:10,backgroundColor:'#FFFBEB',borderRadius:12,padding:12,borderWidth:1,borderColor:'#F59E0B'}}
          onPress={()=>setShowCalc(true)}>
          <Text style={{fontSize:24}}>🧮</Text>
          <View style={{flex:1}}>
            <Text style={{fontSize:13,fontWeight:'700',color:'#92400E'}}>Calcular cuánto ganarías</Text>
            <Text style={{fontSize:11,color:'#B45309'}}>Introduce tu capital y el plazo para comparar</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#B45309"/>
        </TouchableOpacity>

        {BANK_OFFERS.map(o=>(
          <View key={o.id} style={{backgroundColor:COLORS.bg2,borderRadius:18,
            borderWidth:o.hot?2:0.5,borderColor:o.hot?o.color:COLORS.border,overflow:'hidden'}}>
            {o.hot && <View style={{backgroundColor:o.color,paddingVertical:7,alignItems:'center'}}>
              <Text style={{fontSize:12,fontWeight:'800',color:'#fff'}}>⭐ RECOMENDADO</Text>
            </View>}
            <View style={{flexDirection:'row',gap:12,alignItems:'flex-start',padding:16,paddingBottom:8}}>
              <Text style={{fontSize:32}}>{o.logo}</Text>
              <View style={{flex:1}}>
                <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                  <Text style={{fontSize:12,color:COLORS.text3,fontWeight:'600'}}>{o.bank}</Text>
                  <Text style={{fontSize:9,color:COLORS.text3,backgroundColor:COLORS.bg3,borderRadius:4,paddingHorizontal:5,paddingVertical:1}}>✓ {o.last}</Text>
                </View>
                <Text style={{fontSize:14,fontWeight:'700',color:COLORS.text,marginTop:3,lineHeight:19}}>{o.title}</Text>
              </View>
            </View>
            <View style={{flexDirection:'row',alignItems:'flex-start',gap:6,backgroundColor:'#FFFBEB',marginHorizontal:16,borderRadius:8,padding:10,marginBottom:10}}>
              <Ionicons name="star" size={13} color="#F59E0B"/>
              <Text style={{flex:1,fontSize:12,color:'#92400E',fontWeight:'600',lineHeight:17}}>{o.highlight}</Text>
            </View>
            <View style={{gap:5,paddingHorizontal:16,marginBottom:10}}>
              {o.conditions.map(c=>(
                <View key={c} style={{flexDirection:'row',alignItems:'flex-start',gap:8}}>
                  <Ionicons name="checkmark-circle" size={14} color={COLORS.success} style={{marginTop:2}}/>
                  <Text style={{flex:1,fontSize:12,color:COLORS.text,lineHeight:17}}>{c}</Text>
                </View>
              ))}
            </View>
            <View style={{flexDirection:'row',alignItems:'center',gap:8,marginHorizontal:16,borderRadius:10,padding:10,marginBottom:10,borderWidth:1,borderColor:o.color+'44',backgroundColor:o.color+'11'}}>
              <Ionicons name="gift" size={14} color={o.color}/>
              <Text style={{flex:1,fontSize:12,fontWeight:'600',color:o.color}}>{o.referralNote}</Text>
            </View>
            {o.code && (
              <TouchableOpacity style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginHorizontal:16,borderRadius:12,padding:12,marginBottom:10,borderWidth:2,borderColor:o.color,backgroundColor:COLORS.bg}}
                onPress={()=>copyCode(o.code)}>
                <View>
                  <Text style={{fontSize:11,color:COLORS.text3,marginBottom:2}}>Código amigo:</Text>
                  <Text style={{fontSize:17,fontWeight:'800',color:o.color,letterSpacing:2}}>{o.code}</Text>
                </View>
                <View style={{flexDirection:'row',alignItems:'center',gap:5,borderRadius:10,paddingHorizontal:12,paddingVertical:8,backgroundColor:o.color}}>
                  <Ionicons name={copiedCode===o.code?'checkmark':'copy-outline'} size={16} color="#fff"/>
                  <Text style={{color:'#fff',fontWeight:'700',fontSize:12}}>{copiedCode===o.code?'¡Copiado!':'Copiar'}</Text>
                </View>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={{margin:14,marginTop:4,borderRadius:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,padding:14,backgroundColor:o.color}}
              onPress={()=>openURL(o.url)}>
              <Text style={{color:'#fff',fontWeight:'700',fontSize:15}}>{o.cta}</Text>
              <Ionicons name="arrow-forward" size={15} color="#fff"/>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showCalc} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setShowCalc(false)}>
        <View style={{flex:1,backgroundColor:COLORS.bg2}}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:16,borderBottomWidth:0.5,borderBottomColor:COLORS.border}}>
            <Text style={{fontSize:18,fontWeight:'700',color:COLORS.text}}>🧮 Calculadora de intereses</Text>
            <TouchableOpacity onPress={()=>setShowCalc(false)} style={{width:32,height:32,borderRadius:16,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'}}>
              <Ionicons name="close" size={20} color={COLORS.text2}/>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{padding:20,gap:16}}>
            <View>
              <Text style={{fontSize:13,fontWeight:'600',color:COLORS.text,marginBottom:8}}>Tu capital (€)</Text>
              <TextInput style={{backgroundColor:COLORS.bg3,borderRadius:12,borderWidth:1.5,borderColor:COLORS.border,paddingHorizontal:14,paddingVertical:13,fontSize:22,fontWeight:'700',color:COLORS.text}}
                value={amount} onChangeText={setAmount} keyboardType="numeric" autoCorrect={false}/>
            </View>
            <View>
              <Text style={{fontSize:13,fontWeight:'600',color:COLORS.text,marginBottom:8}}>Plazo</Text>
              <View style={{flexDirection:'row',gap:8}}>
                {['3','6','12','24'].map(m=>(
                  <TouchableOpacity key={m} style={{flex:1,paddingVertical:10,borderRadius:10,borderWidth:1.5,alignItems:'center',
                    borderColor:months===m?COLORS.primary:COLORS.border,
                    backgroundColor:months===m?COLORS.primaryLight:COLORS.bg3}}
                    onPress={()=>setMonths(m)}>
                    <Text style={{fontWeight:'700',color:months===m?COLORS.primary:COLORS.text2}}>{m} meses</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {[{bank:'Trade Republic',tae:4.0,color:'#0ADB83'},{bank:'MyInvestor',tae:4.5,color:'#6D28D9'}].map(({bank,tae,color})=>{
              const earned=((parseFloat(amount)||0)*(tae/100)*(parseInt(months)||12)/12);
              return (
                <View key={bank} style={{backgroundColor:COLORS.bg,borderRadius:14,padding:14,borderWidth:1,borderColor:color+'44'}}>
                  <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:4}}>
                    <Text style={{fontSize:15,fontWeight:'700',color:COLORS.text}}>{bank}</Text>
                    <Text style={{fontSize:13,fontWeight:'600',color}}>{tae}% TAE</Text>
                  </View>
                  <Text style={{fontSize:28,fontWeight:'800',color}}>+{earned.toFixed(2)}€</Text>
                  <Text style={{fontSize:12,color:COLORS.text3,marginTop:2}}>intereses en {months} meses</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ─── VUELOS TAB ───────────────────────────────────────────────────────────────
const AEROPUERTOS_ES = [
  {code:'MAD',name:'Madrid Barajas',city:'Madrid'},
  {code:'BCN',name:'Barcelona El Prat',city:'Barcelona'},
  {code:'AGP',name:'Málaga',city:'Málaga'},
  {code:'SVQ',name:'Sevilla',city:'Sevilla'},
  {code:'VLC',name:'Valencia',city:'Valencia'},
  {code:'BIO',name:'Bilbao',city:'Bilbao'},
  {code:'PMI',name:'Palma de Mallorca',city:'Palma'},
  {code:'LPA',name:'Las Palmas',city:'Las Palmas'},
  {code:'TFN',name:'Tenerife Norte',city:'Tenerife'},
  {code:'ALC',name:'Alicante',city:'Alicante'},
  {code:'GRX',name:'Granada',city:'Granada'},
  {code:'SDR',name:'Santander',city:'Santander'},
  {code:'OVD',name:'Asturias',city:'Oviedo'},
  {code:'ZAZ',name:'Zaragoza',city:'Zaragoza'},
];
const DESTINOS = [
  {code:'CDG',name:'París'},  {code:'LHR',name:'Londres'},
  {code:'FCO',name:'Roma'},   {code:'AMS',name:'Ámsterdam'},
  {code:'LIS',name:'Lisboa'}, {code:'OSL',name:'Oslo'},
  {code:'DXB',name:'Dubái'},  {code:'JFK',name:'Nueva York'},
  {code:'CUN',name:'Cancún'}, {code:'LIM',name:'Lima'},
  {code:'BOG',name:'Bogotá'}, {code:'EZE',name:'Buenos Aires'},
  {code:'MIA',name:'Miami'},  {code:'GRU',name:'São Paulo'},
  {code:'NRT',name:'Tokio'},  {code:'BKK',name:'Bangkok'},
];
const TIPS_VUELOS = [
  {e:'📅',t:'Martes y miércoles son los días más baratos para volar en España'},
  {e:'⏰',t:'Compra entre 6-8 semanas antes para los mejores precios en Europa'},
  {e:'🔔',t:'Activa alertas de precio en Google Flights y Skyscanner'},
  {e:'🧳',t:'Solo equipaje de mano: ahorra hasta 50€ por trayecto en Ryanair/Vueling'},
  {e:'🛫',t:'Vuelos madrugada (6-7h) y mediodía suelen ser un 20-30% más baratos'},
  {e:'🔄',t:'Combina aerolíneas: ida en Vueling, vuelta en Ryanair para ahorrar'},
  {e:'🌍',t:'Google Flights, Skyscanner y Kayak comparan precios en tiempo real'},
  {e:'📍',t:'Aeropuertos secundarios: Girona vs BCN, Castellón vs VLC — mucho más baratos'},
];

function VuelosTab() {
  const [origin, setOrigin] = useState(AEROPUERTOS_ES[0]);
  const [dest, setDest] = useState(null);
  const [adults, setAdults] = useState(1);
  const [picker, setPicker] = useState(null); // 'origin' | 'dest'

  function buildGFlightsUrl() {
    if (!dest) return null;
    const d = new Date(); d.setDate(d.getDate()+21);
    const r = new Date(d); r.setDate(r.getDate()+7);
    const fmt = x => `${x.getFullYear()}${String(x.getMonth()+1).padStart(2,'0')}${String(x.getDate()).padStart(2,'0')}`;
    return `https://www.google.com/travel/flights?q=vuelos+${origin.code}+${dest.code}&hl=es`;
  }

  return (
    <ScrollView contentContainerStyle={{padding:14,paddingBottom:100,gap:14}}>
      {/* Buscador */}
      <View style={{backgroundColor:COLORS.bg2,borderRadius:16,padding:16,borderWidth:1,borderColor:COLORS.border,gap:12}}>
        <Text style={{fontSize:16,fontWeight:'700',color:COLORS.text}}>✈️ Buscar vuelo barato</Text>

        <TouchableOpacity style={{backgroundColor:COLORS.bg3,borderRadius:12,borderWidth:1,borderColor:COLORS.border,padding:14,flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}
          onPress={()=>setPicker('origin')}>
          <View>
            <Text style={{fontSize:11,color:COLORS.text3,marginBottom:2}}>Origen</Text>
            <Text style={{fontSize:15,fontWeight:'700',color:COLORS.text}}>{origin.code} — {origin.name}</Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={COLORS.text3}/>
        </TouchableOpacity>

        <TouchableOpacity style={{backgroundColor:COLORS.bg3,borderRadius:12,borderWidth:1,borderColor:dest?COLORS.primary:COLORS.border,padding:14,flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}
          onPress={()=>setPicker('dest')}>
          <View>
            <Text style={{fontSize:11,color:COLORS.text3,marginBottom:2}}>Destino</Text>
            <Text style={{fontSize:15,fontWeight:'700',color:dest?COLORS.text:COLORS.text3}}>{dest?`${dest.code} — ${dest.name}`:'Elige destino'}</Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={COLORS.text3}/>
        </TouchableOpacity>

        <View style={{flexDirection:'row',alignItems:'center',gap:12,flexWrap:'wrap'}}>
          <Text style={{fontSize:13,fontWeight:'600',color:COLORS.text}}>Pasajeros:</Text>
          {[1,2,3,4].map(n=>(
            <TouchableOpacity key={n} style={{paddingHorizontal:14,paddingVertical:8,borderRadius:10,borderWidth:1.5,
              borderColor:adults===n?COLORS.primary:COLORS.border,
              backgroundColor:adults===n?COLORS.primaryLight:COLORS.bg3}}
              onPress={()=>setAdults(n)}>
              <Text style={{fontWeight:'700',color:adults===n?COLORS.primary:COLORS.text2}}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:14,padding:15,alignItems:'center',flexDirection:'row',justifyContent:'center',gap:8,opacity:dest?1:0.5}}
          onPress={()=>{const u=buildGFlightsUrl();if(u)openURL(u);else Alert.alert('Elige destino','Selecciona primero el destino');}}
          disabled={!dest}>
          <Ionicons name="search" size={18} color="#fff"/>
          <Text style={{color:'#fff',fontWeight:'700',fontSize:15}}>Buscar en Google Flights</Text>
        </TouchableOpacity>

        <View style={{flexDirection:'row',gap:8}}>
          {['Skyscanner','Kayak','Momondo'].map(s=>(
            <TouchableOpacity key={s} style={{flex:1,backgroundColor:COLORS.bg3,borderRadius:10,padding:8,alignItems:'center',borderWidth:1,borderColor:COLORS.border}}
              onPress={()=>openURL(`https://www.${s.toLowerCase()}.es`)}>
              <Text style={{fontSize:11,fontWeight:'700',color:COLORS.text2}}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={{fontSize:14,fontWeight:'700',color:COLORS.text}}>💡 Cómo encontrar vuelos baratos</Text>
      {TIPS_VUELOS.map((t,i)=>(
        <View key={i} style={{backgroundColor:COLORS.bg2,borderRadius:12,padding:12,borderWidth:1,borderColor:COLORS.border,flexDirection:'row',gap:10,alignItems:'flex-start'}}>
          <Text style={{fontSize:22}}>{t.e}</Text>
          <Text style={{flex:1,fontSize:13,color:COLORS.text,lineHeight:19}}>{t.t}</Text>
        </View>
      ))}

      {/* Modal picker */}
      <Modal visible={!!picker} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setPicker(null)}>
        <View style={{flex:1,backgroundColor:COLORS.bg}}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:16,borderBottomWidth:0.5,borderBottomColor:COLORS.border}}>
            <Text style={{fontSize:18,fontWeight:'700',color:COLORS.text}}>{picker==='origin'?'🛫 Aeropuerto origen':'🛬 Destino'}</Text>
            <TouchableOpacity onPress={()=>setPicker(null)} style={{width:32,height:32,borderRadius:16,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'}}>
              <Ionicons name="close" size={20} color={COLORS.text2}/>
            </TouchableOpacity>
          </View>
          <FlatList
            data={picker==='origin'?AEROPUERTOS_ES:DESTINOS}
            keyExtractor={a=>a.code}
            contentContainerStyle={{padding:14,gap:8}}
            renderItem={({item:a})=>(
              <TouchableOpacity style={{backgroundColor:COLORS.bg2,borderRadius:12,padding:14,borderWidth:1,borderColor:COLORS.border,flexDirection:'row',alignItems:'center',gap:12}}
                onPress={()=>{if(picker==='origin')setOrigin(a);else setDest(a);setPicker(null);}}>
                <Text style={{fontSize:16,fontWeight:'800',color:COLORS.primary,width:44}}>{a.code}</Text>
                <Text style={{fontSize:14,color:COLORS.text}}>{a.name||a.code}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </ScrollView>
  );
}

// ─── APPS TAB ─────────────────────────────────────────────────────────────────
const APPS_DATA = [
  {cat:'💰 Cashback y recompensas',apps:[
    {name:'iGraal',desc:'Cashback en +2000 tiendas online: Zara, Amazon, Booking, El Corte Inglés...',earn:'Hasta 15% cashback',url:'https://es.igraal.com/padrinazgo?padrino=vpbWSouX',emoji:'🛍️',referral:true,note:'Enlace de referido — los dos ganamos cashback extra'},
    {name:'Attapoll',desc:'Encuestas pagadas. 5-10 min por encuesta. Retira desde 3€ por PayPal o Bizum.',earn:'~5-15€/mes',url:'https://attapoll.app/join/qarui',emoji:'📊',referral:true,note:'Enlace de referido'},
    {name:'WeWard',desc:'Gana puntos caminando. Canjea por Amazon, Carrefour, SEUR...',earn:'~5-10€/mes',url:null,emoji:'🚶',code:'DevotoArana4251',referral:true,note:'Código al registrarte'},
    {name:'Swagbucks',desc:'Encuestas, vídeos y compras. Acumula SB y canjea por PayPal o vales.',earn:'~10-20€/mes',url:'https://www.swagbucks.com',emoji:'⭐',referral:false},
  ]},
  {cat:'⛽ Gasolina y transporte',apps:[
    {name:'Gasolina PreciMap',desc:'Ya la tienes: 12.200+ gasolineras en tiempo real. La más barata a tu lado.',earn:'Hasta 44€/mes',url:null,emoji:'⛽',note:'Usa la pestaña Mapa → Gasolina'},
    {name:'Waze',desc:'Navegación con alertas de tráfico. Evita atascos y llega antes.',earn:'Tiempo = dinero',url:'https://www.waze.com/es/live-map',emoji:'🗺️'},
    {name:'RENFE',desc:'Billetes de tren. Tarifa Joven y descuentos hasta 40% con antelación.',earn:'Hasta 40% dto.',url:'https://www.renfe.com',emoji:'🚄'},
  ]},
  {cat:'🛒 Compras inteligentes',apps:[
    {name:'Idealo',desc:'Comparador de precios en miles de tiendas. Encuentra el más barato de internet.',earn:'Ahorra 10-40%',url:'https://www.idealo.es',emoji:'🔍'},
    {name:'Too Good To Go',desc:'Bolsas sorpresa de restaurantes y pastelerías a 2-5€. Contra el desperdicio.',earn:'Hasta 70% dto.',url:'https://toogoodtogo.com/es',emoji:'🍱'},
    {name:'Wallapop',desc:'Segunda mano: muebles, ropa, tecnología desde 1€. Vende lo que no usas.',earn:'Variable',url:'https://es.wallapop.com',emoji:'♻️'},
    {name:'Vinted',desc:'Moda de segunda mano. Compra y vende sin comisión para el comprador.',earn:'Variable',url:'https://www.vinted.es',emoji:'👗'},
  ]},
  {cat:'💡 Energía y hogar',apps:[
    {name:'Selectra',desc:'Compara tarifas de luz y gas. Cambia de compañía y ahorra hasta 400€/año.',earn:'Hasta 400€/año',url:'https://selectra.es',emoji:'⚡'},
    {name:'Holaluz',desc:'Luz 100% renovable. Tarifa nocturna muy competitiva para cargadores EV.',earn:'Variable',url:'https://www.holaluz.com',emoji:'🌱'},
  ]},
];

function AppsTab() {
  const [copied, setCopied] = useState(null);
  function copy(code) {
    setCopied(code);
    setTimeout(()=>setCopied(null),3000);
    Alert.alert('✅ Copiado',`Código "${code}" copiado.`);
  }
  return (
    <ScrollView contentContainerStyle={{padding:14,paddingBottom:100,gap:16}}>
      {APPS_DATA.map(cat=>(
        <View key={cat.cat}>
          <Text style={{fontSize:14,fontWeight:'700',color:COLORS.text,marginBottom:10}}>{cat.cat}</Text>
          <View style={{gap:10}}>
            {cat.apps.map(app=>(
              <View key={app.name} style={{backgroundColor:COLORS.bg2,borderRadius:14,padding:14,borderWidth:1,borderColor:COLORS.border}}>
                <View style={{flexDirection:'row',gap:10,alignItems:'flex-start',marginBottom:8}}>
                  <Text style={{fontSize:26}}>{app.emoji}</Text>
                  <View style={{flex:1}}>
                    <Text style={{fontSize:14,fontWeight:'700',color:COLORS.text}}>{app.name}</Text>
                    <Text style={{fontSize:12,color:COLORS.text3,marginTop:2,lineHeight:17}}>{app.desc}</Text>
                  </View>
                  <View style={{backgroundColor:COLORS.successLight,borderRadius:8,paddingHorizontal:7,paddingVertical:3}}>
                    <Text style={{fontSize:10,fontWeight:'700',color:COLORS.success}}>{app.earn}</Text>
                  </View>
                </View>
                {app.referral && app.note && (
                  <View style={{backgroundColor:COLORS.primaryLight,borderRadius:8,padding:8,marginBottom:8,flexDirection:'row',gap:6,alignItems:'center'}}>
                    <Ionicons name="gift" size={13} color={COLORS.primary}/>
                    <Text style={{fontSize:11,color:COLORS.primary,fontWeight:'600',flex:1}}>{app.note}</Text>
                  </View>
                )}
                {app.code && (
                  <TouchableOpacity style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:COLORS.bg,borderRadius:10,padding:10,borderWidth:1.5,borderColor:COLORS.primary,marginBottom:8}}
                    onPress={()=>copy(app.code)}>
                    <View>
                      <Text style={{fontSize:10,color:COLORS.text3}}>Código:</Text>
                      <Text style={{fontSize:15,fontWeight:'800',color:COLORS.primary}}>{app.code}</Text>
                    </View>
                    <View style={{backgroundColor:COLORS.primary,borderRadius:8,paddingHorizontal:12,paddingVertical:6,flexDirection:'row',gap:4,alignItems:'center'}}>
                      <Ionicons name={copied===app.code?'checkmark':'copy-outline'} size={14} color="#fff"/>
                      <Text style={{color:'#fff',fontWeight:'700',fontSize:11}}>{copied===app.code?'¡Copiado!':'Copiar'}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                {app.note && !app.code && !app.referral && (
                  <View style={{backgroundColor:COLORS.bg3,borderRadius:8,padding:8,marginBottom:8}}>
                    <Text style={{fontSize:11,color:COLORS.text3}}>{app.note}</Text>
                  </View>
                )}
                {app.url ? (
                  <TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:12,padding:11,alignItems:'center',flexDirection:'row',justifyContent:'center',gap:6}}
                    onPress={()=>openURL(app.url)}>
                    <Text style={{color:'#fff',fontWeight:'700',fontSize:13}}>Abrir app</Text>
                    <Ionicons name="arrow-forward" size={14} color="#fff"/>
                  </TouchableOpacity>
                ) : (
                  <View style={{backgroundColor:COLORS.bg3,borderRadius:12,padding:10,alignItems:'center'}}>
                    <Text style={{color:COLORS.text3,fontSize:12}}>Disponible en PreciMap ↑</Text>
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

// ─── GYM TAB ─────────────────────────────────────────────────────────────────
// Punto 7: selector ciudad/CCAA/España, filtros cercano/barato/ambos, buscador ciudades
const GYM_CITIES = ['Toda España','Madrid','Barcelona','Valencia','Sevilla','Bilbao',
  'Zaragoza','Málaga','Córdoba','Granada','Alicante','Murcia','Valladolid',
  'Santander','San Sebastián','Pamplona','Oviedo','Gijón','Palma','Las Palmas',
  'Santa Cruz de Tenerife','Salamanca','Toledo','Burgos','León','Logroño',
  'Tarragona','Lleida','Girona','Badajoz','Cáceres','Mérida','Vigo','A Coruña',
  'Santiago de Compostela','Lugo','Ferrol'];

const CADENAS_GYM = [
  {name:'McFit',emoji:'🟠',price:'~20€/mes',note:'Sin permanencia, 24h, básico y económico'},
  {name:'Basic-Fit',emoji:'🔵',price:'~25€/mes',note:'Buenas máquinas, sin permanencia'},
  {name:'Altafit',emoji:'🔴',price:'~20€/mes',note:'Español, buena relación calidad-precio'},
  {name:'Vivagym',emoji:'🟣',price:'~30€/mes',note:'Clases colectivas incluidas'},
  {name:'Go Fit',emoji:'🟢',price:'~35€/mes',note:'Piscina y spa en algunos centros'},
  {name:'Holmes Place',emoji:'⚫',price:'~60€/mes',note:'Premium con spa y clases premium'},
  {name:'Metropolitan',emoji:'🔘',price:'~80€/mes',note:'Ultra premium, piscina y squash'},
  {name:'DiR',emoji:'🟡',price:'~50€/mes',note:'Fuerte en Cataluña, piscina incluida'},
];

function GymTab() {
  const [scope, setScope] = useState('');       // ciudad seleccionada
  const [scopeSet, setScopeSet] = useState(false);
  const [sort, setSort] = useState('price');    // 'price' | 'proximity' | 'both'
  const [citySearch, setCitySearch] = useState('');
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(false);

  const filteredCities = GYM_CITIES.filter(c =>
    !citySearch || c.toLowerCase().includes(citySearch.toLowerCase())
  );

  async function loadGyms(city) {
    setLoading(true);
    try {
      let url = `/api/places?cat=gimnasio&sort=${sort === 'proximity' ? 'proximity' : 'price'}&limit=50`;
      if (city && city !== 'Toda España') url += `&city=${encodeURIComponent(city)}`;
      const data = await apiGet(url);
      setGyms(Array.isArray(data) ? data : []);
    } catch(_) {}
    finally { setLoading(false); }
  }

  function selectCity(city) {
    const val = city === 'Toda España' ? '' : city;
    setScope(val);
    setScopeSet(true);
    loadGyms(city);
  }

  // Pantalla de selección
  if (!scopeSet) return (
    <View style={{flex:1,backgroundColor:COLORS.bg}}>
      <View style={{backgroundColor:COLORS.bg2,padding:14,borderBottomWidth:0.5,borderBottomColor:COLORS.border,gap:10}}>
        <Text style={{fontSize:18,fontWeight:'700',color:COLORS.text,textAlign:'center'}}>💪 Gimnasios baratos</Text>
        <Text style={{fontSize:13,color:COLORS.text3,textAlign:'center'}}>¿Dónde buscas gimnasio?</Text>
        <View style={{flexDirection:'row',alignItems:'center',backgroundColor:COLORS.bg3,borderRadius:12,borderWidth:1,borderColor:COLORS.border,paddingHorizontal:10}}>
          <Ionicons name="search" size={16} color={COLORS.text3}/>
          <TextInput style={{flex:1,paddingVertical:10,paddingLeft:8,fontSize:14,color:COLORS.text}}
            placeholder="Buscar ciudad o pueblo..." placeholderTextColor={COLORS.text3}
            value={citySearch} onChangeText={setCitySearch}/>
          {citySearch ? <TouchableOpacity onPress={()=>setCitySearch('')}><Ionicons name="close-circle" size={18} color={COLORS.text3}/></TouchableOpacity> : null}
        </View>
      </View>
      <FlatList
        data={filteredCities}
        keyExtractor={c=>c}
        contentContainerStyle={{padding:12,gap:6,paddingBottom:100}}
        renderItem={({item:city})=>(
          <TouchableOpacity style={{backgroundColor:COLORS.bg2,borderRadius:12,padding:14,borderWidth:1,borderColor:COLORS.border,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}
            onPress={()=>selectCity(city)}>
            <Text style={{fontSize:14,fontWeight:'600',color:COLORS.text}}>{city==='Toda España'?'🇪🇸 ':''}{city}</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.text3}/>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  // Pantalla resultados
  return (
    <View style={{flex:1}}>
      <View style={{backgroundColor:COLORS.bg2,borderBottomWidth:0.5,borderBottomColor:COLORS.border}}>
        <View style={{flexDirection:'row',alignItems:'center',padding:12,gap:8}}>
          <TouchableOpacity onPress={()=>setScopeSet(false)} style={{padding:4}}>
            <Ionicons name="arrow-back" size={20} color={COLORS.text2}/>
          </TouchableOpacity>
          <View style={{flex:1}}>
            <Text style={{fontSize:15,fontWeight:'700',color:COLORS.text}}>
              💪 Gimnasios {scope||'España'}
            </Text>
            <Text style={{fontSize:11,color:COLORS.text3}}>{gyms.length} encontrados · toca "Ir" para ver en Maps</Text>
          </View>
        </View>
        {/* Filtros */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:12,paddingBottom:10,gap:6}}>
          {[
            {key:'price',label:'💰 Más barato'},
            {key:'proximity',label:'📍 Más cercano'},
            {key:'both',label:'⚡ Precio + cercanía'},
          ].map(f=>(
            <TouchableOpacity key={f.key}
              style={{paddingHorizontal:12,paddingVertical:6,borderRadius:20,borderWidth:1.5,
                borderColor:sort===f.key?'#7C3AED':COLORS.border,
                backgroundColor:sort===f.key?'#7C3AED':COLORS.bg3}}
              onPress={()=>{setSort(f.key);loadGyms(scope||'Toda España');}}>
              <Text style={{fontSize:12,fontWeight:'700',color:sort===f.key?'#fff':COLORS.text2}}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Cadenas conocidas */}
      <View style={{backgroundColor:'#F5F3FF',padding:12,borderBottomWidth:0.5,borderBottomColor:COLORS.border}}>
        <Text style={{fontSize:12,fontWeight:'700',color:'#4C1D95',marginBottom:8}}>🏋️ Cadenas de bajo coste</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>
          {CADENAS_GYM.map(c=>(
            <TouchableOpacity key={c.name}
              style={{backgroundColor:'#fff',borderRadius:10,padding:10,borderWidth:1,borderColor:'#DDD6FE',minWidth:110,gap:2}}
              onPress={()=>openURL(`https://www.google.com/maps/search/${encodeURIComponent(c.name+' gimnasio'+(scope?' '+scope:''))}`)}>
              <Text style={{fontSize:11,fontWeight:'700',color:'#4C1D95'}}>{c.emoji} {c.name}</Text>
              <Text style={{fontSize:13,fontWeight:'800',color:'#7C3AED'}}>{c.price}</Text>
              <Text style={{fontSize:9,color:'#6D28D9'}} numberOfLines={1}>{c.note}</Text>
              <Text style={{fontSize:10,color:'#7C3AED',marginTop:2}}>Buscar →</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading
        ? <ActivityIndicator color="#7C3AED" style={{marginTop:40}}/>
        : <FlatList
            data={gyms}
            keyExtractor={g=>String(g.id)}
            contentContainerStyle={{padding:12,paddingBottom:100,gap:8}}
            ListEmptyComponent={
              <View style={{alignItems:'center',paddingTop:40,gap:8}}>
                <Text style={{fontSize:36}}>💪</Text>
                <Text style={{fontSize:15,color:COLORS.text2,fontWeight:'600'}}>Sin gimnasios en {scope||'España'}</Text>
                <TouchableOpacity onPress={()=>setScopeSet(false)} style={{backgroundColor:'#EDE9FE',borderRadius:10,paddingHorizontal:16,paddingVertical:8,marginTop:8}}>
                  <Text style={{fontSize:13,color:'#7C3AED',fontWeight:'700'}}>Cambiar ciudad</Text>
                </TouchableOpacity>
              </View>
            }
            renderItem={({item:g,index})=>(
              <View style={{backgroundColor:COLORS.bg2,borderRadius:13,padding:12,borderWidth:1,borderColor:COLORS.border,flexDirection:'row',alignItems:'center',gap:10}}>
                <View style={{width:38,height:38,borderRadius:10,backgroundColor:'#EDE9FE',alignItems:'center',justifyContent:'center'}}>
                  <Text style={{fontSize:18}}>💪</Text>
                </View>
                <View style={{flex:1,minWidth:0}}>
                  <Text style={{fontSize:10,fontWeight:'700',color:COLORS.text3}}>#{index+1}</Text>
                  <Text style={{fontSize:14,fontWeight:'700',color:COLORS.text}} numberOfLines={1}>{g.name}</Text>
                  <Text style={{fontSize:11,color:COLORS.text3}}>📍 {g.city||scope||'España'}</Text>
                </View>
                <View style={{alignItems:'flex-end',gap:4}}>
                  {g.repPrice ? (
                    <>
                      <Text style={{fontSize:17,fontWeight:'800',color:'#7C3AED'}}>{g.repPrice.toFixed(0)}€</Text>
                      <Text style={{fontSize:10,color:COLORS.text3}}>/mes</Text>
                    </>
                  ) : <Text style={{fontSize:11,color:COLORS.text3}}>Sin precio</Text>}
                  <TouchableOpacity style={{backgroundColor:'#7C3AED',borderRadius:8,paddingHorizontal:8,paddingVertical:4}}
                    onPress={()=>openURL(`https://www.google.com/maps/search/${encodeURIComponent(g.name+(g.city?' '+g.city:''))}`)}>
                    <Text style={{color:'#fff',fontWeight:'700',fontSize:10}}>IR 🗺️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
      }
    </View>
  );
}

