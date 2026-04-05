/**
 * AhorroScreen — v3. Pantalla inicial selector + Supermercados + Bancos + Apps
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Animated,
  FlatList, ActivityIndicator, ScrollView, Alert,
  TextInput, Modal, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, apiGet, apiPost, openURL, fmtP } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from '../components/AuthModal';

const SECTIONS = [
  { key:'super', label:'Supermercado', icon:'cart-outline', color:'#16A34A', desc:'Compara precios y encuentra el más barato' },
  { key:'bancos', label:'Banco', icon:'business-outline', color:'#3B82F6', desc:'Cuentas remuneradas y sin comisiones' },
  { key:'apps', label:'Gana dinero', icon:'cash-outline', color:'#7C3AED', desc:'Apps con cashback, encuestas y referidos' },
];

export default function AhorroScreen() {
  const { isLoggedIn } = useAuth();
  const [activeSection, setActiveSection] = useState(null);
  const [superView, setSuperView] = useState(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [favSupers, setFavSupers] = useState([]);

  useEffect(() => {
    AsyncStorage.getItem('fav_supers').then(r => setFavSupers(r ? JSON.parse(r) : [])).catch(()=>{});
  }, []);

  function toggleFavSuper(name) {
    setFavSupers(prev => {
      const next = prev.includes(name) ? prev.filter(n=>n!==name) : [...prev, name];
      AsyncStorage.setItem('fav_supers', JSON.stringify(next)).catch(()=>{});
      return next;
    });
  }

  // Initial picker: "¿En qué quieres ahorrar?"
  if (!activeSection) {
    return (
      <SafeAreaView style={{flex:1,backgroundColor:COLORS.bg}} edges={['top']}>
        <View style={{flex:1,justifyContent:'center',padding:24}}>
          <View style={{alignItems:'center',marginBottom:24}}>
            <Ionicons name="wallet" size={40} color={COLORS.primary}/>
            <Text style={{fontSize:26,fontWeight:'800',color:COLORS.text,textAlign:'center',marginTop:8}}>Ahorro</Text>
            <Text style={{fontSize:15,color:COLORS.text3,textAlign:'center',marginTop:4}}>¿En qué quieres ahorrar?</Text>
          </View>
          <View style={{gap:12}}>
            {SECTIONS.map(s=>(
              <TouchableOpacity key={s.key} style={{flexDirection:'row',alignItems:'center',gap:14,backgroundColor:COLORS.bg2,borderRadius:18,padding:18,
                borderWidth:2,borderColor:COLORS.border,shadowColor:'#000',shadowOpacity:0.06,shadowRadius:8,elevation:3}}
                onPress={()=>setActiveSection(s.key)}>
                <View style={{width:52,height:52,borderRadius:14,backgroundColor:s.color+'18',alignItems:'center',justifyContent:'center'}}>
                  <Ionicons name={s.icon} size={26} color={s.color}/>
                </View>
                <View style={{flex:1}}>
                  <Text style={{fontSize:18,fontWeight:'700',color:COLORS.text}}>{s.label}</Text>
                  <Text style={{fontSize:13,color:COLORS.text3,marginTop:2}}>{s.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.text3}/>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Super sub-picker: "Supermercado más barato" vs "Buscar producto"
  if (activeSection === 'super' && !superView) {
    return (
      <SafeAreaView style={{flex:1,backgroundColor:COLORS.bg}} edges={['top']}>
        <View style={{flexDirection:'row',alignItems:'center',padding:14,gap:8}}>
          <TouchableOpacity onPress={()=>setActiveSection(null)} style={{width:36,height:36,borderRadius:18,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'}}>
            <Ionicons name="arrow-back" size={20} color={COLORS.text2}/>
          </TouchableOpacity>
          <Text style={{fontSize:18,fontWeight:'700',color:COLORS.text}}>Supermercados</Text>
        </View>
        <View style={{flex:1,justifyContent:'center',padding:24,gap:14}}>
          <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:14,backgroundColor:COLORS.bg2,borderRadius:18,padding:18,
            borderWidth:2,borderColor:'#16A34A',shadowColor:'#000',shadowOpacity:0.06,shadowRadius:8,elevation:3}}
            onPress={()=>setSuperView('ranking')}>
            <View style={{width:52,height:52,borderRadius:14,backgroundColor:'#DCFCE7',alignItems:'center',justifyContent:'center'}}>
              <Ionicons name="trophy-outline" size={26} color="#16A34A"/>
            </View>
            <View style={{flex:1}}>
              <Text style={{fontSize:17,fontWeight:'700',color:COLORS.text}}>Supermercado más barato</Text>
              <Text style={{fontSize:13,color:COLORS.text3,marginTop:2}}>Ranking por CCAA, ciudad o toda España</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.text3}/>
          </TouchableOpacity>
          <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:14,backgroundColor:COLORS.bg2,borderRadius:18,padding:18,
            borderWidth:2,borderColor:COLORS.primary,shadowColor:'#000',shadowOpacity:0.06,shadowRadius:8,elevation:3}}
            onPress={()=>setSuperView('producto')}>
            <View style={{width:52,height:52,borderRadius:14,backgroundColor:COLORS.primaryLight,alignItems:'center',justifyContent:'center'}}>
              <Ionicons name="search-outline" size={26} color={COLORS.primary}/>
            </View>
            <View style={{flex:1}}>
              <Text style={{fontSize:17,fontWeight:'700',color:COLORS.text}}>Buscar producto</Text>
              <Text style={{fontSize:13,color:COLORS.text3,marginTop:2}}>Encuentra dónde es más barato un producto</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.text3}/>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Main content
  return (
    <SafeAreaView style={{flex:1,backgroundColor:COLORS.bg}} edges={['top']}>
      {/* Header with back */}
      <View style={{flexDirection:'row',alignItems:'center',padding:14,gap:8,backgroundColor:COLORS.bg2,borderBottomWidth:0.5,borderBottomColor:COLORS.border}}>
        <TouchableOpacity onPress={()=>{
          if (superView) { setSuperView(null); }
          else { setActiveSection(null); }
        }} style={{width:36,height:36,borderRadius:18,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'}}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text2}/>
        </TouchableOpacity>
        <Text style={{fontSize:18,fontWeight:'700',color:COLORS.text}}>
          {activeSection==='super'?(superView==='ranking'?'Ranking Supermercados':'Buscar Producto'):
           activeSection==='bancos'?'Bancos':'Gana Dinero'}
        </Text>
      </View>

      {activeSection==='super' && superView==='ranking' && <SuperRanking favs={favSupers} onToggleFav={toggleFavSuper}/>}
      {activeSection==='super' && superView==='producto' && <ProductSearch/>}
      {activeSection==='bancos' && <BancosTab/>}
      {activeSection==='apps' && <AppsTab/>}

      {/* FAB — add product (only in super section) */}
      {activeSection==='super' && (
        <TouchableOpacity style={{position:'absolute',bottom:16,right:16,width:52,height:52,borderRadius:99,backgroundColor:COLORS.primary,
          alignItems:'center',justifyContent:'center',shadowColor:'#000',shadowOpacity:0.25,shadowRadius:8,elevation:6}}
          onPress={()=>{if(!isLoggedIn){setShowAuth(true);return;}setShowAddProduct(true);}}>
          <Ionicons name="add" size={28} color="#fff"/>
        </TouchableOpacity>
      )}

      <AddProductModal visible={showAddProduct} onClose={()=>setShowAddProduct(false)}
        onSuccess={()=>{setShowAddProduct(false);Alert.alert('Producto añadido','El precio se ha registrado correctamente.');}}/>
      <AuthModal visible={showAuth} onClose={()=>setShowAuth(false)}/>
    </SafeAreaView>
  );
}

