import React, { useState, useRef } from 'react';
import {
  View, Text, Modal, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform,
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
  {key:'coches',label:'Motor',emoji:'🚗'},
  {key:'otros',label:'Otros',emoji:'🏷️'},
];

export default function AddDealModal({ visible, onClose, onSuccess }) {
  const [step, setStep] = useState(0); // 0=link, 1=detalles, 2=fotos, 3=fechas+cat+publicar
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [original, setOriginal] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [availability, setAvailability] = useState('online'); // online|tienda|ambos
  const [storeLocation, setStoreLocation] = useState('');
  const [store, setStore] = useState('');
  const [cat, setCat] = useState('otros');
  const [images, setImages] = useState([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [duplicates, setDuplicates] = useState([]);
  const [dupLoading, setDupLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const dupTimerRef = useRef(null);
  const amazonTimerRef = useRef(null);

  function reset() {
    setStep(0); setUrl(''); setTitle(''); setDescription(''); setPrice(''); setOriginal('');
    setDiscountCode(''); setAvailability('online'); setStoreLocation('');
    setStore(''); setCat('otros'); setImages([]); setCoverIndex(0);
    setStartDate(''); setEndDate(''); setError(''); setDuplicates([]); setConfirmed(false);
  }
  function handleClose() { reset(); onClose(); }

  async function checkDuplicates(checkUrl, checkTitle) {
    if ((!checkUrl || checkUrl.length < 10) && (!checkTitle || checkTitle.length < 5)) return;
    setDupLoading(true);
    try {
      const res = await apiPost('/api/deals/check-duplicate', { url: checkUrl, title: checkTitle });
      setDuplicates(res?.duplicates || []);
      if (res?.duplicates?.length > 0) setConfirmed(false);
    } catch(_) {}
    finally { setDupLoading(false); }
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true, selectionLimit: 3, quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setImages(prev => [...prev, ...result.assets].slice(0, 3));
    }
  }

  function handleUrlChange(v) {
    setUrl(v);
    const s = detectStore(v);
    if (s) setStore(s);
    // Auto-detect category from URL
    const url_low = v.toLowerCase();
    const store_low = (s||'').toLowerCase();
    const catGuess =
      /(amazon|media|pc|gaming|playstation|xbox|nintendo|steam|fnac|apple|samsung|iphone|laptop)/i.test(store_low+url_low) ? 'tecnologia' :
      /(zara|mango|primark|pull|asos|shein|bershka|lefties|moda|ropa)/i.test(store_low+url_low) ? 'moda' :
      /(ikea|leroy|bricomart|hogar|sofa|colchon|mueble)/i.test(url_low) ? 'hogar' :
      /(mercadona|lidl|aldi|carrefour|dia|supermercado)/i.test(store_low+url_low) ? 'alimentacion' :
      /(vueling|iberia|ryanair|booking|airbnb|viaje|hotel)/i.test(store_low+url_low) ? 'viajes' :
      /(nike|adidas|decathlon|deporte|gym|fitness)/i.test(store_low+url_low) ? 'deportes' :
      /(sephora|druni|douglas|perfum|cosmet|belleza)/i.test(url_low) ? 'belleza' :
      /(libro|fnac|book|audible|comic)/i.test(url_low) ? 'libros' :
      /(ps5|playstation|xbox|nintendo|steam|gaming)/i.test(url_low) ? 'juegos' : null;
    if (catGuess) setCat(catGuess);
    // Amazon autofill
    if (v.startsWith('http') && v.length > 20) {
      clearTimeout(dupTimerRef.current);
      dupTimerRef.current = setTimeout(() => checkDuplicates(v, title), 800);
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
          } catch(_) {}
        }, 1500);
      }
    }
  }

  const disc = price && original && !isNaN(+price) && !isNaN(+original) && +original > +price
    ? Math.round((1 - +price / +original) * 100) : null;

  async function submit() {
    setError('');
    if (!title.trim()) return setError('El título es obligatorio');
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) < 0) return setError('Precio inválido');
    if (duplicates.length > 0 && !confirmed) return setError('Confirma que es diferente a chollos existentes');
    setLoading(true);
    try {
      const finalUrl = url.trim() ? applyAffiliateTag(url.trim()) : '';
      const detectedStore = store.trim() || detectStore(url) || '';
      const res = await apiUpload('/api/deals', {
        title: title.trim(),
        url: finalUrl,
        deal_price: parseFloat(price),
        original_price: original && parseFloat(original) > 0 ? parseFloat(original) : '',
        store: detectedStore,
        category: cat,
        description: description.trim(),
        discount_code: discountCode.trim(),
        availability,
        store_location: storeLocation.trim(),
        starts_at: startDate || '',
        expires_at: endDate || '',
        cover_index: coverIndex,
      }, images[coverIndex]?.uri || images[0]?.uri || null, 'image');
      if (res.error) return setError(res.error);
      // Upload additional images (if more than 1)
      const dealId = res.id || res.deal?.id;
      if (dealId && images.length > 1) {
        for (let i = 0; i < images.length; i++) {
          if (i === coverIndex) continue; // skip cover, already uploaded
          try {
            await apiUpload(`/api/deals/${dealId}/images`, {}, images[i].uri, 'image');
          } catch(_) { /* non-critical — deal already created */ }
        }
      }
      reset(); onSuccess?.();
    } catch(e) { setError(`Error: ${e.message || 'Sin conexión'}`); }
    finally { setLoading(false); }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>
        <View style={s.wrap}>
          {/* Header with back/close */}
          <View style={s.header}>
            <TouchableOpacity onPress={step > 0 ? () => setStep(step-1) : handleClose} style={s.closeBtn}>
              <Ionicons name={step > 0 ? 'arrow-back' : 'close'} size={20} color={COLORS.text2}/>
            </TouchableOpacity>
            <Text style={s.title}>🔥 Publicar chollo</Text>
            <Text style={{fontSize:12,color:COLORS.text3}}>{step+1}/4</Text>
          </View>
          {/* Step indicator */}
          <View style={{flexDirection:'row',paddingHorizontal:16,paddingVertical:6,gap:4}}>
            {[0,1,2,3].map(i => (
              <View key={i} style={{flex:1,height:3,borderRadius:2,backgroundColor: i <= step ? COLORS.danger : COLORS.border}}/>
            ))}
          </View>

          <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* ═══ STEP 0: Link ═══ */}
            {step === 0 && (
              <View style={{gap:12}}>
                <Text style={{fontSize:20,fontWeight:'800',color:COLORS.text}}>🔗 Comparte el enlace</Text>
                <View style={{backgroundColor:'#F0FDF4',borderRadius:14,padding:14,borderWidth:1,borderColor:'#86EFAC'}}>
                  <Text style={{fontSize:14,fontWeight:'700',color:'#15803D',marginBottom:4}}>💸 ¡Gana dinero con referidos!</Text>
                  <Text style={{fontSize:12,color:'#166534',lineHeight:18}}>
                    Pega tu enlace de referido de Amazon, Zara, MediaMarkt, etc. Cada compra desde tu chollo te genera comisión.
                  </Text>
                </View>
                <TextInput style={[s.input,{fontSize:16}]} value={url} onChangeText={handleUrlChange}
                  placeholder="https://amazon.es/... o tu enlace de referido"
                  keyboardType="url" autoCapitalize="none" autoCorrect={false} placeholderTextColor={COLORS.text3}/>
                {store ? <Text style={{fontSize:12,color:COLORS.success,fontWeight:'600'}}>🏪 Detectado: {store}</Text> : null}
                {dupLoading && <Text style={{fontSize:11,color:COLORS.text3}}>🔍 Comprobando duplicados...</Text>}
                {duplicates.length > 0 && !confirmed && (
                  <View style={s.dupWarning}>
                    <Text style={{fontSize:13,fontWeight:'700',color:'#92400E',marginBottom:6}}>⚠️ Ya existe un chollo similar</Text>
                    {duplicates.slice(0,2).map(d => (
                      <View key={d.id} style={{flexDirection:'row',gap:8,padding:6,backgroundColor:'#FEF3C7',borderRadius:8,marginBottom:4}}>
                        <Text style={{fontSize:14}}>🏷️</Text>
                        <Text style={{flex:1,fontSize:12,color:'#92400E'}} numberOfLines={1}>{d.title} · {d.deal_price}€</Text>
                      </View>
                    ))}
                    <TouchableOpacity style={{borderWidth:1.5,borderColor:'#D97706',borderRadius:8,padding:8,alignItems:'center',marginTop:4}}
                      onPress={() => setConfirmed(true)}>
                      <Text style={{color:'#D97706',fontWeight:'700',fontSize:12}}>✓ Es diferente, continuar</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity style={s.nextBtn} onPress={() => setStep(1)}>
                  <Text style={s.nextTxt}>{url ? 'Siguiente: Detalles' : 'Sin enlace, continuar'}</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff"/>
                </TouchableOpacity>
              </View>
            )}

            {/* ═══ STEP 1: Detalles ═══ */}
            {step === 1 && (
              <View style={{gap:10}}>
                <Text style={{fontSize:20,fontWeight:'800',color:COLORS.text}}>📝 Descripción del producto</Text>
                <Text style={s.label}>Título *</Text>
                <TextInput style={s.input} value={title} onChangeText={setTitle}
                  placeholder="Ej: TV Samsung 55'' 4K a mitad de precio" placeholderTextColor={COLORS.text3} maxLength={120}/>
                <Text style={s.label}>Descripción</Text>
                <TextInput style={[s.input,{height:80,textAlignVertical:'top'}]} value={description} onChangeText={setDescription}
                  placeholder="Describe el chollo, condiciones, etc." placeholderTextColor={COLORS.text3} multiline maxLength={500}/>
                <View style={{flexDirection:'row',gap:10}}>
                  <View style={{flex:1}}>
                    <Text style={s.label}>Precio oferta * (€)</Text>
                    <TextInput style={s.input} value={price} onChangeText={setPrice}
                      placeholder="49.99" keyboardType="decimal-pad" placeholderTextColor={COLORS.text3}/>
                  </View>
                  <View style={{flex:1}}>
                    <Text style={s.label}>Precio habitual (€)</Text>
                    <TextInput style={s.input} value={original} onChangeText={setOriginal}
                      placeholder="99.99" keyboardType="decimal-pad" placeholderTextColor={COLORS.text3}/>
                  </View>
                </View>
                {disc && (
                  <View style={{backgroundColor:'#DCFCE7',borderRadius:10,padding:10,alignItems:'center'}}>
                    <Text style={{fontSize:14,fontWeight:'700',color:'#16A34A'}}>🎉 ¡Descuento del {disc}%!</Text>
                  </View>
                )}

                <Text style={s.label}>Código de descuento</Text>
                <TextInput style={s.input} value={discountCode} onChangeText={setDiscountCode}
                  placeholder="Ej: AHORRA20 (opcional)" placeholderTextColor={COLORS.text3} autoCapitalize="characters"/>
                <Text style={s.label}>Disponibilidad</Text>
                <View style={{flexDirection:'row',gap:8}}>
                  {[{key:'online',label:'🌐 Online'},{key:'tienda',label:'🏪 Tienda física'},{key:'ambos',label:'🔄 Ambos'}].map(a => (
                    <TouchableOpacity key={a.key}
                      style={{flex:1,paddingVertical:10,borderRadius:10,alignItems:'center',borderWidth:1.5,
                        borderColor: availability===a.key ? COLORS.primary : COLORS.border,
                        backgroundColor: availability===a.key ? COLORS.primaryLight : COLORS.bg}}
                      onPress={() => setAvailability(a.key)}>
                      <Text style={{fontSize:12,fontWeight:'600',color: availability===a.key ? COLORS.primary : COLORS.text2}}>{a.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {(availability === 'tienda' || availability === 'ambos') && (
                  <>
                    <Text style={s.label}>📍 Ubicación de la tienda</Text>
                    <TextInput style={s.input} value={storeLocation} onChangeText={setStoreLocation}
                      placeholder="Ej: MediaMarkt Córdoba" placeholderTextColor={COLORS.text3}/>
                  </>
                )}
                <TouchableOpacity style={[s.nextBtn, !title.trim() && {opacity:0.4}]}
                  onPress={() => title.trim() ? setStep(2) : setError('Título obligatorio')} disabled={!title.trim()}>
                  <Text style={s.nextTxt}>Siguiente: Fotos</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff"/>
                </TouchableOpacity>
              </View>
            )}

            {/* ═══ STEP 2: Fotos ═══ */}
            {step === 2 && (
              <View style={{gap:12}}>
                <Text style={{fontSize:20,fontWeight:'800',color:COLORS.text}}>📷 Añade imágenes</Text>
                <Text style={{fontSize:13,color:COLORS.text3}}>Hasta 3 fotos. Elige cuál es la portada.</Text>
                <TouchableOpacity style={s.addPhotoBtn} onPress={pickImage}>
                  <Ionicons name="camera-outline" size={28} color={COLORS.primary}/>
                  <Text style={{fontSize:14,fontWeight:'600',color:COLORS.primary,marginTop:4}}>Añadir fotos ({images.length}/3)</Text>
                </TouchableOpacity>
                {images.length > 0 && (
                  <View style={{flexDirection:'row',gap:10,flexWrap:'wrap'}}>
                    {images.map((img, idx) => (
                      <TouchableOpacity key={idx} style={{position:'relative'}} onPress={() => setCoverIndex(idx)}>
                        <Image source={{uri:img.uri}} style={{width:100,height:100,borderRadius:12,borderWidth: idx===coverIndex ? 3 : 1,
                          borderColor: idx===coverIndex ? COLORS.primary : COLORS.border}} resizeMode="cover"/>
                        {idx === coverIndex && (
                          <View style={{position:'absolute',bottom:0,left:0,right:0,backgroundColor:COLORS.primary,borderBottomLeftRadius:10,borderBottomRightRadius:10,padding:3,alignItems:'center'}}>
                            <Text style={{fontSize:9,color:'#fff',fontWeight:'700'}}>PORTADA</Text>
                          </View>
                        )}
                        <TouchableOpacity style={{position:'absolute',top:-4,right:-4}}
                          onPress={() => { setImages(prev => prev.filter((_,i) => i !== idx)); if (coverIndex >= images.length-1) setCoverIndex(0); }}>
                          <Ionicons name="close-circle" size={20} color="#DC2626"/>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {images.length > 1 && <Text style={{fontSize:11,color:COLORS.text3}}>Toca una imagen para hacerla portada</Text>}
                <TouchableOpacity style={s.nextBtn} onPress={() => setStep(3)}>
                  <Text style={s.nextTxt}>{images.length > 0 ? 'Siguiente: Publicar' : 'Sin fotos, continuar'}</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff"/>
                </TouchableOpacity>
              </View>
            )}

            {/* ═══ STEP 3: Fechas + Categoría + PUBLICAR ═══ */}
            {step === 3 && (
              <View style={{gap:10}}>
                <Text style={{fontSize:20,fontWeight:'800',color:COLORS.text}}>📅 Últimos detalles</Text>
                <View style={{flexDirection:'row',gap:10}}>
                  <View style={{flex:1}}>
                    <Text style={s.label}>Fecha inicio</Text>
                    <TextInput style={s.input} value={startDate} onChangeText={setStartDate}
                      placeholder="DD/MM/AAAA" placeholderTextColor={COLORS.text3}/>
                  </View>
                  <View style={{flex:1}}>
                    <Text style={s.label}>Fecha fin</Text>
                    <TextInput style={s.input} value={endDate} onChangeText={setEndDate}
                      placeholder="DD/MM/AAAA" placeholderTextColor={COLORS.text3}/>
                  </View>
                </View>
                <Text style={{fontSize:11,color:COLORS.text3}}>Opcional. Si no pones fecha, expira en 30 días.</Text>
                <Text style={s.label}>Categoría</Text>
                <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
                  {CATS.map(c => (
                    <TouchableOpacity key={c.key}
                      style={{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:10,paddingVertical:6,borderRadius:99,
                        borderWidth:1.5,borderColor: cat===c.key ? COLORS.danger : COLORS.border,
                        backgroundColor: cat===c.key ? COLORS.danger : COLORS.bg}}
                      onPress={() => setCat(c.key)}>
                      <Text style={{fontSize:12}}>{c.emoji}</Text>
                      <Text style={{fontSize:11,fontWeight:'600',color: cat===c.key ? '#fff' : COLORS.text2}}>{c.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={s.label}>Tienda</Text>
                <TextInput style={s.input} value={store} onChangeText={setStore}
                  placeholder="Amazon, MediaMarkt, Zara..." placeholderTextColor={COLORS.text3}/>

                {/* Resumen antes de publicar */}
                <View style={{backgroundColor:COLORS.bg3,borderRadius:14,padding:14,gap:6,marginTop:8}}>
                  <Text style={{fontSize:14,fontWeight:'700',color:COLORS.text}}>📋 Resumen</Text>
                  <Text style={{fontSize:13,color:COLORS.text2}} numberOfLines={2}>📌 {title || '(sin título)'}</Text>
                  <Text style={{fontSize:13,color:COLORS.danger,fontWeight:'700'}}>💰 {price ? price+'€' : '—'} {disc ? `(-${disc}%)` : ''}</Text>
                  {discountCode ? <Text style={{fontSize:12,color:COLORS.primary}}>🏷️ Código: {discountCode}</Text> : null}
                  <Text style={{fontSize:12,color:COLORS.text3}}>📷 {images.length} foto(s) · {availability === 'online' ? '🌐 Online' : availability === 'tienda' ? '🏪 Tienda' : '🔄 Ambos'}</Text>
                  {store ? <Text style={{fontSize:12,color:COLORS.text3}}>🏪 {store}</Text> : null}
                </View>

                {error ? <View style={s.errBox}><Ionicons name="alert-circle-outline" size={15} color={COLORS.danger}/><Text style={s.errTxt}>{error}</Text></View> : null}

                <TouchableOpacity style={[s.publishBtn, loading&&{opacity:0.7}]} onPress={submit} disabled={loading}>
                  {loading ? (
                    <><ActivityIndicator color="#fff" size="small"/><Text style={s.publishTxt}> Publicando...</Text></>
                  ) : (
                    <><Ionicons name="flame" size={20} color="#fff"/><Text style={s.publishTxt}> Publicar chollo (+5 pts)</Text></>
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

const s = StyleSheet.create({
  wrap:{flex:1,backgroundColor:COLORS.bg2},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:16,borderBottomWidth:0.5,borderBottomColor:COLORS.border},
  title:{fontSize:18,fontWeight:'700',color:COLORS.text},
  closeBtn:{width:32,height:32,borderRadius:16,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'},
  body:{padding:16,paddingBottom:60},
  label:{fontSize:13,fontWeight:'600',color:COLORS.text,marginBottom:4,marginTop:4},
  input:{backgroundColor:COLORS.bg3,borderRadius:12,borderWidth:1.5,borderColor:COLORS.border,paddingHorizontal:14,paddingVertical:12,fontSize:15,color:COLORS.text},
  nextBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:COLORS.danger,borderRadius:14,padding:16,marginTop:12},
  nextTxt:{color:'#fff',fontWeight:'700',fontSize:16},
  publishBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:COLORS.danger,borderRadius:14,paddingVertical:18,marginTop:16,
    shadowColor:COLORS.danger,shadowOffset:{width:0,height:4},shadowOpacity:0.4,shadowRadius:12,elevation:6},
  publishTxt:{color:'#fff',fontWeight:'800',fontSize:18},
  addPhotoBtn:{borderWidth:2,borderColor:COLORS.primary,borderStyle:'dashed',borderRadius:14,padding:20,alignItems:'center',backgroundColor:COLORS.primaryLight},
  dupWarning:{backgroundColor:'#FFFBEB',borderRadius:12,padding:12,borderWidth:1.5,borderColor:'#FCD34D'},
  errBox:{flexDirection:'row',alignItems:'flex-start',gap:8,backgroundColor:COLORS.dangerLight,borderRadius:10,padding:12,marginTop:8},
  errTxt:{flex:1,color:COLORS.danger,fontSize:13},
});
