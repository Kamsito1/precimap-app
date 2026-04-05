import React, { useState } from 'react';
import {
  View, Text, Modal, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
const getLocation = () => require('expo-location');
import { COLORS, apiPost, CATEGORY_INFO, fmtP } from '../utils';

const PLACE_TYPES = [
  { key:'restaurante', label:'Cafetería / Bar', icon:'cafe-outline', fields:['price_cafe','price_cerveza','price_menu'] },
  { key:'supermercado', label:'Supermercado', icon:'cart-outline', fields:['price_range'] },
  { key:'farmacia', label:'Farmacia', icon:'medkit-outline', fields:['product_search'] },
  { key:'gimnasio', label:'Gimnasio', icon:'barbell-outline', fields:['monthly_fee'] },
  { key:'peluqueria', label:'Peluquería', icon:'cut-outline', fields:['price_range'] },
  { key:'peluqueria_canina', label:'Peluquería Canina', icon:'paw-outline', fields:['price_range'] },
  { key:'veterinario', label:'Veterinario', icon:'medical-outline', fields:['price_range'] },
  { key:'carniceria', label:'Carnicería', icon:'flame-outline', fields:['price_range'] },
  { key:'fruteria', label:'Frutería', icon:'leaf-outline', fields:['price_range'] },
  { key:'panaderia', label:'Panadería', icon:'nutrition-outline', fields:['price_range'] },
  { key:'pescaderia', label:'Pescadería', icon:'fish-outline', fields:['price_range'] },
  { key:'estanco', label:'Estanco', icon:'cube-outline', fields:['price_range'] },
  { key:'ferreteria', label:'Ferretería', icon:'hammer-outline', fields:['price_range'] },
  { key:'lavanderia', label:'Lavandería', icon:'water-outline', fields:['price_range'] },
];

const PRICE_RANGES = [
  { value:1, label:'€ Económico', color:'#16A34A', desc:'Precios bajos' },
  { value:2, label:'€€ Normal', color:'#65A30D', desc:'Precios medios' },
  { value:3, label:'€€€ Caro', color:'#D97706', desc:'Precios altos' },
  { value:4, label:'€€€€ Premium', color:'#DC2626', desc:'Precios muy altos' },
];

export default function AddGasStationModal({ visible, onClose, onSuccess, activeCat }) {
  const [step, setStep] = useState(0); // 0=tipo, 1=info, 2=precios
  const [placeType, setPlaceType] = useState(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [priceRange, setPriceRange] = useState(null);
  const [priceCafe, setPriceCafe] = useState('');
  const [priceCerveza, setPriceCerveza] = useState('');
  const [priceMenu, setPriceMenu] = useState('');
  const [monthlyFee, setMonthlyFee] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = React.useRef(null);

  function reset() {
    setStep(0); setPlaceType(null); setName(''); setAddress(''); setCity('');
    setLat(''); setLng(''); setPriceRange(null); setPriceCafe('');
    setPriceCerveza(''); setPriceMenu(''); setMonthlyFee(''); setError('');
    setSearchQuery(''); setSearchResults([]);
  }

  function handleClose() { reset(); onClose(); }

  async function getGPS() {
    setLocating(true);
    try {
      const Location = getLocation();
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return Alert.alert('Permiso denegado', 'Necesitamos acceso a tu ubicación.');
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (!loc?.coords?.latitude || !loc?.coords?.longitude) return Alert.alert('Error', 'No se pudo obtener la ubicación.');
      setLat(loc.coords.latitude.toFixed(6));
      setLng(loc.coords.longitude.toFixed(6));
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        if (geo[0]) {
          if (geo[0].street) setAddress(geo[0].street + (geo[0].streetNumber ? ' ' + geo[0].streetNumber : ''));
          if (geo[0].city) setCity(geo[0].city);
        }
      } catch(_) {}
    } catch(_) { Alert.alert('Error', 'No se pudo obtener la ubicación.'); }
    finally { setLocating(false); }
  }

  // Search address using geocoding
  function onSearchAddress(text) {
    setSearchQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!text || text.length < 3) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const Location = getLocation();
        const results = await Location.geocodeAsync(text + ', España');
        if (results && results.length > 0) {
          // Reverse geocode each result to get readable addresses
          const detailed = [];
          for (const r of results.slice(0, 5)) {
            try {
              const geo = await Location.reverseGeocodeAsync({ latitude: r.latitude, longitude: r.longitude });
              const g = geo?.[0] || {};
              const street = [g.street, g.streetNumber].filter(Boolean).join(' ');
              const displayCity = g.city || g.subregion || '';
              const displayAddr = [street, displayCity, g.region].filter(Boolean).join(', ');
              detailed.push({
                lat: r.latitude, lng: r.longitude,
                address: street, city: displayCity,
                display: displayAddr || `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`,
              });
            } catch(_) {
              detailed.push({
                lat: r.latitude, lng: r.longitude,
                address: '', city: '',
                display: `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`,
              });
            }
          }
          setSearchResults(detailed);
        } else {
          setSearchResults([]);
        }
      } catch(_) { setSearchResults([]); }
      finally { setSearching(false); }
    }, 500); // debounce 500ms
  }

  function selectSearchResult(result) {
    setLat(result.lat.toFixed(6));
    setLng(result.lng.toFixed(6));
    if (result.address) setAddress(result.address);
    if (result.city) setCity(result.city);
    setSearchQuery(result.display);
    setSearchResults([]);
  }

  async function submit() {
    setError('');
    if (!name.trim()) return setError('El nombre es obligatorio');
    if (!lat || !lng) return setError('La ubicación GPS es obligatoria');
    if (!placeType) return setError('Selecciona un tipo de lugar');
    // Validate required fields per type
    const typeInfo = PLACE_TYPES.find(t => t.key === placeType);
    if (typeInfo?.fields.includes('price_range') && !priceRange) return setError('Selecciona un rango de precios');
    if (typeInfo?.fields.includes('monthly_fee') && !monthlyFee) return setError('Indica la cuota mensual');
    if (typeInfo?.fields.includes('price_cafe') && !priceCafe && !priceCerveza && !priceMenu)
      return setError('Indica al menos un precio (café, cerveza o menú)');

    setLoading(true);
    try {
      // Create the place
      const placeRes = await apiPost('/api/places', {
        name: name.trim(), category: placeType,
        lat: parseFloat(lat), lng: parseFloat(lng),
        address: address.trim(), city: city.trim(),
        price_range: priceRange || null,
        monthly_fee: monthlyFee ? parseFloat(String(monthlyFee).replace(',','.')) : null,
        subcategory: placeType,
      });
      if (placeRes.error) return setError(placeRes.error);
      const placeId = placeRes.id || placeRes.place?.id;

      // Add prices if provided
      if (placeId) {
        const prices = [];
        if (priceCafe) prices.push({ product: 'Café con leche', price: parseFloat(priceCafe) });
        if (priceCerveza) prices.push({ product: 'Caña de cerveza', price: parseFloat(priceCerveza) });
        if (priceMenu) prices.push({ product: 'Menú del día', price: parseFloat(priceMenu) });
        if (monthlyFee) prices.push({ product: 'Cuota mensual', price: parseFloat(String(monthlyFee).replace(',','.')) });
        for (const p of prices) {
          await apiPost('/api/prices', { place_id: placeId, ...p }).catch(() => {});
        }
      }
      Alert.alert('✅ ¡Nuevo lugar añadido!', 'Aparecerá con el badge "NUEVO". La comunidad votará para verificar los precios.');
      reset();
      onSuccess?.();
    } catch(_) { setError('Error de conexión'); }
    finally { setLoading(false); }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>
        <View style={s.wrap}>
          <View style={s.header}>
            <TouchableOpacity onPress={step > 0 ? () => setStep(step-1) : handleClose} style={s.closeBtn}>
              <Ionicons name={step > 0 ? 'arrow-back' : 'close'} size={20} color={COLORS.text2}/>
            </TouchableOpacity>
            <Text style={s.title}><Ionicons name="location-outline" size={18} color={COLORS.text}/> Añadir lugar</Text>
            <View style={{width:32}}/>
          </View>

          {/* Step indicator */}
          <View style={{flexDirection:'row',paddingHorizontal:16,paddingVertical:8,gap:4}}>
            {[0,1,2].map(i => (
              <View key={i} style={{flex:1,height:3,borderRadius:2,backgroundColor: i <= step ? COLORS.primary : COLORS.border}}/>
            ))}
          </View>

          <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">

            {/* STEP 0: Choose type */}
            {step === 0 && (
              <View style={{gap:10}}>
                <Text style={{fontSize:18,fontWeight:'700',color:COLORS.text,marginBottom:4}}>¿Qué tipo de lugar quieres añadir?</Text>
                <View style={{backgroundColor:'#FEF3C7',borderRadius:12,padding:10,flexDirection:'row',gap:8,marginBottom:8}}>
                  <Ionicons name="information-circle-outline" size={16} color="#92400E"/>
                  <Text style={{flex:1,fontSize:12,color:'#92400E'}}>Las gasolineras ya están registradas por el Ministerio de Energía. Solo puedes añadir otros tipos de lugares.</Text>
                </View>
                {PLACE_TYPES.map(t => (
                  <TouchableOpacity key={t.key}
                    style={{flexDirection:'row',alignItems:'center',gap:12,backgroundColor: placeType===t.key ? COLORS.primaryLight : COLORS.bg2,
                      borderRadius:14,padding:14,borderWidth:1.5,borderColor: placeType===t.key ? COLORS.primary : COLORS.border}}
                    onPress={() => { setPlaceType(t.key); }}>
                    <View style={{width:44,height:44,borderRadius:12,backgroundColor:placeType===t.key?COLORS.primary+'18':COLORS.bg3,alignItems:'center',justifyContent:'center'}}>
                      <Ionicons name={t.icon} size={22} color={placeType===t.key?COLORS.primary:COLORS.text2}/>
                    </View>
                    <Text style={{flex:1,fontSize:15,fontWeight:'600',color: placeType===t.key ? COLORS.primary : COLORS.text}}>{t.label}</Text>
                    {placeType===t.key && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary}/>}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={[s.nextBtn, !placeType && {opacity:0.4}]} onPress={() => placeType && setStep(1)} disabled={!placeType}>
                  <Text style={s.nextTxt}>Siguiente</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff"/>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 1: Location info */}
            {step === 1 && (
              <View style={{gap:4}}>
                <Text style={{fontSize:18,fontWeight:'700',color:COLORS.text,marginBottom:8}}>
                  <Ionicons name={PLACE_TYPES.find(t=>t.key===placeType)?.icon||'location-outline'} size={18} color={COLORS.text}/> Información del lugar
                </Text>
                <Text style={s.label}>Nombre del establecimiento *</Text>
                <TextInput style={s.input} value={name} onChangeText={setName}
                  placeholder={placeType==='restaurante' ? 'Ej: Bar El Rincón' : placeType==='gimnasio' ? 'Ej: McFit Córdoba' : 'Nombre del lugar'}
                  placeholderTextColor={COLORS.text3}/>

                {/* ADDRESS SEARCH */}
                <Text style={[s.label,{marginTop:14}]}>Ubicación *</Text>
                <View style={{backgroundColor:COLORS.bg3,borderRadius:12,borderWidth:1.5,borderColor:(lat&&lng)?COLORS.success:COLORS.primary,overflow:'hidden'}}>
                  <View style={{flexDirection:'row',alignItems:'center',paddingHorizontal:12,gap:8}}>
                    <Ionicons name="search-outline" size={16} color={COLORS.text3}/>
                    <TextInput style={{flex:1,paddingVertical:12,fontSize:14,color:COLORS.text}}
                      value={searchQuery} onChangeText={onSearchAddress}
                      placeholder="Buscar dirección, calle, ciudad..."
                      placeholderTextColor={COLORS.text3} returnKeyType="search"/>
                    {searching && <ActivityIndicator size="small" color={COLORS.primary}/>}
                    {searchQuery ? <TouchableOpacity onPress={()=>{setSearchQuery('');setSearchResults([]);}}><Ionicons name="close-circle" size={18} color={COLORS.text3}/></TouchableOpacity> : null}
                  </View>
                  {/* Search results dropdown */}
                  {searchResults.length > 0 && (
                    <View style={{borderTopWidth:0.5,borderTopColor:COLORS.border}}>
                      {searchResults.map((r,i) => (
                        <TouchableOpacity key={i} style={{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:12,paddingVertical:10,
                          borderBottomWidth:i<searchResults.length-1?0.5:0,borderBottomColor:COLORS.border,backgroundColor:COLORS.bg2}}
                          onPress={() => selectSearchResult(r)}>
                          <Ionicons name="location" size={16} color={COLORS.primary}/>
                          <Text style={{flex:1,fontSize:13,color:COLORS.text}} numberOfLines={2}>{r.display}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* OR use GPS */}
                <Text style={{fontSize:11,color:COLORS.text3,textAlign:'center',marginVertical:6}}>— o —</Text>
                <TouchableOpacity style={[s.gpsBtn,(lat&&lng)&&s.gpsBtnOn]} onPress={getGPS} disabled={locating}>
                  {locating ? <ActivityIndicator size="small" color={COLORS.primary}/>
                    : <Ionicons name={(lat&&lng)?'checkmark-circle':'locate-outline'} size={18} color={(lat&&lng)?COLORS.success:COLORS.primary}/>}
                  <Text style={[s.gpsTxt,(lat&&lng)&&{color:COLORS.success}]}>
                    {(lat&&lng) ? 'Ubicación obtenida' : 'Usar mi ubicación actual'}
                  </Text>
                </TouchableOpacity>

                {/* Show selected location */}
                {(lat&&lng) && (
                  <View style={{backgroundColor:COLORS.successLight,borderRadius:10,padding:10,flexDirection:'row',gap:8,alignItems:'center',marginTop:4,borderWidth:1,borderColor:COLORS.success+'44'}}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.success}/>
                    <View style={{flex:1}}>
                      <Text style={{fontSize:12,fontWeight:'600',color:COLORS.success}}>Ubicación seleccionada</Text>
                      <Text style={{fontSize:11,color:COLORS.text3,marginTop:1}}>{address ? address + (city ? ', ' + city : '') : `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`}</Text>
                    </View>
                    <TouchableOpacity onPress={()=>{setLat('');setLng('');setSearchQuery('');}}>
                      <Ionicons name="close-circle-outline" size={18} color={COLORS.text3}/>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Manual fields (hidden by default, auto-filled by search/GPS) */}
                {(lat&&lng) && !address && (
                  <>
                    <Text style={s.label}>Dirección (opcional)</Text>
                    <TextInput style={s.input} value={address} onChangeText={setAddress} placeholder="Calle y número" placeholderTextColor={COLORS.text3}/>
                  </>
                )}
                {(lat&&lng) && !city && (
                  <>
                    <Text style={s.label}>Ciudad</Text>
                    <TextInput style={s.input} value={city} onChangeText={setCity} placeholder="Ej: Córdoba" placeholderTextColor={COLORS.text3}/>
                  </>
                )}

                <TouchableOpacity style={[s.nextBtn, (!name.trim()||!lat||!lng) && {opacity:0.4}]}
                  onPress={() => (name.trim()&&lat&&lng) && setStep(2)} disabled={!name.trim()||!lat||!lng}>
                  <Text style={s.nextTxt}>Siguiente: Precios</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff"/>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 2: Prices — personalized per category */}
            {step === 2 && (
              <View style={{gap:8}}>
                <Text style={{fontSize:18,fontWeight:'700',color:COLORS.text,marginBottom:4}}>
                  <Ionicons name="wallet-outline" size={18} color={COLORS.primary}/> Precios de {name || 'tu lugar'}
                </Text>

                {/* Restaurante: café, cerveza, menú */}
                {placeType === 'restaurante' && (
                  <View style={{gap:10}}>
                    <Text style={{fontSize:13,color:COLORS.text3,marginBottom:4}}>Indica los precios que conozcas (al menos 1):</Text>
                    <View style={{gap:8}}>
                      <View style={s.priceRow}>
                        <Ionicons name="cafe-outline" size={16} color={COLORS.text2}/>
                        <Text style={s.priceLabel}>Café con leche</Text>
                        <TextInput style={s.priceInput} value={priceCafe} onChangeText={setPriceCafe}
                          placeholder="1,20" placeholderTextColor={COLORS.text3} keyboardType="decimal-pad"/>
                        <Text style={{fontSize:14,color:COLORS.text3}}>€</Text>
                      </View>
                      <View style={s.priceRow}>
                        <Ionicons name="beer-outline" size={16} color={COLORS.text2}/>
                        <Text style={s.priceLabel}>Caña de cerveza</Text>
                        <TextInput style={s.priceInput} value={priceCerveza} onChangeText={setPriceCerveza}
                          placeholder="1,80" placeholderTextColor={COLORS.text3} keyboardType="decimal-pad"/>
                        <Text style={{fontSize:14,color:COLORS.text3}}>€</Text>
                      </View>
                      <View style={s.priceRow}>
                        <Ionicons name="restaurant-outline" size={16} color={COLORS.text2}/>
                        <Text style={s.priceLabel}>Menú del día</Text>
                        <TextInput style={s.priceInput} value={priceMenu} onChangeText={setPriceMenu}
                          placeholder="11,00" placeholderTextColor={COLORS.text3} keyboardType="decimal-pad"/>
                        <Text style={{fontSize:14,color:COLORS.text3}}>€</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Gimnasio: cuota mensual */}
                {placeType === 'gimnasio' && (
                  <View style={{gap:10}}>
                    <Text style={{fontSize:13,color:COLORS.text3}}>¿Cuánto cuesta la cuota mensual?</Text>
                    <View style={s.priceRow}>
                      <Ionicons name="barbell-outline" size={16} color={COLORS.text2}/>
                      <Text style={s.priceLabel}>Cuota mensual</Text>
                      <TextInput style={s.priceInput} value={monthlyFee} onChangeText={setMonthlyFee}
                        placeholder="29,99" placeholderTextColor={COLORS.text3} keyboardType="decimal-pad"/>
                      <Text style={{fontSize:14,color:COLORS.text3}}>€/mes</Text>
                    </View>
                  </View>
                )}

                {/* Supermercado, farmacia, peluquería, etc: rango de precios */}
                {['supermercado','farmacia','peluqueria','peluqueria_canina','veterinario'].includes(placeType) && (
                  <View style={{gap:10}}>
                    <Text style={{fontSize:13,color:COLORS.text3}}>¿Cómo son los precios de este lugar?</Text>
                    {PRICE_RANGES.map(r => (
                      <TouchableOpacity key={r.value}
                        style={{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderRadius:12,
                          borderWidth:1.5,borderColor: priceRange===r.value ? r.color : COLORS.border,
                          backgroundColor: priceRange===r.value ? r.color+'18' : COLORS.bg}}
                        onPress={() => setPriceRange(r.value)}>
                        <Text style={{fontSize:18,fontWeight:'800',color:r.color}}>{r.label.split(' ')[0]}</Text>
                        <View style={{flex:1}}>
                          <Text style={{fontSize:14,fontWeight:'600',color: priceRange===r.value ? r.color : COLORS.text}}>{r.label}</Text>
                          <Text style={{fontSize:11,color:COLORS.text3}}>{r.desc}</Text>
                        </View>
                        {priceRange===r.value && <Ionicons name="checkmark-circle" size={20} color={r.color}/>}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {error ? <View style={s.errBox}><Text style={s.errTxt}>{error}</Text></View> : null}

                <TouchableOpacity style={[s.submitBtn, loading&&{opacity:0.7}]} onPress={submit} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff"/> : (
                    <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                      <Ionicons name="checkmark-circle" size={20} color="#fff"/>
                      <Text style={s.submitTxt}>Publicar lugar (+5 pts)</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={{fontSize:11,color:COLORS.text3,textAlign:'center',marginTop:8}}>
                  Aparecerá con badge "NUEVO". La comunidad votará para verificar la información.
                </Text>
              </View>
            )}

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap:{flex:1,backgroundColor:COLORS.bg2},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:16,borderBottomWidth:0.5,borderBottomColor:COLORS.border},
  title:{fontSize:18,fontWeight:'700',color:COLORS.text},
  closeBtn:{width:32,height:32,borderRadius:16,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'},
  body:{padding:16,paddingBottom:60,gap:4},
  label:{fontSize:13,fontWeight:'600',color:COLORS.text,marginBottom:4,marginTop:10},
  input:{backgroundColor:COLORS.bg3,borderRadius:12,borderWidth:1.5,borderColor:COLORS.border,paddingHorizontal:14,paddingVertical:12,fontSize:15,color:COLORS.text},
  gpsBtn:{flexDirection:'row',alignItems:'center',gap:10,backgroundColor:COLORS.primaryLight,borderRadius:12,padding:14,borderWidth:1.5,borderColor:COLORS.primary,marginVertical:10},
  gpsBtnOn:{backgroundColor:COLORS.successLight,borderColor:COLORS.success},
  gpsTxt:{flex:1,fontSize:13,color:COLORS.primary,fontWeight:'500'},
  nextBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:COLORS.primary,borderRadius:14,padding:16,marginTop:16},
  nextTxt:{color:'#fff',fontWeight:'700',fontSize:16},
  priceRow:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:COLORS.bg3,borderRadius:12,padding:12,borderWidth:1,borderColor:COLORS.border},
  priceLabel:{flex:1,fontSize:14,fontWeight:'600',color:COLORS.text},
  priceInput:{width:70,fontSize:18,fontWeight:'700',color:COLORS.primary,textAlign:'right'},
  errBox:{backgroundColor:COLORS.dangerLight,borderRadius:10,padding:12,marginTop:8},
  errTxt:{color:COLORS.danger,fontSize:13},
  submitBtn:{backgroundColor:COLORS.success,borderRadius:14,padding:16,alignItems:'center',marginTop:12},
  submitTxt:{color:'#fff',fontWeight:'700',fontSize:16},
});
