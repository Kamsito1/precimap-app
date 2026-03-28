import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal,
  FlatList, ActivityIndicator, Linking, Platform, Alert, TextInput, Animated, Share, KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker } from 'react-native-maps';
// expo-location cargado de forma diferida — import estático crashea en iOS/Hermes
const getLocation = () => require('expo-location');
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  COLORS, CATEGORY_INFO, FUEL_LABELS, gasPriceColor,
  stationMinPrice, apiGet, apiPost, apiDelete, distanceKm, timeAgo, openURL,
} from '../utils';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from '../components/AuthModal';
import AddGasStationModal from '../components/AddGasStationModal';
import CityPicker from '../components/CityPicker';
import PriceChangeModal from '../components/PriceChangeModal';

const FUELS = [
  { key:'g95',         label:'Gasolina 95',  emoji:'🟢', color:'#3B82F6', bg:'#EFF6FF' },
  { key:'diesel',      label:'Diésel A',     emoji:'🟡', color:'#F59E0B', bg:'#FFFBEB' },
  { key:'g98',         label:'Gasolina 98',  emoji:'🔵', color:'#8B5CF6', bg:'#F5F3FF' },
  { key:'diesel_plus', label:'Diésel Premium',emoji:'🟠',color:'#F97316', bg:'#FFF7ED' },
  { key:'glp',         label:'GLP / Autogas',emoji:'🟤', color:'#10B981', bg:'#F0FDF4' },
  { key:'gnc',         label:'Gas Natural',  emoji:'⚪', color:'#06B6D4', bg:'#ECFEFF' },
];

// ─── PRECIO MEDIO SEMANAL POR CADENA DE SUPERMERCADO ────────────────────────
// Basado en una cesta semanal de ~30 productos básicos (fuente: OCU 2024 + PRODUCTOS)
// Se usa para mostrar en los marcadores del mapa cuánto cuesta de media una semana
const WEEKLY_COST_BY_CHAIN = {
  'aldi':       72.50,  'Aldi':       72.50,
  'lidl':       76.80,  'Lidl':       76.80,
  'alcampo':    82.40,  'Alcampo':    82.40,
  'dia':        83.90,  'Dia':        83.90,  'Día':        83.90,
  'mercadona':  88.50,  'Mercadona':  88.50,
  'carrefour':  95.20,  'Carrefour':  95.20,
  'consum':     96.80,  'Consum':     96.80,
  'eroski':     97.50,  'Eroski':     97.50,
  'coviran':    85.00,  'Coviran':    85.00,
  'spar':       86.50,  'Spar':       86.50,
  'ahorramas':  92.00,  'Ahorramas':  92.00,
  'condis':     93.50,  'Condis':     93.50,
  'bonpreu':    96.00,  'Bonpreu':    96.00,
  'gadis':      94.80,  'Gadis':      94.80,
  'hiperdino':  91.00,  'Hiperdino':  91.00,
  'supercor':  102.00,  'Supercor':  102.00,
  'el corte':  110.00,  'El Corte Inglés': 110.00,
};
const AVG_WEEKLY_COST = 88.50; // media nacional (Mercadona como referencia)

function getWeeklyCost(placeName) {
  if (!placeName) return null;
  const n = placeName.toLowerCase();
  for (const [chain, cost] of Object.entries(WEEKLY_COST_BY_CHAIN)) {
    if (n.includes(chain.toLowerCase())) return cost;
  }
  return null;
}

const CATS = [
  { key:'gasolinera',   label:'Gasolina',    emoji:'⛽' },
  { key:'restaurante',  label:'Cafés',       emoji:'☕', product:'Café con leche',  key2:'cafe' },
  { key:'restaurante',  label:'Cervezas',    emoji:'🍺', product:'Caña de cerveza', key2:'cerveza' },
  { key:'restaurante',  label:'Restaurantes',emoji:'🍽️', product:'Menú del día',    key2:'restaurante_menu' },
  { key:'supermercado', label:'Súper',       emoji:'🛒' },
  { key:'farmacia',     label:'Farmacia',    emoji:'💊' },
  { key:'gimnasio',     label:'Gimnasios',   emoji:'💪' },
];

const SORT_OPTS = [
  { key:'proximity',       label:'📍 Más cercano' },
  { key:'price',           label:'💰 Más barato' },
  { key:'price_proximity', label:'⚡ Precio + cercanía' },
];

const RADII = [5, 10, 25, 50, 100, 999]; // 999 = Toda España

// Centro de España (Madrid) como región inicial — se actualiza al obtener GPS
const SPAIN_CENTER = { latitude:40.4168, longitude:-3.7038, latitudeDelta:6.0, longitudeDelta:6.0 };

