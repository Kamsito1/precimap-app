import React, { useState, useRef } from 'react';
import {
  View, Text, Modal, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, apiUpload, apiPost, apiGet, detectStore, applyAffiliateTag, API_BASE } from '../utils';

const CATS = [
  {key:'tecnologia',label:'Tecnología',emoji:'💻'},
  {key:'moda',label:'Moda',emoji:'👗'},
  {key:'hogar',label:'Hogar',emoji:'🏠'},
  {key:'alimentacion',label:'Alimentación',emoji:'🛒'},
  {key:'viajes',label:'Viajes',emoji:'✈️'},
  {key:'deportes',label:'Deportes',emoji:'⚽'},
  {key:'belleza',label:'Belleza',emoji:'💄'},
  {key:'libros',label:'Libros',emoji:'📚'},
  {key:'juegos',label:'Gaming',emoji:'🎮'},
  {key:'ocio',label:'Ocio',emoji:'🎭'},
  {key:'salud',label:'Salud',emoji:'💊'},
  {key:'mascotas',label:'Mascotas',emoji:'🐾'},
  {key:'infantil',label:'Infantil',emoji:'👶'},
  {key:'otros',label:'Otros',emoji:'🏷️'},
];

export default function AddDealModal({ visible, onClose, onSuccess }) {
  const [title,      setTitle]      = useState('');
  const [url,        setUrl]        = useState('');
  const [price,      setPrice]      = useState('');
  const [original,   setOriginal]   = useState('');
  const [store,      setStore]      = useState('');
  const [cat,        setCat]        = useState('otros');
  const [images,     setImages]     = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [duplicates, setDuplicates] = useState([]);
  const [dupLoading, setDupLoading] = useState(false);
  const [confirmed,  setConfirmed]  = useState(false); // user confirmed despite duplicate
  const dupTimerRef = useRef(null);
  const amazonTimerRef = useRef(null);
  const dupTitleTimerRef = useRef(null);

  function reset() {
    setTitle(''); setUrl(''); setPrice(''); setOriginal('');
    setStore(''); setCat('otros'); setImages([]); setError('');
    setDuplicates([]); setConfirmed(false);
  }

  // Check for duplicates after URL or title changes (debounced)
  async function checkDuplicates(checkUrl, checkTitle) {
    if ((!checkUrl || checkUrl.length < 10) && (!checkTitle || checkTitle.length < 5)) return;
    setDupLoading(true);
    try {
      const res = await apiPost('/api/deals/check-duplicate', { url: checkUrl, title: checkTitle });
      setDuplicates(res?.duplicates || []);
      if (res?.duplicates?.length > 0) setConfirmed(false);
    } catch {}
    finally { setDupLoading(false); }
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setImages(prev => {
        const combined = [...prev, ...result.assets];
        return combined.slice(0, 5); // max 5 photos
      });
    }
  }

  function removeImage(idx) {
    setImages(prev => prev.filter((_,i) => i !== idx));
  }

  async function submit() {
    setError('');
    if (!title.trim()) return setError('El título es obligatorio');
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) return setError('Introduce un precio válido');
    if (url.trim() && !url.trim().startsWith('http')) return setError('La URL debe empezar por http:// o https://');

    // Block if duplicates found and not confirmed
    if (duplicates.length > 0 && !confirmed) {
      return setError('Ya existe un chollo similar. Confirma que es diferente para publicarlo.');
    }

    setLoading(true);
    try {
      const detectedStore = store.trim() || detectStore(url) || '';
      // Silently apply affiliate tag (user doesn't see this)
      const finalUrl = url.trim() ? applyAffiliateTag(url.trim()) : '';
      const res = await apiUpload('/api/deals', {
        title: title.trim(),
        url: finalUrl,
        deal_price: parseFloat(price),
        original_price: original && parseFloat(original) > 0 ? parseFloat(original) : '',
        store: detectedStore,
        category: cat,
      }, images[0]?.uri || null, 'image');
      if (res.error) return setError(res.error);
      reset(); onSuccess?.();
    } catch(e) { setError(`Error: ${e.message || 'Sin conexión'}`); }
    finally { setLoading(false); }
  }

  function handleUrlChange(v) {
    setUrl(v);
    const s = detectStore(v);
    if (s) setStore(s);
    // Auto-detect category
    const url_low = v.toLowerCase();
    const store_low = (s||'').toLowerCase();
    const catGuess =
      /(amazon|media|pc|gaming|playstation|xbox|nintendo|steam|fnac|apple|samsung|iphone|laptop|portátil|auricular)/i.test(store_low+url_low) ? 'tecnologia' :
      /(zara|mango|primark|pull|asos|shein|bershka|lefties|moda|ropa|calzado|zapatilla|vestido)/i.test(store_low+url_low) ? 'moda' :
      /(ikea|leroy|bricomart|hogar|sofa|colchon|mueble|aspirador|robot|freidora|cafetera)/i.test(url_low) ? 'hogar' :
      /(mercadona|lidl|aldi|carrefour|dia|supermercado|aliment|aceite|pasta|arroz|leche)/i.test(store_low+url_low) ? 'alimentacion' :
      /(vueling|iberia|ryanair|booking|airbnb|viaje|hotel|vuelo|sky|trivago|renfe)/i.test(store_low+url_low) ? 'viajes' :
      /(nike|adidas|decathlon|deporte|gym|fitness|running|bicicleta|pesas|yoga)/i.test(store_low+url_low) ? 'deportes' :
      /(sephora|druni|douglas|perfum|cosmet|belleza|beauty|serum|crema|maquillaje)/i.test(url_low) ? 'belleza' :
      /(libro|fnac|book|audible|comic|manga|novela)/i.test(url_low) ? 'libros' :
      /(ps5|playstation|xbox|nintendo|steam|gaming|videojuego|game|rpg|fps)/i.test(url_low) ? 'juegos' :
      /(spotify|netflix|disney|hbo|prime|cine|teatro|musica|concierto|festival|ocio|leisure)/i.test(url_low) ? 'ocio' :
      /(farmacia|salud|vitamina|suplemento|proteina|collagen|ibuprofeno|medicamento)/i.test(url_low) ? 'salud' :
      /(mascota|perro|gato|veterinario|pienso|acuario|pajaro|roedor)/i.test(url_low) ? 'mascotas' :
      /(bebe|infantil|juguete|cuna|cochecito|pañal|guarderia|jugueteria)/i.test(url_low) ? 'infantil' :
      /(coches|motor|automocion|pcm|leasing|coche|moto|neumatico)/i.test(url_low) ? 'coches' : null;
    if (catGuess) setCat(catGuess);

    if (v.startsWith('http') && v.length > 20) {
      // Duplicate check
      clearTimeout(dupTimerRef.current);
      dupTimerRef.current = setTimeout(() => checkDuplicates(v, title), 800);

      // Amazon PA API autofill — if Amazon URL and no title yet
      if ((v.includes('amazon.es') || v.includes('amazon.com') || v.includes('amzn')) && !title) {
        clearTimeout(amazonTimerRef.current);
        amazonTimerRef.current = setTimeout(async () => {
          try {
            const res = await fetch(`${API_BASE}/api/amazon/product?url=${encodeURIComponent(v)}`);
            if (res.ok) {
              const data = await res.json();
              if (data.title && !title) setTitle(data.title);
              if (data.price && !price) setPrice(String(data.price));
              if (data.originalPrice && !original) setOriginal(String(data.originalPrice));
            }
          } catch {}
        }, 1500);
      }
    }
  }

  function handleTitleChange(v) {
    setTitle(v);
    if (v.length > 8) {
      clearTimeout(dupTitleTimerRef.current);
      dupTitleTimerRef.current = setTimeout(() => checkDuplicates(url, v), 1200);
    }
  }

  const disc = price && original && !isNaN(+price) && !isNaN(+original) && +original > +price
    ? Math.round((1 - +price / +original) * 100) : null;
  const savingEuros = disc && +original > +price ? (+original - +price).toFixed(2) : null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>
        <View style={s.wrap}>
          <View style={s.header}>
            <Text style={s.title}>🔥 Publicar chollo</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={20} color={COLORS.text2}/>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Multi-photo carousel picker */}
            <View style={s.photosSection}>
              <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                <Text style={s.photoLabel}>Fotos del chollo ({images.length}/5)</Text>
                {images.length > 0 && (
                  <Text style={{fontSize:11,color:COLORS.text3}}>Los chollos con fotos tienen 3× más votos</Text>
                )}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>
                {/* Add button */}
                {images.length < 5 && (
                  <TouchableOpacity style={s.addPhotoBtn} onPress={pickImage}>
                    <Ionicons name="camera-outline" size={28} color={COLORS.primary}/>
                    <Text style={{fontSize:10,color:COLORS.primary,fontWeight:'600',marginTop:4}}>Añadir</Text>
                    <Text style={{fontSize:9,color:COLORS.text3}}>hasta 5</Text>
                  </TouchableOpacity>
                )}
                {/* Photo thumbnails */}
                {images.map((img, idx) => (
                  <View key={idx} style={s.photoThumb}>
                    <Image source={{uri: img.uri}} style={s.photoThumbImg} resizeMode="cover"/>
                    {idx === 0 && (
                      <View style={s.photoPrimary}>
                        <Text style={{fontSize:8,color:'#fff',fontWeight:'700'}}>PRINCIPAL</Text>
                      </View>
                    )}
                    <TouchableOpacity style={s.photoRemove} onPress={() => removeImage(idx)}>
                      <Ionicons name="close-circle" size={18} color="#DC2626"/>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* URL — autodetects store + duplicate check */}
            <Field label="URL del producto">
              <TextInput style={s.input} value={url} onChangeText={handleUrlChange}
                placeholder="https://amazon.es/..." keyboardType="url" autoCapitalize="none"
                placeholderTextColor={COLORS.text3}/>
            </Field>
            {store ? <Text style={s.storeDetected}>🏪 Detectado: {store}</Text> : null}
            {dupLoading && <Text style={{fontSize:11,color:COLORS.text3,marginBottom:8}}>🔍 Comprobando duplicados...</Text>}

            {/* DUPLICATE WARNING — Chollometro style */}
            {duplicates.length > 0 && !confirmed && (
              <View style={s.dupWarning}>
                <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:8}}>
                  <Ionicons name="warning" size={18} color="#D97706"/>
                  <Text style={{fontSize:14,fontWeight:'700',color:'#92400E'}}>
                    ⚠️ Ya existe {duplicates.length} chollo similar
                  </Text>
                </View>
                {duplicates.slice(0,2).map(d => (
                  <View key={d.id} style={s.dupItem}>
                    {d.image_url ? <Image source={{uri:d.image_url}} style={s.dupImg}/> : <Text style={{fontSize:20}}>🏷️</Text>}
                    <View style={{flex:1}}>
                      <Text style={{fontSize:12,fontWeight:'600',color:'#92400E'}} numberOfLines={2}>{d.title}</Text>
                      <Text style={{fontSize:11,color:'#B45309'}}>{d.deal_price}€ · {d.store || 'Sin tienda'}</Text>
                      <Text style={{fontSize:10,color:'#B45309',opacity:0.7}}>{d.match_type === 'url_exacta' ? '🔗 URL idéntica' : `📝 ${d.similarity}% similar`}</Text>
                    </View>
                  </View>
                ))}
                <Text style={{fontSize:12,color:'#92400E',marginBottom:8}}>
                  Si tu chollo tiene diferente precio o condición, puedes publicarlo igualmente.
                </Text>
                <TouchableOpacity style={s.dupConfirmBtn} onPress={() => setConfirmed(true)}>
                  <Text style={{color:'#D97706',fontWeight:'700',fontSize:13}}>✓ Es diferente, publicar igualmente</Text>
                </TouchableOpacity>
              </View>
            )}
            {confirmed && duplicates.length > 0 && (
              <View style={{backgroundColor:'#DCFCE7',borderRadius:8,padding:8,marginBottom:8,flexDirection:'row',alignItems:'center',gap:6}}>
                <Ionicons name="checkmark-circle" size={14} color="#16A34A"/>
                <Text style={{fontSize:12,color:'#166534'}}>Confirmado — publicarás tu chollo aunque sea similar</Text>
              </View>
            )}

            {/* Title */}
            <Field label="Título *">
              <TextInput style={s.input} value={title} onChangeText={handleTitleChange}
                placeholder="Ej: TV Samsung 55'' 4K a mitad de precio"
                placeholderTextColor={COLORS.text3} maxLength={120}/>
            </Field>

            {/* Prices */}
            <View style={{flexDirection:'row',gap:10}}>
              <View style={{flex:1}}>
                <Field label="Precio chollo *">
                  <TextInput style={s.input} value={price} onChangeText={setPrice}
                    placeholder="49.99" keyboardType="decimal-pad" placeholderTextColor={COLORS.text3}/>
                </Field>
              </View>
              <View style={{flex:1}}>
                <Field label="Precio original">
                  <TextInput style={s.input} value={original} onChangeText={setOriginal}
                    placeholder="99.99" keyboardType="decimal-pad" placeholderTextColor={COLORS.text3}/>
                </Field>
              </View>
            </View>
            {disc && (
              <View style={s.discBanner}>
                <Text style={s.discBannerTxt}>🎉 ¡Descuento del {disc}%!</Text>
                {savingEuros && <Text style={{fontSize:13,color:'#fff',opacity:0.9}}>El comprador ahorra {savingEuros}€</Text>}
              </View>
            )}

            {/* Store */}
            <Field label="Tienda">
              <TextInput style={s.input} value={store} onChangeText={setStore}
                placeholder="Amazon, MediaMarkt, Zara..." placeholderTextColor={COLORS.text3}/>
            </Field>

            {/* Category */}
            <Text style={s.fieldLabel}>Categoría</Text>
            <View style={s.catGrid}>
              {CATS.map(c=>(
                <TouchableOpacity key={c.key} style={[s.catBtn, cat===c.key && s.catBtnOn]} onPress={()=>setCat(c.key)}>
                  <Text style={s.catEmoji}>{c.emoji}</Text>
                  <Text style={[s.catTxt, cat===c.key && {color:'#fff',fontWeight:'600'}]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {error ? <View style={s.errBox}><Ionicons name="alert-circle-outline" size={15} color={COLORS.danger}/><Text style={s.errTxt}>{error}</Text></View> : null}

            <TouchableOpacity style={[s.submitBtn, loading&&{opacity:0.8}]} onPress={submit} disabled={loading}>
              {loading ? (
                <><ActivityIndicator color="#fff" size="small"/><Text style={s.submitTxt}> Subiendo imagen...</Text></>
              ) : (
                <><Ionicons name="flame" size={18} color="#fff"/><Text style={s.submitTxt}> Publicar chollo (+5 pts)</Text></>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({ label, children }) {
  return <View style={{marginBottom:12}}><Text style={s.fieldLabel}>{label}</Text>{children}</View>;
}

const s = StyleSheet.create({
  wrap:{flex:1,backgroundColor:COLORS.bg2},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:16,borderBottomWidth:0.5,borderBottomColor:COLORS.border},
  title:{fontSize:18,fontWeight:'700',color:COLORS.text},
  closeBtn:{width:32,height:32,borderRadius:16,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'},
  body:{padding:16,paddingBottom:60},
  imgPicker:{borderRadius:16,borderWidth:2,borderColor:COLORS.border,borderStyle:'dashed',height:180,marginBottom:16,overflow:'hidden'},
  imgPickerFilled:{borderStyle:'solid',borderColor:COLORS.primary},
  img:{width:'100%',height:'100%'},
  imgPlaceholder:{flex:1,alignItems:'center',justifyContent:'center',gap:8},
  imgPlaceholderTxt:{fontSize:15,fontWeight:'600',color:COLORS.text3},
  imgPlaceholderSub:{fontSize:12,color:COLORS.text3},
  imgEditBtn:{position:'absolute',bottom:8,right:8,flexDirection:'row',alignItems:'center',gap:4,backgroundColor:'rgba(0,0,0,0.65)',borderRadius:99,paddingHorizontal:10,paddingVertical:5},
  storeDetected:{fontSize:12,color:COLORS.success,fontWeight:'600',marginTop:-8,marginBottom:8},
  photosSection:{marginBottom:16},
  photoLabel:{fontSize:13,fontWeight:'700',color:COLORS.text},
  addPhotoBtn:{width:88,height:88,borderRadius:12,borderWidth:2,borderColor:COLORS.primary,borderStyle:'dashed',alignItems:'center',justifyContent:'center',backgroundColor:COLORS.primaryLight},
  photoThumb:{width:88,height:88,borderRadius:12,overflow:'hidden',borderWidth:2,borderColor:COLORS.border},
  photoThumbImg:{width:'100%',height:'100%'},
  photoPrimary:{position:'absolute',bottom:0,left:0,right:0,backgroundColor:'rgba(37,99,235,0.85)',padding:3,alignItems:'center'},
  photoRemove:{position:'absolute',top:2,right:2},
  fieldLabel:{fontSize:13,fontWeight:'600',color:COLORS.text,marginBottom:6},
  input:{backgroundColor:COLORS.bg3,borderRadius:12,borderWidth:1.5,borderColor:COLORS.border,paddingHorizontal:14,paddingVertical:12,fontSize:15,color:COLORS.text},
  discBanner:{backgroundColor:COLORS.successLight,borderRadius:10,padding:10,marginBottom:12,alignItems:'center'},
  discBannerTxt:{fontSize:14,fontWeight:'700',color:COLORS.success},
  catGrid:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:16},
  catBtn:{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:12,paddingVertical:8,borderRadius:99,borderWidth:1.5,borderColor:COLORS.border,backgroundColor:COLORS.bg},
  catBtnOn:{backgroundColor:COLORS.danger,borderColor:COLORS.danger},
  catEmoji:{fontSize:14},catTxt:{fontSize:13,color:COLORS.text2},
  errBox:{flexDirection:'row',alignItems:'flex-start',gap:8,backgroundColor:COLORS.dangerLight,borderRadius:10,padding:12,marginBottom:12},
  errTxt:{flex:1,color:COLORS.danger,fontSize:13},
  submitBtn:{backgroundColor:COLORS.danger,borderRadius:14,paddingVertical:16,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,shadowColor:COLORS.danger,shadowOffset:{width:0,height:4},shadowOpacity:0.3,shadowRadius:8,elevation:4},
  submitTxt:{color:'#fff',fontWeight:'700',fontSize:16},
  // Duplicate warning styles
  dupWarning:{backgroundColor:'#FFFBEB',borderRadius:12,padding:12,marginBottom:12,borderWidth:1.5,borderColor:'#FCD34D'},
  dupItem:{flexDirection:'row',gap:10,alignItems:'flex-start',backgroundColor:'#FEF3C7',borderRadius:8,padding:8,marginBottom:6},
  dupImg:{width:44,height:44,borderRadius:6,backgroundColor:COLORS.bg3},
  dupConfirmBtn:{borderWidth:1.5,borderColor:'#D97706',borderRadius:8,padding:8,alignItems:'center'},
});
