import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal,
  FlatList, ActivityIndicator, Linking, Platform, Alert, TextInput, Animated, Share, KeyboardAvoidingView, Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker } from 'react-native-maps';
const getLocation = () => require('expo-location');
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  COLORS, CATEGORY_INFO, FUEL_LABELS, gasPriceColor,
  stationMinPrice, apiGet, apiPost, apiDelete, distanceKm, timeAgo, openURL, fmtP,
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

const WEEKLY_COST_BY_CHAIN = {
  'aldi':72.50,'Aldi':72.50,'lidl':76.80,'Lidl':76.80,'alcampo':82.40,'Alcampo':82.40,
  'dia':83.90,'Dia':83.90,'Día':83.90,'mercadona':88.50,'Mercadona':88.50,
  'carrefour':95.20,'Carrefour':95.20,'consum':96.80,'Consum':96.80,
  'eroski':97.50,'Eroski':97.50,'coviran':85.00,'Coviran':85.00,
  'spar':86.50,'Spar':86.50,'ahorramas':92.00,'Ahorramas':92.00,
  'condis':93.50,'Condis':93.50,'bonpreu':96.00,'Bonpreu':96.00,
  'gadis':94.80,'Gadis':94.80,'hiperdino':91.00,'Hiperdino':91.00,
  'supercor':102.00,'Supercor':102.00,'el corte':110.00,'El Corte Inglés':110.00,
};
const AVG_WEEKLY_COST = 88.50;

const CITY_COORDS = {
  'Madrid':{lat:40.4168,lng:-3.7038},'Barcelona':{lat:41.3851,lng:2.1734},
  'Sevilla':{lat:37.3886,lng:-5.9823},'Valencia':{lat:39.4699,lng:-0.3763},
  'Bilbao':{lat:43.2630,lng:-2.9350},'Málaga':{lat:36.7213,lng:-4.4213},
  'Zaragoza':{lat:41.6488,lng:-0.8891},'Murcia':{lat:37.9838,lng:-1.1332},
  'Palma':{lat:39.5696,lng:2.6502},'Granada':{lat:37.1773,lng:-3.5986},
  'Córdoba':{lat:37.8882,lng:-4.7794},'Alicante':{lat:38.3452,lng:-0.4810},
  'Valladolid':{lat:41.6523,lng:-4.7245},'Vigo':{lat:42.2314,lng:-8.7124},
  'Gijón':{lat:43.5453,lng:-5.6615},'Pamplona':{lat:42.8125,lng:-1.6458},
  'Jerez de la Frontera':{lat:36.6869,lng:-6.1372},
  'Salamanca':{lat:40.9701,lng:-5.6635},'Toledo':{lat:39.8628,lng:-4.0273},
  'San Sebastián':{lat:43.3183,lng:-1.9812},'Santander':{lat:43.4623,lng:-3.8099},
  'Almería':{lat:36.8340,lng:-2.4637},'Huelva':{lat:37.2614,lng:-6.9447},
  'Badajoz':{lat:38.8794,lng:-6.9706},'Cáceres':{lat:39.4752,lng:-6.3724},
  'Logroño':{lat:42.4627,lng:-2.4449},'Burgos':{lat:42.3440,lng:-3.6970},
  'León':{lat:42.5987,lng:-5.5671},'Oviedo':{lat:43.3614,lng:-5.8593},
  'Villafranca de Córdoba':{lat:37.9641,lng:-4.5301},
};

function getWeeklyCost(placeName) {
  if (!placeName) return null;
  const n = placeName.toLowerCase();
  for (const [chain, cost] of Object.entries(WEEKLY_COST_BY_CHAIN)) {
    if (n.includes(chain.toLowerCase())) return cost;
  }
  return null;
}

const CATS = [
  { key:'gasolinera',   label:'Gasolina',    emoji:'⛽', icon:'speedometer-outline', group:'gasolina' },
  { key:'restaurante',  label:'Cafés',       emoji:'☕', icon:'cafe-outline',        product:'Café con leche',  key2:'cafe',   group:'restaurantes' },
  { key:'restaurante',  label:'Cervezas',    emoji:'🍺', icon:'beer-outline',        product:'Caña de cerveza', key2:'cerveza', group:'restaurantes' },
  { key:'restaurante',  label:'Restaurantes',emoji:'🍽️', icon:'restaurant-outline',  product:'Menú del día',    key2:'restaurante_menu', group:'restaurantes' },
  { key:'supermercado', label:'Súper',       emoji:'🛒', icon:'cart-outline',         group:'servicios' },
  { key:'farmacia',     label:'Farmacia',    emoji:'💊', icon:'medkit-outline',       group:'servicios' },
  { key:'gimnasio',     label:'Gimnasios',   emoji:'💪', icon:'barbell-outline',      group:'servicios' },
  { key:'peluqueria',   label:'Peluquerías', emoji:'💇', icon:'cut-outline',          group:'servicios' },
  { key:'peluqueria_canina', label:'Peluq. Canina', emoji:'🐕', icon:'paw-outline',  group:'servicios' },
  { key:'veterinario',  label:'Veterinarios',emoji:'🏥', icon:'medical-outline',      group:'servicios' },
  { key:'carniceria',   label:'Carnicerías', emoji:'🥩', icon:'flame-outline',         group:'servicios' },
  { key:'fruteria',     label:'Fruterías',   emoji:'🍎', icon:'leaf-outline',           group:'servicios' },
  { key:'panaderia',    label:'Panaderías',  emoji:'🥖', icon:'nutrition-outline',      group:'servicios' },
  { key:'pescaderia',   label:'Pescaderías', emoji:'🐟', icon:'fish-outline',           group:'servicios' },
  { key:'estanco',      label:'Estancos',    emoji:'🚬', icon:'cube-outline',           group:'servicios' },
  { key:'ferreteria',   label:'Ferreterías', emoji:'🔧', icon:'hammer-outline',         group:'servicios' },
  { key:'lavanderia',   label:'Lavanderías', emoji:'👕', icon:'water-outline',          group:'servicios' },
];

const FILTER_GROUPS = [
  { key:'gasolina',     label:'Gasolina',     icon:'speedometer-outline', desc:'Estaciones de servicio', color:'#3B82F6' },
  { key:'restaurantes', label:'Restaurantes', icon:'restaurant-outline', desc:'Cafés, bares y restaurantes', color:'#DC2626' },
  { key:'servicios',    label:'Servicios',    icon:'storefront-outline', desc:'Farmacias, gimnasios, peluquerías...', color:'#7C3AED' },
];

const SORT_OPTS = [
  { key:'proximity',       label:'Más cercano', icon:'location' },
  { key:'price',           label:'Más barato', icon:'wallet' },
  { key:'price_proximity', label:'Precio + cercanía', icon:'flash' },
];

const RADII = [5, 10, 25, 50, 100, 999];
const SPAIN_CENTER = { latitude:40.4168, longitude:-3.7038, latitudeDelta:6.0, longitudeDelta:6.0 };

function SuperLogo({ uri, fallbackEmoji }) {
  const [failed, setFailed] = React.useState(false);
  if (failed) return <Text style={{fontSize:22}}>{fallbackEmoji}</Text>;
  return <Image source={{uri}} style={{width:44,height:44,resizeMode:'contain'}} onError={() => setFailed(true)}/>;
}

