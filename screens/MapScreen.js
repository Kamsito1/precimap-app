import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal,
  FlatList, ActivityIndicator, Linking, Platform, Alert, TextInput, Animated, Share,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  COLORS, CATEGORY_INFO, FUEL_LABELS, gasPriceColor,
  stationMinPrice, apiGet, apiPost, distanceKm, timeAgo,
} from '../utils';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from '../components/AuthModal';
import AddGasStationModal from '../components/AddGasStationModal';
import CityPicker from '../components/CityPicker';

const FUELS = [
  { key:'g95',         label:'Gasolina 95',  emoji:'🟢', color:'#3B82F6', bg:'#EFF6FF' },
  { key:'diesel',      label:'Diésel A',     emoji:'🟡', color:'#F59E0B', bg:'#FFFBEB' },
  { key:'g98',         label:'Gasolina 98',  emoji:'🔵', color:'#8B5CF6', bg:'#F5F3FF' },
  { key:'diesel_plus', label:'Diésel Premium',emoji:'🟠',color:'#F97316', bg:'#FFF7ED' },
  { key:'glp',         label:'GLP / Autogas',emoji:'🟤', color:'#10B981', bg:'#F0FDF4' },
  { key:'gnc',         label:'Gas Natural',  emoji:'⚪', color:'#06B6D4', bg:'#ECFEFF' },
];

const CATS = [
  { key:'all',          label:'Todo',        emoji:'🏙️' },
  { key:'gasolinera',   label:'Gasolina',    emoji:'⛽' },
  { key:'supermercado', label:'Súper',        emoji:'🛒' },
  { key:'bar',          label:'Bares',        emoji:'🍺' },
  { key:'cafe',         label:'Cafés',        emoji:'☕' },
  { key:'farmacia',     label:'Farmacias',    emoji:'💊' },
  { key:'restaurante',  label:'Restaurantes', emoji:'🍕' },
];

const SORT_OPTS = [
  { key:'proximity',       label:'📍 Más cercano' },
  { key:'price',           label:'💰 Más barato' },
  { key:'price_proximity', label:'⚡ Precio + cercanía' },
];

const RADII = [5, 10, 25, 50, 100, 999]; // 999 = Toda España

const CORDOBA = { latitude:37.8882, longitude:-4.7794, latitudeDelta:0.12, longitudeDelta:0.12 };