// ─── DATA ────────────────────────────────────────────────────────────────────
const CCAA_CITIES = {
  'Andalucía':['Sevilla','Málaga','Córdoba','Granada','Almería','Cádiz','Jaén','Huelva','Jerez','Villafranca de Córdoba'],
  'Aragón':['Zaragoza','Huesca','Teruel'],
  'Asturias':['Oviedo','Gijón','Avilés'],
  'Baleares':['Palma','Ibiza','Manacor'],
  'Canarias':['Las Palmas','Santa Cruz de Tenerife'],
  'Cantabria':['Santander','Torrelavega'],
  'C. La Mancha':['Toledo','Ciudad Real','Albacete','Guadalajara'],
  'C. y León':['Valladolid','Burgos','Salamanca','León','Segovia'],
  'Cataluña':['Barcelona','Tarragona','Lleida','Girona','Sabadell'],
  'Extremadura':['Badajoz','Cáceres','Mérida'],
  'Galicia':['Vigo','A Coruña','Ourense','Santiago'],
  'La Rioja':['Logroño'],
  'Madrid':['Madrid','Alcalá de Henares','Móstoles','Getafe','Leganés'],
  'Murcia':['Murcia','Cartagena','Lorca'],
  'Navarra':['Pamplona','Tudela'],
  'País Vasco':['Bilbao','San Sebastián','Vitoria'],
  'C. Valenciana':['Valencia','Alicante','Castellón','Elche'],
};

const RANKING = [
  {pos:1,name:'Aldi',weekly:72,pct:-22,tip:'El más barato según OCU.',maps:'Aldi supermercado',color:'#16A34A'},
  {pos:2,name:'Lidl',weekly:77,pct:-18,tip:'Calidad-precio excepcional.',maps:'Lidl supermercado',color:'#16A34A'},
  {pos:3,name:'Día',weekly:84,pct:-12,tip:'Tarjeta ClubDía muy rentable.',maps:'Día supermercado',color:'#65A30D'},
  {pos:4,name:'Coviran',weekly:85,pct:-4,tip:'Cooperativa andaluza, buenos precios.',maps:'Coviran supermercado',color:'#65A30D'},
  {pos:5,name:'Mercadona',weekly:89,pct:-8,tip:'El favorito de España.',maps:'Mercadona supermercado',color:'#D97706'},
  {pos:6,name:'Alcampo',weekly:82,pct:-5,tip:'Descuentos con tarjeta.',maps:'Alcampo supermercado',color:'#65A30D'},
  {pos:7,name:'Carrefour',weekly:95,pct:-3,tip:'Gran variedad de productos.',maps:'Carrefour supermercado',color:'#D97706'},
  {pos:8,name:'Eroski',weekly:98,pct:0,tip:'Ofertas para socios.',maps:'Eroski supermercado',color:'#D97706'},
  {pos:9,name:'Consum',weekly:97,pct:-10,tip:'Fuerte en Valencia y Cataluña.',maps:'Consum supermercado',color:'#D97706'},
  {pos:10,name:'El Corte Inglés',weekly:110,pct:8,tip:'Premium y gourmet.',maps:'El Corte Inglés supermercado',color:'#DC2626'},
];