export default function MapScreen() {
  const { isLoggedIn } = useAuth();
  const [places, setPlaces] = useState([]);
  const [gasolineras, setGasolineras] = useState([]);
  const [activeCat, setActiveCat] = useState('gasolinera');
  const [activeCatKey, setActiveCatKey] = useState('gasolinera');
  const [userLoc, setUserLoc] = useState(null);
  const [viewMode, setViewMode] = useState('map');
  const [sort, setSort] = useState('price');
  const [radius, setRadius] = useState(25);
  const [product, setProduct] = useState('');
  const [gasSearch, setGasSearch] = useState('');
  const [city, setCity] = useState('');
  const [activeFuel, setActiveFuel] = useState('g95');
  const [loading, setLoading] = useState(false);
  const [gasLoading, setGasLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [serverError, setServerError] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showAddGas, setShowAddGas] = useState(false);
  const [priceChangePlace, setPriceChangePlace] = useState(null);
  const [mapRegion, setMapRegion] = useState(null);
  const [allGas, setAllGas] = useState([]);
  const [nearbyGasLoaded, setNearbyGasLoaded] = useState(false);
  const [serverFuelStats, setServerFuelStats] = useState(null);
  const [favStations, setFavStations] = useState([]);
  const [showFavsOnly, setShowFavsOnly] = useState(false);
  const [cityStats, setCityStats] = useState(null);
  const [recentPrices, setRecentPrices] = useState([]);
  const [priceRange, setPriceRange] = useState(null);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeGroup, setActiveGroup] = useState('gasolina');
  // NEW: Initial filter picker — shown on first launch EVERY time
  const [showInitialPicker, setShowInitialPicker] = useState(true);
  const [initialPickerStep, setInitialPickerStep] = useState(0); // 0=group, 1=subfilter
  const mapRef = useRef(null);

  useEffect(() => {
    AsyncStorage.getItem('location_permission_asked').then(asked => {
      if (asked) {
        initLocation(); loadFuelStats(); loadFavs(); loadEvents();
      } else {
        setShowLocationPrompt(true);
        loadFuelStats(); loadFavs(); loadEvents();
      }
    }).catch(() => { initLocation(); loadFuelStats(); loadFavs(); loadEvents(); });
  }, []);

  useEffect(() => { loadFavs(); }, [isLoggedIn]);

  async function loadFavs() {
    try {
      if (isLoggedIn) {
        const serverFavs = await apiGet('/api/users/me/favorites').catch(() => null);
        if (serverFavs && Array.isArray(serverFavs)) {
          setFavStations(serverFavs.map(f => ({ id: f.station_id, name: f.station_name, city: f.station_city, lat: f.lat, lng: f.lng })));
          await AsyncStorage.setItem('fav_stations', JSON.stringify(serverFavs.map(f => ({ id: f.station_id, name: f.station_name, city: f.station_city, lat: f.lat, lng: f.lng }))));
          return;
        }
      }
      const raw = await AsyncStorage.getItem('fav_stations');
      setFavStations(raw ? JSON.parse(raw) : []);
    } catch(_) {}
  }

  useEffect(() => { loadPlaces(); }, [activeCat, sort, radius, product, city, userLoc]);

  useEffect(() => {
    apiGet('/api/prices/recent?limit=8')
      .then(d => setRecentPrices(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!city) { setCityStats(null); return; }
    apiGet(`/api/places/stats?city=${encodeURIComponent(city)}`)
      .then(d => setCityStats(d))
      .catch(() => setCityStats(null));
  }, [city]);

  async function loadFuelStats() {
    try {
      const data = await apiGet('/api/gasolineras/stats');
      if (data?.stats) setServerFuelStats(data.stats);
    } catch(_) { setServerError(true); }
  }

  async function loadAllGasolineras(userCoords) {
    setGasLoading(true); setLoadProgress(5);
    const prog = setInterval(() => setLoadProgress(p => {
      if (p < 30) return p + 8; if (p < 60) return p + 4; if (p < 85) return p + 1; return p;
    }), 500);
    try {
      if (userCoords) {
        const { lat, lng } = userCoords;
        const nearbyData = await apiGet(`/api/gasolineras?lat=${lat}&lng=${lng}&radius=30`) || [];
        if (nearbyData.length > 0) { setAllGas(nearbyData); setNearbyGasLoaded(true); setLoadProgress(40); }
      }
      const data = await apiGet('/api/gasolineras') || [];
      clearInterval(prog); setLoadProgress(100);
      setAllGas(data); setNearbyGasLoaded(false); setServerError(false);
    } catch(_) { clearInterval(prog); setServerError(true); }
    finally { setGasLoading(false); }
  }

  async function loadEvents() {
    try {
      const data = await apiGet('/api/events?limit=50&upcoming=1') || [];
      // Events have their own tab, no map markers needed
    } catch(_) {}
  }

  async function initLocation() {
    try {
      const Location = getLocation();
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!loc?.coords?.latitude || !loc?.coords?.longitude) { loadAllGasolineras(null); return; }
        const { latitude: lat, longitude: lng } = loc.coords;
        setUserLoc({ lat, lng });
        mapRef.current?.animateToRegion({ latitude:lat, longitude:lng, latitudeDelta:0.06, longitudeDelta:0.06 }, 1000);
        try {
          if (activeCat !== 'gasolinera') {
            const geo = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
            const detectedCity = geo?.[0]?.city || geo?.[0]?.subregion || '';
            if (detectedCity && !city) setCity(detectedCity);
          }
        } catch(_) {}
        loadAllGasolineras({ lat, lng });
      } else { loadAllGasolineras(null); }
    } catch(_) { loadAllGasolineras(null); }
  }

  async function loadPlaces() {
    if (activeCat === 'gasolinera') return;
    setLoading(true);
    try {
      const lat = userLoc?.lat || 40.4168;
      const lng = userLoc?.lng || -3.7038;
      const effectiveSort = !city && !userLoc ? 'price' : !city && userLoc ? 'price_proximity' : sort;
      let url = `/api/places?sort=${effectiveSort}&lat=${lat}&lng=${lng}&cat=${activeCat}`;
      if (city) url += `&city=${encodeURIComponent(city)}`;
      else if (userLoc) url += `&radius=${radius < 100 ? radius : 25}`;
      if (product) url += `&product=${encodeURIComponent(product)}`;
      setPlaces(await apiGet(url) || []);
      setServerError(false);
    } catch(_) { setServerError(true); } finally { setLoading(false); }
  }

  // Filter allGas client-side
  useEffect(() => {
    let filtered = allGas;
    if (city) {
      const nc = city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      filtered = filtered.filter(s => {
        const sc = (s.city||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
        return sc === nc || sc.startsWith(nc + ' ') || nc.startsWith(sc + ' ');
      });
    } else if (mapRegion && radius < 999) {
      const { latitude: cLat, longitude: cLng, latitudeDelta, longitudeDelta } = mapRegion;
      const latPad = latitudeDelta * 0.6, lngPad = longitudeDelta * 0.6;
      filtered = filtered.filter(s => s.lat >= cLat - latPad && s.lat <= cLat + latPad && s.lng >= cLng - lngPad && s.lng <= cLng + lngPad);
    }
    if (activeFuel !== 'all') filtered = filtered.filter(s => s.prices?.[activeFuel] > 0);
    setGasolineras(filtered);
  }, [allGas, city, mapRegion, activeFuel, radius]);

  const visiblePlaces = (() => {
    const base = activeCat === 'gasolinera' ? [] : places.filter(p => {
      // Filter restaurants by subtype: only show places with the relevant price
      if (activeCat === 'restaurante' && activeCatKey === 'cafe') return p.price_cafe > 0;
      if (activeCat === 'restaurante' && activeCatKey === 'cerveza') return p.price_cerveza > 0;
      if (activeCat === 'restaurante' && activeCatKey === 'restaurante_menu') return p.price_menu > 0;
      return true;
    });
    if (!priceRange || !['restaurante','farmacia'].includes(activeCat)) return base;
    const RANGES = {
      restaurante: [{min:0,max:10},{min:10,max:15},{min:15,max:25},{min:25,max:Infinity}],
      farmacia:    [{min:0,max:3}, {min:3,max:8},  {min:8,max:20}, {min:20,max:Infinity}],
    };
    const range = RANGES[activeCat]?.[priceRange-1];
    if (!range) return base;
    return base.filter(p => { const price = p.repPrice; if (!price || price <= 0) return false; return price >= range.min && price < range.max; });
  })();

  const favIds = new Set(favStations.map(f => String(f.id)));
  const visibleGas = activeCat === 'gasolinera' ? gasolineras
    .filter(s => activeFuel === 'all' || (s.prices?.[activeFuel] > 0))
    .filter(s => !showFavsOnly || favIds.has(String(s.id)))
    .map(s => {
      const fuelKey = activeFuel !== 'all' ? activeFuel : s.prices?.g95 ? 'g95' : s.prices?.diesel ? 'diesel' : null;
      return { ...s, _mainFuel: fuelKey, minPrice: fuelKey ? s.prices[fuelKey] : null };
    }) : [];

  const MAX_MAP_MARKERS = 150;
  const mapGas = visibleGas.slice(0, MAX_MAP_MARKERS);
  const mapPlaces = visiblePlaces.slice(0, 50);

  const fuelStats = React.useMemo(() => {
    if (serverFuelStats) return serverFuelStats;
    if (!allGas.length) return {};
    const stats = {};
    FUELS.filter(f => f.key !== 'all').forEach(({ key }) => {
      const prices = allGas.map(s => s.prices?.[key]).filter(p => p > 0 && !isNaN(p));
      if (!prices.length) return;
      prices.sort((a,b) => a-b);
      stats[key] = { min: prices[0], max: prices[prices.length-1], avg: prices.reduce((a,b)=>a+b,0)/prices.length, count: prices.length };
    });
    return stats;
  }, [allGas, serverFuelStats]);

  function navigateTo(lat, lng, name) {
    if (!lat || !lng) return;
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    if (typeof document !== 'undefined') { openURL(googleMapsUrl); return; }
    const url = Platform.OS === 'ios'
      ? `maps://maps.apple.com/?daddr=${lat},${lng}&q=${encodeURIComponent(name||'')}`
      : `geo:${lat},${lng}?q=${encodeURIComponent(name||'')}`;
    Linking.openURL(url).catch(() => openURL(googleMapsUrl));
  }

  // ══════════ PRE-PERMISSION LOCATION SCREEN ══════════
  if (showLocationPrompt) {
    return (
      <SafeAreaView style={{flex:1,backgroundColor:COLORS.bg,justifyContent:'center',alignItems:'center',padding:32}} edges={['top','bottom']}>
        <Ionicons name="location-outline" size={24} color={COLORS.primary}/>
        <Text style={{fontSize:24,fontWeight:'800',color:COLORS.text,textAlign:'center',marginBottom:12}}>Activa la ubicación</Text>
        <Text style={{fontSize:15,color:COLORS.text2,textAlign:'center',lineHeight:22,marginBottom:8}}>
          MapaTacaño usa tu ubicación para mostrarte las <Text style={{fontWeight:'700',color:COLORS.primary}}>gasolineras más baratas cerca de ti</Text> y los mejores precios de tu zona.
        </Text>
        <Text style={{fontSize:13,color:COLORS.text3,textAlign:'center',marginBottom:32}}>Solo se usa mientras tienes la app abierta. Nunca en segundo plano.</Text>
        <TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:16,paddingVertical:16,paddingHorizontal:40,width:'100%',alignItems:'center',marginBottom:12}}
          onPress={() => { AsyncStorage.setItem('location_permission_asked','1').catch(()=>{}); setShowLocationPrompt(false); initLocation(); }}>
          <Text style={{color:'#fff',fontWeight:'800',fontSize:16}}>Activar ubicación</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ══════════ INITIAL FILTER PICKER — shown every app launch ══════════
  if (showInitialPicker) {
    const subCats = CATS.filter(c => c.group === activeGroup);
    return (
      <SafeAreaView style={{flex:1,backgroundColor:COLORS.bg}} edges={['top','bottom']}>
        <ScrollView contentContainerStyle={{padding:24,paddingBottom:40}} showsVerticalScrollIndicator={false}>
          <View style={{alignItems:'center',marginBottom:24,marginTop:20}}>
            <Ionicons name="map" size={36} color={COLORS.primary}/>
            <Text style={{fontSize:26,fontWeight:'800',color:COLORS.text,textAlign:'center',marginTop:8}}>Mapa Tacaño</Text>
            <Text style={{fontSize:14,color:COLORS.text3,textAlign:'center',marginTop:4}}>¿Qué quieres buscar hoy?</Text>
          </View>

          {initialPickerStep === 0 && (
            <View style={{gap:12}}>
              {FILTER_GROUPS.map(g => (
                <TouchableOpacity key={g.key}
                  style={{flexDirection:'row',alignItems:'center',gap:14,backgroundColor:COLORS.bg2,borderRadius:18,padding:18,
                    borderWidth:2,borderColor:activeGroup===g.key?g.color:COLORS.border,
                    shadowColor:'#000',shadowOpacity:0.06,shadowRadius:8,elevation:3}}
                  onPress={() => {
                    setActiveGroup(g.key);
                    const firstCat = CATS.find(c => c.group === g.key);
                    if (firstCat) {
                      setActiveCat(firstCat.key);
                      setActiveCatKey(firstCat.key2 || firstCat.key);
                      setProduct(firstCat.product || '');
                    }
                    if (g.key === 'gasolina') { setSort('proximity'); }
                    else { setSort('price'); }
                    // If gasolina, go to fuel picker; else go to subfilter
                    setInitialPickerStep(1);
                  }}>
                  <View style={{width:52,height:52,borderRadius:14,backgroundColor:g.color+'18',alignItems:'center',justifyContent:'center'}}>
                    <Ionicons name={g.icon} size={26} color={g.color}/>
                  </View>
                  <View style={{flex:1}}>
                    <Text style={{fontSize:18,fontWeight:'700',color:COLORS.text}}>{g.label}</Text>
                    <Text style={{fontSize:13,color:COLORS.text3,marginTop:2}}>{g.desc}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.text3}/>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* STEP 1: Subfilter selection */}
          {initialPickerStep === 1 && (
            <View style={{gap:12}}>
              <TouchableOpacity onPress={() => setInitialPickerStep(0)} style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:8}}>
                <Ionicons name="arrow-back" size={20} color={COLORS.primary}/>
                <Text style={{fontSize:14,color:COLORS.primary,fontWeight:'600'}}>Volver</Text>
              </TouchableOpacity>
              <Text style={{fontSize:18,fontWeight:'700',color:COLORS.text,marginBottom:4}}>
                {FILTER_GROUPS.find(g=>g.key===activeGroup)?.emoji} {FILTER_GROUPS.find(g=>g.key===activeGroup)?.label}
              </Text>

              {/* For gasolina: show fuel type picker */}
              {activeGroup === 'gasolina' && (
                <View style={{gap:8}}>
                  <Text style={{fontSize:14,color:COLORS.text2,marginBottom:4}}>Elige carburante:</Text>
                  {FUELS.map(fuel => (
                    <TouchableOpacity key={fuel.key}
                      style={{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:COLORS.bg2,borderRadius:14,padding:14,
                        borderWidth:1.5,borderColor:activeFuel===fuel.key?fuel.color:COLORS.border}}
                      onPress={() => { setActiveFuel(fuel.key); setShowInitialPicker(false); }}>
                      <View style={{width:12,height:12,borderRadius:6,backgroundColor:fuel.color}}/>
                      <Text style={{flex:1,fontSize:15,fontWeight:'600',color:COLORS.text}}>{fuel.label}</Text>
                      {fuelStats[fuel.key] && (
                        <Text style={{fontSize:12,color:COLORS.text3}}>desde {fuelStats[fuel.key].min?.toFixed(3).replace(".",",")}€</Text>
                      )}
                      <Ionicons name="chevron-forward" size={16} color={COLORS.text3}/>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* For restaurantes: café/cerveza/restaurante */}
              {activeGroup === 'restaurantes' && (
                <View style={{gap:8}}>
                  <Text style={{fontSize:14,color:COLORS.text2,marginBottom:4}}>¿Qué buscas?</Text>
                  {subCats.map(c => (
                    <TouchableOpacity key={c.key2||c.key}
                      style={{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:COLORS.bg2,borderRadius:14,padding:14,
                        borderWidth:1.5,borderColor:activeCatKey===(c.key2||c.key)?COLORS.primary:COLORS.border}}
                      onPress={() => {
                        setActiveCat(c.key); setActiveCatKey(c.key2||c.key); setProduct(c.product||'');
                        setShowInitialPicker(false);
                      }}>
                      <Ionicons name={c.icon} size={22} color={activeCatKey===(c.key2||c.key)?COLORS.primary:COLORS.text2}/>
                      <Text style={{flex:1,fontSize:15,fontWeight:'600',color:COLORS.text}}>{c.label}</Text>
                      <Ionicons name="chevron-forward" size={16} color={COLORS.text3}/>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* For servicios: all service subcategories */}
              {activeGroup === 'servicios' && (
                <View style={{gap:8}}>
                  <Text style={{fontSize:14,color:COLORS.text2,marginBottom:4}}>Tipo de servicio:</Text>
                  {subCats.map(c => (
                    <TouchableOpacity key={c.key2||c.key}
                      style={{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:COLORS.bg2,borderRadius:14,padding:14,
                        borderWidth:1.5,borderColor:activeCatKey===(c.key2||c.key)?'#7C3AED':COLORS.border}}
                      onPress={() => {
                        setActiveCat(c.key); setActiveCatKey(c.key2||c.key); setProduct(c.product||'');
                        setShowInitialPicker(false);
                      }}>
                      <Ionicons name={c.icon} size={22} color={activeCatKey===(c.key2||c.key)?'#7C3AED':COLORS.text2}/>
                      <Text style={{flex:1,fontSize:15,fontWeight:'600',color:COLORS.text}}>{c.label}</Text>
                      <Ionicons name="chevron-forward" size={16} color={COLORS.text3}/>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ══════════ MAIN MAP/LIST VIEW ══════════
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* ── HEADER (responsive: 2 rows) ── */}
      <View style={s.header}>
        {/* Row 1: Logo + view toggle + settings */}
        <View style={s.headerRow}>
          <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
            <Ionicons name="wallet" size={20} color={COLORS.primary}/>
            <Text style={s.logo}>Mapa Tacaño</Text>
          </View>
          <View style={s.rightRow}>
            <View style={s.toggle}>
              <TouchableOpacity style={[s.togBtn,viewMode==='map'&&s.togBtnOn]} onPress={()=>setViewMode('map')}>
                <Ionicons name="map-outline" size={15} color={viewMode==='map'?COLORS.primary:COLORS.text3}/>
                <Text style={[s.togTxt,viewMode==='map'&&{color:COLORS.primary}]}>Mapa</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.togBtn,viewMode==='list'&&s.togBtnOn]} onPress={()=>setViewMode('list')}>
                <Ionicons name="list-outline" size={15} color={viewMode==='list'?COLORS.primary:COLORS.text3}/>
                <Text style={[s.togTxt,viewMode==='list'&&{color:COLORS.primary}]}>Lista</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={s.filterIconBtn} onPress={() => setShowSettingsModal(true)}>
              <Ionicons name="options-outline" size={22} color={COLORS.text2}/>
            </TouchableOpacity>
          </View>
        </View>
        {/* Row 2: Current filter badge (tappable to change) */}
        <TouchableOpacity style={s.filterBadgeRow} onPress={() => { setShowInitialPicker(true); setInitialPickerStep(0); }}>
          <Ionicons name={activeCat==='gasolinera'?'speedometer-outline':activeCat==='restaurante'?'restaurant-outline':'storefront-outline'} size={14} color={COLORS.primary}/>
          <Text style={{fontSize:12,fontWeight:'600',color:COLORS.primary}} numberOfLines={1}>
            {activeCat==='gasolinera'?(FUELS.find(f=>f.key===activeFuel)?.label||'Gasolina'):(CATS.find(c=>(c.key2||c.key)===activeCatKey)?.label||activeCat)}
          </Text>
          <Ionicons name="chevron-down" size={12} color={COLORS.text3}/>
          <Text style={{fontSize:10,color:COLORS.text3}}>cambiar</Text>
        </TouchableOpacity>

        {/* City picker */}
        <View style={{paddingHorizontal:12,paddingBottom:4}}>
          <CityPicker value={city} onChange={setCity}
            placeholder={city ? city : "Tu ubicación actual"}/>
        </View>
      </View>

      {/* ── SETTINGS MODAL (proper Modal, not absolute positioned) ── */}
      <Modal visible={showSettingsModal} animationType="fade" transparent onRequestClose={() => setShowSettingsModal(false)}>
        <TouchableOpacity style={{flex:1,backgroundColor:'rgba(0,0,0,0.4)'}} activeOpacity={1} onPress={() => setShowSettingsModal(false)}>
          <View style={{position:'absolute',top:100,right:16,backgroundColor:COLORS.bg2,borderRadius:18,padding:16,width:290,
            shadowColor:'#000',shadowOpacity:0.2,shadowRadius:20,elevation:10,borderWidth:1,borderColor:COLORS.border}}>
            <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
              {/* Header with close */}
              <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                <Text style={{fontSize:16,fontWeight:'700',color:COLORS.text}}>Filtros</Text>
                <TouchableOpacity onPress={() => setShowSettingsModal(false)}
                  style={{width:30,height:30,borderRadius:15,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'}}>
                  <Ionicons name="close" size={18} color={COLORS.text2}/>
                </TouchableOpacity>
              </View>

              {/* Type */}
              <Text style={{fontSize:11,fontWeight:'600',color:COLORS.text3,marginBottom:6,letterSpacing:0.5}}>TIPO</Text>
              {FILTER_GROUPS.map(g => (
                <TouchableOpacity key={g.key}
                  style={{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:8,paddingHorizontal:8,borderRadius:10,marginBottom:4,
                    backgroundColor:activeGroup===g.key?COLORS.primaryLight:'transparent',
                    borderWidth:activeGroup===g.key?1.5:0,borderColor:COLORS.primary}}
                  onPress={() => {
                    setActiveGroup(g.key);
                    const firstCat = CATS.find(c => c.group === g.key);
                    if (firstCat) { setActiveCat(firstCat.key); setActiveCatKey(firstCat.key2||firstCat.key); setProduct(firstCat.product||''); }
                    if (g.key==='gasolina') { setActiveFuel(activeFuel||'g95'); setSort('proximity'); }
                    else { setSort('price'); }
                    setPriceRange(null);
                  }}>
                  <Ionicons name={g.icon} size={16} color={activeGroup===g.key?COLORS.primary:COLORS.text2}/>
                  <Text style={{flex:1,fontSize:13,fontWeight:'600',color:activeGroup===g.key?COLORS.primary:COLORS.text}}>{g.label}</Text>
                  {activeGroup===g.key && <Ionicons name="checkmark-circle" size={16} color={COLORS.primary}/>}
                </TouchableOpacity>
              ))}

              {/* Subcategories */}
              <Text style={{fontSize:11,fontWeight:'600',color:COLORS.text3,marginTop:10,marginBottom:6,letterSpacing:0.5}}>SUBFILTRO</Text>
              <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
                {CATS.filter(c => c.group === activeGroup).map((c,i) => {
                  const ck = c.key2 || c.key;
                  const isOn = activeCatKey === ck;
                  return (
                    <TouchableOpacity key={ck+i}
                      style={{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:10,paddingVertical:6,borderRadius:99,
                        borderWidth:1.5,borderColor:isOn?COLORS.primary:COLORS.border,backgroundColor:isOn?COLORS.primary:COLORS.bg}}
                      onPress={() => {
                        setActiveCat(c.key); setActiveCatKey(ck); setProduct(c.product||''); setPriceRange(null);
                        if (c.key==='gasolinera') setSort('proximity'); else setSort('price');
                        setShowSettingsModal(false);
                      }}>
                      <Ionicons name={c.icon} size={13} color={isOn?'#fff':COLORS.text2}/>
                      <Text style={{fontSize:11,fontWeight:'600',color:isOn?'#fff':COLORS.text2}}>{c.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Fuel selector for gasolina */}
              {activeGroup === 'gasolina' && (
                <View style={{marginTop:10}}>
                  <Text style={{fontSize:11,fontWeight:'600',color:COLORS.text3,marginBottom:6,letterSpacing:0.5}}>CARBURANTE</Text>
                  <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
                    {FUELS.map(f => (
                      <TouchableOpacity key={f.key}
                        style={{paddingHorizontal:10,paddingVertical:6,borderRadius:99,borderWidth:1.5,
                          borderColor:activeFuel===f.key?f.color:COLORS.border,backgroundColor:activeFuel===f.key?f.bg:COLORS.bg}}
                        onPress={() => setActiveFuel(f.key)}>
                        <Text style={{fontSize:11,fontWeight:'600',color:activeFuel===f.key?f.color:COLORS.text2}}>{f.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Sort */}
              <Text style={{fontSize:11,fontWeight:'600',color:COLORS.text3,marginTop:10,marginBottom:6,letterSpacing:0.5}}>ORDENAR POR</Text>
              <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
                {SORT_OPTS.map(so => (
                  <TouchableOpacity key={so.key}
                    style={{paddingHorizontal:10,paddingVertical:6,borderRadius:99,borderWidth:1.5,
                      borderColor:sort===so.key?COLORS.primary:COLORS.border,backgroundColor:sort===so.key?COLORS.primaryLight:COLORS.bg}}
                    onPress={() => setSort(so.key)}>
                    <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
                      <Ionicons name={so.icon+'-outline'} size={12} color={sort===so.key?COLORS.primary:COLORS.text2}/>
                      <Text style={{fontSize:11,fontWeight:'600',color:sort===so.key?COLORS.primary:COLORS.text2}}>{so.label}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ══════════ MAP VIEW ══════════ */}
      {viewMode === 'map' && (
        <View style={{flex:1}}>
          <MapView ref={mapRef} style={{flex:1}} initialRegion={SPAIN_CENTER}
            showsUserLocation showsMyLocationButton
            mapPadding={{bottom:64,top:0,left:0,right:0}}
            onRegionChangeComplete={(region) => setMapRegion(region)}>

            {/* Community places with €/€€/€€€/€€€€ markers */}
            {mapPlaces.map(p => {
              const catInfoKey = p.category==='restaurante' && activeCatKey
                ? `restaurante_${activeCatKey==='cafe'?'cafe':activeCatKey==='cerveza'?'cerveza':'menu'}` : p.category;
              const info = CATEGORY_INFO[catInfoKey] || CATEGORY_INFO[p.category] || CATEGORY_INFO.default;
              const weeklyCost = p.category==='supermercado' ? getWeeklyCost(p.name) : null;
              const repP = weeklyCost || p.repPrice || p.minPrice;
              let priceLabel = null, priceBg = null;
              if (weeklyCost) { priceLabel = `${weeklyCost?.toFixed(0)}€`; }
              else if (p.category==='gimnasio' && repP > 0) { priceLabel = `${repP?.toFixed(0)}€/m`; priceBg = '#3B82F6'; }
              else if (repP > 0 && !isNaN(repP)) {
                const AVG_SVC = {cafe:1.4,cerveza:2.2,restaurante_menu:12,restaurante:12,farmacia:4,supermercado:AVG_WEEKLY_COST};
                const avg = AVG_SVC[activeCatKey] || AVG_SVC[p.category] || 10;
                if (repP < avg*0.75)      { priceLabel='€';    priceBg='#16A34A'; }
                else if (repP < avg)       { priceLabel='€€';   priceBg='#65A30D'; }
                else if (repP < avg*1.3)   { priceLabel='€€€';  priceBg='#D97706'; }
                else                        { priceLabel='€€€€'; priceBg='#DC2626'; }
              }
              if (!p.lat || !p.lng) return null;
              return (
                <Marker key={`p${p.id}`} coordinate={{latitude:p.lat,longitude:p.lng}} onPress={()=>setSelectedPlace(p)}>
                  <View style={[ms.marker,{backgroundColor:priceBg||info.bg,borderColor:priceBg||info.color,borderWidth:2}]}>
                    <Ionicons name={info.icon||'location-outline'} size={14} color={priceBg?'#fff':info.color||COLORS.text2}/>
                    {priceLabel && <Text style={[ms.markerPrice,{color:priceBg?'#fff':COLORS.text,fontWeight:'800'}]}>{priceLabel}</Text>}
                  </View>
                </Marker>
              );
            })}

            {/* Gas stations */}
            {mapGas.map(s => {
              const displayFuel = activeFuel!=='all' && s.prices?.[activeFuel]>0 ? activeFuel
                : s.prices?.g95>0 ? 'g95' : s.prices?.diesel>0 ? 'diesel' : s.prices?.g98>0 ? 'g98' : null;
              const displayPrice = displayFuel ? s.prices[displayFuel] : null;
              const col = displayPrice ? gasPriceColor(displayPrice) : {bg:'#9CA3AF',text:'#fff',label:'Sin datos'};
              if (activeFuel && activeFuel!=='all' && !s.prices?.[activeFuel]) return null;
              if (!s.lat || !s.lng) return null;
              return (
                <Marker key={s.id} coordinate={{latitude:s.lat,longitude:s.lng}} onPress={() => {
                  setSelectedStation(s);
                  mapRef.current?.animateToRegion({latitude:s.lat,longitude:s.lng,latitudeDelta:0.008,longitudeDelta:0.008},400);
                }}>
                  <View style={[ms.gasMarker,{backgroundColor:col.bg}]}>
                    <Ionicons name="speedometer" size={13} color="#fff"/>
                    {displayPrice>0 && <Text style={ms.gasPrice}>{displayPrice?.toFixed(3).replace(".",",")}</Text>}
                    {userLoc && (() => {
                      const d = distanceKm(userLoc.lat,userLoc.lng,s.lat,s.lng);
                      if (d>3) return null;
                      const label = d<1 ? `${Math.round(d*1000)}m` : `${d.toFixed(1)}km`;
                      const distColor = d<0.5?'#22C55E':d<1.5?'#FCD34D':col.text;
                      return <Text style={{fontSize:8,color:distColor,fontWeight:'700',opacity:0.9}}>{label}</Text>;
                    })()}
                  </View>
                </Marker>
              );
            })}
          </MapView>

          {/* Server error banner */}
          {serverError && (
            <View style={[ms.loadBar,{backgroundColor:'#FEF2F2',borderColor:'#FECACA'}]}>
              <Ionicons name="wifi-outline" size={14} color={COLORS.danger}/>
              <Text style={[ms.loadTxt,{color:COLORS.danger}]}>Sin conexión al servidor</Text>
              <TouchableOpacity onPress={loadPlaces} style={{marginLeft:8}}>
                <Text style={{fontSize:11,color:COLORS.primary,fontWeight:'700'}}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Loading bar */}
          {gasLoading && (
            <View style={ms.loadBar}>
              <ActivityIndicator size="small" color={COLORS.warning}/>
              <Text style={ms.loadTxt}>{nearbyGasLoaded ? `Cargando toda España... ${loadProgress}%` : 'Cargando gasolineras cercanas...'}</Text>
              {loadProgress>0 && (
                <View style={{width:60,height:4,backgroundColor:COLORS.border,borderRadius:99,marginLeft:6,overflow:'hidden'}}>
                  <View style={{width:`${loadProgress}%`,height:'100%',backgroundColor:COLORS.warning,borderRadius:99}}/>
                </View>
              )}
            </View>
          )}

          {/* Legend */}
          {activeCat==='gasolinera' && gasolineras.length>0 && (
            <View style={ms.legend}>
              <View style={{backgroundColor:'rgba(15,23,42,0.7)',borderRadius:8,paddingHorizontal:8,paddingVertical:3,marginRight:4}}>
                <Text style={{fontSize:10,color:'#fff',fontWeight:'700'}}>{gasolineras.length>999?(gasolineras.length/1000).toFixed(1)+'K':gasolineras.length} est.</Text>
              </View>
              {[['#16A34A','Barato'],['#D97706','Medio'],['#DC2626','Caro']].map(([c,l])=>(
                <View key={l} style={ms.legendItem}><View style={[ms.legendDot,{backgroundColor:c}]}/><Text style={ms.legendTxt}>{l}</Text></View>
              ))}
            </View>
          )}

          {/* Add FAB */}
          <TouchableOpacity style={ms.fab} onPress={() => {
            if (!isLoggedIn) { setShowAuth(true); return; }
            setShowAddGas(true);
          }}>
            <Ionicons name="add" size={28} color="#fff"/>
          </TouchableOpacity>
        </View>
      )}

      {/* ══════════ LIST VIEW (no brand search bar) ══════════ */}
      {viewMode === 'list' && (
        <View style={{flex:1}}>
          {loading ? <ActivityIndicator color={COLORS.primary} style={{marginTop:40}}/> : (() => {
            const searchLow = gasSearch.toLowerCase();
            const gasFiltered = searchLow
              ? visibleGas.filter(s => (s.name||'').toLowerCase().includes(searchLow) || (s.brand||'').toLowerCase().includes(searchLow) || (s.city||'').toLowerCase().includes(searchLow))
              : visibleGas;
            const listData = [
              ...visiblePlaces,
              ...gasFiltered.slice(0,150).map(s=>({
                ...s, isGas:true,
                _dist:distanceKm(userLoc?.lat||40.4168,userLoc?.lng||(-3.7038),s.lat,s.lng),
                minPrice:activeFuel&&activeFuel!=='all'?(s.prices?.[activeFuel]||null):stationMinPrice(s.prices),
              })),
            ].sort((a,b) => {
              if(sort==='price') return (a.minPrice??999)-(b.minPrice??999);
              return (a._dist??999)-(b._dist??999);
            });

            return (
              <FlatList data={listData}
                keyExtractor={(it,i)=>it.isGas?`gas_${it.id||i}`:`pl_${it.id||i}`}
                contentContainerStyle={{padding:12,gap:10,paddingBottom:100}}
                renderItem={({item})=>(
                  <ListCard item={item}
                    onPress={()=>{ if (item.isGas) setSelectedStation(item); else setSelectedPlace(item); }}
                    onNav={()=>navigateTo(item.lat,item.lng,item.name||item.title)}
                    activeFuel={activeFuel} catKey={activeCatKey}
                    isFav={item.isGas && favIds.has(String(item.id))}/>
                )}
                ListEmptyComponent={
                  <View style={{alignItems:'center',paddingTop:60,gap:8}}>
                    <Ionicons name="search-outline" size={24} color={COLORS.text2}/>
                    <Text style={{fontSize:15,color:COLORS.text2,fontWeight:'600'}}>Sin resultados en esta zona</Text>
                    <Text style={{fontSize:13,color:COLORS.text3,textAlign:'center',paddingHorizontal:30}}>
                      {activeCat==='gasolinera' ? 'Desplázate en el mapa para ver más' : 'Elige una ciudad en el filtro de arriba'}
                    </Text>
                  </View>
                }/>
            );
          })()}
          <TouchableOpacity style={[ms.fab,{position:'absolute',bottom:20,right:16}]} onPress={() => {
            if (!isLoggedIn) { setShowAuth(true); return; }
            setShowAddGas(true);
          }}>
            <Ionicons name="add" size={28} color="#fff"/>
          </TouchableOpacity>
        </View>
      )}

      {/* ── MODALS ── */}
      <Modal visible={!!selectedPlace} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setSelectedPlace(null)}>
        {selectedPlace && <PlaceModal place={selectedPlace} catKey={activeCatKey} onClose={()=>setSelectedPlace(null)} onNavigate={navigateTo} isLoggedIn={isLoggedIn} onAuthNeeded={()=>setShowAuth(true)} onProposePrice={(p,product)=>{setSelectedPlace(null);setPriceChangePlace({place:p,product});}}/>}
      </Modal>
      <PriceChangeModal visible={!!priceChangePlace} onClose={()=>setPriceChangePlace(null)} place={priceChangePlace?.place} initialProduct={priceChangePlace?.product}/>
      <Modal visible={!!selectedStation} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setSelectedStation(null)}>
        {selectedStation && <GasModal station={selectedStation} onClose={()=>setSelectedStation(null)} onNavigate={navigateTo} onFavChange={loadFavs}/>}
      </Modal>
      <AddGasStationModal visible={showAddGas} onClose={()=>setShowAddGas(false)} activeCat={activeCat}
        onSuccess={()=>{setShowAddGas(false);loadPlaces();Alert.alert('✅ Lugar añadido','¡Aparecerá con badge "NUEVO". La comunidad votará para verificar.');}}/>
      <AuthModal visible={showAuth} onClose={()=>setShowAuth(false)}/>
    </SafeAreaView>
  );
}

// === LIST CARD ===
function ListCard({ item, onPress, onNav, activeFuel, catKey, isFav }) {
  const catInfoKey = item.category==='restaurante'&&catKey
    ? `restaurante_${catKey==='cafe'?'cafe':catKey==='cerveza'?'cerveza':'menu'}` : item.category;
  const info = item.isGas ? {emoji:'⛽',icon:'speedometer-outline',bg:'#FEF3C7',label:'Gasolinera',color:'#F59E0B'}
    : (CATEGORY_INFO[catInfoKey]||CATEGORY_INFO[item.category]||CATEGORY_INFO.default);
  const col = item.isGas && item.minPrice ? gasPriceColor(item.minPrice) : null;
  const dist = !item._dist||item._dist===999 ? null : item._dist<1 ? `${Math.round(item._dist*1000)}m` : `${item._dist.toFixed(1)}km`;

  function priceLabel() {
    if (item.category==='supermercado') {
      const wc = getWeeklyCost(item.name); const price = wc||item.repPrice;
      if (!price) return null;
      const diff = ((price-AVG_WEEKLY_COST)/AVG_WEEKLY_COST*100)?.toFixed(0);
      const tag = price<AVG_WEEKLY_COST*0.92?'🟢':price>AVG_WEEKLY_COST*1.08?'🔴':'🟡';
      return `${tag} ~${price?.toFixed(0)}€/sem · ${Number(diff)>0?'+':''}${diff}%`;
    }
    const p = item.repPrice||item.minPrice;
    if (!p||isNaN(p)) return null;
    if (item.isGas) {
      const shortLabel = {g95:'G95',g98:'G98',diesel:'Diésel',diesel_plus:'Diésel+',glp:'GLP',gnc:'GNC'}[activeFuel]||'G95';
      return `${shortLabel} ${p?.toFixed(3).replace(".",",")}€/L`;
    }
    if (item.category==='restaurante') {
      const labels = {cafe:'☕ Café',cerveza:'🍺 Caña',restaurante_menu:'🍽️ Menú'};
      return `${labels[catKey]||'🍽️'} ${p?.toFixed(2).replace(".",",")}€`;
    }
    if (item.category==='gimnasio') return `💪 desde ${p?.toFixed(0)}€/mes`;
    if (item.category==='farmacia') {
      const euros = p<3?'€':p<8?'€€':p<20?'€€€':'€€€€';
      return `💊 ~${p?.toFixed(2).replace(".",",")}€  ${euros}`;
    }
    return `~${p?.toFixed(2).replace(".",",")}€`;
  }

  function priceColor() {
    if (item.isGas) return col;
    if (item.category==='restaurante') {
      const p=item.repPrice; if(!p) return null;
      const AVG={cafe:1.4,cerveza:2.2,restaurante_menu:12}; const avg=AVG[catKey]||12;
      if(p<avg*0.85) return {bg:'#DCFCE7',text:'#15803D'};
      if(p>avg*1.20) return {bg:'#FEE2E2',text:'#DC2626'};
      return {bg:'#FEF9C3',text:'#92400E'};
    }
    if (item.category==='supermercado') {
      const price=getWeeklyCost(item.name)||item.repPrice; if(!price) return null;
      if(price<AVG_WEEKLY_COST*0.92) return {bg:'#DCFCE7',text:'#15803D'};
      if(price>AVG_WEEKLY_COST*1.08) return {bg:'#FEE2E2',text:'#DC2626'};
      return {bg:'#FEF9C3',text:'#92400E'};
    }
    return null;
  }
  const pLabel=priceLabel(), pColor=priceColor();

  return (
    <TouchableOpacity style={lcs.card} onPress={onPress} activeOpacity={0.75}>
      <View style={[lcs.icon,{backgroundColor:info.bg,overflow:'hidden'}]}>
        {(() => {
          if (item.category==='supermercado'&&item.name) {
            const n=item.name.toLowerCase();
            const logoMap={'mercadona':'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Mercadona_logo.svg/240px-Mercadona_logo.svg.png',
              'lidl':'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Lidl-Logo.svg/240px-Lidl-Logo.svg.png',
              'aldi':'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Aldi_Nord_Logo.svg/240px-Aldi_Nord_Logo.svg.png',
              'carrefour':'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Carrefour_logo.svg/240px-Carrefour_logo.svg.png',
              'dia':'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Logo_Dia.svg/240px-Logo_Dia.svg.png'};
            const logoUrl=Object.entries(logoMap).find(([key])=>n.includes(key))?.[1];
            if (logoUrl) return <SuperLogo uri={logoUrl} fallbackEmoji={info.emoji}/>;
          }
          return <Ionicons name={info.icon||'location-outline'} size={22} color={info.color||COLORS.text2}/>;
        })()}
        {isFav?<View style={{position:'absolute',top:-4,right:-4}}><Ionicons name="heart" size={12} color={COLORS.danger}/></View>:null}
      </View>
      <View style={lcs.info}>
        <Text style={lcs.name} numberOfLines={1}>{
          item.isGas&&item.name&&item.name===item.name.toUpperCase()
            ? item.name.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()) : item.name||item.address}</Text>
        <View style={{flexDirection:'row',alignItems:'center',gap:4,marginTop:1}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:3,backgroundColor:info.bg||COLORS.bg3,borderRadius:4,paddingHorizontal:5,paddingVertical:1}}>
              <Ionicons name={info.icon||'location-outline'} size={10} color={info.text||COLORS.text2}/>
              <Text style={{fontSize:10,fontWeight:'700',color:info.text||COLORS.text2}}>{info.label}</Text>
            </View>
          {item.city&&<View style={{flexDirection:'row',alignItems:'center',gap:2}}><Ionicons name="location-outline" size={10} color={COLORS.text3}/><Text style={lcs.sub} numberOfLines={1}>{item.city}</Text></View>}
        </View>
        {pLabel && (
          <View style={[lcs.pricePill,{backgroundColor:pColor?pColor.bg:col?col.bg:COLORS.warningLight}]}>
            <Text style={[lcs.pricePillTxt,{color:pColor?pColor.text:col?col.text:COLORS.warning}]}>{pLabel}</Text>
          </View>
        )}
      </View>
      <View style={lcs.right}>
        {dist&&<View style={{flexDirection:'row',alignItems:'center',gap:2}}><Ionicons name="location-outline" size={11} color={COLORS.text3}/><Text style={lcs.dist}>{dist}</Text></View>}
        <TouchableOpacity style={lcs.navBtn} onPress={onNav}><Text style={lcs.navTxt}>Ir</Text></TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// === GAS MODAL ===
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
        apiDelete(`/api/users/me/favorites/${station.id}`).catch(() => {});
      } else {
        const newFav = { id: station.id, name: station.name, city: station.city, lat: station.lat, lng: station.lng };
        favs.push(newFav);
        if (favs.length > 20) favs = favs.slice(-20);
        apiPost('/api/users/me/favorites', {
          station_id: String(station.id), station_name: station.name,
          station_city: station.city, lat: station.lat, lng: station.lng,
        }).catch(() => {});
      }
      await AsyncStorage.setItem(FAV_KEY, JSON.stringify(favs));
      setIsFav(!isFav); onFavChange?.();
    } catch(_) {}
  }

  const fuels = Object.entries(station.prices||{}).filter(([,v])=>v&&v>0);
  const mainFuelKey = station.prices?.g95?'g95':station.prices?.diesel?'diesel':station.prices?.g98?'g98':fuels[0]?.[0]||null;
  const mainPrice = mainFuelKey ? station.prices[mainFuelKey] : null;
  const mainCol = mainPrice ? gasPriceColor(mainPrice) : {bg:'#6B7280',text:'#fff',label:'Sin datos'};

  return (
    <View style={gcs.wrap}>
      <View style={gcs.handle}/>
      <View style={gcs.header}>
        <View style={[gcs.iconBg,{backgroundColor:'#FEF3C7'}]}><Ionicons name="speedometer-outline" size={28} color="#F59E0B"/></View>
        <View style={{flex:1}}>
          <Text style={gcs.title} numberOfLines={2}>{
            station.name&&station.name===station.name.toUpperCase()
              ? station.name.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()) : station.name||'Gasolinera'
          }</Text>
          <Text style={gcs.sub} numberOfLines={1}>{station.address}</Text>
          {station.schedule&&<View style={{flexDirection:'row',alignItems:'center',gap:4,marginTop:1}}><Ionicons name="time-outline" size={11} color={COLORS.text3}/><Text style={gcs.hours}>{station.schedule}</Text></View>}
        </View>
        <TouchableOpacity onPress={toggleFav} style={[gcs.closeBtn,{backgroundColor:isFav?'#FEF2F2':COLORS.bg3,marginRight:6}]}>
          <Ionicons name={isFav?'heart':'heart-outline'} size={20} color={isFav?COLORS.danger:COLORS.text2}/>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={gcs.closeBtn}><Ionicons name="close" size={20} color={COLORS.text2}/></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{padding:16,paddingBottom:40}}>
        {mainPrice>0&&!isNaN(mainPrice)&&(
          <View style={[gcs.hero,{backgroundColor:mainCol.bg}]}>
            <Text style={[gcs.heroLbl,{color:mainCol.text}]}>{FUEL_LABELS[mainFuelKey]||mainFuelKey}</Text>
            <Text style={[gcs.heroPrice,{color:mainCol.text}]}>{mainPrice?.toFixed(3).replace(".",",")}€/L</Text>
            <Text style={[gcs.heroTag,{color:mainCol.text}]}>{mainCol.label}</Text>
          </View>
        )}
        <Text style={gcs.sectionTitle}>Todos los carburantes</Text>
        <Text style={gcs.sectionNote}>Fuente: Ministerio de Energía · Actualización diaria</Text>
        <View style={gcs.grid}>
          {fuels.map(([key,price])=>{
            const col=gasPriceColor(price);
            return (
              <View key={key} style={gcs.fuelCard}>
                <View style={[gcs.fuelBar,{backgroundColor:col.bg}]}/>
                <View style={{padding:10}}>
                  <Text style={gcs.fuelName}>{FUEL_LABELS[key]||key}</Text>
                  <Text style={[gcs.fuelPrice,{color:col.bg}]}>{price?.toFixed(3).replace(".",",")}€</Text>
                  <Text style={gcs.fuelUnit}>por litro</Text>
                  <View style={[gcs.fuelBadge,{backgroundColor:col.bg+'25'}]}>
                    <Text style={[gcs.fuelBadgeTxt,{color:col.bg}]}>{col.label}</Text>
                  </View>
                </View>
              </View>
            );
          })}
          {fuels.length===0&&<Text style={{color:COLORS.text3,fontSize:13}}>Sin datos de precios</Text>}
        </View>

        <TouchableOpacity style={gcs.navBtn} onPress={()=>{onClose();onNavigate(station.lat,station.lng,station.name);}}>
          <Ionicons name="navigate" size={18} color="#fff"/>
          <Text style={gcs.navBtnTxt}>Cómo llegar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[gcs.navBtn,{backgroundColor:COLORS.bg3,marginTop:8}]}
          onPress={async()=>{
            const msg=`${station.name}\nG95: ${station.prices?.g95?.toFixed(3).replace(".",",")||'N/D'}€ | Diesel: ${station.prices?.diesel?.toFixed(3).replace(".",",")||'N/D'}€\nVía Mapa Tacaño`;
            try { Share.share({message:msg}).catch(()=>{}); } catch(_) {}
          }}>
          <Ionicons name="share-outline" size={18} color={COLORS.text2}/>
          <Text style={[gcs.navBtnTxt,{color:COLORS.text2}]}>Compartir precio</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// === PLACE MODAL ===
function PlaceModal({ place, catKey, onClose, onNavigate, isLoggedIn, onAuthNeeded, onProposePrice }) {
  const catInfoKey = place.category==='restaurante'&&catKey
    ? `restaurante_${catKey==='cafe'?'cafe':catKey==='cerveza'?'cerveza':'menu'}` : place.category;
  const info = CATEGORY_INFO[catInfoKey]||CATEGORY_INFO[place.category]||CATEGORY_INFO.default;
  const prices = place.prices||[];
  const [history, setHistory] = React.useState({});
  React.useEffect(() => {
    apiGet(`/api/places/${place.id}/price-history`).then(d=>{if(d?.history)setHistory(d.history);}).catch(()=>{});
  }, [place.id]);

  return (
    <View style={pcs.wrap}>
      <View style={pcs.handle}/>
      <View style={pcs.header}>
        <View style={[pcs.iconBg,{backgroundColor:info.bg}]}><Ionicons name={info.icon||'location-outline'} size={26} color={info.color||COLORS.text2}/></View>
        <View style={{flex:1}}>
          <Text style={pcs.title} numberOfLines={2}>{place.name}</Text>
          <Text style={pcs.sub}>{info.label}{place.address?` · ${place.address}`:''}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={pcs.closeBtn}><Ionicons name="close" size={20} color={COLORS.text2}/></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{padding:16,paddingBottom:40}}>
        <View style={pcs.actions}>
          <TouchableOpacity style={pcs.actionBtn} onPress={()=>place&&onProposePrice(place)}>
            <Ionicons name="pricetag-outline" size={18} color={COLORS.primary}/>
            <Text style={pcs.actionTxt}>Ver precios</Text>
          </TouchableOpacity>
          <TouchableOpacity style={pcs.actionBtnNav} onPress={()=>{onClose();onNavigate(place.lat,place.lng,place.name);}}>
            <Ionicons name="navigate" size={18} color="#fff"/>
            <Text style={pcs.actionTxtNav}>Cómo llegar</Text>
          </TouchableOpacity>
        </View>

        {/* Representative price banner */}
        {place.repPrice!=null&&prices.length>0&&(()=>{
          const cat=place.category;
          const restLabel={cafe:'precio café',cerveza:'precio caña',restaurante_menu:'precio menú del día'};
          const label=cat==='restaurante'?(restLabel[catKey]||'precio medio'):cat==='farmacia'?'precio medio medicamento':cat==='gimnasio'?'cuota mensual desde':'precio medio';
          const REST_REF={cafe:1.4,cerveza:2.2,restaurante_menu:12};
          const REF={restaurante:REST_REF[catKey]||12,farmacia:5,supermercado:100,gimnasio:30};
          const ref=REF[cat];
          const priceColor=!ref?COLORS.primary:place.repPrice<ref*0.85?'#16A34A':place.repPrice>ref*1.15?'#DC2626':'#D97706';
          const priceTag=!ref?null:place.repPrice<ref*0.85?'🟢 Barato':place.repPrice>ref*1.15?'🔴 Caro':'🟡 Precio medio';
          return (
            <View style={{backgroundColor:priceColor+'15',borderRadius:12,padding:12,marginBottom:14,flexDirection:'row',alignItems:'center',gap:10,borderWidth:1,borderColor:priceColor+'44'}}>
              <Ionicons name="wallet-outline" size={24} color={COLORS.primary}/>
              <View style={{flex:1}}>
                <View style={{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                  <Text style={{fontSize:20,fontWeight:'800',color:priceColor}}>{(place.repPrice||0)?.toFixed(2).replace(".",",")}€</Text>
                  <Text style={{fontSize:12,fontWeight:'600',color:COLORS.text2}}>{label}</Text>
                  {priceTag&&<View style={{backgroundColor:priceColor+'22',borderRadius:99,paddingHorizontal:8,paddingVertical:2}}>
                    <Text style={{fontSize:10,fontWeight:'700',color:priceColor}}>{priceTag}</Text>
                  </View>}
                </View>
              </View>
            </View>
          );
        })()}

        {/* Price history */}
        {Object.keys(history).length>0&&(
          <View style={{marginBottom:16}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:4,marginBottom:12}}><Ionicons name="trending-up-outline" size={14} color={COLORS.success}/><Text style={pcs.sectionTitle}>TENDENCIA DE PRECIOS</Text></View>
            {Object.entries(history).slice(0,4).map(([prod,pts])=>{
              if(!pts||pts.length<2) return null;
              const last=pts[pts.length-1]?.price, prev=pts[pts.length-2]?.price;
              if(last==null||prev==null) return null;
              const diff=last-prev;
              return (
                <View key={prod} style={{flexDirection:'row',alignItems:'center',paddingVertical:8,borderBottomWidth:0.5,borderBottomColor:COLORS.border,gap:10}}>
                  <View style={{flex:1}}>
                    <Text style={{fontSize:13,fontWeight:'600',color:COLORS.text}} numberOfLines={1}>{prod}</Text>
                    <Text style={{fontSize:10,color:COLORS.text3,marginTop:1}}>{pts.length} reportes</Text>
                  </View>
                  <View style={{alignItems:'flex-end'}}>
                    <Text style={{fontSize:16,fontWeight:'800',color:COLORS.text}}>{(last||0)?.toFixed(2).replace(".",",")}€</Text>
                    <Text style={{fontSize:11,fontWeight:'700',color:Math.abs(diff)<0.01?COLORS.text3:diff>0?COLORS.danger:COLORS.success}}>
                      {Math.abs(diff)<0.01?'—':diff>0?`↑${diff?.toFixed(2).replace(".",",")}€`:`↓${Math.abs(diff)?.toFixed(2).replace(".",",")}€`}
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
            <TouchableOpacity key={p.id} style={pcs.priceRow} onPress={()=>onProposePrice(place,p.product)} activeOpacity={0.7}>
              <View style={{flex:1}}>
                <Text style={pcs.product}>{p.product}</Text>
                <Text style={pcs.reporter}>Por {p.users?.name||p.reporter_name||'la comunidad'} · {timeAgo(p.reported_at)}</Text>
                <View style={[pcs.statusBadge,{backgroundColor:p.status==='verified'?COLORS.successLight:COLORS.warningLight}]}>
                  <View style={{flexDirection:'row',alignItems:'center',gap:3}}>
                    <Ionicons name={p.status==='verified'?'checkmark-circle':'time-outline'} size={12} color={p.status==='verified'?COLORS.success:COLORS.warning}/>
                    <Text style={[pcs.statusTxt,{color:p.status==='verified'?COLORS.success:COLORS.warning}]}>{p.status==='verified'?'Verificado':'Pendiente'}</Text>
                  </View>
                </View>
              </View>
              <View style={{alignItems:'flex-end',gap:4}}>
                <Text style={pcs.price}>{p.price!=null?p.price?.toFixed(2).replace(".",","):'—'}€<Text style={pcs.unit}>/{p.unit||'ud'}</Text></Text>
              </View>
            </TouchableOpacity>
          ))
        }
        <TouchableOpacity style={pcs.addPriceBtn} onPress={()=>onProposePrice(place,null)}>
          <Ionicons name="add-circle-outline" size={18} color={COLORS.primary}/>
          <Text style={{fontSize:13,color:COLORS.primary,fontWeight:'700'}}>Añadir nuevo precio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingVertical:12,marginTop:8}}
          onPress={()=>{
            if(!isLoggedIn){onAuthNeeded();return;}
            Alert.alert('Reportar sitio','¿Qué problema tiene este sitio?',[
              {text:'Cancelar'},
              {text:'Ubicación incorrecta',onPress:()=>apiPost('/api/reports',{type:'place',target_id:place.id,reason:'Ubicación incorrecta'}).then(()=>Alert.alert('Reportado','Gracias. Un admin lo revisará.'))},
              {text:'No existe / Cerrado',style:'destructive',onPress:()=>apiPost('/api/reports',{type:'place',target_id:place.id,reason:'No existe o ha cerrado'}).then(()=>Alert.alert('Reportado','Gracias. Un admin lo revisará.'))},
            ]);
          }}>
          <Ionicons name="flag-outline" size={14} color={COLORS.text3}/>
          <Text style={{fontSize:12,color:COLORS.text3,fontWeight:'600'}}>Reportar sitio</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ══════════ STYLES ══════════
const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:COLORS.bg2},
  header:{backgroundColor:COLORS.bg2,borderBottomWidth:0.5,borderBottomColor:COLORS.border,paddingBottom:4},
  headerRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:14,paddingTop:10,paddingBottom:6},
  logo:{fontSize:18,fontWeight:'800',color:COLORS.primary},
  rightRow:{flexDirection:'row',alignItems:'center',gap:10},
  toggle:{flexDirection:'row',backgroundColor:COLORS.bg,borderRadius:99,padding:2,borderWidth:1,borderColor:COLORS.border},
  togBtn:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:10,paddingVertical:6,borderRadius:99},
  togBtnOn:{backgroundColor:COLORS.bg2,shadowColor:'#000',shadowOpacity:0.08,shadowRadius:3,elevation:2},
  togTxt:{fontSize:12,fontWeight:'600',color:COLORS.text3},
  filterIconBtn:{width:36,height:36,borderRadius:18,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'},
  filterBadgeRow:{flexDirection:'row',alignItems:'center',gap:5,marginHorizontal:14,marginBottom:6,backgroundColor:COLORS.primaryLight,borderRadius:99,paddingHorizontal:12,paddingVertical:6,alignSelf:'flex-start',borderWidth:1,borderColor:COLORS.primary+'33'},
});

const ms = StyleSheet.create({
  marker:{alignItems:'center',borderRadius:99,borderWidth:2.5,paddingHorizontal:5,paddingVertical:3,minWidth:34,shadowColor:'#000',shadowOpacity:0.2,shadowRadius:3,elevation:3},
  markerEmoji:{fontSize:14},
  markerPrice:{fontSize:9,fontWeight:'700',color:COLORS.text},
  gasMarker:{alignItems:'center',borderRadius:99,borderWidth:2,borderColor:'#fff',paddingHorizontal:5,paddingVertical:3,minWidth:40,shadowColor:'#000',shadowOpacity:0.25,shadowRadius:4,elevation:4},
  gasEmoji:{fontSize:13},
  gasPrice:{fontSize:9,fontWeight:'700',color:'#fff'},
  loadBar:{position:'absolute',top:10,left:12,right:12,backgroundColor:'rgba(255,255,255,0.97)',borderRadius:10,padding:10,flexDirection:'row',alignItems:'center',gap:8,shadowColor:'#000',shadowOpacity:0.1,shadowRadius:6,elevation:4},
  loadTxt:{fontSize:12,color:COLORS.text2},
  legend:{position:'absolute',bottom:16,left:12,flexDirection:'row',alignItems:'center',gap:10,backgroundColor:'rgba(255,255,255,0.97)',borderRadius:10,paddingHorizontal:12,paddingVertical:8,shadowColor:'#000',shadowOpacity:0.1,shadowRadius:6,elevation:3},
  legendItem:{flexDirection:'row',alignItems:'center',gap:4},
  legendDot:{width:10,height:10,borderRadius:5},
  legendTxt:{fontSize:11,color:COLORS.text2,fontWeight:'500'},
  fab:{position:'absolute',bottom:16,right:16,width:52,height:52,borderRadius:99,backgroundColor:COLORS.primary,alignItems:'center',justifyContent:'center',shadowColor:'#000',shadowOpacity:0.25,shadowRadius:8,elevation:6},
});

const lcs = StyleSheet.create({
  card:{backgroundColor:COLORS.bg2,borderRadius:14,borderWidth:0.5,borderColor:COLORS.border,flexDirection:'row',padding:12,gap:10,alignItems:'center'},
  icon:{width:44,height:44,borderRadius:10,alignItems:'center',justifyContent:'center'},
  info:{flex:1,gap:2},
  name:{fontSize:15,fontWeight:'600',color:COLORS.text},
  sub:{fontSize:12,color:COLORS.text3},
  pricePill:{alignSelf:'flex-start',borderRadius:99,paddingHorizontal:8,paddingVertical:2,marginTop:2},
  pricePillTxt:{fontSize:11,fontWeight:'700'},
  right:{alignItems:'flex-end',gap:6},
  dist:{fontSize:12,color:COLORS.text3},
  navBtn:{backgroundColor:COLORS.primary,borderRadius:99,paddingHorizontal:12,paddingVertical:6},
  navTxt:{fontSize:12,fontWeight:'700',color:'#fff'},
});

const gcs = StyleSheet.create({
  wrap:{flex:1,backgroundColor:COLORS.bg2},
  handle:{width:40,height:4,borderRadius:99,backgroundColor:COLORS.border,alignSelf:'center',marginTop:10},
  header:{flexDirection:'row',alignItems:'center',gap:12,padding:16,borderBottomWidth:0.5,borderBottomColor:COLORS.border},
  iconBg:{width:52,height:52,borderRadius:14,alignItems:'center',justifyContent:'center'},
  title:{fontSize:17,fontWeight:'700',color:COLORS.text,lineHeight:22},
  sub:{fontSize:12,color:COLORS.text2,marginTop:2},
  hours:{fontSize:11,color:COLORS.text3,marginTop:1},
  closeBtn:{width:32,height:32,borderRadius:99,backgroundColor:COLORS.bg,alignItems:'center',justifyContent:'center'},
  hero:{borderRadius:16,padding:18,alignItems:'center',marginBottom:18},
  heroLbl:{fontSize:14,fontWeight:'600',opacity:0.9},
  heroPrice:{fontSize:40,fontWeight:'800',marginVertical:4},
  heroTag:{fontSize:13,fontWeight:'700'},
  sectionTitle:{fontSize:11,fontWeight:'700',color:COLORS.text3,letterSpacing:0.5,marginBottom:4},
  sectionNote:{fontSize:11,color:COLORS.text3,marginBottom:12},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:20},
  fuelCard:{width:'47%',borderRadius:12,overflow:'hidden',backgroundColor:COLORS.bg2,borderWidth:0.5,borderColor:COLORS.border},
  fuelBar:{height:5},
  fuelName:{fontSize:13,fontWeight:'700',color:COLORS.text,marginBottom:2},
  fuelPrice:{fontSize:24,fontWeight:'800'},
  fuelUnit:{fontSize:11,color:COLORS.text3,marginBottom:6},
  fuelBadge:{alignSelf:'flex-start',borderRadius:99,paddingHorizontal:8,paddingVertical:2},
  fuelBadgeTxt:{fontSize:11,fontWeight:'600'},
  navBtn:{backgroundColor:COLORS.primary,borderRadius:99,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,padding:14},
  navBtnTxt:{color:'#fff',fontWeight:'700',fontSize:15},
});

const pcs = StyleSheet.create({
  wrap:{flex:1,backgroundColor:COLORS.bg2},
  handle:{width:40,height:4,borderRadius:99,backgroundColor:COLORS.border,alignSelf:'center',marginTop:10},
  header:{flexDirection:'row',alignItems:'center',gap:12,padding:16,borderBottomWidth:0.5,borderBottomColor:COLORS.border},
  iconBg:{width:48,height:48,borderRadius:12,alignItems:'center',justifyContent:'center'},
  title:{fontSize:17,fontWeight:'700',color:COLORS.text},
  sub:{fontSize:12,color:COLORS.text2,marginTop:2},
  closeBtn:{width:32,height:32,borderRadius:99,backgroundColor:COLORS.bg,alignItems:'center',justifyContent:'center'},
  actions:{flexDirection:'row',gap:10,marginBottom:18},
  actionBtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,backgroundColor:COLORS.primaryLight,borderRadius:99,padding:12,borderWidth:1,borderColor:COLORS.primary},
  actionTxt:{fontSize:13,fontWeight:'600',color:COLORS.primary},
  actionBtnNav:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,backgroundColor:COLORS.primary,borderRadius:99,padding:12},
  actionTxtNav:{fontSize:13,fontWeight:'600',color:'#fff'},
  sectionTitle:{fontSize:11,fontWeight:'700',color:COLORS.text3,letterSpacing:0.5,marginBottom:12},
  emptyBox:{alignItems:'center',padding:28},
  emptyTxt:{fontSize:14,color:COLORS.text3,textAlign:'center',lineHeight:22},
  priceRow:{flexDirection:'row',alignItems:'flex-start',paddingVertical:12,borderBottomWidth:0.5,borderBottomColor:COLORS.border,gap:10},
  product:{fontSize:15,fontWeight:'600',color:COLORS.text},
  reporter:{fontSize:12,color:COLORS.text3,marginTop:2},
  statusBadge:{alignSelf:'flex-start',borderRadius:99,paddingHorizontal:8,paddingVertical:3,marginTop:6},
  statusTxt:{fontSize:11,fontWeight:'600'},
  price:{fontSize:22,fontWeight:'800',color:COLORS.primary},
  unit:{fontSize:11,fontWeight:'400',color:COLORS.text3},
  addPriceBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,margin:12,padding:12,backgroundColor:COLORS.primaryLight,borderRadius:12,borderWidth:1,borderColor:COLORS.primary+'44'},
});
