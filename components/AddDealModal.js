import React, { useState } from 'react';
import {
  View, Text, Modal, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, apiPost, fmtP } from '../utils';

const CATEGORIES = [
  {key:'tecnologia',label:'Tecnología',icon:'laptop-outline'},
  {key:'hogar',label:'Hogar',icon:'home-outline'},
  {key:'moda',label:'Moda',icon:'shirt-outline'},
  {key:'alimentacion',label:'Alimentación',icon:'nutrition-outline'},
  {key:'ocio',label:'Ocio',icon:'game-controller-outline'},
  {key:'viajes',label:'Viajes',icon:'airplane-outline'},
  {key:'servicios',label:'Servicios',icon:'construct-outline'},
  {key:'otros',label:'Otros',icon:'ellipsis-horizontal-outline'},
];

export default function AddDealModal({ visible, onClose, onSuccess }) {
  const [step, setStep] = useState(0);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dealPrice, setDealPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [availability, setAvailability] = useState('online');
  const [storeLocation, setStoreLocation] = useState('');
  const [images, setImages] = useState([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [startsAt, setStartsAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [category, setCategory] = useState('otros');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setStep(0);setUrl('');setTitle('');setDescription('');setDealPrice('');
    setOriginalPrice('');setDiscountCode('');setAvailability('online');
    setStoreLocation('');setImages([]);setCoverIndex(0);setStartsAt('');
    setExpiresAt('');setCategory('otros');setError('');
  }
  function handleClose() { reset(); onClose(); }

  async function pickImage() {
    if (images.length >= 3) return Alert.alert('Máximo 3 imágenes');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, quality: 0.8, base64: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        setImages(prev => [...prev, {
          uri: result.assets[0].uri,
          base64: result.assets[0].base64,
        }]);
      }
    } catch(_) { Alert.alert('Error','No se pudo seleccionar la imagen'); }
  }

  function removeImage(idx) {
    setImages(prev => prev.filter((_,i) => i !== idx));
    if (coverIndex >= images.length - 1) setCoverIndex(0);
  }

  async function submit() {
    setError('');
    if (!title.trim()) return setError('El título es obligatorio');
    if (!dealPrice) return setError('El precio en oferta es obligatorio');
    setLoading(true);
    try {
      const body = {
        title: title.trim(), url: url.trim()||null,
        deal_price: parseFloat(String(dealPrice).replace(',','.')),
        original_price: originalPrice ? parseFloat(String(originalPrice).replace(',','.')) : null,
        description: description.trim()||null,
        discount_code: discountCode.trim()||null,
        availability, store_location: storeLocation.trim()||null,
        starts_at: startsAt.trim()||null,
        expires_at: expiresAt.trim()||null,
        category, cover_index: coverIndex,
      };
      // Send first image as base64
      if (images.length > 0 && images[coverIndex]?.base64) {
        body.image_base64 = images[coverIndex].base64;
      }
      const deal = await apiPost('/api/deals', body);
      if (deal?.error) return setError(deal.error);
      // Upload additional images
      const dealId = deal?.id;
      if (dealId && images.length > 1) {
        for (let i = 0; i < images.length; i++) {
          if (i === coverIndex) continue;
          if (images[i]?.base64) {
            await apiPost(`/api/deals/${dealId}/images`, {
              image_base64: images[i].base64,
            }).catch(()=>{});
          }
        }
      }
      reset(); onSuccess?.();
    } catch(e) { setError('Error de conexión'); }
    finally { setLoading(false); }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>
        <View style={st.wrap}>
          {/* Header */}
          <View style={st.header}>
            <TouchableOpacity onPress={step>0?()=>setStep(step-1):handleClose} style={st.closeBtn}>
              <Ionicons name={step>0?'arrow-back':'close'} size={20} color={COLORS.text2}/>
            </TouchableOpacity>
            <Text style={st.headerTitle}>Publicar chollo</Text>
            <Text style={{fontSize:12,color:COLORS.text3}}>Paso {step+1}/4</Text>
          </View>
          {/* Step bar */}
          <View style={{flexDirection:'row',paddingHorizontal:16,paddingVertical:6,gap:4}}>
            {[0,1,2,3].map(i=>(
              <View key={i} style={{flex:1,height:3,borderRadius:2,backgroundColor:i<=step?COLORS.primary:COLORS.border}}/>
            ))}
          </View>

          <ScrollView contentContainerStyle={st.body} keyboardShouldPersistTaps="handled">
            {/* STEP 0: Link */}
            {step===0 && (
              <View style={{gap:12}}>
                <Ionicons name="link-outline" size={40} color={COLORS.primary} style={{alignSelf:'center'}}/>
                <Text style={st.stepTitle}>Comparte el enlace del chollo</Text>
                <Text style={{fontSize:13,color:COLORS.text3,textAlign:'center'}}>Pega el link de la oferta. Tu enlace de referido se mantendrá.</Text>
                <TextInput style={st.input} value={url} onChangeText={setUrl}
                  placeholder="https://www.ejemplo.com/oferta..." placeholderTextColor={COLORS.text3}
                  autoCapitalize="none" keyboardType="url" autoCorrect={false}/>
                <Text style={st.label}>Título del chollo *</Text>
                <TextInput style={st.input} value={title} onChangeText={setTitle}
                  placeholder="Ej: Auriculares Sony WH-1000XM5 al 40%" placeholderTextColor={COLORS.text3}/>
                <TouchableOpacity style={[st.nextBtn,!title.trim()&&{opacity:0.4}]}
                  onPress={()=>title.trim()&&setStep(1)} disabled={!title.trim()}>
                  <Text style={st.nextTxt}>Siguiente</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff"/>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 1: Description & prices */}
            {step===1 && (
              <View style={{gap:8}}>
                <Text style={st.stepTitle}>Detalles del producto</Text>
                <Text style={st.label}>Descripción</Text>
                <TextInput style={[st.input,{height:80,textAlignVertical:'top'}]} value={description}
                  onChangeText={setDescription} placeholder="Describe la oferta..."
                  placeholderTextColor={COLORS.text3} multiline/>
                <View style={{flexDirection:'row',gap:10}}>
                  <View style={{flex:1}}>
                    <Text style={st.label}>Precio oferta *</Text>
                    <View style={st.priceBox}>
                      <TextInput style={st.priceInput} value={dealPrice} onChangeText={setDealPrice}
                        placeholder="0,00" placeholderTextColor={COLORS.text3} keyboardType="decimal-pad"/>
                      <Text style={st.priceCur}>€</Text>
                    </View>
                  </View>
                  <View style={{flex:1}}>
                    <Text style={st.label}>Precio habitual</Text>
                    <View style={st.priceBox}>
                      <TextInput style={st.priceInput} value={originalPrice} onChangeText={setOriginalPrice}
                        placeholder="0,00" placeholderTextColor={COLORS.text3} keyboardType="decimal-pad"/>
                      <Text style={st.priceCur}>€</Text>
                    </View>
                  </View>
                </View>

                <Text style={st.label}>Código descuento (si lo hay)</Text>
                <View style={{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:COLORS.bg3,borderRadius:12,paddingHorizontal:12,borderWidth:1,borderColor:COLORS.border}}>
                  <Ionicons name="ticket-outline" size={16} color={COLORS.text3}/>
                  <TextInput style={{flex:1,paddingVertical:10,fontSize:14,color:COLORS.text}} value={discountCode}
                    onChangeText={setDiscountCode} placeholder="DESCUENTO20" placeholderTextColor={COLORS.text3} autoCapitalize="characters"/>
                </View>
                <Text style={st.label}>Disponibilidad</Text>
                <View style={{flexDirection:'row',gap:8}}>
                  {[['online','Online','globe-outline'],['tienda','Tienda física','storefront-outline']].map(([val,lab,ico])=>(
                    <TouchableOpacity key={val} style={{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,
                      paddingVertical:10,borderRadius:10,borderWidth:1.5,
                      borderColor:availability===val?COLORS.primary:COLORS.border,
                      backgroundColor:availability===val?COLORS.primaryLight:COLORS.bg}}
                      onPress={()=>setAvailability(val)}>
                      <Ionicons name={ico} size={16} color={availability===val?COLORS.primary:COLORS.text2}/>
                      <Text style={{fontSize:13,fontWeight:'600',color:availability===val?COLORS.primary:COLORS.text2}}>{lab}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {availability==='tienda' && (
                  <><Text style={st.label}>Ubicación de la tienda</Text>
                  <TextInput style={st.input} value={storeLocation} onChangeText={setStoreLocation}
                    placeholder="Ej: MediaMarkt Córdoba" placeholderTextColor={COLORS.text3}/></>
                )}
                <TouchableOpacity style={[st.nextBtn,!dealPrice&&{opacity:0.4}]}
                  onPress={()=>dealPrice&&setStep(2)} disabled={!dealPrice}>
                  <Text style={st.nextTxt}>Siguiente</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff"/>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 2: Images */}
            {step===2 && (
              <View style={{gap:12}}>
                <Text style={st.stepTitle}>Añade imágenes</Text>
                <Text style={{fontSize:13,color:COLORS.text3,textAlign:'center'}}>Hasta 3 imágenes. Toca una para elegirla como portada.</Text>
                <View style={{flexDirection:'row',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
                  {images.map((img,i)=>(
                    <TouchableOpacity key={i} style={{width:100,height:100,borderRadius:12,overflow:'hidden',
                      borderWidth:coverIndex===i?3:1,borderColor:coverIndex===i?COLORS.primary:COLORS.border}}
                      onPress={()=>setCoverIndex(i)}>
                      <Image source={{uri:img.uri}} style={{width:'100%',height:'100%'}} resizeMode="cover"/>
                      {coverIndex===i && (
                        <View style={{position:'absolute',top:4,left:4,backgroundColor:COLORS.primary,borderRadius:4,paddingHorizontal:4,paddingVertical:1}}>
                          <Text style={{fontSize:8,color:'#fff',fontWeight:'700'}}>PORTADA</Text>
                        </View>
                      )}
                      <TouchableOpacity style={{position:'absolute',top:4,right:4,width:22,height:22,borderRadius:11,backgroundColor:'rgba(0,0,0,0.6)',alignItems:'center',justifyContent:'center'}}
                        onPress={()=>removeImage(i)}>
                        <Ionicons name="close" size={14} color="#fff"/>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                  {images.length<3 && (
                    <TouchableOpacity style={{width:100,height:100,borderRadius:12,borderWidth:2,borderColor:COLORS.border,borderStyle:'dashed',
                      alignItems:'center',justifyContent:'center',backgroundColor:COLORS.bg3}}
                      onPress={pickImage}>
                      <Ionicons name="camera-outline" size={28} color={COLORS.text3}/>
                      <Text style={{fontSize:10,color:COLORS.text3,marginTop:4}}>Añadir</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity style={st.nextBtn} onPress={()=>setStep(3)}>
                  <Text style={st.nextTxt}>{images.length>0?'Siguiente':'Saltar sin imágenes'}</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff"/>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 3: Dates + Category + Publish */}
            {step===3 && (
              <View style={{gap:10}}>
                <Text style={st.stepTitle}>Fechas y categoría</Text>
                <View style={{flexDirection:'row',gap:10}}>
                  <View style={{flex:1}}>
                    <Text style={st.label}>Fecha inicio</Text>
                    <TextInput style={st.input} value={startsAt} onChangeText={setStartsAt}
                      placeholder="DD/MM/AAAA" placeholderTextColor={COLORS.text3}/>
                  </View>
                  <View style={{flex:1}}>
                    <Text style={st.label}>Fecha vencimiento (opcional)</Text>
                    <TextInput style={st.input} value={expiresAt} onChangeText={setExpiresAt}
                      placeholder="DD/MM/AAAA" placeholderTextColor={COLORS.text3}/>
                  </View>
                </View>
                <Text style={st.label}>Categoría</Text>
                <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
                  {CATEGORIES.map(c=>(
                    <TouchableOpacity key={c.key}
                      style={{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:12,paddingVertical:8,borderRadius:10,
                        borderWidth:1.5,borderColor:category===c.key?COLORS.primary:COLORS.border,
                        backgroundColor:category===c.key?COLORS.primaryLight:COLORS.bg}}
                      onPress={()=>setCategory(c.key)}>
                      <Ionicons name={c.icon} size={14} color={category===c.key?COLORS.primary:COLORS.text2}/>
                      <Text style={{fontSize:12,fontWeight:'600',color:category===c.key?COLORS.primary:COLORS.text2}}>{c.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {error?<View style={st.errBox}><Text style={st.errTxt}>{error}</Text></View>:null}
                <TouchableOpacity style={[st.publishBtn,loading&&{opacity:0.7}]} onPress={submit} disabled={loading}>
                  {loading?<ActivityIndicator color="#fff"/>:(
                    <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                      <Ionicons name="checkmark-circle" size={20} color="#fff"/>
                      <Text style={st.publishTxt}>Publicar chollo</Text>
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

const st = StyleSheet.create({
  wrap:{flex:1,backgroundColor:COLORS.bg2},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:16,borderBottomWidth:0.5,borderBottomColor:COLORS.border},
  headerTitle:{fontSize:18,fontWeight:'700',color:COLORS.text},
  closeBtn:{width:32,height:32,borderRadius:16,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'},
  body:{padding:16,paddingBottom:60},
  stepTitle:{fontSize:20,fontWeight:'700',color:COLORS.text,textAlign:'center',marginBottom:8},
  label:{fontSize:13,fontWeight:'600',color:COLORS.text,marginTop:6,marginBottom:4},
  input:{backgroundColor:COLORS.bg3,borderRadius:12,borderWidth:1,borderColor:COLORS.border,paddingHorizontal:14,paddingVertical:11,fontSize:14,color:COLORS.text},
  priceBox:{flexDirection:'row',alignItems:'center',backgroundColor:COLORS.bg3,borderRadius:12,borderWidth:1,borderColor:COLORS.border,paddingHorizontal:12},
  priceInput:{flex:1,paddingVertical:10,fontSize:18,fontWeight:'700',color:COLORS.primary},
  priceCur:{fontSize:16,fontWeight:'700',color:COLORS.text3},
  nextBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:COLORS.primary,borderRadius:14,padding:16,marginTop:16},
  nextTxt:{color:'#fff',fontWeight:'700',fontSize:16},
  publishBtn:{backgroundColor:COLORS.primary,borderRadius:14,padding:16,alignItems:'center',marginTop:16},
  publishTxt:{color:'#fff',fontWeight:'700',fontSize:16},
  errBox:{backgroundColor:COLORS.dangerLight,borderRadius:10,padding:10,marginTop:8},
  errTxt:{color:COLORS.danger,fontSize:13},
});