function SuperRanking({ favs, onToggleFav }) {
  const [scope, setScope] = useState('');
  const [selectedCCAA, setSelectedCCAA] = useState(null);
  const [showSelector, setShowSelector] = useState(true);
  const [localSupers, setLocalSupers] = useState([]);
  const [loadingLocal, setLoadingLocal] = useState(false);

  useEffect(() => {
    if (!showSelector && scope) loadLocalSupers();
  }, [showSelector, scope]);

  async function loadLocalSupers() {
    setLoadingLocal(true);
    try {
      const data = await apiGet(`/api/places?cat=supermercado&city=${encodeURIComponent(scope)}&sort=price&limit=20`) || [];
      setLocalSupers(data.filter(p => {
        const n = (p.name||'').toLowerCase();
        return !['mercadona','lidl','aldi','carrefour','alcampo','dia','eroski','consum','el corte','spar','coviran'].some(chain => n.includes(chain));
      }));
    } catch(_) {} finally { setLoadingLocal(false); }
  }

  if (showSelector) {
    return (
      <ScrollView contentContainerStyle={{padding:16,gap:12,paddingBottom:100}}>
        <Text style={{fontSize:15,color:COLORS.text3,textAlign:'center',marginBottom:4}}>Elige tu zona para ver precios</Text>
        <TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:14,padding:16,alignItems:'center'}}
          onPress={()=>{setScope('');setShowSelector(false);}}>
          <Ionicons name="globe-outline" size={22} color="#fff"/>
          <Text style={{fontSize:16,fontWeight:'700',color:'#fff',marginTop:4}}>Toda España</Text>
        </TouchableOpacity>
        <View style={{backgroundColor:COLORS.bg2,borderRadius:14,padding:14,borderWidth:1,borderColor:COLORS.border}}>
          <Text style={{fontSize:13,fontWeight:'700',color:COLORS.text,marginBottom:8}}>Elige tu Comunidad Autónoma</Text>
          {Object.keys(CCAA_CITIES).map(ccaa=>(
            <View key={ccaa}>
              <TouchableOpacity style={{paddingHorizontal:12,paddingVertical:10,borderRadius:10,marginBottom:4,
                backgroundColor:selectedCCAA===ccaa?COLORS.primaryLight:COLORS.bg3,borderWidth:1,
                borderColor:selectedCCAA===ccaa?COLORS.primary:COLORS.border,
                flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}
                onPress={()=>setSelectedCCAA(selectedCCAA===ccaa?null:ccaa)}>
                <Text style={{fontSize:13,fontWeight:'600',color:selectedCCAA===ccaa?COLORS.primary:COLORS.text}}>{ccaa}</Text>
                <Ionicons name={selectedCCAA===ccaa?'chevron-up':'chevron-down'} size={16} color={selectedCCAA===ccaa?COLORS.primary:COLORS.text3}/>
              </TouchableOpacity>
              {selectedCCAA===ccaa&&(
                <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,paddingTop:4,paddingLeft:8,paddingBottom:8}}>
                  <TouchableOpacity style={{paddingHorizontal:10,paddingVertical:6,borderRadius:8,backgroundColor:COLORS.primary}}
                    onPress={()=>{setScope(ccaa);setShowSelector(false);}}>
                    <Text style={{fontSize:12,fontWeight:'600',color:'#fff'}}>Toda {ccaa}</Text>
                  </TouchableOpacity>
                  {CCAA_CITIES[ccaa].map(city=>(
                    <TouchableOpacity key={city} style={{paddingHorizontal:10,paddingVertical:6,borderRadius:8,backgroundColor:COLORS.bg3,borderWidth:1,borderColor:COLORS.border}}
                      onPress={()=>{setScope(city);setShowSelector(false);}}>
                      <Text style={{fontSize:12,fontWeight:'500',color:COLORS.text2}}>{city}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{padding:14,gap:10,paddingBottom:100}}>
      <TouchableOpacity onPress={()=>setShowSelector(true)} style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:4}}>
        <Ionicons name="location-outline" size={14} color={COLORS.primary}/>
        <Text style={{fontSize:13,fontWeight:'600',color:COLORS.primary}}>{scope||'Toda España'} — cambiar</Text>
      </TouchableOpacity>
      {/* National ranking */}
      <Text style={{fontSize:12,fontWeight:'700',color:COLORS.text3,letterSpacing:0.5}}>CADENAS NACIONALES</Text>
      {RANKING.map(sm=>(
        <View key={sm.pos} style={{backgroundColor:COLORS.bg2,borderRadius:14,padding:14,borderWidth:0.5,borderColor:COLORS.border,flexDirection:'row',alignItems:'center',gap:10}}>
          <View style={{width:28,height:28,borderRadius:14,backgroundColor:sm.color+'22',alignItems:'center',justifyContent:'center'}}>
            <Text style={{fontSize:12,fontWeight:'800',color:sm.color}}>{sm.pos}</Text>
          </View>
          <View style={{flex:1}}>
            <Text style={{fontSize:14,fontWeight:'700',color:COLORS.text}}>{sm.name}</Text>
            <Text style={{fontSize:10,color:COLORS.text3}}>{sm.tip}</Text>
          </View>
          <View style={{alignItems:'flex-end'}}>
            <Text style={{fontSize:15,fontWeight:'800',color:sm.color}}>{sm.weekly}€<Text style={{fontSize:9,fontWeight:'500'}}>/sem</Text></Text>
          </View>
          <TouchableOpacity style={{width:28,height:28,borderRadius:14,backgroundColor:favs.includes(sm.name)?'#FEF2F2':COLORS.bg3,alignItems:'center',justifyContent:'center'}}
            onPress={()=>onToggleFav(sm.name)}>
            <Ionicons name={favs.includes(sm.name)?'heart':'heart-outline'} size={14} color={favs.includes(sm.name)?'#DC2626':COLORS.text3}/>
          </TouchableOpacity>
        </View>
      ))}
      {/* Local supermarkets from DB */}
      {scope && (
        <>
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:10}}>
          <Text style={{fontSize:12,fontWeight:'700',color:COLORS.text3,letterSpacing:0.5}}>MERCADOS LOCALES</Text>
          {loadingLocal && <ActivityIndicator size="small" color={COLORS.primary}/>}
        </View>
        {localSupers.length === 0 && !loadingLocal && (
          <View style={{alignItems:'center',paddingVertical:20,gap:6}}>
            <Ionicons name="storefront-outline" size={24} color={COLORS.text3}/>
            <Text style={{fontSize:12,color:COLORS.text3,textAlign:'center'}}>No hay mercados locales en {scope} todavía. Añade el tuyo con el botón +</Text>
          </View>
        )}
        {localSupers.map(p=>(
          <View key={p.id} style={{backgroundColor:COLORS.bg2,borderRadius:14,padding:14,borderWidth:0.5,borderColor:COLORS.border,flexDirection:'row',alignItems:'center',gap:10}}>
            <View style={{width:28,height:28,borderRadius:14,backgroundColor:'#7C3AED22',alignItems:'center',justifyContent:'center'}}>
              <Ionicons name="storefront" size={14} color="#7C3AED"/>
            </View>
            <View style={{flex:1}}>
              <Text style={{fontSize:14,fontWeight:'700',color:COLORS.text}}>{p.name}</Text>
              <Text style={{fontSize:10,color:COLORS.text3}}>{p.city}{p.address?` · ${p.address}`:''}</Text>
            </View>
            {p.repPrice>0 && (
              <Text style={{fontSize:15,fontWeight:'800',color:'#7C3AED'}}>{p.repPrice?.toFixed(0)}€<Text style={{fontSize:9,fontWeight:'500'}}>/sem</Text></Text>
            )}
            <TouchableOpacity style={{width:28,height:28,borderRadius:14,backgroundColor:favs.includes(p.name)?'#FEF2F2':COLORS.bg3,alignItems:'center',justifyContent:'center'}}
              onPress={()=>onToggleFav(p.name)}>
              <Ionicons name={favs.includes(p.name)?'heart':'heart-outline'} size={14} color={favs.includes(p.name)?'#DC2626':COLORS.text3}/>
            </TouchableOpacity>
          </View>
        ))}
        </>
      )}
    </ScrollView>
  );
}

// ─── PRODUCT SEARCH ──────────────────────────────────────────────────────────
function ProductSearch() {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [selectedCCAA, setSelectedCCAA] = useState(null);
  const [showCityPicker, setShowCityPicker] = useState(true);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [productSugs, setProductSugs] = useState([]);
  const prodTO = useRef(null);

  function onQueryChange(text) {
    setQuery(text);
    if (prodTO.current) clearTimeout(prodTO.current);
    if (text.length < 2) { setProductSugs([]); return; }
    prodTO.current = setTimeout(async () => {
      try { setProductSugs(await apiGet(`/api/products/search?q=${encodeURIComponent(text)}`) || []); } catch(_) {}
    }, 300);
  }

  function selectProduct(p) { setQuery(p); setProductSugs([]); search(p); }

  async function search(q) {
    const term = (q || query).trim();
    if (!term) return;
    setProductSugs([]);
    setLoading(true);
    try {
      let url = `/api/products/prices?product=${encodeURIComponent(term)}`;
      if (city) url += `&city=${encodeURIComponent(city)}`;
      setResults(await apiGet(url) || []);
    } catch(_) {} finally { setLoading(false); }
  }

  if (showCityPicker) {
    return (
      <ScrollView contentContainerStyle={{padding:16,gap:12,paddingBottom:100}}>
        <Text style={{fontSize:15,color:COLORS.text3,textAlign:'center',marginBottom:4}}>Elige dónde buscar</Text>
        <TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:14,padding:14,alignItems:'center'}}
          onPress={()=>{setCity('');setShowCityPicker(false);}}>
          <Ionicons name="globe-outline" size={20} color="#fff"/>
          <Text style={{fontSize:15,fontWeight:'700',color:'#fff',marginTop:4}}>Toda España</Text>
        </TouchableOpacity>
        <View style={{backgroundColor:COLORS.bg2,borderRadius:14,padding:14,borderWidth:1,borderColor:COLORS.border}}>
          <Text style={{fontSize:13,fontWeight:'700',color:COLORS.text,marginBottom:8}}>Comunidad Autónoma</Text>
          {Object.keys(CCAA_CITIES).map(ccaa=>(
            <View key={ccaa}>
              <TouchableOpacity style={{paddingHorizontal:12,paddingVertical:9,borderRadius:10,marginBottom:3,
                backgroundColor:selectedCCAA===ccaa?COLORS.primaryLight:COLORS.bg3,borderWidth:1,
                borderColor:selectedCCAA===ccaa?COLORS.primary:COLORS.border,
                flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}
                onPress={()=>setSelectedCCAA(selectedCCAA===ccaa?null:ccaa)}>
                <Text style={{fontSize:12,fontWeight:'600',color:selectedCCAA===ccaa?COLORS.primary:COLORS.text}}>{ccaa}</Text>
                <Ionicons name={selectedCCAA===ccaa?'chevron-up':'chevron-down'} size={14} color={COLORS.text3}/>
              </TouchableOpacity>
              {selectedCCAA===ccaa&&(
                <View style={{flexDirection:'row',flexWrap:'wrap',gap:5,paddingTop:4,paddingLeft:8,paddingBottom:8}}>
                  {CCAA_CITIES[ccaa].map(c=>(
                    <TouchableOpacity key={c} style={{paddingHorizontal:9,paddingVertical:5,borderRadius:8,backgroundColor:COLORS.bg3,borderWidth:1,borderColor:COLORS.border}}
                      onPress={()=>{setCity(c);setShowCityPicker(false);}}>
                      <Text style={{fontSize:11,fontWeight:'500',color:COLORS.text2}}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={{flex:1}}>
      <View style={{padding:14,gap:8,backgroundColor:COLORS.bg2,borderBottomWidth:0.5,borderBottomColor:COLORS.border}}>
        <TouchableOpacity onPress={()=>setShowCityPicker(true)} style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:4}}>
          <Ionicons name="location-outline" size={14} color={COLORS.primary}/>
          <Text style={{fontSize:13,fontWeight:'600',color:COLORS.primary}}>{city||'Toda España'} — cambiar</Text>
        </TouchableOpacity>
        <View style={{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:COLORS.bg3,borderRadius:12,paddingHorizontal:12,borderWidth:1,borderColor:COLORS.border}}>
          <Ionicons name="search-outline" size={16} color={COLORS.text3}/>
          <TextInput style={{flex:1,paddingVertical:10,fontSize:14,color:COLORS.text}}
            value={query} onChangeText={onQueryChange} placeholder="Buscar producto (ej: leche, pan, aceite...)"
            placeholderTextColor={COLORS.text3} returnKeyType="search" onSubmitEditing={()=>search()}/>
          <TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:8,paddingHorizontal:12,paddingVertical:6}} onPress={()=>search()}>
            <Text style={{color:'#fff',fontWeight:'700',fontSize:12}}>Buscar</Text>
          </TouchableOpacity>
        </View>
        {productSugs.length>0&&(
          <View style={{backgroundColor:COLORS.bg2,borderRadius:10,borderWidth:1,borderColor:COLORS.border,marginTop:4}}>
            {productSugs.map(p=>(
              <TouchableOpacity key={p} style={{paddingHorizontal:14,paddingVertical:10,borderBottomWidth:0.5,borderBottomColor:COLORS.border,flexDirection:'row',alignItems:'center',gap:8}}
                onPress={()=>selectProduct(p)}>
                <Ionicons name="pricetag-outline" size={14} color={COLORS.primary}/>
                <Text style={{fontSize:14,color:COLORS.text}}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      {loading ? <ActivityIndicator color={COLORS.primary} style={{marginTop:30}}/> : (
        <FlatList data={results} keyExtractor={p=>`pr_${p.id}`}
          contentContainerStyle={{padding:14,gap:10,paddingBottom:80}}
          renderItem={({item:p})=>(
            <View style={{backgroundColor:COLORS.bg2,borderRadius:14,padding:12,borderWidth:0.5,borderColor:COLORS.border}}>
              <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
                <View style={{width:40,height:40,borderRadius:10,backgroundColor:'#DCFCE7',alignItems:'center',justifyContent:'center'}}>
                  <Ionicons name="pricetag-outline" size={20} color="#16A34A"/>
                </View>
                <View style={{flex:1}}>
                  <Text style={{fontSize:14,fontWeight:'600',color:COLORS.text}} numberOfLines={1}>{p.product}</Text>
                  <Text style={{fontSize:11,color:COLORS.text3}}>{p.places?.name||'Supermercado'} · {p.places?.city||''}</Text>
                </View>
                <View style={{alignItems:'flex-end'}}>
                  <Text style={{fontSize:16,fontWeight:'800',color:COLORS.primary}}>{p.price?.toFixed(2).replace(".",",")}€</Text>
                  <Text style={{fontSize:10,color:COLORS.text3}}>/{p.unit||'ud'}</Text>
                </View>
              </View>
              {p.places?.lat&&p.places?.lng&&(
                <TouchableOpacity style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,marginTop:8,paddingTop:8,
                  borderTopWidth:0.5,borderTopColor:COLORS.border}}
                  onPress={()=>openURL(`https://www.google.com/maps/dir/?api=1&destination=${p.places.lat},${p.places.lng}`)}>
                  <Ionicons name="navigate-outline" size={14} color={COLORS.primary}/>
                  <Text style={{fontSize:13,fontWeight:'700',color:COLORS.primary}}>Ir al supermercado</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          ListEmptyComponent={
            !loading&&query.trim() ? (
              <View style={{alignItems:'center',paddingTop:40,gap:6}}>
                <Ionicons name="search-outline" size={30} color={COLORS.text3}/>
                <Text style={{fontSize:14,color:COLORS.text3}}>Sin resultados para "{query}"</Text>
              </View>
            ) : (
              <View style={{alignItems:'center',paddingTop:40,gap:6}}>
                <Ionicons name="basket-outline" size={30} color={COLORS.text3}/>
                <Text style={{fontSize:14,color:COLORS.text3}}>Busca un producto para ver precios</Text>
              </View>
            )
          }/>
      )}
    </View>
  );
}

// ─── BANCOS TAB (sin cambios, solo iconos) ───────────────────────────────────
const BANK_OFFERS = [
  {id:'trade',bank:'Trade Republic',color:'#0ADB83',hot:true,
   title:'Cuenta con 4% TAE + acciones fraccionadas',
   highlight:'4% TAE sin condiciones + invierte desde 1€',
   conditions:['4% TAE en efectivo no invertido','Sin comisiones','Acciones, ETFs desde 1€','Cuenta alemana IBAN DE'],
   url:'https://ref.trade.re/juanantonioex',cta:'Abrir Trade Republic',
   referralNote:'Usa mi enlace y ganamos ambos una acción gratis'},
  {id:'myinvestor',bank:'MyInvestor',color:'#6D28D9',hot:true,
   title:'Hasta 4.50% TAE + fondos indexados',
   highlight:'4.50% TAE sin permanencia + fondos sin comisión',
   conditions:['4.50% TAE sin permanencia','Fondos sin comisión de custodia','Sin comisiones','Respaldado por Andbank'],
   url:'https://newapp.myinvestor.es/do/signup?promotionalCode=UNHO5',cta:'Abrir MyInvestor',
   code:'UNHO5',referralNote:'Usa el código UNHO5 al registrarte'},
  {id:'bbva',bank:'BBVA',color:'#004B9E',hot:false,
   title:'Cuenta Online — sin comisiones + hasta 300€',
   highlight:'Sin comisiones con código amigo: hasta 300€ de regalo',
   conditions:['Sin comisiones de mantenimiento','Tarjeta débito gratuita','Hasta 300€ bienvenida','App 4.8/5'],
   url:'https://www.bbva.es/personas/productos/cuentas/cuenta-online.html',cta:'Abrir BBVA',
   code:'14D400110DACFB',referralNote:'Usa el código al registrarte para el bono'},
  {id:'revolut',bank:'Revolut',color:'#191C1F',hot:false,
   title:'Sin comisiones en divisas + hasta 4% ahorro',
   highlight:'Tipo de cambio real, sin comisión para viajes',
   conditions:['Sin comisión en divisas hasta 1.000€/mes','Cambio al tipo real','Tarjeta virtual instantánea','Transferencias baratas'],
   url:'https://revolut.com/referral/?referral-code=juananmpu9',cta:'Abrir Revolut',
   referralNote:'Regístrate con mi enlace y ganamos ambos'},
];

function BancosTab() {
  const [copiedCode, setCopiedCode] = useState(null);
  function copyCode(code) { setCopiedCode(code); setTimeout(()=>setCopiedCode(null),3000); Alert.alert('Copiado',`Código "${code}" copiado.`); }
  return (
    <ScrollView contentContainerStyle={{padding:14,gap:14,paddingBottom:100}}>
      {BANK_OFFERS.map(o=>(
        <View key={o.id} style={{backgroundColor:COLORS.bg2,borderRadius:18,borderWidth:o.hot?2:0.5,borderColor:o.hot?o.color:COLORS.border,overflow:'hidden'}}>
          {o.hot&&<View style={{backgroundColor:o.color,paddingVertical:7,alignItems:'center'}}><Text style={{fontSize:12,fontWeight:'800',color:'#fff'}}>RECOMENDADO</Text></View>}
          <View style={{padding:16,gap:8}}>
            <Text style={{fontSize:12,color:COLORS.text3,fontWeight:'600'}}>{o.bank}</Text>
            <Text style={{fontSize:14,fontWeight:'700',color:COLORS.text,lineHeight:19}}>{o.title}</Text>
            <View style={{flexDirection:'row',alignItems:'flex-start',gap:6,backgroundColor:'#FFFBEB',borderRadius:8,padding:10}}>
              <Ionicons name="star" size={13} color="#F59E0B"/>
              <Text style={{flex:1,fontSize:12,color:'#92400E',fontWeight:'600',lineHeight:17}}>{o.highlight}</Text>
            </View>
            {o.conditions.map(c=>(
              <View key={c} style={{flexDirection:'row',alignItems:'flex-start',gap:8}}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.success} style={{marginTop:2}}/>
                <Text style={{flex:1,fontSize:12,color:COLORS.text,lineHeight:17}}>{c}</Text>
              </View>
            ))}

            <View style={{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:o.color+'11',borderRadius:10,padding:10,borderWidth:1,borderColor:o.color+'44'}}>
              <Ionicons name="gift" size={14} color={o.color}/>
              <Text style={{flex:1,fontSize:12,fontWeight:'600',color:o.color}}>{o.referralNote}</Text>
            </View>
            {o.code&&(
              <TouchableOpacity style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderRadius:12,padding:12,borderWidth:2,borderColor:o.color,backgroundColor:COLORS.bg}}
                onPress={()=>copyCode(o.code)}>
                <View>
                  <Text style={{fontSize:11,color:COLORS.text3}}>Código amigo:</Text>
                  <Text style={{fontSize:17,fontWeight:'800',color:o.color,letterSpacing:2}}>{o.code}</Text>
                </View>
                <View style={{flexDirection:'row',alignItems:'center',gap:5,borderRadius:10,paddingHorizontal:12,paddingVertical:8,backgroundColor:o.color}}>
                  <Ionicons name={copiedCode===o.code?'checkmark':'copy-outline'} size={16} color="#fff"/>
                  <Text style={{color:'#fff',fontWeight:'700',fontSize:12}}>{copiedCode===o.code?'Copiado':'Copiar'}</Text>
                </View>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={{borderRadius:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,padding:14,backgroundColor:o.color}}
              onPress={()=>openURL(o.url)}>
              <Text style={{color:'#fff',fontWeight:'700',fontSize:15}}>{o.cta}</Text>
              <Ionicons name="arrow-forward" size={15} color="#fff"/>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── APPS TAB — solo apps con referidos propios ──────────────────────────────
const APPS_DATA = [
  {name:'iGraal',icon:'cart-outline',color:'#EC4899',
   desc:'Cashback automático en +2.000 tiendas: Amazon, Zara, Booking, El Corte Inglés, AliExpress y más. Compras como siempre y te devuelven entre un 3% y un 15% del precio total. Retiras por PayPal o transferencia bancaria a partir de 20€.',
   earn:'Hasta 15% cashback · 5€ de bienvenida al registrarte',
   referral:'Al registrarte con mi enlace, los dos recibimos 5€ de saldo gratis.',
   url:'https://es.igraal.com/padrinazgo?padrino=vpbWSouX'},
  {name:'Attapoll',icon:'clipboard-outline',color:'#3B82F6',
   desc:'Completa encuestas cortas de 5-10 minutos y cobra por cada una. Puedes hacerlas en cualquier momento desde el móvil. Retira desde solo 3€ por PayPal, Revolut o Bizum. Las encuestas se adaptan a tu perfil — cuanto más completas, mejor pagan.',
   earn:'5-15€ al mes · retiro desde 3€',
   referral:'Al entrar con mi enlace recibes saldo de bienvenida para empezar ganando antes.',
   url:'https://attapoll.app/join/qarui'},
  {name:'WeWard',icon:'walk-outline',color:'#16A34A',
   desc:'Gana puntos simplemente por caminar. La app cuenta tus pasos y los convierte en dinero real. Canjea los puntos por tarjetas regalo de Amazon, Carrefour, SEUR, donaciones a ONGs o transferencia bancaria.',
   earn:'5-10€ al mes solo caminando · puntos extra al registrarte',
   referral:'Introduce mi código al crear la cuenta y empezarás con puntos extra.',
   url:null,code:'DevotoArana4251'},
];

function AppsTab() {
  const [copied, setCopied] = useState(null);
  function copy(code) { setCopied(code); setTimeout(()=>setCopied(null),3000); Alert.alert('Copiado',`Código "${code}" copiado.`); }
  return (
    <ScrollView contentContainerStyle={{padding:14,gap:14,paddingBottom:100}}>
      <View style={{backgroundColor:COLORS.primaryLight,borderRadius:14,padding:14,flexDirection:'row',gap:10,alignItems:'center',borderWidth:1,borderColor:COLORS.primary+'33'}}>
        <Ionicons name="information-circle-outline" size={20} color={COLORS.primary}/>
        <Text style={{flex:1,fontSize:12,color:COLORS.primary,lineHeight:18}}>
          Solo incluimos apps que hemos probado y que tienen referido activo. Ganamos ambos cuando te registras.
        </Text>
      </View>

      {APPS_DATA.map(a=>(
        <View key={a.name} style={{backgroundColor:COLORS.bg2,borderRadius:18,borderWidth:0.5,borderColor:COLORS.border,overflow:'hidden'}}>
          <View style={{padding:16,gap:10}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
              <View style={{width:44,height:44,borderRadius:12,backgroundColor:a.color+'18',alignItems:'center',justifyContent:'center'}}>
                <Ionicons name={a.icon} size={22} color={a.color}/>
              </View>
              <View style={{flex:1}}>
                <Text style={{fontSize:16,fontWeight:'700',color:COLORS.text}}>{a.name}</Text>
                <Text style={{fontSize:12,fontWeight:'600',color:a.color}}>{a.earn}</Text>
              </View>
            </View>
            <Text style={{fontSize:13,color:COLORS.text2,lineHeight:19}}>{a.desc}</Text>
            <View style={{flexDirection:'row',alignItems:'flex-start',gap:6,backgroundColor:a.color+'11',borderRadius:10,padding:10,borderWidth:1,borderColor:a.color+'44'}}>
              <Ionicons name="gift" size={14} color={a.color}/>
              <Text style={{flex:1,fontSize:12,fontWeight:'600',color:a.color}}>{a.referral}</Text>
            </View>
            {a.code&&(
              <TouchableOpacity style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderRadius:12,padding:12,borderWidth:2,borderColor:a.color,backgroundColor:COLORS.bg}}
                onPress={()=>copy(a.code)}>
                <View>
                  <Text style={{fontSize:11,color:COLORS.text3}}>Código:</Text>
                  <Text style={{fontSize:17,fontWeight:'800',color:a.color,letterSpacing:2}}>{a.code}</Text>
                </View>
                <View style={{flexDirection:'row',alignItems:'center',gap:5,borderRadius:10,paddingHorizontal:12,paddingVertical:8,backgroundColor:a.color}}>
                  <Ionicons name={copied===a.code?'checkmark':'copy-outline'} size={16} color="#fff"/>
                  <Text style={{color:'#fff',fontWeight:'700',fontSize:12}}>{copied===a.code?'Copiado':'Copiar'}</Text>
                </View>
              </TouchableOpacity>
            )}

            {a.url&&(
              <TouchableOpacity style={{borderRadius:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,padding:14,backgroundColor:a.color}}
                onPress={()=>openURL(a.url)}>
                <Text style={{color:'#fff',fontWeight:'700',fontSize:15}}>Registrarte gratis</Text>
                <Ionicons name="arrow-forward" size={15} color="#fff"/>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}


// ─── ADD PRODUCT MODAL (slides) ──────────────────────────────────────────────
function AddProductModal({ visible, onClose, onSuccess }) {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState('product'); // 'product' | 'new_super'
  const [city, setCity] = useState('');
  const [citySugs, setCitySugs] = useState([]);
  const [superSearch, setSuperSearch] = useState('');
  const [superResults, setSuperResults] = useState([]);
  const [selectedSuper, setSelectedSuper] = useState(null);
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  // New super fields
  const [newSuperName, setNewSuperName] = useState('');
  const [newSuperAddress, setNewSuperAddress] = useState('');
  const [searchAddr, setSearchAddr] = useState('');
  const [addrResults, setAddrResults] = useState([]);
  const [newLat, setNewLat] = useState('');
  const [newLng, setNewLng] = useState('');
  const [newPriceRange, setNewPriceRange] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [duplicate, setDuplicate] = useState(null);
  const cityTO = useRef(null);
  const superTO = useRef(null);

  function reset() {
    setStep(0);setMode('product');setCity('');setCitySugs([]);setSuperSearch('');setSuperResults([]);
    setSelectedSuper(null);setProductName('');setPrice('');setDescription('');
    setImages([]);setError('');setDuplicate(null);
    setNewSuperName('');setNewSuperAddress('');setSearchAddr('');setAddrResults([]);
    setNewLat('');setNewLng('');setNewPriceRange(null);
  }
  function handleClose() { reset(); onClose(); }

  function onCitySearch(t) {
    setCity(t);
    if (cityTO.current) clearTimeout(cityTO.current);
    if (t.length<2) { setCitySugs([]); return; }
    cityTO.current = setTimeout(async()=>{
      try { setCitySugs(await apiGet(`/api/cities/search?q=${encodeURIComponent(t)}`)||[]); } catch(_) {}
    },300);
  }

  function onSuperSearch(t) {
    setSuperSearch(t);
    if (superTO.current) clearTimeout(superTO.current);
    if (t.length<2) { setSuperResults([]); return; }
    superTO.current = setTimeout(async()=>{
      try { setSuperResults(await apiGet(`/api/places/search-super?q=${encodeURIComponent(t)}&city=${encodeURIComponent(city)}`)||[]); } catch(_) {}
    },400);
  }

  async function checkDuplicate() {
    if (!selectedSuper||!productName.trim()) return;
    try {
      const r = await apiGet(`/api/prices/check-duplicate?place_id=${selectedSuper.id}&product=${encodeURIComponent(productName.trim())}`);
      if (r?.exists) setDuplicate(r.existing);
      else setDuplicate(null);
    } catch(_) {}
  }

  async function pickImage() {
    if (images.length>=3) return;
    try {
      const r = await ImagePicker.launchImageLibraryAsync({mediaTypes:ImagePicker.MediaTypeOptions.Images,allowsEditing:true,quality:0.8,base64:true});
      if (!r.canceled&&r.assets?.[0]) setImages(prev=>[...prev,{uri:r.assets[0].uri,base64:r.assets[0].base64}]);
    } catch(_) {}
  }

  const addrTO = useRef(null);
  function onSearchAddr(text) {
    setSearchAddr(text);
    if (addrTO.current) clearTimeout(addrTO.current);
    if (text.length < 3) { setAddrResults([]); return; }
    addrTO.current = setTimeout(async () => {
      try {
        const Location = require('expo-location');
        const results = await Location.geocodeAsync(text + ', España');
        const detailed = [];
        for (const r of (results||[]).slice(0, 5)) {
          try {
            const geo = await Location.reverseGeocodeAsync({latitude:r.latitude,longitude:r.longitude});
            const g = geo?.[0]||{};
            const street = [g.street,g.streetNumber].filter(Boolean).join(' ');
            const dCity = g.city||g.subregion||'';
            detailed.push({lat:r.latitude,lng:r.longitude,address:street,city:dCity,
              display:[street,dCity,g.region].filter(Boolean).join(', ')||`${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`});
          } catch(_) { detailed.push({lat:r.latitude,lng:r.longitude,address:'',city:'',display:`${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`}); }
        }
        setAddrResults(detailed);
      } catch(_) { setAddrResults([]); }
    }, 500);
  }

  function selectAddr(r) {
    setNewLat(r.lat.toFixed(6)); setNewLng(r.lng.toFixed(6));
    if (r.address) setNewSuperAddress(r.address);
    if (r.city) setCity(r.city);
    setSearchAddr(r.display); setAddrResults([]);
  }

  async function useGPS() {
    try {
      const Location = require('expo-location');
      const {status} = await Location.requestForegroundPermissionsAsync();
      if (status!=='granted') return;
      const loc = await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High});
      if (loc?.coords) {
        setNewLat(loc.coords.latitude.toFixed(6));
        setNewLng(loc.coords.longitude.toFixed(6));
        const geo = await Location.reverseGeocodeAsync({latitude:loc.coords.latitude,longitude:loc.coords.longitude});
        if (geo?.[0]) {
          if (geo[0].street) setNewSuperAddress(geo[0].street+(geo[0].streetNumber?' '+geo[0].streetNumber:''));
          if (geo[0].city) setCity(geo[0].city);
        }
        setSearchAddr('Ubicación actual');
      }
    } catch(_) {}
  }

  async function submit() {
    setError('');
    if (mode==='new_super') {
      if (!newSuperName.trim()) return setError('Nombre del supermercado obligatorio');
      if (!newLat||!newLng) return setError('Ubicación obligatoria');
      if (!newPriceRange) return setError('Selecciona un rango de precios');
      setLoading(true);
      try {
        const res = await apiPost('/api/places', {
          name:newSuperName.trim(), category:'supermercado',
          lat:parseFloat(newLat), lng:parseFloat(newLng),
          address:newSuperAddress.trim(), city:city.trim(),
          price_range:newPriceRange, subcategory:'supermercado',
        });
        if (res?.error) return setError(res.error);
        reset(); onSuccess?.();
      } catch(_) { setError('Error al guardar'); }
      finally { setLoading(false); }
      return;
    }
    if (!selectedSuper) return setError('Selecciona un supermercado');
    if (!productName.trim()) return setError('Nombre del producto obligatorio');
    if (!price) return setError('Precio obligatorio');
    setLoading(true);
    try {
      await apiPost('/api/prices', {
        place_id: selectedSuper.id,
        product: productName.trim(),
        price: parseFloat(String(price).replace(',','.')), unit: 'unidad',
      });
      reset(); onSuccess?.();
    } catch(e) { setError('Error al guardar'); }
    finally { setLoading(false); }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>
        <View style={{flex:1,backgroundColor:COLORS.bg2}}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:16,borderBottomWidth:0.5,borderBottomColor:COLORS.border}}>
            <TouchableOpacity onPress={step>0?()=>setStep(step-1):handleClose} style={{width:32,height:32,borderRadius:16,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'}}>
              <Ionicons name={step>0?'arrow-back':'close'} size={20} color={COLORS.text2}/>
            </TouchableOpacity>
            <Text style={{fontSize:18,fontWeight:'700',color:COLORS.text}}>Añadir producto</Text>
            <Text style={{fontSize:12,color:COLORS.text3}}>Paso {step+1}/{mode==='new_super'?2:3}</Text>
          </View>
          <View style={{flexDirection:'row',paddingHorizontal:16,paddingVertical:6,gap:4}}>
            {Array.from({length:mode==='new_super'?2:3}).map((_,i)=>(<View key={i} style={{flex:1,height:3,borderRadius:2,backgroundColor:i<=step?COLORS.primary:COLORS.border}}/>))}
          </View>

          <ScrollView contentContainerStyle={{padding:16,paddingBottom:60}} keyboardShouldPersistTaps="handled">
            {/* STEP 0: Choose city + supermarket */}
            {step===0 && (
              <View style={{gap:10}}>
                <Text style={{fontSize:20,fontWeight:'700',color:COLORS.text,textAlign:'center'}}>Elige el supermercado</Text>
                <Text style={{fontSize:12,fontWeight:'600',color:COLORS.text,marginTop:4}}>Ciudad</Text>
                <View style={{position:'relative'}}>
                  <TextInput style={{backgroundColor:COLORS.bg3,borderRadius:12,paddingHorizontal:14,paddingVertical:10,fontSize:14,color:COLORS.text,borderWidth:1,borderColor:COLORS.border}}
                    value={city} onChangeText={onCitySearch} placeholder="Escribe tu ciudad..." placeholderTextColor={COLORS.text3}/>
                  {citySugs.length>0 && (
                    <View style={{position:'absolute',top:44,left:0,right:0,backgroundColor:COLORS.bg2,borderRadius:10,borderWidth:1,borderColor:COLORS.border,shadowColor:'#000',shadowOpacity:0.1,shadowRadius:8,elevation:5,zIndex:99}}>
                      {citySugs.map(c=>(
                        <TouchableOpacity key={c} style={{paddingHorizontal:12,paddingVertical:8,borderBottomWidth:0.5,borderBottomColor:COLORS.border}}
                          onPress={()=>{setCity(c);setCitySugs([]);}}>
                          <Text style={{fontSize:13,color:COLORS.text}}>{c}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <Text style={{fontSize:12,fontWeight:'600',color:COLORS.text,marginTop:8}}>Supermercado</Text>
                <TextInput style={{backgroundColor:COLORS.bg3,borderRadius:12,paddingHorizontal:14,paddingVertical:10,fontSize:14,color:COLORS.text,borderWidth:1,borderColor:selectedSuper?COLORS.success:COLORS.border}}
                  value={superSearch} onChangeText={onSuperSearch} placeholder="Buscar supermercado por nombre..." placeholderTextColor={COLORS.text3}/>
                {superResults.length>0 && (
                  <View style={{backgroundColor:COLORS.bg2,borderRadius:10,borderWidth:1,borderColor:COLORS.border,marginTop:4}}>
                    {superResults.map(s=>(
                      <TouchableOpacity key={s.id} style={{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,paddingVertical:10,
                        borderBottomWidth:0.5,borderBottomColor:COLORS.border,backgroundColor:selectedSuper?.id===s.id?COLORS.primaryLight:COLORS.bg2}}
                        onPress={()=>{setSelectedSuper(s);setSuperSearch(s.name);setSuperResults([]);}}>
                        <Ionicons name="cart" size={14} color={selectedSuper?.id===s.id?COLORS.primary:COLORS.text3}/>
                        <View style={{flex:1}}>
                          <Text style={{fontSize:13,fontWeight:'600',color:COLORS.text}}>{s.name}</Text>
                          <Text style={{fontSize:11,color:COLORS.text3}}>{s.city}{s.address?` · ${s.address}`:''}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {selectedSuper && (
                  <View style={{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:COLORS.successLight,borderRadius:10,padding:10,marginTop:4,borderWidth:1,borderColor:COLORS.success+'44'}}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.success}/>
                    <Text style={{flex:1,fontSize:12,fontWeight:'600',color:COLORS.success}}>{selectedSuper.name} — {selectedSuper.city}</Text>
                  </View>
                )}
                <TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:14,padding:16,alignItems:'center',marginTop:16,opacity:selectedSuper?1:0.4}}
                  onPress={()=>selectedSuper&&setStep(1)} disabled={!selectedSuper}>
                  <Text style={{color:'#fff',fontWeight:'700',fontSize:16}}>Siguiente</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{borderRadius:14,padding:14,alignItems:'center',marginTop:6,borderWidth:1.5,borderColor:COLORS.primary,backgroundColor:COLORS.primaryLight}}
                  onPress={()=>{setMode('new_super');setStep(1);}}>
                  <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                    <Ionicons name="storefront-outline" size={16} color={COLORS.primary}/>
                    <Text style={{color:COLORS.primary,fontWeight:'700',fontSize:14}}>No lo encuentro — añadir supermercado</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 1: Product info OR New super info */}
            {step===1 && mode==='new_super' && (
              <View style={{gap:10}}>
                <Text style={{fontSize:20,fontWeight:'700',color:COLORS.text,textAlign:'center'}}>Nuevo supermercado</Text>
                <Text style={{fontSize:12,fontWeight:'600',color:COLORS.text}}>Nombre *</Text>
                <TextInput style={{backgroundColor:COLORS.bg3,borderRadius:12,paddingHorizontal:14,paddingVertical:10,fontSize:14,color:COLORS.text,borderWidth:1,borderColor:COLORS.border}}
                  value={newSuperName} onChangeText={setNewSuperName} placeholder="Ej: Mercado local Los Goritos" placeholderTextColor={COLORS.text3}/>
                <Text style={{fontSize:12,fontWeight:'600',color:COLORS.text,marginTop:4}}>Ubicación *</Text>
                <View style={{backgroundColor:COLORS.bg3,borderRadius:12,borderWidth:1,borderColor:(newLat&&newLng)?COLORS.success:COLORS.primary,overflow:'hidden'}}>
                  <View style={{flexDirection:'row',alignItems:'center',paddingHorizontal:12,gap:8}}>
                    <Ionicons name="search-outline" size={16} color={COLORS.text3}/>
                    <TextInput style={{flex:1,paddingVertical:10,fontSize:14,color:COLORS.text}}
                      value={searchAddr} onChangeText={onSearchAddr} placeholder="Buscar dirección..." placeholderTextColor={COLORS.text3}/>
                  </View>
                  {addrResults.length>0&&(
                    <View style={{borderTopWidth:0.5,borderTopColor:COLORS.border}}>
                      {addrResults.map((r,i)=>(
                        <TouchableOpacity key={i} style={{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,paddingVertical:8,borderBottomWidth:0.5,borderBottomColor:COLORS.border}}
                          onPress={()=>selectAddr(r)}>
                          <Ionicons name="location" size={14} color={COLORS.primary}/>
                          <Text style={{flex:1,fontSize:12,color:COLORS.text}} numberOfLines={2}>{r.display}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                <Text style={{fontSize:11,color:COLORS.text3,textAlign:'center'}}>— o —</Text>
                <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:(newLat&&newLng)?COLORS.successLight:COLORS.primaryLight,borderRadius:12,padding:12,borderWidth:1,borderColor:(newLat&&newLng)?COLORS.success:COLORS.primary}}
                  onPress={useGPS}>
                  <Ionicons name={(newLat&&newLng)?'checkmark-circle':'locate-outline'} size={16} color={(newLat&&newLng)?COLORS.success:COLORS.primary}/>
                  <Text style={{fontSize:13,fontWeight:'600',color:(newLat&&newLng)?COLORS.success:COLORS.primary}}>{(newLat&&newLng)?'Ubicación obtenida':'Usar mi ubicación'}</Text>
                </TouchableOpacity>
                <Text style={{fontSize:12,fontWeight:'600',color:COLORS.text,marginTop:4}}>Rango de precios *</Text>
                <View style={{flexDirection:'row',gap:6}}>
                  {[{v:1,l:'€',c:'#16A34A'},{v:2,l:'€€',c:'#65A30D'},{v:3,l:'€€€',c:'#D97706'},{v:4,l:'€€€€',c:'#DC2626'}].map(r=>(
                    <TouchableOpacity key={r.v} style={{flex:1,paddingVertical:10,borderRadius:10,alignItems:'center',
                      backgroundColor:newPriceRange===r.v?r.c+'22':COLORS.bg3,borderWidth:1.5,borderColor:newPriceRange===r.v?r.c:COLORS.border}}
                      onPress={()=>setNewPriceRange(r.v)}>
                      <Text style={{fontSize:14,fontWeight:'800',color:newPriceRange===r.v?r.c:COLORS.text2}}>{r.l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {error?<View style={{backgroundColor:COLORS.dangerLight,borderRadius:10,padding:10}}><Text style={{color:COLORS.danger,fontSize:13}}>{error}</Text></View>:null}
                <TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:14,padding:16,alignItems:'center',marginTop:8,opacity:loading?0.7:1}}
                  onPress={submit} disabled={loading}>
                  {loading?<ActivityIndicator color="#fff"/>:(
                    <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                      <Ionicons name="checkmark-circle" size={20} color="#fff"/>
                      <Text style={{color:'#fff',fontWeight:'700',fontSize:16}}>Añadir supermercado</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}
            {step===1 && mode==='product' && (
              <View style={{gap:10}}>
                <Text style={{fontSize:20,fontWeight:'700',color:COLORS.text,textAlign:'center'}}>Información del producto</Text>
                <Text style={{fontSize:12,fontWeight:'600',color:COLORS.text}}>Nombre del producto *</Text>
                <TextInput style={{backgroundColor:COLORS.bg3,borderRadius:12,paddingHorizontal:14,paddingVertical:10,fontSize:14,color:COLORS.text,borderWidth:1,borderColor:COLORS.border}}
                  value={productName} onChangeText={t=>{setProductName(t);setDuplicate(null);}} onBlur={checkDuplicate}
                  placeholder="Ej: Leche entera 1L" placeholderTextColor={COLORS.text3}/>
                {duplicate && (
                  <View style={{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'#FEF3C7',borderRadius:10,padding:10,borderWidth:1,borderColor:'#FCD34D'}}>
                    <Ionicons name="warning-outline" size={14} color="#92400E"/>
                    <Text style={{flex:1,fontSize:12,color:'#92400E'}}>Este producto ya existe en {selectedSuper?.name} a {duplicate.price?.toFixed(2).replace(".",",")}€. Se actualizará el precio.</Text>
                  </View>
                )}
                <Text style={{fontSize:12,fontWeight:'600',color:COLORS.text}}>Precio *</Text>
                <View style={{flexDirection:'row',alignItems:'center',backgroundColor:COLORS.bg3,borderRadius:12,paddingHorizontal:14,borderWidth:1,borderColor:COLORS.border}}>
                  <TextInput style={{flex:1,paddingVertical:10,fontSize:18,fontWeight:'700',color:COLORS.primary}}
                    value={price} onChangeText={setPrice} placeholder="0,00" placeholderTextColor={COLORS.text3} keyboardType="decimal-pad"/>
                  <Text style={{fontSize:16,fontWeight:'700',color:COLORS.text3}}>€</Text>
                </View>
                <Text style={{fontSize:12,fontWeight:'600',color:COLORS.text}}>Descripción (opcional)</Text>
                <TextInput style={{backgroundColor:COLORS.bg3,borderRadius:12,paddingHorizontal:14,paddingVertical:10,fontSize:14,color:COLORS.text,borderWidth:1,borderColor:COLORS.border,height:70,textAlignVertical:'top'}}
                  value={description} onChangeText={setDescription} placeholder="Marca, tamaño, detalles..." placeholderTextColor={COLORS.text3} multiline/>
                <TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:14,padding:16,alignItems:'center',marginTop:8,opacity:productName.trim()&&price?1:0.4}}
                  onPress={()=>productName.trim()&&price&&setStep(2)} disabled={!productName.trim()||!price}>
                  <Text style={{color:'#fff',fontWeight:'700',fontSize:16}}>Siguiente</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 2: Images + publish */}
            {step===2 && (
              <View style={{gap:12}}>
                <Text style={{fontSize:20,fontWeight:'700',color:COLORS.text,textAlign:'center'}}>Fotos (opcional)</Text>
                <Text style={{fontSize:13,color:COLORS.text3,textAlign:'center'}}>Añade fotos del producto o etiqueta de precio</Text>
                <View style={{flexDirection:'row',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
                  {images.map((img,i)=>(
                    <View key={i} style={{width:90,height:90,borderRadius:12,overflow:'hidden',borderWidth:1,borderColor:COLORS.border}}>
                      <Image source={{uri:img.uri}} style={{width:'100%',height:'100%'}} resizeMode="cover"/>
                      <TouchableOpacity style={{position:'absolute',top:4,right:4,width:20,height:20,borderRadius:10,backgroundColor:'rgba(0,0,0,0.6)',alignItems:'center',justifyContent:'center'}}
                        onPress={()=>setImages(prev=>prev.filter((_,j)=>j!==i))}>
                        <Ionicons name="close" size={12} color="#fff"/>
                      </TouchableOpacity>
                    </View>
                  ))}
                  {images.length<3 && (
                    <TouchableOpacity style={{width:90,height:90,borderRadius:12,borderWidth:2,borderColor:COLORS.border,borderStyle:'dashed',alignItems:'center',justifyContent:'center',backgroundColor:COLORS.bg3}}
                      onPress={pickImage}>
                      <Ionicons name="camera-outline" size={24} color={COLORS.text3}/>
                    </TouchableOpacity>
                  )}
                </View>
                {error?<View style={{backgroundColor:COLORS.dangerLight,borderRadius:10,padding:10}}><Text style={{color:COLORS.danger,fontSize:13}}>{error}</Text></View>:null}
                <TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:14,padding:16,alignItems:'center',marginTop:8,opacity:loading?0.7:1}}
                  onPress={submit} disabled={loading}>
                  {loading?<ActivityIndicator color="#fff"/>:(
                    <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                      <Ionicons name="checkmark-circle" size={20} color="#fff"/>
                      <Text style={{color:'#fff',fontWeight:'700',fontSize:16}}>Publicar producto (+10 pts)</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