export default function MapScreen() {
  const { isLoggedIn } = useAuth();
  const [places, setPlaces]         = useState([]);
  const [gasolineras, setGasolineras] = useState([]);
  const [showHint, setShowHint] = useState(false); // first-time hint
  const [activeCat, setActiveCat]   = useState('all');
  const [userLoc, setUserLoc]       = useState(null);
  const [viewMode, setViewMode]     = useState('map');
  const [sort, setSort]             = useState('proximity');
  const [radius, setRadius]         = useState(25);
  const [product, setProduct]       = useState('');
  const [gasSearch, setGasSearch]   = useState(''); // separate search for list view gas stations  const [city, setCity]             = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFuel, setActiveFuel]   = useState(null); // null = must choose first
  const [loading, setLoading]         = useState(false);
  const [gasLoading, setGasLoading]   = useState(false);
  const [loadProgress, setLoadProgress] = useState(0); // 0-100 fake progress for UX
  const [serverError, setServerError] = useState(false);
  const [selectedPlace, setSelectedPlace]     = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [showAuth, setShowAuth]     = useState(false);
  const [showAddGas, setShowAddGas] = useState(false);
  const [mapRegion, setMapRegion]   = useState(null); // current visible region
  const [allGas, setAllGas]         = useState([]);
  const [serverFuelStats, setServerFuelStats] = useState(null);
  const [favStations, setFavStations] = useState([]); // from AsyncStorage
  const [showFavsOnly, setShowFavsOnly] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => { initLocation(); loadAllGasolineras(); loadFuelStats(); loadFavs(); }, []);

  // Show first-time hint after 3 seconds
  useEffect(() => {
    AsyncStorage.getItem('map_hint_shown').then(v => {
      if (!v) {
        setTimeout(() => setShowHint(true), 3000);
        AsyncStorage.setItem('map_hint_shown', '1');
      }
    }).catch(() => {});
  }, []);

  async function loadFavs() {
    try {
      const raw = await AsyncStorage.getItem('fav_stations');
      setFavStations(raw ? JSON.parse(raw) : []);
    } catch {}
  }
  useEffect(() => { loadPlaces(); }, [activeCat, sort, radius, product, city, userLoc]);

  // Load ALL gasolineras once into client cache (server already has them cached at 5ms)
  async function loadFuelStats() {
    try {
      const data = await apiGet('/api/gasolineras/stats');
      if (data?.stats) setServerFuelStats(data.stats);
    } catch {}
  }

  async function loadAllGasolineras() {
    setGasLoading(true);
    setLoadProgress(5);
    // Fake progress animation while waiting for server cache
    const prog = setInterval(() => setLoadProgress(p => Math.min(p + 3, 90)), 1000);
    try {
      const data = await apiGet('/api/gasolineras') || [];
      clearInterval(prog);
      setLoadProgress(100);
      setAllGas(data);
      setServerError(false);
    } catch {
      clearInterval(prog);
      setServerError(true);
    }
    finally { setGasLoading(false); }
  }

  async function initLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude: lat, longitude: lng } = loc.coords;
        setUserLoc({ lat, lng });
        mapRef.current?.animateToRegion({ latitude:lat, longitude:lng, latitudeDelta:0.06, longitudeDelta:0.06 }, 1000);
      }
    } catch {}
  }

  async function loadPlaces() {
    setLoading(true);
    try {
      const lat = userLoc?.lat || CORDOBA.latitude;
      const lng = userLoc?.lng || CORDOBA.longitude;
      let url = `/api/places?sort=${sort}&lat=${lat}&lng=${lng}`;
      if (city) {
        url += `&city=${encodeURIComponent(city)}`;
      } else if (radius >= 100) {
        // Toda España — no radius filter
      } else {
        url += `&radius=${radius}`;
      }
      if (activeCat !== 'all') url += `&cat=${activeCat}`;
      if (product) url += `&product=${encodeURIComponent(product)}`;
      setPlaces(await apiGet(url) || []);
      setServerError(false);
    } catch { setServerError(true); } finally { setLoading(false); }
  }

  // Filter allGas client-side based on viewport/city/fuel — no extra API calls
  useEffect(() => {
    let filtered = allGas;
    if (city) {
      const nc = city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      filtered = filtered.filter(s =>
        (s.city||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(nc) ||
        (s.province||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(nc)
      );
    } else if (mapRegion && radius < 999) {
      // Filter by current map viewport (user sees only what's on screen)
      const { latitude: cLat, longitude: cLng, latitudeDelta, longitudeDelta } = mapRegion;
      const latPad = latitudeDelta * 0.6;
      const lngPad = longitudeDelta * 0.6;
      filtered = filtered.filter(s =>
        s.lat >= cLat - latPad && s.lat <= cLat + latPad &&
        s.lng >= cLng - lngPad && s.lng <= cLng + lngPad
      );
    }
    if (activeFuel !== 'all') filtered = filtered.filter(s => s.prices?.[activeFuel] > 0);
    setGasolineras(filtered);
  }, [allGas, city, mapRegion, activeFuel, radius]);

  const visiblePlaces = places.filter(p => activeCat === 'all' || p.category === activeCat);
  // For gas stations in list: use G95 or Diesel price, never GLP
  const favIds = new Set(favStations.map(f => f.id));
  const visibleGas = (activeCat === 'all' || activeCat === 'gasolinera') ? gasolineras
    .filter(s => activeFuel === 'all' || (s.prices?.[activeFuel] > 0))
    .filter(s => !showFavsOnly || favIds.has(s.id))
    .map(s => {
      const fuelKey = activeFuel !== 'all' ? activeFuel
        : s.prices?.g95 ? 'g95'
        : s.prices?.diesel ? 'diesel'
        : null;
      return { ...s, _mainFuel: fuelKey, minPrice: fuelKey ? s.prices[fuelKey] : null };
    }) : [];

  // Limit markers to prevent lag on low-end devices (React Native Maps lags >150)
  const MAX_MAP_MARKERS = 150;
  const mapGas    = visibleGas.slice(0, MAX_MAP_MARKERS);
  const mapPlaces = visiblePlaces.slice(0, 50);
  const tooManyMarkers = visibleGas.length > MAX_MAP_MARKERS;

  // Price stats per fuel — use server stats if available (faster), fallback to local calc
  const fuelStats = React.useMemo(() => {
    if (serverFuelStats) return serverFuelStats;
    if (!allGas.length) return {};
    const stats = {};
    FUELS.filter(f => f.key !== 'all').forEach(({ key }) => {
      const prices = allGas.map(s => s.prices?.[key]).filter(p => p > 0 && !isNaN(p));
      if (!prices.length) return;
      prices.sort((a,b) => a-b);
      stats[key] = {
        min: prices[0], max: prices[prices.length-1],
        avg: prices.reduce((a,b)=>a+b,0)/prices.length,
        count: prices.length,
      };
    });
    return stats;
  }, [allGas, serverFuelStats]);

  // ── Fuel selector screen (shown when no fuel chosen yet) ─────────────────
  if (activeFuel === null) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={{flex:1,backgroundColor:COLORS.bg}}>
          <View style={{backgroundColor:COLORS.primary,paddingHorizontal:20,paddingTop:20,paddingBottom:24}}>
            <Text style={{fontSize:22,fontWeight:'800',color:'#fff',marginBottom:6}}>⛽ Elige tu carburante</Text>
            <Text style={{fontSize:14,color:'rgba(255,255,255,0.8)',lineHeight:20}}>
              El mapa mostrará el precio de cada estación para el carburante que elijas
            </Text>
          </View>
          {!Object.keys(fuelStats).length ? (
            <View style={{flex:1,alignItems:'center',justifyContent:'center',gap:16,paddingHorizontal:40}}>
              <Text style={{fontSize:48}}>⛽</Text>
              <Text style={{fontSize:17,fontWeight:'700',color:COLORS.text}}>Conectando...</Text>
              <Text style={{fontSize:13,color:COLORS.text3,textAlign:'center'}}>
                Obteniendo precios de 12.000+ estaciones del Ministerio
              </Text>
              <ActivityIndicator color={COLORS.primary} style={{marginTop:8}}/>
              {loadProgress > 0 && (
                <>
                  <View style={{width:'100%',height:6,backgroundColor:COLORS.border,borderRadius:99,overflow:'hidden'}}>
                    <View style={{width:`${loadProgress}%`,height:'100%',backgroundColor:COLORS.primary,borderRadius:99}}/>
                  </View>
                  <Text style={{fontSize:12,color:COLORS.text3}}>{loadProgress}%</Text>
                </>
              )}
            </View>
          ) : (
            <ScrollView contentContainerStyle={{padding:16,gap:10,paddingBottom:60}}>
              {FUELS.filter(f=>f.key!=='all').map(fuel => {
                const st = fuelStats[fuel.key];
                if (!st) return null;
                return (
                  <TouchableOpacity key={fuel.key}
                    style={{backgroundColor:COLORS.bg2,borderRadius:16,padding:14,flexDirection:'row',alignItems:'center',gap:12,borderWidth:1.5,borderColor:fuel.color+'55',shadowColor:'#000',shadowOpacity:0.04,shadowRadius:6,elevation:2}}
                    onPress={()=>setActiveFuel(fuel.key)} activeOpacity={0.8}>
                    <View style={{width:14,height:14,borderRadius:7,backgroundColor:fuel.color}}/>
                    <View style={{flex:1}}>
                      <Text style={{fontSize:16,fontWeight:'700',color:COLORS.text}}>{fuel.label}</Text>
                      <Text style={{fontSize:11,color:COLORS.text3,marginTop:2}}>{st.count.toLocaleString('es-ES')} estaciones disponibles</Text>
                    </View>
                    <View style={{alignItems:'flex-end',gap:4}}>
                      <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                        <Text style={{fontSize:11,color:COLORS.text3,width:32}}>🟢 min</Text>
                        <Text style={{fontSize:13,fontWeight:'800',color:'#16A34A',minWidth:56,textAlign:'right'}}>{st.min.toFixed(3)}€</Text>
                      </View>
                      <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                        <Text style={{fontSize:11,color:COLORS.text3,width:32}}>🟡 med</Text>
                        <Text style={{fontSize:13,fontWeight:'700',color:'#D97706',minWidth:56,textAlign:'right'}}>{st.avg.toFixed(3)}€</Text>
                      </View>
                      <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                        <Text style={{fontSize:11,color:COLORS.text3,width:32}}>🔴 max</Text>
                        <Text style={{fontSize:13,fontWeight:'700',color:'#DC2626',minWidth:56,textAlign:'right'}}>{st.max.toFixed(3)}€</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.text3}/>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={{backgroundColor:COLORS.bg2,borderRadius:16,padding:14,flexDirection:'row',alignItems:'center',gap:12,borderWidth:1.5,borderColor:'#6B7280'}}
                onPress={()=>setActiveFuel('all')} activeOpacity={0.8}>
                <View style={{width:14,height:14,borderRadius:7,backgroundColor:'#6B7280'}}/>
                <View style={{flex:1}}>
                  <Text style={{fontSize:16,fontWeight:'700',color:COLORS.text}}>Ver todos</Text>
                  <Text style={{fontSize:11,color:COLORS.text3,marginTop:2}}>Precio principal de cada estación</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.text3}/>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    );
  }

  function navigateTo(lat, lng, name) {
    const url = Platform.OS === 'ios'
      ? `maps://maps.apple.com/?daddr=${lat},${lng}&q=${encodeURIComponent(name)}`
      : `geo:${lat},${lng}?q=${encodeURIComponent(name)}`;
    Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`));
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <Text style={s.logo}>🗺️ PreciMap</Text>
          {activeFuel && activeFuel !== 'all' && (
            <TouchableOpacity
              style={[s.fuelActiveBadge, {backgroundColor:(FUELS.find(f=>f.key===activeFuel)||{}).color+'22', borderColor:(FUELS.find(f=>f.key===activeFuel)||{}).color}]}
              onPress={()=>setActiveFuel(null)}>
              <Text style={[s.fuelActiveTxt, {color:(FUELS.find(f=>f.key===activeFuel)||{color:COLORS.text}).color}]}>
                ⛽ {FUELS.find(f=>f.key===activeFuel)?.label}
              </Text>
              {activeFuel && fuelStats[activeFuel] && (
                <Text style={{fontSize:9,color:COLORS.text3}}>
                  {' '}🟢{fuelStats[activeFuel].min.toFixed(3)}€
                </Text>
              )}
              <Text style={{fontSize:9,color:COLORS.text3}}> · cambiar</Text>
            </TouchableOpacity>
          )}
          <View style={s.rightRow}>
            {/* View toggle */}
            <View style={s.toggle}>
              <TouchableOpacity style={[s.togBtn, viewMode==='map'&&s.togBtnOn]} onPress={()=>setViewMode('map')}>
                <Ionicons name="map-outline" size={14} color={viewMode==='map'?COLORS.primary:COLORS.text3}/>
                <Text style={[s.togTxt,viewMode==='map'&&{color:COLORS.primary}]}>Mapa</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.togBtn, viewMode==='list'&&s.togBtnOn]} onPress={()=>setViewMode('list')}>
                <Ionicons name="list-outline" size={14} color={viewMode==='list'?COLORS.primary:COLORS.text3}/>
                <Text style={[s.togTxt,viewMode==='list'&&{color:COLORS.primary}]}>Lista</Text>
              </TouchableOpacity>
            </View>
            {favStations.length > 0 && (
              <TouchableOpacity style={[s.filterIconBtn, showFavsOnly && {backgroundColor:'#FEF2F2'}]}
                onPress={() => setShowFavsOnly(!showFavsOnly)}>
                <Ionicons name={showFavsOnly ? 'heart' : 'heart-outline'} size={18} color={showFavsOnly ? COLORS.danger : COLORS.text2}/>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.filterIconBtn} onPress={() => setShowFilters(!showFilters)}>
              <Ionicons name="options-outline" size={20} color={showFilters?COLORS.primary:COLORS.text2}/>
            </TouchableOpacity>
          </View>
        </View>

        {/* Category pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingHorizontal:12,gap:6,paddingBottom:8}}>
          {CATS.map(c=>(
            <TouchableOpacity key={c.key} style={[s.catBtn,activeCat===c.key&&s.catBtnOn]} onPress={()=>setActiveCat(c.key)}>
              <Text style={s.catEmoji}>{c.emoji}</Text>
              <Text style={[s.catTxt,activeCat===c.key&&{color:'#fff'}]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* City quick filter — shown when active or always in collapsed form */}
        <View style={{paddingHorizontal:12,paddingBottom:city ? 8 : 4}}>
          <CityPicker
            value={city}
            onChange={setCity}
            placeholder={city ? city : "📍 Toda España"}
          />
        </View>

        {/* Expanded filter panel */}
        {showFilters && (
          <View style={s.filtersPanel}>
            {/* Info about viewport loading */}
            <View style={{backgroundColor:COLORS.primaryLight,borderRadius:10,padding:10,marginBottom:10,flexDirection:'row',gap:8}}>
              <Text style={{fontSize:14}}>💡</Text>
              <Text style={{flex:1,fontSize:12,color:COLORS.primary}}>El mapa carga gasolineras según lo que tienes en pantalla. Haz zoom o desplázate para ver más.</Text>
            </View>
            {/* Sort */}
            <Text style={s.filterLabel}>Ordenar por</Text>
            <View style={s.radRow}>
              {SORT_OPTS.map(so=>(
                <TouchableOpacity key={so.key} style={[s.sortBtn,sort===so.key&&s.sortBtnOn]} onPress={()=>setSort(so.key)}>
                  <Text style={[s.sortTxt,sort===so.key&&{color:'#fff'}]}>{so.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Fuel type filter — only when gasolinera is active */}
            {(activeCat==='all'||activeCat==='gasolinera') && (
              <>
                <Text style={s.filterLabel}>⛽ Carburante</Text>
                <View style={s.fuelsGrid}>
                  {FUELS.map(f => (
                    <TouchableOpacity key={f.key}
                      style={[s.fuelCard, activeFuel===f.key && {borderColor:f.color,backgroundColor:f.bg}]}
                      onPress={() => setActiveFuel(f.key)}>
                      {activeFuel===f.key && <View style={[s.fuelCardDot,{backgroundColor:f.color}]}/>}
                      <Text style={[s.fuelCardTxt, activeFuel===f.key && {color:f.color,fontWeight:'700'}]}>{f.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {activeFuel !== 'all' && (
                  <View style={s.fuelInfo}>
                    <Ionicons name="information-circle-outline" size={13} color={COLORS.primary}/>
                    <Text style={s.fuelInfoTxt}>
                      Colores basados en precio de {FUELS.find(f=>f.key===activeFuel)?.label}. Solo aparecen gasolineras que ofrecen este carburante.
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* Product search (supermarket / pharmacy) */}
            {(activeCat==='supermercado'||activeCat==='farmacia'||activeCat==='all') && (
              <>
                <Text style={s.filterLabel}>{activeCat==='farmacia'?'Buscar medicamento':'Buscar producto'}</Text>
                <View style={s.productRow}>
                  <TextInput style={s.productInput} value={product} onChangeText={setProduct}
                    placeholder={activeCat==='farmacia'?'Ej: ibuprofeno 600mg':'Ej: huevos, leche, agua...'}
                    placeholderTextColor={COLORS.text3} returnKeyType="search" onSubmitEditing={loadPlaces}/>
                  {product ? <TouchableOpacity onPress={()=>{setProduct('');loadPlaces();}}><Ionicons name="close-circle" size={18} color={COLORS.text3}/></TouchableOpacity> : null}
                </View>
                {activeCat==='supermercado' && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6,paddingTop:4}}>
                    {['huevos','leche','agua','pan','pollo','arroz','aceite'].map(p=>(
                      <TouchableOpacity key={p} style={[s.quickProd,product===p&&s.quickProdOn]} onPress={()=>{setProduct(product===p?'':p);loadPlaces();}}>
                        <Text style={[s.quickProdTxt,product===p&&{color:'#fff'}]}>{p}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </>
            )}
          </View>
        )}
      </View>

      {/* MAP VIEW */}
      {viewMode === 'map' && (
        <View style={{flex:1}}>
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            initialRegion={CORDOBA}
            showsUserLocation
            showsMyLocationButton
            onRegionChangeComplete={(region) => setMapRegion(region)}
          >
            {/* Community places */}
            {mapPlaces.map(p => {
              const info = CATEGORY_INFO[p.category] || CATEGORY_INFO.default;
              return (
                <Marker key={`p${p.id}`} coordinate={{latitude:p.lat,longitude:p.lng}} onPress={()=>setSelectedPlace(p)}>
                  <View style={[ms.marker,{backgroundColor:info.bg,borderColor:info.color}]}>
                    <Text style={ms.markerEmoji}>{info.emoji}</Text>
                    {p.minPrice > 0 && !isNaN(p.minPrice) && <Text style={ms.markerPrice}>{p.minPrice.toFixed(2)}€</Text>}
                  </View>
                </Marker>
              );
            })}
            {/* Gas stations — color based on G95 or Diesel ONLY (not GLP/GNC) */}
            {mapGas.map(s => {
              // Use selected fuel price if available, otherwise best available
              const displayFuel = activeFuel !== 'all' && s.prices?.[activeFuel] > 0
                ? activeFuel
                : s.prices?.g95 > 0 ? 'g95'
                : s.prices?.diesel > 0 ? 'diesel'
                : s.prices?.g98 > 0 ? 'g98'
                : null;
              const displayPrice = displayFuel ? s.prices[displayFuel] : null;
              const col = displayPrice ? gasPriceColor(displayPrice) : { bg: '#9CA3AF', text: '#fff', label: 'Sin datos' };
              if (activeFuel && activeFuel !== 'all' && !s.prices?.[activeFuel]) return null;
              return (
                <Marker key={s.id} coordinate={{ latitude: s.lat, longitude: s.lng }} onPress={() => {
                  setSelectedStation(s);
                  // Center map on station
                  if (mapRef.current && s.lat && s.lng) {
                    mapRef.current.animateToRegion({
                      latitude: s.lat, longitude: s.lng,
                      latitudeDelta: 0.008, longitudeDelta: 0.008,
                    }, 400);
                  }
                }}>
                  <View style={[ms.gasMarker, { backgroundColor: col.bg }]}>
                    <Text style={ms.gasEmoji}>⛽</Text>
                    {displayPrice > 0 && <Text style={ms.gasPrice}>{displayPrice.toFixed(3)}</Text>}
                    {userLoc && (() => {
                      const d = distanceKm(userLoc.lat, userLoc.lng, s.lat, s.lng);
                      if (d > 5) return null; // only show if <5km
                      const label = d < 1 ? `${Math.round(d*1000)}m` : `${d.toFixed(1)}km`;
                      return <Text style={{fontSize:8,color:col.text,fontWeight:'600',opacity:0.8}}>{label}</Text>;
                    })()}
                  </View>
                </Marker>
              );
            })}
          </MapView>

          {/* Favorites only banner */}
          {showFavsOnly && favStations.length === 0 && (
            <View style={[ms.loadBar, {backgroundColor:'#FEF2F2',borderColor:'#FECACA'}]}>
              <Text style={{fontSize:13}}>❤️</Text>
              <Text style={[ms.loadTxt,{color:COLORS.danger}]}>
                No tienes gasolineras favoritas · Abre una y pulsa ❤️
              </Text>
              <TouchableOpacity onPress={()=>setShowFavsOnly(false)} style={{marginLeft:8}}>
                <Text style={{fontSize:11,color:COLORS.primary,fontWeight:'700'}}>Ver todas</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Server error banner */}
          {serverError && (
            <View style={[ms.loadBar, {backgroundColor:'#FEF2F2',borderColor:'#FECACA'}]}>
              <Ionicons name="wifi-outline" size={14} color={COLORS.danger}/>
              <Text style={[ms.loadTxt, {color:COLORS.danger}]}>
                Sin conexión al servidor · Asegúrate de estar en la misma WiFi
              </Text>
              <TouchableOpacity onPress={loadPlaces} style={{marginLeft:8}}>
                <Text style={{fontSize:11,color:COLORS.primary,fontWeight:'700'}}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Loading bar — initial load of ALL stations */}
          {gasLoading && (
            <View style={ms.loadBar}>
              <ActivityIndicator size="small" color={COLORS.warning}/>
              <Text style={ms.loadTxt}>Cargando 12.000+ gasolineras de España...</Text>
            </View>
          )}

          {/* All loaded indicator */}
          {!gasLoading && allGas.length > 0 && gasolineras.length === 0 && !serverError && (
            <View style={ms.loadBar}>
              <Text style={ms.loadTxt}>Sin gasolineras en esta zona — desplázate o amplía el mapa</Text>
            </View>
          )}

          {/* Legend + fuel stats panel */}
          {(activeCat==='all'||activeCat==='gasolinera') && gasolineras.length > 0 && (
            <View style={ms.legend}>
              {/* Color legend */}
              {[['#16A34A','Barato'],['#D97706','Medio'],['#DC2626','Caro']].map(([c,l])=>(
                <View key={l} style={ms.legendItem}>
                  <View style={[ms.legendDot,{backgroundColor:c}]}/>
                  <Text style={ms.legendTxt}>{l}</Text>
                </View>
              ))}
              {/* Live stats for selected fuel */}
              {activeFuel && activeFuel !== 'all' && fuelStats[activeFuel] && (() => {
                const st = fuelStats[activeFuel];
                return (
                  <>
                    <View style={ms.legendSep}/>
                    <Text style={ms.legendStat}>🟢{st.min.toFixed(3)}</Text>
                    <Text style={ms.legendStat}>🟡{st.avg.toFixed(3)}</Text>
                    <Text style={ms.legendStat}>🔴{st.max.toFixed(3)}</Text>
                  </>
                );
              })()}
              <Text style={ms.legendCount}>
                {showFavsOnly
                  ? `❤️ ${gasolineras.length} favoritas`
                  : `${gasolineras.length.toLocaleString()} est.${city ? ' · '+city : ''}`
                }
              </Text>
            </View>
          )}

          {/* First-time hint */}
          {showHint && (
            <View style={{position:'absolute',top:16,left:16,right:16,backgroundColor:'rgba(15,23,42,0.88)',borderRadius:14,padding:14,flexDirection:'row',gap:10,alignItems:'center'}}>
              <Text style={{fontSize:20}}>💡</Text>
              <View style={{flex:1}}>
                <Text style={{fontSize:13,fontWeight:'700',color:'#fff'}}>Toca cualquier gasolinera</Text>
                <Text style={{fontSize:12,color:'rgba(255,255,255,0.7)',marginTop:2}}>Ve precios y distancia · Guarda favoritas con ❤️</Text>
              </View>
              <TouchableOpacity onPress={()=>setShowHint(false)} style={{padding:4}}>
                <Text style={{fontSize:16,color:'rgba(255,255,255,0.6)'}}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Search FAB — tap to switch to list and search */}
          <TouchableOpacity
            style={[ms.fab, { bottom: 90, backgroundColor: COLORS.bg2, borderWidth: 1.5, borderColor: COLORS.border }]}
            onPress={() => setViewMode('list')}>
            <Ionicons name="search" size={22} color={COLORS.text2}/>
          </TouchableOpacity>

          {/* Add FAB */}
          <TouchableOpacity style={ms.fab} onPress={() => {
            if (!isLoggedIn) { setShowAuth(true); return; }
            Alert.alert('Añadir', '¿Qué quieres añadir?', [
              { text:'⛽ Gasolinera no registrada', onPress:()=>setShowAddGas(true) },
              { text:'📍 Otro lugar (bar, súper...)', onPress:()=>Alert.alert('Próximamente','La funcionalidad completa de añadir lugares estará disponible pronto.') },
              { text:'Cancelar', style:'cancel' },
            ]);
          }}>
            <Ionicons name="add" size={28} color="#fff"/>
          </TouchableOpacity>
        </View>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <View style={{flex:1}}>
          {/* Search bar for list mode */}
          <View style={{flexDirection:'row',alignItems:'center',backgroundColor:COLORS.bg2,borderBottomWidth:0.5,borderBottomColor:COLORS.border,paddingHorizontal:12,paddingVertical:8,gap:8}}>
            <Ionicons name="search-outline" size={16} color={COLORS.text3}/>
            <TextInput
              style={{flex:1,fontSize:14,color:COLORS.text,height:32}}
              placeholder={activeCat==='gasolinera'||activeCat==='all' ? 'Buscar gasolinera o marca...' : 'Buscar lugar...'}
              placeholderTextColor={COLORS.text3}
              value={gasSearch}
              onChangeText={setGasSearch}
            />
            {gasSearch ? <TouchableOpacity onPress={()=>setGasSearch('')}><Ionicons name="close-circle" size={16} color={COLORS.text3}/></TouchableOpacity> : null}
            <Text style={{fontSize:11,color:COLORS.text3}}>
              {(visiblePlaces.length + visibleGas.length).toLocaleString('es-ES')} result.
            </Text>
          </View>
          {loading ? <ActivityIndicator color={COLORS.primary} style={{marginTop:40}}/> : (() => {
            // Filter gas by name search
            const searchLow = gasSearch.toLowerCase();
            const gasFiltered = searchLow
              ? visibleGas.filter(s =>
                  (s.name||'').toLowerCase().includes(searchLow) ||
                  (s.brand||'').toLowerCase().includes(searchLow) ||
                  (s.city||'').toLowerCase().includes(searchLow)
                )
              : visibleGas;
            const listData = [
              ...visiblePlaces,
              ...gasFiltered.slice(0,150).map(s=>({
                ...s, isGas:true,
                _dist: distanceKm(userLoc?.lat||CORDOBA.latitude, userLoc?.lng||CORDOBA.longitude, s.lat, s.lng),
                minPrice: activeFuel && activeFuel!=='all' ? (s.prices?.[activeFuel]||null) : stationMinPrice(s.prices),
              })),
            ].sort((a,b)=>{
              if(sort==='price') return (a.minPrice??999)-(b.minPrice??999);
              return (a._dist??999)-(b._dist??999);
            });
            return (
              <FlatList
                data={listData}
                keyExtractor={(it,i)=>String(it.id||i)}
                contentContainerStyle={{padding:12,gap:10,paddingBottom:80}}
                renderItem={({item})=>(
                  <ListCard item={item}
                    onPress={()=>item.isGas?setSelectedStation(item):setSelectedPlace(item)}
                    onNav={()=>navigateTo(item.lat,item.lng,item.name)}
                    activeFuel={activeFuel}
                    isFav={item.isGas && favIds.has(item.id)}
                  />
                )}
                ListEmptyComponent={
                  <View style={{alignItems:'center',paddingTop:60,gap:8}}>
                    <Text style={{fontSize:24}}>🔍</Text>
                    <Text style={{fontSize:15,color:COLORS.text2,fontWeight:'600'}}>
                      {gasSearch ? `Sin resultados para "${gasSearch}"` : 'Sin resultados en esta zona'}
                    </Text>
                    <Text style={{fontSize:13,color:COLORS.text3,textAlign:'center',paddingHorizontal:30}}>
                      {gasSearch ? 'Prueba con otro nombre o marca' : 'Desplázate en el mapa para cargar gasolineras'}
                    </Text>
                  </View>
                }
              />
            );
          })()}
        </View>
      )}

      {/* Modals */}
      <Modal visible={!!selectedPlace} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setSelectedPlace(null)}>
        {selectedPlace && <PlaceModal place={selectedPlace} onClose={()=>setSelectedPlace(null)} onNavigate={navigateTo} isLoggedIn={isLoggedIn} onAuthNeeded={()=>setShowAuth(true)}/>}
      </Modal>
      <Modal visible={!!selectedStation} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setSelectedStation(null)}>
        {selectedStation && <GasModal station={selectedStation} onClose={()=>setSelectedStation(null)} onNavigate={navigateTo} onFavChange={loadFavs}/>}
      </Modal>
      <AddGasStationModal visible={showAddGas} onClose={()=>setShowAddGas(false)} userLoc={userLoc}
        onSuccess={()=>{ setShowAddGas(false); loadPlaces(); loadAllGasolineras(); Alert.alert('✅ Añadida','Gracias. La comunidad la verificará con sus votos.'); }}/>
      <AuthModal visible={showAuth} onClose={()=>setShowAuth(false)}/>
    </SafeAreaView>
  );
}

// === LIST CARD ===
function ListCard({ item, onPress, onNav, activeFuel, isFav }) {
  const info = item.isGas ? {emoji:'⛽',bg:'#FEF3C7',label:'Gasolinera'} : (CATEGORY_INFO[item.category]||CATEGORY_INFO.default);
  const fuelLabel = activeFuel && activeFuel !== 'all' ? FUEL_LABELS[activeFuel] : 'G95';
  const col = item.isGas && item.minPrice ? gasPriceColor(item.minPrice) : null;
  const dist = !item._dist || item._dist===999 ? '?' : item._dist<1 ? `${Math.round(item._dist*1000)}m` : `${item._dist.toFixed(1)}km`;
  return (
    <TouchableOpacity style={lcs.card} onPress={onPress} activeOpacity={0.75}>
      <View style={[lcs.icon,{backgroundColor:info.bg}]}>
        <Text style={{fontSize:22}}>{info.emoji}</Text>
        {isFav && <View style={{position:'absolute',top:-4,right:-4}}><Text style={{fontSize:12}}>❤️</Text></View>}
      </View>
      <View style={lcs.info}>
        <Text style={lcs.name} numberOfLines={1}>{item.name||item.address}</Text>
        <Text style={lcs.sub} numberOfLines={1}>{info.label}{item.address?` · ${item.address}`:''}</Text>
        {item.bestFor ? <Text style={lcs.bestFor}>{item.bestFor}</Text> : null}
        {item.minPrice && (
          <View style={[lcs.pricePill,{backgroundColor:col?col.bg+'22':COLORS.warningLight}]}>
            <Text style={[lcs.pricePillTxt,{color:col?col.bg:COLORS.warning}]}>
              {item.isGas ? fuelLabel+' ' : 'desde '}{item.minPrice.toFixed(item.isGas?3:2)}€
            </Text>
          </View>
        )}
      </View>
      <View style={lcs.right}>
        <Text style={lcs.dist}>📍 {dist}</Text>
        <TouchableOpacity style={lcs.navBtn} onPress={onNav}>
          <Text style={lcs.navTxt}>Ir</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// === GAS MODAL (all fuels, color coded) ===
function GasModal({ station, onClose, onNavigate, onFavChange }) {
  const [isFav, setIsFav] = React.useState(false);
  const FAV_KEY = 'fav_stations';

  React.useEffect(() => {
    AsyncStorage.getItem(FAV_KEY).then(raw => {
      const favs = raw ? JSON.parse(raw) : [];
      setIsFav(favs.some(f => f.id === station.id));
    }).catch(() => {});
  }, [station.id]);

  async function toggleFav() {
    try {
      const raw = await AsyncStorage.getItem(FAV_KEY);
      let favs = raw ? JSON.parse(raw) : [];
      if (isFav) {
        favs = favs.filter(f => f.id !== station.id);
      } else {
        favs.push({ id: station.id, name: station.name, city: station.city, lat: station.lat, lng: station.lng });
        if (favs.length > 20) favs = favs.slice(-20); // keep last 20
      }
      await AsyncStorage.setItem(FAV_KEY, JSON.stringify(favs));
      setIsFav(!isFav);
      onFavChange?.(); // reload favStations in parent MapScreen
    } catch {}
  }
  const fuels = Object.entries(station.prices||{}).filter(([,v])=>v&&v>0);

  // Main fuel = G95 first, then Diesel — NOT minimum price
  const mainFuelKey = station.prices?.g95 ? 'g95'
    : station.prices?.diesel ? 'diesel'
    : station.prices?.g98 ? 'g98'
    : fuels[0]?.[0] || null;
  const mainPrice = mainFuelKey ? station.prices[mainFuelKey] : null;
  const mainCol = mainPrice ? gasPriceColor(mainPrice) : {bg:'#6B7280',text:'#fff',label:'Sin datos'};
  return (
    <View style={gcs.wrap}>
      <View style={gcs.handle}/>
      <View style={gcs.header}>
        <View style={[gcs.iconBg,{backgroundColor:'#FEF3C7'}]}><Text style={{fontSize:28}}>⛽</Text></View>
        <View style={{flex:1}}>
          <Text style={gcs.title} numberOfLines={2}>{station.name||'Gasolinera'}</Text>
          <Text style={gcs.sub} numberOfLines={1}>{station.address}</Text>
          {station.schedule&&<Text style={gcs.hours}>🕐 {station.schedule}</Text>}
        </View>
        <TouchableOpacity onPress={toggleFav} style={[gcs.closeBtn, { backgroundColor: isFav ? '#FEF2F2' : COLORS.bg3, marginRight: 6 }]}>
          <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={20} color={isFav ? COLORS.danger : COLORS.text2}/>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={gcs.closeBtn}><Ionicons name="close" size={20} color={COLORS.text2}/></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{padding:16,paddingBottom:40}}>
        {/* Hero price — always G95 or Diesel, never GLP */}
        {mainPrice > 0 && !isNaN(mainPrice) && (
          <View style={[gcs.hero,{backgroundColor:mainCol.bg}]}>
            <Text style={[gcs.heroLbl,{color:mainCol.text}]}>{FUEL_LABELS[mainFuelKey]||mainFuelKey}</Text>
            <Text style={[gcs.heroPrice,{color:mainCol.text}]}>{mainPrice > 0 && !isNaN(mainPrice) ? mainPrice.toFixed(3)+"€/L" : "N/D"}</Text>
            <Text style={[gcs.heroTag,{color:mainCol.text}]}>{mainCol.label}</Text>
          </View>
        )}
        {/* All fuels grid */}
        <Text style={gcs.sectionTitle}>TODOS LOS CARBURANTES</Text>
        <Text style={gcs.sectionNote}>Fuente: Ministerio de Energía de España · Actualización diaria</Text>
        <View style={gcs.grid}>
          {fuels.map(([key,price])=>{
            const col = gasPriceColor(price);
            return (
              <View key={key} style={gcs.fuelCard}>
                <View style={[gcs.fuelBar,{backgroundColor:col.bg}]}/>
                <View style={{padding:10}}>
                  <Text style={gcs.fuelName}>{FUEL_LABELS[key]||key}</Text>
                  <Text style={[gcs.fuelPrice,{color:col.bg}]}>{price > 0 && !isNaN(price) ? price.toFixed(3)+"€" : "N/D"}</Text>
                  <Text style={gcs.fuelUnit}>por litro</Text>
                  <View style={[gcs.fuelBadge,{backgroundColor:col.bg+'25'}]}>
                    <Text style={[gcs.fuelBadgeTxt,{color:col.bg}]}>{col.label}</Text>
                  </View>
                </View>
              </View>
            );
          })}
          {fuels.length===0&&<Text style={{color:COLORS.text3,fontSize:13}}>Sin datos de precios disponibles</Text>}
        </View>
        <TouchableOpacity style={gcs.navBtn} onPress={()=>{onClose();onNavigate(station.lat,station.lng,station.name);}}>
          <Ionicons name="navigate" size={18} color="#fff"/>
          <Text style={gcs.navBtnTxt}>Cómo llegar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[gcs.navBtn,{backgroundColor:COLORS.bg3,marginTop:8}]}
          onPress={()=>{
            const msg = `⛽ ${station.name}\nG95: ${station.prices?.g95?.toFixed(3)||'N/D'}€ | Diesel: ${station.prices?.diesel?.toFixed(3)||'N/D'}€\nVía PreciMap 🗺️`;
            Share.share({ message: msg }).catch(()=>{});
          }}>
          <Ionicons name="share-outline" size={18} color={COLORS.text2}/>
          <Text style={[gcs.navBtnTxt,{color:COLORS.text2}]}>Compartir precio</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// === PLACE MODAL (bars, supermarkets, etc.) ===
function PlaceModal({ place, onClose, onNavigate, isLoggedIn, onAuthNeeded }) {
  const info = CATEGORY_INFO[place.category]||CATEGORY_INFO.default;
  const prices = place.prices||[];
  const [history, setHistory] = React.useState({});

  React.useEffect(() => {
    apiGet(`/api/places/${place.id}/price-history`).then(d => {
      if (d?.history) setHistory(d.history);
    }).catch(() => {});
  }, [place.id]);
  return (
    <View style={pcs.wrap}>
      <View style={pcs.handle}/>
      <View style={pcs.header}>
        <View style={[pcs.iconBg,{backgroundColor:info.bg}]}><Text style={{fontSize:26}}>{info.emoji}</Text></View>
        <View style={{flex:1}}>
          <Text style={pcs.title} numberOfLines={2}>{place.name}</Text>
          <Text style={pcs.sub}>{info.label}{place.address?` · ${place.address}`:''}</Text>
          {place.bestFor&&<Text style={pcs.bestFor}>{place.bestFor}</Text>}
        </View>
        <TouchableOpacity onPress={onClose} style={pcs.closeBtn}><Ionicons name="close" size={20} color={COLORS.text2}/></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{padding:16,paddingBottom:40}}>
        <View style={pcs.actions}>
          <TouchableOpacity style={pcs.actionBtn} onPress={()=>{isLoggedIn?Alert.alert('Añadir precio','Próximamente desde la app'):onAuthNeeded();}}>
            <Ionicons name="add-circle-outline" size={18} color={COLORS.primary}/>
            <Text style={pcs.actionTxt}>Añadir precio</Text>
          </TouchableOpacity>
          <TouchableOpacity style={pcs.actionBtnNav} onPress={()=>{onClose();onNavigate(place.lat,place.lng,place.name);}}>
            <Ionicons name="navigate" size={18} color="#fff"/>
            <Text style={pcs.actionTxtNav}>Cómo llegar</Text>
          </TouchableOpacity>
        </View>
        {/* Price history panel */}
        {Object.keys(history).length > 0 && (
          <View style={{marginBottom:16}}>
            <Text style={pcs.sectionTitle}>📈 TENDENCIA DE PRECIOS</Text>
            {Object.entries(history).slice(0,4).map(([prod, pts]) => {
              if (pts.length < 2) return null;
              const last = pts[pts.length-1].price;
              const prev = pts[pts.length-2].price;
              const diff = last - prev;
              const min = Math.min(...pts.map(p=>p.price));
              const max = Math.max(...pts.map(p=>p.price));
              return (
                <View key={prod} style={{flexDirection:'row',alignItems:'center',paddingVertical:8,borderBottomWidth:0.5,borderBottomColor:COLORS.border,gap:10}}>
                  <View style={{flex:1}}>
                    <Text style={{fontSize:13,fontWeight:'600',color:COLORS.text}} numberOfLines={1}>{prod}</Text>
                    <Text style={{fontSize:10,color:COLORS.text3,marginTop:1}}>min {min.toFixed(2)}€ · max {max.toFixed(2)}€ · {pts.length} reportes</Text>
                  </View>
                  <View style={{alignItems:'flex-end'}}>
                    <Text style={{fontSize:16,fontWeight:'800',color:COLORS.text}}>{last.toFixed(2)}€</Text>
                    <Text style={{fontSize:11,fontWeight:'700',color: Math.abs(diff)<0.01 ? COLORS.text3 : diff>0 ? COLORS.danger : COLORS.success}}>
                      {Math.abs(diff)<0.01 ? '—' : diff>0 ? `↑${diff.toFixed(2)}€` : `↓${Math.abs(diff).toFixed(2)}€`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <Text style={pcs.sectionTitle}>PRECIOS DE LA COMUNIDAD</Text>
        {prices.length===0
          ? <View style={pcs.emptyBox}><Text style={pcs.emptyTxt}>Sin precios aún{'\n'}¡Sé el primero en reportar!</Text></View>
          : prices.map(p=>(
            <View key={p.id} style={pcs.priceRow}>
              <View style={{flex:1}}>
                <Text style={pcs.product}>{p.product}</Text>
                <Text style={pcs.reporter}>Por {p.reporter_name||'usuario'} · {timeAgo(p.reported_at)}</Text>
                <View style={[pcs.statusBadge,{backgroundColor:p.status==='verified'?COLORS.successLight:COLORS.warningLight}]}>
                  <Text style={[pcs.statusTxt,{color:p.status==='verified'?COLORS.success:COLORS.warning}]}>{p.status==='verified'?'✅ Verificado':'⏳ Pendiente'}</Text>
                </View>
              </View>
              <Text style={pcs.price}>{p.price.toFixed(2)}€<Text style={pcs.unit}>/{p.unit}</Text></Text>
            </View>
          ))
        }
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:COLORS.bg2},
  header:{backgroundColor:COLORS.bg2,borderBottomWidth:0.5,borderBottomColor:COLORS.border},
  headerRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:14,paddingTop:12,paddingBottom:8},
  logo:{fontSize:17,fontWeight:'700',color:COLORS.primary},
  rightRow:{flexDirection:'row',alignItems:'center',gap:8},
  toggle:{flexDirection:'row',backgroundColor:COLORS.bg,borderRadius:99,padding:2,borderWidth:1,borderColor:COLORS.border},
  togBtn:{flexDirection:'row',alignItems:'center',gap:3,paddingHorizontal:9,paddingVertical:5,borderRadius:99},
  togBtnOn:{backgroundColor:COLORS.bg2,shadowColor:'#000',shadowOpacity:0.08,shadowRadius:3,elevation:2},
  togTxt:{fontSize:12,fontWeight:'500',color:COLORS.text3},
  filterIconBtn:{padding:4},
  catBtn:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:10,paddingVertical:5,borderRadius:99,borderWidth:1.5,borderColor:COLORS.border,backgroundColor:COLORS.bg},
  catBtnOn:{backgroundColor:COLORS.primary,borderColor:COLORS.primary},
  catEmoji:{fontSize:13},catTxt:{fontSize:12,fontWeight:'500',color:COLORS.text2},
  filtersPanel:{backgroundColor:COLORS.bg,marginHorizontal:12,marginBottom:8,borderRadius:14,padding:14,borderWidth:1,borderColor:COLORS.border},
  filterLabel:{fontSize:12,fontWeight:'700',color:COLORS.text,marginBottom:6,marginTop:8},
  radRow:{flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:4},
  radBtn:{paddingHorizontal:12,paddingVertical:6,borderRadius:99,borderWidth:1.5,borderColor:COLORS.border,backgroundColor:COLORS.bg2},
  radBtnOn:{backgroundColor:COLORS.primary,borderColor:COLORS.primary},
  radTxt:{fontSize:13,fontWeight:'600',color:COLORS.text2},
  sortBtn:{paddingHorizontal:10,paddingVertical:6,borderRadius:99,borderWidth:1.5,borderColor:COLORS.border,backgroundColor:COLORS.bg2},
  sortBtnOn:{backgroundColor:COLORS.primary,borderColor:COLORS.primary},
  sortTxt:{fontSize:12,fontWeight:'600',color:COLORS.text2},
  productRow:{flexDirection:'row',alignItems:'center',backgroundColor:COLORS.bg2,borderRadius:10,borderWidth:1,borderColor:COLORS.border,paddingHorizontal:10,paddingVertical:8,gap:6},
  productInput:{flex:1,fontSize:14,color:COLORS.text},
  quickProd:{paddingHorizontal:10,paddingVertical:5,borderRadius:99,borderWidth:1,borderColor:COLORS.border,backgroundColor:COLORS.bg2},
  quickProdOn:{backgroundColor:COLORS.primary,borderColor:COLORS.primary},
  quickProdTxt:{fontSize:12,color:COLORS.text2},
  fuelBtn:{paddingHorizontal:12,paddingVertical:7,borderRadius:99,borderWidth:1.5,borderColor:COLORS.border,backgroundColor:COLORS.bg2},
  fuelBtnTxt:{fontSize:12,color:COLORS.text2},
  fuelNote:{fontSize:11,color:COLORS.text3,marginTop:6,lineHeight:16,fontStyle:'italic'},
  fuelsGrid:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:6},
  fuelCard:{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:12,paddingVertical:8,borderRadius:10,borderWidth:1.5,borderColor:COLORS.border,backgroundColor:COLORS.bg2},
  fuelCardDot:{width:8,height:8,borderRadius:4},
  fuelCardTxt:{fontSize:13,fontWeight:'500',color:COLORS.text2},
  fuelInfo:{flexDirection:'row',alignItems:'flex-start',gap:6,backgroundColor:COLORS.primaryLight,borderRadius:8,padding:8,marginTop:4},
  fuelInfoTxt:{flex:1,fontSize:11,color:COLORS.primary,lineHeight:16},
});

const ms = StyleSheet.create({
  marker:{alignItems:'center',borderRadius:99,borderWidth:2.5,paddingHorizontal:5,paddingVertical:3,minWidth:34,shadowColor:'#000',shadowOpacity:0.2,shadowRadius:3,elevation:3},
  markerEmoji:{fontSize:14},markerPrice:{fontSize:9,fontWeight:'700',color:COLORS.text},
  gasMarker:{alignItems:'center',borderRadius:99,borderWidth:2,borderColor:'#fff',paddingHorizontal:5,paddingVertical:3,minWidth:40,shadowColor:'#000',shadowOpacity:0.25,shadowRadius:4,elevation:4},
  gasEmoji:{fontSize:13},gasPrice:{fontSize:9,fontWeight:'700',color:'#fff'},
  loadBar:{position:'absolute',top:10,left:12,right:12,backgroundColor:'rgba(255,255,255,0.97)',borderRadius:10,padding:10,flexDirection:'row',alignItems:'center',gap:8,shadowColor:'#000',shadowOpacity:0.1,shadowRadius:6,elevation:4},
  loadTxt:{fontSize:12,color:COLORS.text2},
  legend:{position:'absolute',bottom:16,left:12,flexDirection:'row',alignItems:'center',gap:10,backgroundColor:'rgba(255,255,255,0.97)',borderRadius:10,paddingHorizontal:12,paddingVertical:8,shadowColor:'#000',shadowOpacity:0.1,shadowRadius:6,elevation:3},
  legendItem:{flexDirection:'row',alignItems:'center',gap:4},legendDot:{width:10,height:10,borderRadius:5},
  legendTxt:{fontSize:11,color:COLORS.text2,fontWeight:'500'},legendCount:{fontSize:10,color:COLORS.text3,marginLeft:2},
  legendSep:{width:0.5,height:14,backgroundColor:COLORS.border,marginHorizontal:4},
  legendStat:{fontSize:11,fontWeight:'700',color:COLORS.text},
  fab:{position:'absolute',bottom:16,right:16,width:52,height:52,borderRadius:99,backgroundColor:COLORS.primary,alignItems:'center',justifyContent:'center',shadowColor:'#000',shadowOpacity:0.25,shadowRadius:8,elevation:6},
});

const lcs = StyleSheet.create({
  card:{backgroundColor:COLORS.bg2,borderRadius:14,borderWidth:0.5,borderColor:COLORS.border,flexDirection:'row',padding:12,gap:10,alignItems:'center'},
  icon:{width:44,height:44,borderRadius:10,alignItems:'center',justifyContent:'center'},
  info:{flex:1,gap:2},
  name:{fontSize:15,fontWeight:'600',color:COLORS.text},
  sub:{fontSize:12,color:COLORS.text3},
  bestFor:{fontSize:12,color:COLORS.primary,fontWeight:'600',marginTop:1},
  pricePill:{alignSelf:'flex-start',borderRadius:99,paddingHorizontal:8,paddingVertical:2,marginTop:2},
  pricePillTxt:{fontSize:11,fontWeight:'700'},
  right:{alignItems:'flex-end',gap:6},
  dist:{fontSize:12,color:COLORS.text3},
  navBtn:{backgroundColor:COLORS.primary,borderRadius:99,paddingHorizontal:12,paddingVertical:6},
  navTxt:{fontSize:12,fontWeight:'700',color:'#fff'},
});

const gcs = StyleSheet.create({
  wrap:{flex:1,backgroundColor:COLORS.bg2},handle:{width:40,height:4,borderRadius:99,backgroundColor:COLORS.border,alignSelf:'center',marginTop:10},
  header:{flexDirection:'row',alignItems:'center',gap:12,padding:16,borderBottomWidth:0.5,borderBottomColor:COLORS.border},
  iconBg:{width:52,height:52,borderRadius:14,alignItems:'center',justifyContent:'center'},
  title:{fontSize:17,fontWeight:'700',color:COLORS.text,lineHeight:22},sub:{fontSize:12,color:COLORS.text2,marginTop:2},
  hours:{fontSize:11,color:COLORS.text3,marginTop:1},closeBtn:{width:32,height:32,borderRadius:99,backgroundColor:COLORS.bg,alignItems:'center',justifyContent:'center'},
  hero:{borderRadius:16,padding:18,alignItems:'center',marginBottom:18},
  heroLbl:{fontSize:14,fontWeight:'600',opacity:0.9},heroPrice:{fontSize:40,fontWeight:'800',marginVertical:4},heroTag:{fontSize:13,fontWeight:'700'},
  sectionTitle:{fontSize:11,fontWeight:'700',color:COLORS.text3,letterSpacing:0.5,marginBottom:4},
  sectionNote:{fontSize:11,color:COLORS.text3,marginBottom:12},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:20},
  fuelCard:{width:'47%',borderRadius:12,overflow:'hidden',backgroundColor:COLORS.bg2,borderWidth:0.5,borderColor:COLORS.border},
  fuelBar:{height:5},fuelName:{fontSize:13,fontWeight:'700',color:COLORS.text,marginBottom:2},
  fuelPrice:{fontSize:24,fontWeight:'800'},fuelUnit:{fontSize:11,color:COLORS.text3,marginBottom:6},
  fuelBadge:{alignSelf:'flex-start',borderRadius:99,paddingHorizontal:8,paddingVertical:2},fuelBadgeTxt:{fontSize:11,fontWeight:'600'},
  navBtn:{backgroundColor:COLORS.primary,borderRadius:99,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,padding:14},navBtnTxt:{color:'#fff',fontWeight:'700',fontSize:15},
});

const pcs = StyleSheet.create({
  wrap:{flex:1,backgroundColor:COLORS.bg2},handle:{width:40,height:4,borderRadius:99,backgroundColor:COLORS.border,alignSelf:'center',marginTop:10},
  header:{flexDirection:'row',alignItems:'center',gap:12,padding:16,borderBottomWidth:0.5,borderBottomColor:COLORS.border},
  iconBg:{width:48,height:48,borderRadius:12,alignItems:'center',justifyContent:'center'},
  title:{fontSize:17,fontWeight:'700',color:COLORS.text},sub:{fontSize:12,color:COLORS.text2,marginTop:2},
  bestFor:{fontSize:12,color:COLORS.primary,fontWeight:'600',marginTop:3},
  closeBtn:{width:32,height:32,borderRadius:99,backgroundColor:COLORS.bg,alignItems:'center',justifyContent:'center'},
  actions:{flexDirection:'row',gap:10,marginBottom:18},
  actionBtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,backgroundColor:COLORS.primaryLight,borderRadius:99,padding:12,borderWidth:1,borderColor:COLORS.primary},
  actionTxt:{fontSize:13,fontWeight:'600',color:COLORS.primary},
  actionBtnNav:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,backgroundColor:COLORS.primary,borderRadius:99,padding:12},
  actionTxtNav:{fontSize:13,fontWeight:'600',color:'#fff'},
  sectionTitle:{fontSize:11,fontWeight:'700',color:COLORS.text3,letterSpacing:0.5,marginBottom:12},
  emptyBox:{alignItems:'center',padding:28},emptyTxt:{fontSize:14,color:COLORS.text3,textAlign:'center',lineHeight:22},
  priceRow:{flexDirection:'row',alignItems:'flex-start',paddingVertical:12,borderBottomWidth:0.5,borderBottomColor:COLORS.border,gap:10},
  product:{fontSize:15,fontWeight:'600',color:COLORS.text},reporter:{fontSize:12,color:COLORS.text3,marginTop:2},
  statusBadge:{alignSelf:'flex-start',borderRadius:99,paddingHorizontal:8,paddingVertical:3,marginTop:6},statusTxt:{fontSize:11,fontWeight:'600'},
  price:{fontSize:22,fontWeight:'800',color:COLORS.primary},unit:{fontSize:11,fontWeight:'400',color:COLORS.text3},
  fuelActiveBadge:{flexDirection:'row',alignItems:'center',borderRadius:99,borderWidth:1.5,paddingHorizontal:10,paddingVertical:5},
  fuelActiveTxt:{fontSize:12,fontWeight:'700'},
});