export default function MapScreen() {
  const { isLoggedIn } = useAuth();
  const [places, setPlaces]         = useState([]);
  const [gasolineras, setGasolineras] = useState([]);
  const [showHint, setShowHint] = useState(false); // first-time hint
  const [activeCat, setActiveCat]   = useState('gasolinera'); // Gasolina es el caso de uso principal
  const [activeCatKey, setActiveCatKey] = useState('gasolinera');
  const [userLoc, setUserLoc]       = useState(null);
  const [viewMode, setViewMode]     = useState('map');
  // Gasolina: proximity (más cercana). Resto: price (más barata primero)
  const [sort, setSort] = useState('price');
  const [radius, setRadius]         = useState(25);
  const [product, setProduct]       = useState('');
  const [gasSearch, setGasSearch]   = useState('');
  const [city, setCity]             = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFuel, setActiveFuel]   = useState('g95'); // por defecto G95 para gasolineras
  const [loading, setLoading]         = useState(false);
  const [gasLoading, setGasLoading]   = useState(false);
  const [loadProgress, setLoadProgress] = useState(0); // 0-100 fake progress for UX
  const [serverError, setServerError] = useState(false);
  const [selectedPlace, setSelectedPlace]     = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [showAuth, setShowAuth]     = useState(false);
  const [showAddGas, setShowAddGas] = useState(false);
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [priceChangePlace, setPriceChangePlace] = useState(null);
  const [mapRegion, setMapRegion]   = useState(null); // current visible region
  const [allGas, setAllGas]         = useState([]);
  const [nearbyGasLoaded, setNearbyGasLoaded] = useState(false); // carga progresiva
  const [mapEvents, setMapEvents]   = useState([]); // eventos en el mapa
  const [serverFuelStats, setServerFuelStats] = useState(null);
  const [favStations, setFavStations] = useState([]); // from AsyncStorage
  const [showFavsOnly, setShowFavsOnly] = useState(false);
  const [cityStats, setCityStats] = useState(null); // resumen de precios de la ciudad
  const mapRef = useRef(null);

  useEffect(() => { initLocation(); loadFuelStats(); loadFavs(); loadEvents(); }, []);

  // Re-load favs when login state changes (e.g. user logs in after app opened)
  useEffect(() => { loadFavs(); }, [isLoggedIn]);

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
      // Try server first (persistent), fallback to local
      if (isLoggedIn) {
        const serverFavs = await apiGet('/api/users/me/favorites').catch(() => null);
        if (serverFavs && Array.isArray(serverFavs)) {
          setFavStations(serverFavs.map(f => ({ id: f.station_id, name: f.station_name, city: f.station_city, lat: f.lat, lng: f.lng })));
          // Sync to local cache
          await AsyncStorage.setItem('fav_stations', JSON.stringify(serverFavs.map(f => ({ id: f.station_id, name: f.station_name, city: f.station_city, lat: f.lat, lng: f.lng }))));
          return;
        }
      }
      const raw = await AsyncStorage.getItem('fav_stations');
      setFavStations(raw ? JSON.parse(raw) : []);
    } catch(_) {}
  }
  useEffect(() => { loadPlaces(); }, [activeCat, sort, radius, product, city, userLoc]);

  // Cargar stats de precios de la ciudad cuando cambia
  useEffect(() => {
    if (!city) { setCityStats(null); return; }
    apiGet(`/api/places/stats?city=${encodeURIComponent(city)}`)
      .then(d => setCityStats(d))
      .catch(() => setCityStats(null));
  }, [city]);

  // Load ALL gasolineras once into client cache (server already has them cached at 5ms)
  async function loadFuelStats() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const data = await apiGet('/api/gasolineras/stats');
      clearTimeout(timeout);
      if (data?.stats) setServerFuelStats(data.stats);
    } catch(_) { setServerError(true); }
  }

  async function loadAllGasolineras(userCoords) {
    setGasLoading(true);
    setLoadProgress(5);
    const prog = setInterval(() => setLoadProgress(p => {
      if (p < 30) return p + 8;
      if (p < 60) return p + 4;
      if (p < 85) return p + 1;
      return p;
    }), 500);
    try {
      // CARGA PROGRESIVA: primero las cercanas si tenemos ubicación
      if (userCoords) {
        const { lat, lng } = userCoords;
        const nearbyData = await apiGet(`/api/gasolineras?lat=${lat}&lng=${lng}&radius=30`) || [];
        if (nearbyData.length > 0) {
          setAllGas(nearbyData);
          setNearbyGasLoaded(true);
          setLoadProgress(40);
        }
      }
      // Luego carga completa en background
      const data = await apiGet('/api/gasolineras') || [];
      clearInterval(prog);
      setLoadProgress(100);
      setAllGas(data);
      setNearbyGasLoaded(false);
      setServerError(false);
    } catch(_) {
      clearInterval(prog);
      setServerError(true);
    }
    finally { setGasLoading(false); }
  }

  async function loadEvents() {
    try {
      const data = await apiGet('/api/events?limit=50&upcoming=1') || [];
      // Geocode events by city using city coords lookup
      const CITY_COORDS = {
        'Madrid': {lat:40.4168,lng:-3.7038}, 'Barcelona': {lat:41.3851,lng:2.1734},
        'Sevilla': {lat:37.3886,lng:-5.9823}, 'Valencia': {lat:39.4699,lng:-0.3763},
        'Bilbao': {lat:43.2630,lng:-2.9350}, 'Málaga': {lat:36.7213,lng:-4.4213},
        'Zaragoza': {lat:41.6488,lng:-0.8891}, 'Murcia': {lat:37.9838,lng:-1.1332},
        'Palma': {lat:39.5696,lng:2.6502}, 'Granada': {lat:37.1773,lng:-3.5986},
        'Córdoba': {lat:37.8882,lng:-4.7794}, 'Alicante': {lat:38.3452,lng:-0.4810},
        'Valladolid': {lat:41.6523,lng:-4.7245}, 'Vigo': {lat:42.2314,lng:-8.7124},
        'Gijón': {lat:43.5453,lng:-5.6615}, 'Pamplona': {lat:42.8125,lng:-1.6458},
        'Jerez de la Frontera': {lat:36.6869,lng:-6.1372},
        'Salamanca': {lat:40.9701,lng:-5.6635}, 'Toledo': {lat:39.8628,lng:-4.0273},
        'San Sebastián': {lat:43.3183,lng:-1.9812},
      };
      const withCoords = data
        .map(e => {
          const coords = CITY_COORDS[e.city];
          if (!coords && !e.lat) return null;
          return { ...e, lat: e.lat || coords.lat, lng: e.lng || coords.lng };
        })
        .filter(Boolean);
      setMapEvents(withCoords);
    } catch(_) {}
  }

  async function initLocation() {
    try {
      const Location = getLocation();
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude: lat, longitude: lng } = loc.coords;
        setUserLoc({ lat, lng });
        mapRef.current?.animateToRegion({ latitude:lat, longitude:lng, latitudeDelta:0.06, longitudeDelta:0.06 }, 1000);
        // Auto-set nearest city for non-gas categories
        try {
          const geo = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
          const detectedCity = geo?.[0]?.city || geo?.[0]?.subregion || '';
          if (detectedCity && !city) {
            // Only auto-set if no city filter is already active
            const KNOWN = ['Madrid','Barcelona','Sevilla','Valencia','Bilbao','Zaragoza','Málaga','Córdoba','Alicante','Murcia','Granada','Valladolid','Palma','Santander'];
            const match = KNOWN.find(c => detectedCity.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(detectedCity.toLowerCase().slice(0,5)));
            if (match) setCity(match);
          }
        } catch(_) {}
        // Carga progresiva — primero las cercanas al usuario
        loadAllGasolineras({ lat, lng });
      } else {
        loadAllGasolineras(null);
      }
    } catch(_) {
      loadAllGasolineras(null);
    }
  }

  async function loadPlaces() {
    if (activeCat === 'gasolinera') return;
    setLoading(true);
    try {
      const lat = userLoc?.lat || 40.4168;
      const lng = userLoc?.lng || -3.7038;
      // Sin ciudad ni GPS → price puro (mejores de España)
      // Con GPS sin ciudad → price_proximity (barato + cercano)
      // Con ciudad → sort elegido por el usuario (default: price)
      const effectiveSort = !city && !userLoc ? 'price'
        : !city && userLoc ? 'price_proximity'
        : sort;
      let url = `/api/places?sort=${effectiveSort}&lat=${lat}&lng=${lng}&cat=${activeCat}`;
      if (city) {
        url += `&city=${encodeURIComponent(city)}`;
      } else if (userLoc) {
        url += `&radius=${radius < 100 ? radius : 25}`;
      }
      if (product) url += `&product=${encodeURIComponent(product)}`;
      setPlaces(await apiGet(url) || []);
      setServerError(false);
    } catch(_) { setServerError(true); } finally { setLoading(false); }
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

  // visiblePlaces ya viene filtrado del servidor (loadPlaces pasa &cat=activeCat)
  // Solo necesitamos asegurar que no se mezclen categorías en modo 'all' (ya eliminado)
  const visiblePlaces = activeCat === 'gasolinera' ? [] : places;
  // For gas stations in list: use G95 or Diesel price, never GLP
  const favIds = new Set(favStations.map(f => f.id));
  const visibleGas = activeCat === 'gasolinera' ? gasolineras
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

  // ── Fuel selector screen (shown when gas category is active and no fuel chosen) ─────────────────
  // FIX: Solo bloquear con selector si el usuario está en categoría gasolinera
  // El mapa debe abrir directamente sin forzar selección de carburante
  if (activeFuel === null && activeCat === 'gasolinera') {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={{flex:1,backgroundColor:COLORS.bg}}>
          <View style={{backgroundColor:COLORS.primary,paddingHorizontal:20,paddingTop:20,paddingBottom:24}}>
            <Text style={{fontSize:22,fontWeight:'800',color:'#fff',marginBottom:6}}>⛽ Elige tu carburante</Text>
            {fuelStats?.g95 && (
              <Text style={{fontSize:12,color:'rgba(255,255,255,0.7)',marginBottom:2}}>
                G95 ahora desde {fuelStats?.g95?.min?.toFixed(3)}€/L · media {fuelStats?.g95?.avg?.toFixed(3)}€/L
              </Text>
            )}
            <Text style={{fontSize:14,color:'rgba(255,255,255,0.8)',lineHeight:20}}>
              El mapa mostrará el precio de cada estación para el carburante que elijas
            </Text>
          </View>
          {!Object.keys(fuelStats).length ? (
            <View style={{flex:1,alignItems:'center',justifyContent:'center',gap:16,paddingHorizontal:40}}>
              <Text style={{fontSize:48}}>⛽</Text>
              <Text style={{fontSize:17,fontWeight:'700',color:COLORS.text}}>Cargando precios...</Text>
              <Text style={{fontSize:13,color:COLORS.text3,textAlign:'center'}}>
                Conectando con el servidor de gasolineras del Ministerio
              </Text>
              <ActivityIndicator color={COLORS.primary} size="large" style={{marginTop:4}}/>
              {loadProgress > 0 && loadProgress < 100 && (
                <>
                  <View style={{width:'100%',height:6,backgroundColor:COLORS.border,borderRadius:99,overflow:'hidden'}}>
                    <View style={{width:`${loadProgress}%`,height:'100%',backgroundColor:COLORS.primary,borderRadius:99}}/>
                  </View>
                  <Text style={{fontSize:12,color:COLORS.text3}}>{loadProgress}% · cargando gasolineras...</Text>
                </>
              )}
              <TouchableOpacity
                style={{marginTop:8,paddingHorizontal:24,paddingVertical:12,backgroundColor:COLORS.primaryLight,borderRadius:12,borderWidth:1.5,borderColor:COLORS.primary}}
                onPress={() => { setLoadProgress(0); loadFuelStats(); loadAllGasolineras(); }}>
                <Text style={{color:COLORS.primary,fontWeight:'700',fontSize:14}}>🔄 Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{flex:1}}>
            {/* 🧮 Calculadora de ahorro rápida */}
            {fuelStats?.g95 && (() => {
              const min = fuelStats.g95.min || 0;
              const avg = fuelStats.g95.avg || 0;
              const tank = 50;
              const savedPerTank = ((avg - min) * tank).toFixed(2);
              const savedPerMonth = ((avg - min) * tank * 2.5).toFixed(0);
              return (
                <View style={{backgroundColor:'#ECFDF5',borderRadius:14,padding:14,marginHorizontal:16,marginTop:12,marginBottom:4,flexDirection:'row',alignItems:'center',gap:10,borderWidth:1,borderColor:'#BBF7D0'}}>
                  <Text style={{fontSize:24}}>⛽</Text>
                  <View style={{flex:1}}>
                    <Text style={{fontSize:13,fontWeight:'700',color:'#065F46'}}>
                      Ahorra {savedPerMonth}€/mes llenando donde la G95 es más barata
                    </Text>
                    <Text style={{fontSize:11,color:'#047857',marginTop:2}}>
                      {min.toFixed(3)}€/L mín vs {avg.toFixed(3)}€/L media · {savedPerTank}€ por depósito
                    </Text>
                  </View>
                </View>
              );
            })()}
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
                        <Text style={{fontSize:13,fontWeight:'800',color:'#16A34A',minWidth:56,textAlign:'right'}}>{st.min?.toFixed(3)}€</Text>
                      </View>
                      <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                        <Text style={{fontSize:11,color:COLORS.text3,width:32}}>🟡 med</Text>
                        <Text style={{fontSize:13,fontWeight:'700',color:'#D97706',minWidth:56,textAlign:'right'}}>{st.avg?.toFixed(3)}€</Text>
                      </View>
                      <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                        <Text style={{fontSize:11,color:COLORS.text3,width:32}}>🔴 max</Text>
                        <Text style={{fontSize:13,fontWeight:'700',color:'#DC2626',minWidth:56,textAlign:'right'}}>{st.max?.toFixed(3)}€</Text>
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
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  function navigateTo(lat, lng, name) {
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(name||'')}`;
    // Web: always Google Maps in new tab
    if (typeof document !== 'undefined') { openURL(googleMapsUrl); return; }
    const url = Platform.OS === 'ios'
      ? `maps://maps.apple.com/?daddr=${lat},${lng}&q=${encodeURIComponent(name||'')}`
      : `geo:${lat},${lng}?q=${encodeURIComponent(name||'')}`;
    Linking.openURL(url).catch(() => openURL(googleMapsUrl));
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <Text style={s.logo}>🗺️ PreciMap</Text>
          {/* Badge carburante — solo cuando estamos en gasolinera */}
          {activeCat === 'gasolinera' && activeFuel && activeFuel !== 'all' && (
            <TouchableOpacity
              style={[s.fuelActiveBadge, {backgroundColor:(FUELS.find(f=>f.key===activeFuel)||{}).color+'22', borderColor:(FUELS.find(f=>f.key===activeFuel)||{}).color}]}
              onPress={()=>setActiveFuel(null)}>
              <Text style={[s.fuelActiveTxt, {color:(FUELS.find(f=>f.key===activeFuel)||{color:COLORS.text}).color}]}>
                ⛽ {FUELS.find(f=>f.key===activeFuel)?.label}
              </Text>
              {fuelStats[activeFuel] && (
                <Text style={{fontSize:9,color:COLORS.text3}}>
                  {' '}🟢{fuelStats[activeFuel].min?.toFixed(3)}€
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
          {CATS.map((c,i)=>{
            const ck = c.key2 || c.key;
            const isOn = activeCatKey === ck;
            // Color específico por categoría cuando está activa
            const catColor = {
              gasolinera:'#F59E0B', cafe:'#EA580C', cerveza:'#D97706',
              restaurante_menu:'#E11D48', supermercado:'#16A34A',
              farmacia:'#2563EB', gimnasio:'#7C3AED',
            }[ck] || COLORS.primary;
            return (
              <TouchableOpacity key={ck+i}
                style={[s.catBtn, isOn && {backgroundColor:catColor, borderColor:catColor}]}
                onPress={()=>{
                  setActiveCat(c.key);
                  setActiveCatKey(ck);
                  setProduct(c.product||'');
                  if (c.key === 'gasolinera') {
                    setActiveFuel(null);
                    setSort('proximity');
                  } else {
                    setSort('price'); // más barato primero para cafés, cervezas, menús, etc.
                  }
                }}>
                <Text style={s.catEmoji}>{c.emoji}</Text>
                <Text style={[s.catTxt,isOn&&{color:'#fff',fontWeight:'700'}]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Barra de búsqueda de producto — solo para farmacia y gimnasio (supermercado usa Ahorro) */}
        {(activeCat === 'farmacia' || activeCat === 'gimnasio') && (
          <View style={{paddingHorizontal:12,paddingBottom:8}}>
            <View style={{flexDirection:'row',alignItems:'center',backgroundColor:COLORS.bg3,borderRadius:12,borderWidth:1.5,borderColor:product?COLORS.primary:COLORS.border,paddingHorizontal:10,gap:6}}>
              <Text style={{fontSize:16}}>{activeCat==='farmacia'?'💊':'💪'}</Text>
              <TextInput
                style={{flex:1,paddingVertical:9,fontSize:14,color:COLORS.text}}
                value={product}
                onChangeText={setProduct}
                placeholder={activeCat==='farmacia' ? 'Buscar medicamento... (ibuprofeno, paracetamol...)' : 'Buscar cadena... (McFit, Basic-Fit...)'}
                placeholderTextColor={COLORS.text3}
                returnKeyType="search"
                onSubmitEditing={loadPlaces}
              />
              {product ? (
                <TouchableOpacity onPress={()=>{setProduct('');loadPlaces();}}>
                  <Ionicons name="close-circle" size={18} color={COLORS.text3}/>
                </TouchableOpacity>
              ) : null}
            </View>
            {activeCat === 'farmacia' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6,paddingTop:6}}>
                {['ibuprofeno','paracetamol','amoxicilina','omeprazol','loratadina','vitamina C','colágeno','magnesio','anticonceptivos','termómetro','tensiómetro','mascarilla'].map(p=>(
                  <TouchableOpacity key={p}
                    style={{paddingHorizontal:10,paddingVertical:4,borderRadius:12,borderWidth:1,
                      borderColor:product===p?COLORS.primary:COLORS.border,
                      backgroundColor:product===p?COLORS.primaryLight:COLORS.bg}}
                    onPress={()=>{setProduct(product===p?'':p); setTimeout(loadPlaces,100);}}>
                    <Text style={{fontSize:12,fontWeight:'600',color:product===p?COLORS.primary:COLORS.text2}}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            {activeCat === 'gimnasio' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6,paddingTop:6}}>
                {['mcfit','basic-fit','anytime fitness','vivagym','altafit','go fit','forus','gym directa','holmes place'].map(p=>(
                  <TouchableOpacity key={p}
                    style={{paddingHorizontal:10,paddingVertical:4,borderRadius:12,borderWidth:1,
                      borderColor:product===p?'#7C3AED':COLORS.border,
                      backgroundColor:product===p?'#EDE9FE':COLORS.bg}}
                    onPress={()=>{setProduct(product===p?'':p); setTimeout(loadPlaces,100);}}>
                    <Text style={{fontSize:12,fontWeight:'600',color:product===p?'#7C3AED':COLORS.text2}}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* FIX: Eventos eliminados del mapa — tienen su propia sección en la barra de navegación */}


        {/* City quick filter */}
        <View style={{paddingHorizontal:12,paddingBottom:4}}>
          <CityPicker
            value={city}
            onChange={setCity}
            placeholder={!city && !userLoc && activeCat !== 'gasolinera'
              ? "🔍 Elige tu ciudad para ver resultados"
              : city ? city : "📍 Tu ubicación actual"}
          />
        </View>
        {/* Aviso si no hay ciudad ni GPS para categorías que lo necesitan */}
        {!city && !userLoc && activeCat !== 'gasolinera' && (
          <View style={{marginHorizontal:12,marginBottom:6,backgroundColor:'#FFF7ED',borderRadius:10,padding:8,flexDirection:'row',gap:6,alignItems:'center',borderWidth:1,borderColor:'#FED7AA'}}>
            <Text style={{fontSize:14}}>📍</Text>
            <Text style={{flex:1,fontSize:12,color:'#92400E',fontWeight:'600'}}>
              {activeCat === 'supermercado'
                ? 'Elige tu ciudad para ver supermercados cerca de ti'
                : 'Elige una ciudad arriba para ver los precios más baratos cerca de ti'}
            </Text>
          </View>
        )}

        {/* Banner resumen de precios de la ciudad — solo para restaurantes */}
        {city && cityStats && activeCat === 'restaurante' && (() => {
          const stats = cityStats.stats || {};
          const KEY_MAP = {
            cafe:             ['Café con leche','Café solo'],
            cerveza:          ['Caña de cerveza','Cerveza caña'],
            restaurante_menu: ['Menú del día','Menú del día completo'],
          };
          const keys = KEY_MAP[activeCatKey] || [];
          const found = keys.map(k => stats[k]).find(v => v);
          if (!found) return null;
          const emoji = activeCatKey === 'cafe' ? '☕' : activeCatKey === 'cerveza' ? '🍺' : '🍽️';
          return (
            <View style={{marginHorizontal:12,marginBottom:6,backgroundColor:COLORS.primaryLight,borderRadius:10,padding:8,flexDirection:'row',gap:8,alignItems:'center',borderWidth:1,borderColor:COLORS.primary+'33'}}>
              <Text style={{fontSize:16}}>{emoji}</Text>
              <View style={{flex:1}}>
                <Text style={{fontSize:12,fontWeight:'700',color:COLORS.primary}}>
                  En {city}: desde <Text style={{fontSize:14}}>{found.min.toFixed(2)}€</Text>
                  {found.max !== found.min ? ` hasta ${found.max.toFixed(2)}€` : ''}
                </Text>
                <Text style={{fontSize:10,color:COLORS.text3}}>{found.count} precios reportados</Text>
              </View>
            </View>
          );
        })()}
        {showFilters && (
          <View style={s.filtersPanel}>
            {/* Info solo para gasolineras — viewport loading */}
            {activeCat === 'gasolinera' && (
              <View style={{backgroundColor:COLORS.primaryLight,borderRadius:10,padding:10,marginBottom:10,flexDirection:'row',gap:8}}>
                <Text style={{fontSize:14}}>💡</Text>
                <Text style={{flex:1,fontSize:12,color:COLORS.primary}}>El mapa carga gasolineras según lo que tienes en pantalla. Haz zoom o desplázate para ver más.</Text>
              </View>
            )}
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
            {activeCat==='gasolinera' && (
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

            {/* Product search — solo farmacia en panel de filtros (súper busca por nombre) */}
            {activeCat==='farmacia' && (
              <>
                <Text style={s.filterLabel}>Buscar medicamento</Text>
                <View style={s.productRow}>
                  <TextInput style={s.productInput} value={product} onChangeText={setProduct}
                    placeholder="Ej: ibuprofeno 600mg, paracetamol..."
                    placeholderTextColor={COLORS.text3} returnKeyType="search" onSubmitEditing={loadPlaces}/>
                  {product ? <TouchableOpacity onPress={()=>{setProduct('');loadPlaces();}}><Ionicons name="close-circle" size={18} color={COLORS.text3}/></TouchableOpacity> : null}
                </View>
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
            initialRegion={SPAIN_CENTER}
            showsUserLocation
            showsMyLocationButton
            mapPadding={{ bottom: 64, top: 0, left: 0, right: 0 }}
            onRegionChangeComplete={(region) => setMapRegion(region)}
          >
            {/* Community places — icono según subcategoría activa */}
            {mapPlaces.map(p => {
              // Icono correcto según subcategoría (café, cerveza, restaurante, etc.)
              const catInfoKey = p.category === 'restaurante' && activeCatKey
                ? `restaurante_${activeCatKey === 'cafe' ? 'cafe' : activeCatKey === 'cerveza' ? 'cerveza' : 'menu'}`
                : p.category;
              const info = CATEGORY_INFO[catInfoKey] || CATEGORY_INFO[p.category] || CATEGORY_INFO.default;
              // Precio representativo
              const weeklyCost = p.category === 'supermercado' ? getWeeklyCost(p.name) : null;
              const repP = weeklyCost || p.repPrice || p.minPrice;
              // Color del borde: verde=barato, rojo=caro, amarillo=normal
              let borderColor = info.color;
              if (repP > 0) {
                const AVG_CAT = {
                  cafe: 1.4, cerveza: 2.2, restaurante_menu: 12,
                  restaurante: 12, farmacia: 4, gimnasio: 30, supermercado: AVG_WEEKLY_COST
                };
                const avg = AVG_CAT[activeCatKey] || AVG_CAT[p.category] || null;
                if (avg) {
                  if (repP < avg * 0.85) borderColor = '#16A34A';       // barato → verde
                  else if (repP > avg * 1.20) borderColor = '#DC2626';   // caro → rojo
                  else borderColor = '#D97706';                           // normal → naranja
                }
              }
              // Label precio claro
              let priceLabel = null;
              if (weeklyCost) priceLabel = `${weeklyCost.toFixed(0)}€`;
              else if (repP > 0 && !isNaN(repP)) {
                if (p.category === 'gimnasio') priceLabel = `${repP.toFixed(0)}€/m`;
                else priceLabel = `${repP.toFixed(2)}€`;
              }
              return (
                <Marker key={`p${p.id}`} coordinate={{latitude:p.lat,longitude:p.lng}} onPress={()=>setSelectedPlace(p)}>
                  <View style={[ms.marker,{backgroundColor:info.bg,borderColor,borderWidth:2}]}>
                    <Text style={ms.markerEmoji}>{info.emoji}</Text>
                    {priceLabel && <Text style={ms.markerPrice}>{priceLabel}</Text>}
                  </View>
                </Marker>
              );
            })}
            {/* FIX: Eventos eliminados del mapa — usan coords aproximadas de ciudad, no precisas */}
            {/* Los eventos tienen su propia sección en la barra de navegación */}
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
                      if (d > 3) return null; // only show if <3km
                      const label = d < 1 ? `${Math.round(d*1000)}m` : `${d.toFixed(1)}km`;
                      // Green if <500m, yellow if <1.5km, white otherwise
                      const distColor = d < 0.5 ? '#22C55E' : d < 1.5 ? '#FCD34D' : col.text;
                      return <Text style={{fontSize:8,color:distColor,fontWeight:'700',opacity:0.9}}>{label}</Text>;
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

          {/* Loading bar — initial load + progressive */}
          {gasLoading && (
            <View style={ms.loadBar}>
              <ActivityIndicator size="small" color={COLORS.warning}/>
              <Text style={ms.loadTxt}>
                {nearbyGasLoaded
                  ? `Cargando toda España... ${loadProgress}%`
                  : `Cargando gasolineras cercanas...`}
              </Text>
              {loadProgress > 0 && (
                <View style={{width:60,height:4,backgroundColor:COLORS.border,borderRadius:99,marginLeft:6,overflow:'hidden'}}>
                  <View style={{width:`${loadProgress}%`,height:'100%',backgroundColor:COLORS.warning,borderRadius:99}}/>
                </View>
              )}
            </View>
          )}

          {/* All loaded indicator */}
          {!gasLoading && allGas.length > 0 && gasolineras.length === 0 && !serverError && (
            <View style={ms.loadBar}>
              <Text style={ms.loadTxt}>Sin gasolineras en esta zona — desplázate o amplía el mapa</Text>
            </View>
          )}

          {/* Legend + fuel stats panel */}
          {activeCat==='gasolinera' && gasolineras.length > 0 && (
            <View style={ms.legend}>
              {/* Visible count badge */}
              <View style={{backgroundColor:'rgba(15,23,42,0.7)',borderRadius:8,paddingHorizontal:8,paddingVertical:3,marginRight:4}}>
                <Text style={{fontSize:10,color:'#fff',fontWeight:'700'}}>
                  {showFavsOnly ? `❤️ ${gasolineras.length}` : `⛽ ${gasolineras.length > 999 ? (gasolineras.length/1000).toFixed(1)+'K' : gasolineras.length}`}
                </Text>
              </View>
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
                    <Text style={ms.legendStat}>🟢{st.min?.toFixed(3)}</Text>
                    <Text style={ms.legendStat}>🟡{st.avg?.toFixed(3)}</Text>
                    <Text style={ms.legendStat}>🔴{st.max?.toFixed(3)}</Text>
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
                <Text style={{fontSize:13,fontWeight:'700',color:'#fff'}}>Encuentra los precios más baratos</Text>
                <Text style={{fontSize:12,color:'rgba(255,255,255,0.7)',marginTop:2}}>⛽ Gasolina · ☕ Cafés · 🍺 Cervezas · 🍽️ Menús · 🛒 Súper cerca de ti</Text>
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
              { text:'📍 Supermercado / Farmacia / Otro', onPress:()=>setShowAddPlace(true) },
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
              placeholder={activeCat==='gasolinera' ? 'Buscar gasolinera o marca...' : 'Buscar lugar...'}
              placeholderTextColor={COLORS.text3}
              value={gasSearch}
              onChangeText={setGasSearch}
            />
            {gasSearch ? <TouchableOpacity onPress={()=>setGasSearch('')}><Ionicons name="close-circle" size={16} color={COLORS.text3}/></TouchableOpacity> : null}
            <Text style={{fontSize:11,color:COLORS.text3}}>
              {activeCat === 'gasolinera'
                ? `${visibleGas.length.toLocaleString('es-ES')} est.`
                : (() => {
                    const conPrecio = visiblePlaces.filter(p => p.repPrice > 0).length;
                    const total = visiblePlaces.length;
                    return conPrecio > 0
                      ? `${conPrecio} con precio · ${total} total`
                      : `${total} resultados`;
                  })()
              }
            </Text>
          </View>
          {/* Chips de marcas — solo para gasolinera */}
          {activeCat === 'gasolinera' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{paddingHorizontal:12,paddingVertical:6,gap:6}}>
              {['Repsol','Cepsa','BP','Galp','Shell','Plenoil','Ballenoil','Alcampo','Carrefour','Petronor'].map(marca => (
                <TouchableOpacity key={marca}
                  style={{paddingHorizontal:10,paddingVertical:3,borderRadius:99,borderWidth:1.5,
                    borderColor: gasSearch===marca ? COLORS.primary : COLORS.border,
                    backgroundColor: gasSearch===marca ? COLORS.primaryLight : COLORS.bg}}
                  onPress={()=>setGasSearch(gasSearch===marca ? '' : marca)}>
                  <Text style={{fontSize:12,fontWeight:'600',color:gasSearch===marca ? COLORS.primary : COLORS.text2}}>{marca}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
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
              // FIX: Eventos eliminados de la lista del mapa — tienen su propia sección
              ...gasFiltered.slice(0,150).map(s=>({
                ...s, isGas:true,
                _dist: distanceKm(userLoc?.lat||40.4168, userLoc?.lng||(-3.7038), s.lat, s.lng),
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
                contentContainerStyle={{padding:12,gap:10,paddingBottom:100}}
                renderItem={({item})=>(
                  <ListCard item={item}
                    onPress={()=>{
                      if (item.isEvent) {
                        Alert.alert(
                          `🎭 ${item.title}`,
                          `📍 ${item.city||''}\n📅 ${item.date ? new Date(item.date).toLocaleDateString('es-ES') : ''}\n💶 ${item.price_from ? `Desde ${item.price_from}€` : (item.is_free ? 'Gratis' : '')}`,
                          [
                            item.url ? { text:'Ver evento', onPress:()=>openURL(item.url) } : null,
                            {text:'Cerrar'},
                          ].filter(Boolean)
                        );
                      } else if (item.isGas) {
                        setSelectedStation(item);
                      } else {
                        setSelectedPlace(item);
                      }
                    }}
                    onNav={()=>navigateTo(item.lat,item.lng,item.name||item.title)}
                    activeFuel={activeFuel}
                    catKey={activeCatKey}
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
                      {gasSearch
                        ? 'Prueba con otro nombre o marca'
                        : activeCat==='gasolinera'
                          ? 'Desplázate en el mapa para ver más'
                          : 'Elige una ciudad en el filtro de arriba para ver resultados'}
                    </Text>
                  </View>
                }
              />
            );
          })()}

          {/* FAB en lista — añadir lugar/precio */}
          <TouchableOpacity style={[ms.fab, {position:'absolute', bottom:20, right:16}]} onPress={() => {
            if (!isLoggedIn) { setShowAuth(true); return; }
            Alert.alert('Añadir', '¿Qué quieres añadir?', [
              { text:'⛽ Gasolinera no registrada', onPress:()=>setShowAddGas(true) },
              { text:'📍 Supermercado / Farmacia / Otro', onPress:()=>setShowAddPlace(true) },
              { text:'Cancelar', style:'cancel' },
            ]);
          }}>
            <Ionicons name="add" size={28} color="#fff"/>
          </TouchableOpacity>
        </View>
      )}

      {/* Modals */}
      <Modal visible={!!selectedPlace} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setSelectedPlace(null)}>
        {selectedPlace && <PlaceModal place={selectedPlace} catKey={activeCatKey} onClose={()=>setSelectedPlace(null)} onNavigate={navigateTo} isLoggedIn={isLoggedIn} onAuthNeeded={()=>setShowAuth(true)} onProposePrice={(p, product)=>{setSelectedPlace(null); setPriceChangePlace({place:p, product});}}/>}
      </Modal>
      <PriceChangeModal visible={!!priceChangePlace} onClose={()=>setPriceChangePlace(null)} place={priceChangePlace?.place} initialProduct={priceChangePlace?.product}/>
      <Modal visible={!!selectedStation} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setSelectedStation(null)}>
        {selectedStation && <GasModal station={selectedStation} onClose={()=>setSelectedStation(null)} onNavigate={navigateTo} onFavChange={loadFavs}/>}
      </Modal>
      <AddGasStationModal visible={showAddGas} onClose={()=>setShowAddGas(false)} userLoc={userLoc}
        onSuccess={()=>{ setShowAddGas(false); loadPlaces(); loadAllGasolineras(); Alert.alert('✅ Añadida','Gracias. La comunidad la verificará con sus votos.'); }}/>
      <AddPlaceModal visible={showAddPlace} onClose={()=>setShowAddPlace(false)} userLoc={userLoc}
        onSuccess={()=>{ setShowAddPlace(false); loadPlaces(); Alert.alert('✅ Lugar añadido','¡Gracias! Ya aparece en el mapa para que la comunidad reporte precios.'); }}/>
      <AuthModal visible={showAuth} onClose={()=>setShowAuth(false)}/>
    </SafeAreaView>
  );
}

// === LIST CARD ===
function ListCard({ item, onPress, onNav, activeFuel, catKey, isFav }) {
  // Events get special treatment
  if (item.isEvent) {
    const dist = item._dist != null && item._dist < 999 ? (item._dist < 1 ? `${Math.round(item._dist*1000)}m` : `${item._dist.toFixed(1)}km`) : null;
    return (
      <TouchableOpacity style={lcs.card} onPress={onPress} activeOpacity={0.75}>
        <View style={[lcs.icon, {backgroundColor:'#EDE9FE'}]}>
          <Text style={{fontSize:22}}>🎭</Text>
        </View>
        <View style={lcs.info}>
          <Text style={lcs.name} numberOfLines={1}>{item.title||'Evento'}</Text>
          <View style={{flexDirection:'row',alignItems:'center',gap:4,marginTop:1}}>
            <View style={{backgroundColor:'#EDE9FE',borderRadius:4,paddingHorizontal:5,paddingVertical:1}}>
              <Text style={{fontSize:10,fontWeight:'700',color:'#7C3AED'}}>🎭 Evento</Text>
            </View>
            {item.city && <Text style={lcs.sub}>📍 {item.city}</Text>}
            {item.date && <Text style={lcs.sub}>📅 {new Date(item.date).toLocaleDateString('es-ES',{day:'2-digit',month:'short'})}</Text>}
          </View>
          {item.price_from != null && (
            <View style={[lcs.pricePill,{backgroundColor:'#F5F3FF'}]}>
              <Text style={[lcs.pricePillTxt,{color:'#7C3AED'}]}>{item.is_free ? '🆓 Gratis' : `desde ${item.price_from}€`}</Text>
            </View>
          )}
        </View>
        <View style={lcs.right}>
          {dist && <Text style={lcs.dist}>📍 {dist}</Text>}
          <TouchableOpacity style={lcs.navBtn} onPress={onNav}>
            <Text style={lcs.navTxt}>Ir</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  // Para restaurantes: usar icono y label según subcategoría activa (café, cerveza, menú)
  const catInfoKey = item.category === 'restaurante' && catKey
    ? `restaurante_${catKey === 'cafe' ? 'cafe' : catKey === 'cerveza' ? 'cerveza' : 'menu'}`
    : item.category;
  const info = item.isGas
    ? {emoji:'⛽', bg:'#FEF3C7', label:'Gasolinera', color:'#F59E0B'}
    : (CATEGORY_INFO[catInfoKey] || CATEGORY_INFO[item.category] || CATEGORY_INFO.default);
  const fuelLabel = activeFuel && activeFuel !== 'all' ? FUEL_LABELS[activeFuel] : 'G95';
  const col = item.isGas && item.minPrice ? gasPriceColor(item.minPrice) : null;
  const dist = !item._dist || item._dist===999 ? null : item._dist<1 ? `${Math.round(item._dist*1000)}m` : `${item._dist.toFixed(1)}km`;

  // Price label — específico por subcategoría para restaurantes
  function priceLabel() {
    if (item.category === 'supermercado') {
      const wc = getWeeklyCost(item.name);
      const price = wc || item.repPrice;
      if (!price) return null;
      const diff = ((price - AVG_WEEKLY_COST) / AVG_WEEKLY_COST * 100).toFixed(0);
      const tag = price < AVG_WEEKLY_COST * 0.92 ? '🟢' : price > AVG_WEEKLY_COST * 1.08 ? '🔴' : '🟡';
      return `${tag} ~${price.toFixed(0)}€/sem · ${Number(diff)>0?'+':''}${diff}%`;
    }
    const p = item.repPrice || item.minPrice;
    if (!p || isNaN(p)) return null;
    if (item.isGas) {
      // Etiqueta corta: "G95 1.539€" — sin "Gasolina" para ahorrar espacio
      const shortLabel = {g95:'G95',g98:'G98',diesel:'Diésel',diesel_plus:'Diésel+',glp:'GLP',gnc:'GNC'}[activeFuel] || 'G95';
      return `${shortLabel} ${p.toFixed(3)}€/L`;
    }
    if (item.category === 'restaurante') {
      // Mostrar qué producto es el precio según subcategoría
      const labels = { cafe:'☕ Café', cerveza:'🍺 Caña', restaurante_menu:'🍽️ Menú' };
      const productLabel = labels[catKey] || '🍽️';
      return `${productLabel} ${p.toFixed(2)}€`;
    }
    if (item.category === 'farmacia')  return `💊 ~${p.toFixed(2)}€`;
    if (item.category === 'gimnasio')  return `💪 desde ${p.toFixed(0)}€/mes`;
    return `~${p.toFixed(2)}€`;
  }
  const pLabel = priceLabel();

  // Color del precio para restaurantes (verde=barato, rojo=caro)
  function priceColor() {
    if (item.isGas) return col;
    if (item.category === 'restaurante') {
      const p = item.repPrice;
      if (!p) return null;
      const AVG = { cafe:1.4, cerveza:2.2, restaurante_menu:12 };
      const avg = AVG[catKey] || 12;
      if (p < avg * 0.85) return { bg: '#DCFCE7', text: '#15803D' }; // barato
      if (p > avg * 1.20) return { bg: '#FEE2E2', text: '#DC2626' }; // caro
      return { bg: '#FEF9C3', text: '#92400E' }; // normal
    }
    return null;
  }
  const pColor = priceColor();

  return (
    <TouchableOpacity style={lcs.card} onPress={onPress} activeOpacity={0.75}>
      <View style={[lcs.icon,{backgroundColor:info.bg}]}>
        <Text style={{fontSize:22}}>{info.emoji}</Text>
        {isFav && <View style={{position:'absolute',top:-4,right:-4}}><Text style={{fontSize:12}}>❤️</Text></View>}
      </View>
      <View style={lcs.info}>
        <Text style={lcs.name} numberOfLines={1}>{
          // Gasolineras vienen en MAYÚSCULAS del Ministerio — capitalizar para legibilidad
          item.isGas && item.name && item.name === item.name.toUpperCase()
            ? item.name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
            : item.name || item.address
        }</Text>
        <View style={{flexDirection:'row',alignItems:'center',gap:4,marginTop:1}}>
          <View style={{backgroundColor:info.bg||COLORS.bg3,borderRadius:4,paddingHorizontal:5,paddingVertical:1}}>
            <Text style={{fontSize:10,fontWeight:'700',color:info.text||COLORS.text2}}>{info.emoji} {info.label}</Text>
          </View>
          {item.city && <Text style={lcs.sub} numberOfLines={1}>📍 {item.city}</Text>}
        </View>
        {item.bestFor ? <Text style={lcs.bestFor}>{item.bestFor}</Text> : null}
        {pLabel && (
          <View style={[lcs.pricePill,{
            backgroundColor: pColor ? pColor.bg
              : col ? col.bg  // gasolina: fondo sólido con color verde/rojo/naranja
              : COLORS.warningLight
          }]}>
            <Text style={[lcs.pricePillTxt,{
              color: pColor ? pColor.text
                : col ? col.text
                : COLORS.warning
            }]}>{pLabel}</Text>
          </View>
        )}
      </View>
      <View style={lcs.right}>
        {dist && <Text style={lcs.dist}>📍 {dist}</Text>}
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
        // Remove from server too
        apiDelete(`/api/users/me/favorites/${station.id}`).catch(() => {});
      } else {
        const newFav = { id: station.id, name: station.name, city: station.city, lat: station.lat, lng: station.lng };
        favs.push(newFav);
        if (favs.length > 20) favs = favs.slice(-20); // keep last 20
        // Save to server for persistence across devices
        apiPost('/api/users/me/favorites', {
          station_id: String(station.id), station_name: station.name,
          station_city: station.city, lat: station.lat, lng: station.lng,
        }).catch(() => {});
      }
      await AsyncStorage.setItem(FAV_KEY, JSON.stringify(favs));
      setIsFav(!isFav);
      onFavChange?.(); // reload favStations in parent MapScreen
    } catch(_) {}
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
          <Text style={gcs.title} numberOfLines={2}>{
            station.name && station.name === station.name.toUpperCase()
              ? station.name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
              : station.name||'Gasolinera'
          }</Text>
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
        <Text style={gcs.sectionTitle}>Todos los carburantes</Text>
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
          onPress={async ()=>{
            const msg = `⛽ ${station.name}\nG95: ${station.prices?.g95?.toFixed(3)||'N/D'}€ | Diesel: ${station.prices?.diesel?.toFixed(3)||'N/D'}€\nVía PreciMap 🗺️`;
            try {
              if (typeof navigator !== 'undefined' && navigator.share) {
                await navigator.share({ title: station.name, text: msg });
              } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
                await navigator.clipboard.writeText(msg);
              } else {
                Share.share({ message: msg }).catch(()=>{});
              }
            } catch(_) {}
          }}>
          <Ionicons name="share-outline" size={18} color={COLORS.text2}/>
          <Text style={[gcs.navBtnTxt,{color:COLORS.text2}]}>Compartir precio</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// === PLACE MODAL (bars, supermarkets, etc.) ===
function PlaceModal({ place, catKey, onClose, onNavigate, isLoggedIn, onAuthNeeded, onProposePrice }) {
  const catInfoKey = place.category === 'restaurante' && catKey
    ? `restaurante_${catKey === 'cafe' ? 'cafe' : catKey === 'cerveza' ? 'cerveza' : 'menu'}`
    : place.category;
  const info = CATEGORY_INFO[catInfoKey] || CATEGORY_INFO[place.category] || CATEGORY_INFO.default;
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
          <TouchableOpacity style={pcs.actionBtn} onPress={() => place && onProposePrice(place)}>
            <Ionicons name="pricetag-outline" size={18} color={COLORS.primary}/>
            <Text style={pcs.actionTxt}>💰 Ver precios y cambios</Text>
          </TouchableOpacity>
          <TouchableOpacity style={pcs.actionBtnNav} onPress={()=>{onClose();onNavigate(place.lat,place.lng,place.name);}}>
            <Ionicons name="navigate" size={18} color="#fff"/>
            <Text style={pcs.actionTxtNav}>Cómo llegar</Text>
          </TouchableOpacity>
        </View>

        {/* Representative price banner */}
        {place.repPrice != null && prices.length > 0 && (() => {
          const cat = place.category;
          // Label específico por subcategoría de restaurante
          const restLabel = { cafe:'precio café', cerveza:'precio caña', restaurante_menu:'precio menú del día' };
          const label = cat==='restaurante' ? (restLabel[catKey] || 'precio medio plato')
            : cat==='farmacia' ? 'precio medio medicamento'
            : cat==='supermercado' ? 'cesta semanal estimada'
            : cat==='gimnasio' ? 'cuota mensual desde'
            : 'precio medio';
          const detail = place.repContext ||
            (cat==='restaurante'
            ? `Media de ${prices.filter(p=>p.price>=3).length || prices.length} platos · media España ~12€`
            : cat==='farmacia'
            ? `Media de ${prices.filter(p=>p.price>=1).length || prices.length} medicamentos · media España ~4-8€`
            : cat==='supermercado'
            ? `Estimado sobre ${prices.length} productos reportados · media España ~100€/semana`
            : cat==='gimnasio'
            ? `${prices.length} tarifas reportadas · media España ~25-40€/mes`
            : `${prices.length} productos reportados por la comunidad`);
          // Color refs per category
          // Referencia de precio por subcategoría
          const REST_REF = { cafe:1.4, cerveza:2.2, restaurante_menu:12 };
          const REF = {restaurante: REST_REF[catKey] || 12, farmacia:5, supermercado:100, gimnasio:30};
          const ref = REF[cat];
          const priceColor = !ref ? COLORS.primary
            : place.repPrice < ref*0.85 ? '#16A34A'
            : place.repPrice > ref*1.15 ? '#DC2626'
            : '#D97706';
          const priceTag = !ref ? null
            : place.repPrice < ref*0.85 ? '🟢 Barato'
            : place.repPrice > ref*1.15 ? '🔴 Caro'
            : '🟡 Precio medio';
          return (
            <View style={{backgroundColor:priceColor+'15',borderRadius:12,padding:12,marginBottom:14,flexDirection:'row',alignItems:'center',gap:10,borderWidth:1,borderColor:priceColor+'44'}}>
              <Text style={{fontSize:28}}>💰</Text>
              <View style={{flex:1}}>
                <View style={{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                  <Text style={{fontSize:20,fontWeight:'800',color:priceColor}}>{(place.repPrice||0).toFixed(2)}€</Text>
                  <Text style={{fontSize:12,fontWeight:'600',color:COLORS.text2}}>{label}</Text>
                  {priceTag && <View style={{backgroundColor:priceColor+'22',borderRadius:99,paddingHorizontal:8,paddingVertical:2,borderWidth:1,borderColor:priceColor+'44'}}>
                    <Text style={{fontSize:10,fontWeight:'700',color:priceColor}}>{priceTag}</Text>
                  </View>}
                </View>
                <Text style={{fontSize:11,color:COLORS.text3,marginTop:2}}>{detail}</Text>
              </View>
            </View>
          );
        })()}
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
                    <Text style={{fontSize:10,color:COLORS.text3,marginTop:1}}>min {(min||0).toFixed(2)}€ · max {(max||0).toFixed(2)}€ · {pts.length} reportes</Text>
                  </View>
                  <View style={{alignItems:'flex-end'}}>
                    <Text style={{fontSize:16,fontWeight:'800',color:COLORS.text}}>{(last||0).toFixed(2)}€</Text>
                    <Text style={{fontSize:11,fontWeight:'700',color: Math.abs(diff)<0.01 ? COLORS.text3 : diff>0 ? COLORS.danger : COLORS.success}}>
                      {Math.abs(diff)<0.01 ? '—' : diff>0 ? `↑${(diff||0).toFixed(2)}€` : `↓${Math.abs(diff||0).toFixed(2)}€`}
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
            <TouchableOpacity key={p.id} style={pcs.priceRow} onPress={() => onProposePrice(place, p.product)} activeOpacity={0.7}>
              <View style={{flex:1}}>
                <Text style={pcs.product}>{p.product}</Text>
                <Text style={pcs.reporter}>Por {p.users?.name || p.reporter_name || 'la comunidad'} · {timeAgo(p.reported_at)}</Text>
                <View style={[pcs.statusBadge,{backgroundColor:p.status==='verified'?COLORS.successLight:COLORS.warningLight}]}>
                  <Text style={[pcs.statusTxt,{color:p.status==='verified'?COLORS.success:COLORS.warning}]}>{p.status==='verified'?'✅ Verificado':'⏳ Pendiente · toca para proponer cambio'}</Text>
                </View>
              </View>
              <View style={{alignItems:'flex-end',gap:4}}>
                <Text style={pcs.price}>{p.price?.toFixed(2)}€<Text style={pcs.unit}>/{p.unit}</Text></Text>
                <Ionicons name="chevron-forward" size={12} color={COLORS.text3}/>
              </View>
            </TouchableOpacity>
          ))
        }
        <TouchableOpacity style={pcs.addPriceBtn} onPress={() => onProposePrice(place, null)}>
          <Ionicons name="add-circle-outline" size={18} color={COLORS.primary}/>
          <Text style={{fontSize:13,color:COLORS.primary,fontWeight:'700'}}>Añadir nuevo precio</Text>
        </TouchableOpacity>
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
  addPriceBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,margin:12,padding:12,backgroundColor:COLORS.primaryLight,borderRadius:12,borderWidth:1,borderColor:COLORS.primary+'44'},
  fuelActiveBadge:{flexDirection:'row',alignItems:'center',borderRadius:99,borderWidth:1.5,paddingHorizontal:10,paddingVertical:5},
  fuelActiveTxt:{fontSize:12,fontWeight:'700'},
});

// ─── ADD PLACE MODAL ──────────────────────────────────────────────────────────
function AddPlaceModal({ visible, onClose, userLoc, onSuccess }) {
  const [name, setName]   = useState('');
  const [cat, setCat]     = useState('supermercado');
  const [address, setAddr] = useState('');
  const [city, setCity]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const CATS = [
    {key:'supermercado', label:'🛒 Supermercado'},
    {key:'gimnasio',     label:'💪 Gimnasio'},
    {key:'farmacia',     label:'💊 Farmacia'},
    {key:'gasolinera',   label:'⛽ Gasolinera'},
    {key:'restaurante',  label:'🍽️ Bar / Restaurante / Café'},
    {key:'otro',         label:'📍 Otro'},
  ];

  function reset() { setName(''); setCat('supermercado'); setAddr(''); setCity(''); setError(''); }

  async function submit() {
    if (!name.trim()) return setError('El nombre es obligatorio');
    setLoading(true);
    try {
      const lat = userLoc?.lat || 40.416775;
      const lng = userLoc?.lng || -3.703790;
      await apiPost('/api/places', { name: name.trim(), category: cat, lat, lng, address: address.trim(), city: city.trim() });
      reset();
      onSuccess?.();
    } catch(e) { setError(e.message || 'Error al añadir'); }
    finally { setLoading(false); }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'flex-end'}}>
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'}>
          <View style={{backgroundColor:COLORS.bg2,borderTopLeftRadius:20,borderTopRightRadius:20,padding:20,gap:12}}>
            <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
              <Text style={{fontSize:18,fontWeight:'700',color:COLORS.text}}>📍 Añadir lugar</Text>
              <TouchableOpacity onPress={()=>{reset();onClose();}}>
                <Ionicons name="close" size={22} color={COLORS.text2}/>
              </TouchableOpacity>
            </View>
            {error ? <Text style={{color:COLORS.danger,fontSize:13}}>{error}</Text> : null}
            <TextInput style={{backgroundColor:COLORS.bg3,borderRadius:12,padding:12,fontSize:15,color:COLORS.text,borderWidth:1.5,borderColor:COLORS.border}}
              value={name} onChangeText={setName} placeholder="Nombre del lugar *" placeholderTextColor={COLORS.text3}/>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginVertical:4}}>
              <View style={{flexDirection:'row',gap:8}}>
                {CATS.map(c => (
                  <TouchableOpacity key={c.key}
                    style={{paddingHorizontal:12,paddingVertical:8,borderRadius:99,borderWidth:1.5,borderColor:cat===c.key?COLORS.primary:COLORS.border,backgroundColor:cat===c.key?COLORS.primaryLight:COLORS.bg3}}
                    onPress={()=>setCat(c.key)}>
                    <Text style={{fontSize:13,fontWeight:'700',color:cat===c.key?COLORS.primary:COLORS.text2}}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TextInput style={{backgroundColor:COLORS.bg3,borderRadius:12,padding:12,fontSize:14,color:COLORS.text,borderWidth:1.5,borderColor:COLORS.border}}
              value={address} onChangeText={setAddr} placeholder="Dirección (opcional)" placeholderTextColor={COLORS.text3}/>
            <TextInput style={{backgroundColor:COLORS.bg3,borderRadius:12,padding:12,fontSize:14,color:COLORS.text,borderWidth:1.5,borderColor:COLORS.border}}
              value={city} onChangeText={setCity} placeholder="Ciudad (opcional)" placeholderTextColor={COLORS.text3}/>
            <Text style={{fontSize:11,color:COLORS.text3}}>📍 Se guardará con tu ubicación actual. Añade la dirección exacta para que sea más fácil encontrarlo.</Text>
            <TouchableOpacity
              style={{backgroundColor:COLORS.primary,borderRadius:12,padding:14,alignItems:'center',opacity:loading?0.7:1}}
              onPress={submit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff"/> : <Text style={{color:'#fff',fontWeight:'700',fontSize:16}}>Añadir al mapa</Text>}
            </TouchableOpacity>
            <View style={{height:20}}/>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
