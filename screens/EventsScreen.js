import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Modal, ScrollView, TextInput,
  KeyboardAvoidingView, Platform, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, apiGet, apiPost, timeAgo, openURL, fmtP } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from '../components/AuthModal';
import CommentsModal from '../components/CommentsModal';

const CATS = [
  {key:'all',label:'Todos',icon:'apps-outline'},
  {key:'musica',label:'Música',icon:'musical-notes-outline'},
  {key:'deporte',label:'Deporte',icon:'football-outline'},
  {key:'cultura',label:'Cultura',icon:'library-outline'},
  {key:'festival',label:'Festival',icon:'sparkles-outline'},
  {key:'expo',label:'Expo',icon:'images-outline'},
  {key:'gastronomia',label:'Gastro',icon:'wine-outline'},
  {key:'cine',label:'Cine',icon:'film-outline'},
  {key:'teatro',label:'Teatro',icon:'mask-outline'},  
  {key:'otro',label:'Otros',icon:'ellipsis-horizontal-outline'},
];

const CCAA_CITIES = {
  'Andalucía':['Sevilla','Málaga','Córdoba','Granada','Almería','Cádiz','Jaén','Huelva','Jerez','Villafranca de Córdoba'],
  'Aragón':['Zaragoza','Huesca','Teruel'],
  'Asturias':['Oviedo','Gijón','Avilés'],
  'Baleares':['Palma','Ibiza'],
  'Canarias':['Las Palmas','Santa Cruz de Tenerife'],
  'Cantabria':['Santander','Torrelavega'],
  'C. La Mancha':['Toledo','Ciudad Real','Albacete'],
  'C. y León':['Valladolid','Burgos','Salamanca','León'],
  'Cataluña':['Barcelona','Tarragona','Lleida','Girona'],
  'Extremadura':['Badajoz','Cáceres','Mérida'],
  'Galicia':['Vigo','A Coruña','Santiago'],
  'La Rioja':['Logroño'],
  'Madrid':['Madrid','Alcalá de Henares','Móstoles','Getafe'],
  'Murcia':['Murcia','Cartagena'],
  'Navarra':['Pamplona'],
  'País Vasco':['Bilbao','San Sebastián','Vitoria'],
  'C. Valenciana':['Valencia','Alicante','Castellón'],
};

export default function EventsScreen() {
  const { isLoggedIn } = useAuth();
  const [events, setEvents] = useState([]);
  const [cat, setCat] = useState('all');
  const [sort, setSort] = useState('date');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(true);
  const [selectedCCAA, setSelectedCCAA] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [commentsEvent, setCommentsEvent] = useState(null);

  useEffect(() => { if (!showCityPicker) loadEvents(); }, [cat, sort, city, showCityPicker]);

  async function loadEvents() {
    setLoading(true);
    try {
      let url = `/api/events?cat=${cat}&sort=${sort}&limit=20`;
      if (city) url += `&city=${encodeURIComponent(city)}`;
      setEvents(await apiGet(url) || []);
    } catch(_) {} finally { setLoading(false); setRefreshing(false); }
  }

  const onRefresh = useCallback(()=>{setRefreshing(true);loadEvents();},[cat,sort,city]);

  // ── CITY PICKER (CCAA → city selectors, no typing) ──
  if (showCityPicker) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={{flex:1,padding:16}}>
          <View style={{alignItems:'center',marginBottom:20}}>
            <Ionicons name="calendar" size={36} color={COLORS.primary}/>
            <Text style={{fontSize:24,fontWeight:'800',color:COLORS.text,marginTop:8}}>Eventos</Text>
            <Text style={{fontSize:14,color:COLORS.text3,marginTop:4}}>¿Dónde quieres buscar?</Text>
          </View>
          <TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:14,padding:14,alignItems:'center',marginBottom:12}}
            onPress={()=>{setCity('');setShowCityPicker(false);}}>
            <Ionicons name="globe-outline" size={20} color="#fff"/>
            <Text style={{fontSize:15,fontWeight:'700',color:'#fff',marginTop:4}}>Toda España</Text>
          </TouchableOpacity>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{backgroundColor:COLORS.bg2,borderRadius:14,padding:14,borderWidth:1,borderColor:COLORS.border}}>
              {Object.keys(CCAA_CITIES).map(ccaa=>(
                <View key={ccaa}>
                  <TouchableOpacity style={{paddingHorizontal:12,paddingVertical:9,borderRadius:10,marginBottom:3,
                    backgroundColor:selectedCCAA===ccaa?COLORS.primaryLight:COLORS.bg3,borderWidth:1,
                    borderColor:selectedCCAA===ccaa?COLORS.primary:COLORS.border,
                    flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}
                    onPress={()=>setSelectedCCAA(selectedCCAA===ccaa?null:ccaa)}>
                    <Text style={{fontSize:13,fontWeight:'600',color:selectedCCAA===ccaa?COLORS.primary:COLORS.text}}>{ccaa}</Text>
                    <Ionicons name={selectedCCAA===ccaa?'chevron-up':'chevron-down'} size={14} color={COLORS.text3}/>
                  </TouchableOpacity>
                  {selectedCCAA===ccaa&&(
                    <View style={{flexDirection:'row',flexWrap:'wrap',gap:5,paddingTop:4,paddingLeft:8,paddingBottom:8}}>
                      {CCAA_CITIES[ccaa].map(c=>(
                        <TouchableOpacity key={c} style={{paddingHorizontal:10,paddingVertical:6,borderRadius:8,backgroundColor:COLORS.bg3,borderWidth:1,borderColor:COLORS.border}}
                          onPress={()=>{setCity(c);setShowCityPicker(false);}}>
                          <Text style={{fontSize:12,fontWeight:'500',color:COLORS.text2}}>{c}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
            <Ionicons name="calendar" size={20} color={COLORS.primary}/>
            <Text style={{fontSize:18,fontWeight:'800',color:COLORS.text}}>Eventos</Text>
          </View>
          <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
            <TouchableOpacity style={s.headerBtn} onPress={()=>setShowSettings(true)}>
              <Ionicons name="options-outline" size={20} color={COLORS.text2}/>
            </TouchableOpacity>
            <TouchableOpacity style={s.headerBtn} onPress={()=>{if(!isLoggedIn){setShowAuth(true);return;}setShowAdd(true);}}>
              <Ionicons name="add" size={20} color={COLORS.primary}/>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity onPress={()=>setShowCityPicker(true)} style={{flexDirection:'row',alignItems:'center',gap:5,marginHorizontal:14,marginBottom:8,
          backgroundColor:COLORS.primaryLight,borderRadius:99,paddingHorizontal:12,paddingVertical:6,alignSelf:'flex-start',borderWidth:1,borderColor:COLORS.primary+'33'}}>
          <Ionicons name="location-outline" size={13} color={COLORS.primary}/>
          <Text style={{fontSize:12,fontWeight:'600',color:COLORS.primary}}>{city||'Toda España'}</Text>
          <Ionicons name="chevron-down" size={11} color={COLORS.text3}/>
        </TouchableOpacity>
      </View>

      {/* Settings Modal — categories + sort + filters */}
      <Modal visible={showSettings} animationType="fade" transparent onRequestClose={()=>setShowSettings(false)}>
        <TouchableOpacity style={{flex:1,backgroundColor:'rgba(0,0,0,0.4)'}} activeOpacity={1} onPress={()=>setShowSettings(false)}>
          <View style={{position:'absolute',top:100,right:16,backgroundColor:COLORS.bg2,borderRadius:18,padding:16,width:280,
            shadowColor:'#000',shadowOpacity:0.2,shadowRadius:20,elevation:10,borderWidth:1,borderColor:COLORS.border}}>
            <TouchableOpacity activeOpacity={1} onPress={e=>e.stopPropagation()}>
              <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                <Text style={{fontSize:16,fontWeight:'700',color:COLORS.text}}>Filtros</Text>
                <TouchableOpacity onPress={()=>setShowSettings(false)} style={{width:30,height:30,borderRadius:15,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'}}>
                  <Ionicons name="close" size={18} color={COLORS.text2}/>
                </TouchableOpacity>
              </View>
              <Text style={{fontSize:11,fontWeight:'600',color:COLORS.text3,marginBottom:6,letterSpacing:0.5}}>CATEGORÍA</Text>
              <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:10}}>
                {CATS.map(c=>(
                  <TouchableOpacity key={c.key} style={{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:10,paddingVertical:6,borderRadius:99,
                    borderWidth:1.5,borderColor:cat===c.key?COLORS.primary:COLORS.border,backgroundColor:cat===c.key?COLORS.primary:COLORS.bg}}
                    onPress={()=>{setCat(c.key);setShowSettings(false);}}>
                    <Ionicons name={c.icon} size={12} color={cat===c.key?'#fff':COLORS.text2}/>
                    <Text style={{fontSize:11,fontWeight:'600',color:cat===c.key?'#fff':COLORS.text2}}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{fontSize:11,fontWeight:'600',color:COLORS.text3,marginBottom:6,letterSpacing:0.5}}>ORDENAR POR</Text>
              <View style={{flexDirection:'row',gap:6}}>
                {[{key:'date',label:'Próximos',icon:'calendar-outline'},{key:'price',label:'Más baratos',icon:'wallet-outline'}].map(so=>(
                  <TouchableOpacity key={so.key} style={{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:10,paddingVertical:6,borderRadius:99,
                    borderWidth:1.5,borderColor:sort===so.key?COLORS.primary:COLORS.border,backgroundColor:sort===so.key?COLORS.primaryLight:COLORS.bg}}
                    onPress={()=>setSort(so.key)}>
                    <Ionicons name={so.icon} size={12} color={sort===so.key?COLORS.primary:COLORS.text2}/>
                    <Text style={{fontSize:11,fontWeight:'600',color:sort===so.key?COLORS.primary:COLORS.text2}}>{so.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Event list */}
      <FlatList data={events} keyExtractor={e=>`ev_${e.id}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary}/>}
        contentContainerStyle={{padding:12,gap:10,paddingBottom:80}}
        renderItem={({item:e})=>{
          const d = e.date ? new Date(e.date) : null;
          const imgUrl = e.image_url || (Array.isArray(e.images)&&e.images[0]) || null;
          return (
            <TouchableOpacity style={s.card} activeOpacity={0.85} onPress={()=>setSelectedEvent(e)}>
              {imgUrl && (
                <Image source={{uri:imgUrl.startsWith('http')?imgUrl:`https://web-production-a8023.up.railway.app${imgUrl}`}}
                  style={{width:'100%',height:140,borderTopLeftRadius:14,borderTopRightRadius:14}} resizeMode="cover"/>
              )}
              <View style={{padding:12,gap:4}}>
                <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                  {d && (
                    <View style={{backgroundColor:COLORS.primary,borderRadius:8,paddingHorizontal:8,paddingVertical:4,alignItems:'center'}}>
                      <Text style={{fontSize:8,fontWeight:'700',color:'rgba(255,255,255,0.8)',textTransform:'uppercase'}}>
                        {d.toLocaleDateString('es-ES',{month:'short'})}
                      </Text>
                      <Text style={{fontSize:16,fontWeight:'800',color:'#fff'}}>{d.getDate()}</Text>
                    </View>
                  )}
                  <View style={{flex:1}}>
                    <Text style={{fontSize:15,fontWeight:'700',color:COLORS.text}} numberOfLines={2}>{e.title}</Text>
                    <View style={{flexDirection:'row',alignItems:'center',gap:4,marginTop:2}}>
                      <Ionicons name="location-outline" size={12} color={COLORS.text3}/>
                      <Text style={{fontSize:12,color:COLORS.text3}} numberOfLines={1}>{e.city||'España'}</Text>
                    </View>
                  </View>
                  <View style={{alignItems:'flex-end'}}>
                    <Text style={{fontSize:14,fontWeight:'800',color:e.is_free?COLORS.success:COLORS.primary}}>
                      {e.is_free?'Gratis':e.price_from?`${e.price_from}€`:''}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={loading?<ActivityIndicator color={COLORS.primary} style={{marginTop:40}}/>:(
          <View style={{alignItems:'center',paddingTop:50,gap:8}}>
            <Ionicons name="calendar-outline" size={40} color={COLORS.text3}/>
            <Text style={{fontSize:16,fontWeight:'700',color:COLORS.text}}>No hay eventos</Text>
            <Text style={{fontSize:13,color:COLORS.text3}}>Pulsa + para añadir uno</Text>
          </View>
        )}/>

      {/* Event detail */}
      <Modal visible={!!selectedEvent} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setSelectedEvent(null)}>
        {selectedEvent && (
          <View style={{flex:1,backgroundColor:COLORS.bg2}}>
            <View style={{width:40,height:4,borderRadius:99,backgroundColor:COLORS.border,alignSelf:'center',marginTop:10}}/>
            <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:16}}>
              <Text style={{fontSize:16,fontWeight:'700',color:COLORS.text}}>Detalle del evento</Text>
              <TouchableOpacity onPress={()=>setSelectedEvent(null)} style={{width:32,height:32,borderRadius:16,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'}}>
                <Ionicons name="close" size={20} color={COLORS.text2}/>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{padding:16,paddingBottom:40}}>
              {(selectedEvent.image_url||(Array.isArray(selectedEvent.images)&&selectedEvent.images[0]))&&(
                <Image source={{uri:(selectedEvent.image_url||selectedEvent.images[0]).startsWith('http')?(selectedEvent.image_url||selectedEvent.images[0]):`https://web-production-a8023.up.railway.app${selectedEvent.image_url||selectedEvent.images[0]}`}}
                  style={{width:'100%',height:200,borderRadius:14,marginBottom:16}} resizeMode="cover"/>
              )}
              <Text style={{fontSize:22,fontWeight:'800',color:COLORS.text,marginBottom:8}}>{selectedEvent.title}</Text>
              <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:4}}>
                <Ionicons name="location-outline" size={14} color={COLORS.text3}/>
                <Text style={{fontSize:13,color:COLORS.text2}}>{selectedEvent.city||'España'}{selectedEvent.venue?` · ${selectedEvent.venue}`:''}</Text>
              </View>
              {selectedEvent.date&&(
                <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:4}}>
                  <Ionicons name="calendar-outline" size={14} color={COLORS.text3}/>
                  <Text style={{fontSize:13,color:COLORS.text2}}>{new Date(selectedEvent.date).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</Text>
                </View>
              )}
              <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:12}}>
                <Ionicons name="wallet-outline" size={14} color={COLORS.text3}/>
                <Text style={{fontSize:14,fontWeight:'700',color:selectedEvent.is_free?COLORS.success:COLORS.primary}}>
                  {selectedEvent.is_free?'Gratis':selectedEvent.price_from?`Desde ${selectedEvent.price_from}€`:'Ver precio'}
                </Text>
              </View>
              {selectedEvent.description&&<Text style={{fontSize:14,color:COLORS.text2,lineHeight:20,marginBottom:12}}>{selectedEvent.description}</Text>}
              {selectedEvent.url&&(
                <TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:14,padding:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8}}
                  onPress={()=>openURL(selectedEvent.url)}>
                  <Ionicons name="open-outline" size={18} color="#fff"/>
                  <Text style={{color:'#fff',fontWeight:'700',fontSize:15}}>Ver evento</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={{backgroundColor:COLORS.bg3,borderRadius:14,padding:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,marginTop:8}}
                onPress={()=>{setCommentsEvent(selectedEvent);setSelectedEvent(null);}}>
                <Ionicons name="chatbubble-outline" size={18} color={COLORS.text2}/>
                <Text style={{color:COLORS.text2,fontWeight:'700',fontSize:15}}>Comentarios</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingVertical:12}}
                onPress={()=>{
                  if(!isLoggedIn){setShowAuth(true);return;}
                  Alert.alert('Reportar evento','¿Qué problema tiene este evento?',[
                    {text:'Cancelar'},
                    {text:'Información incorrecta',onPress:()=>apiPost(`/api/events/${selectedEvent.id}/report`,{reason:'Información incorrecta'}).then(()=>Alert.alert('Reportado','Un admin lo revisará.'))},
                    {text:'Evento falso',style:'destructive',onPress:()=>apiPost(`/api/events/${selectedEvent.id}/report`,{reason:'Evento falso o spam'}).then(()=>Alert.alert('Reportado','Un admin lo revisará.'))},
                  ]);
                }}>
                <Ionicons name="flag-outline" size={14} color={COLORS.text3}/>
                <Text style={{fontSize:12,color:COLORS.text3,fontWeight:'600'}}>Reportar evento</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Add event modal */}
      <AddEventModal visible={showAdd} onClose={()=>setShowAdd(false)} onSuccess={()=>{setShowAdd(false);loadEvents();}} defaultCity={city}/>
      <CommentsModal visible={!!commentsEvent} eventId={commentsEvent?.id} onClose={()=>setCommentsEvent(null)}/>
      <AuthModal visible={showAuth} onClose={()=>setShowAuth(false)}/>
    </SafeAreaView>
  );
}

// ── ADD EVENT MODAL (slides) ─────────────────────────────────────────────────
function AddEventModal({ visible, onClose, onSuccess, defaultCity }) {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState(defaultCity||'');
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState('');
  const [url, setUrl] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [priceFrom, setPriceFrom] = useState('');
  const [category, setCategory] = useState('otro');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function reset(){setStep(0);setTitle('');setDescription('');setCity(defaultCity||'');setVenue('');setDate('');setUrl('');setIsFree(false);setPriceFrom('');setCategory('otro');setImages([]);setError('');}
  function handleClose(){reset();onClose();}

  async function pickImage(){
    if(images.length>=3)return;
    try{const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:ImagePicker.MediaTypeOptions.Images,allowsEditing:true,quality:0.8,base64:true});
    if(!r.canceled&&r.assets?.[0])setImages(prev=>[...prev,{uri:r.assets[0].uri,base64:r.assets[0].base64}]);}catch(_){}
  }

  async function submit(){
    setError('');
    if(!title.trim()) return setError('Título obligatorio');
    if(!city.trim()) return setError('Ciudad obligatoria');
    if(!date.trim()) return setError('Fecha obligatoria');
    setLoading(true);
    try{
      const body={title:title.trim(),description:description.trim()||null,city:city.trim(),venue:venue.trim()||null,
        date:date.trim(),url:url.trim()||null,is_free:isFree,price_from:priceFrom?parseFloat(String(priceFrom).replace(',','.')):null,category};
      if(images.length>0&&images[0]?.base64) body.image_base64=images[0].base64;
      const res=await apiPost('/api/events',body);
      if(res?.error) return setError(res.error);
      reset();onSuccess?.();
    }catch(_){setError('Error al guardar');}finally{setLoading(false);}
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>
        <View style={{flex:1,backgroundColor:COLORS.bg2}}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:16,borderBottomWidth:0.5,borderBottomColor:COLORS.border}}>
            <TouchableOpacity onPress={step>0?()=>setStep(step-1):handleClose} style={{width:32,height:32,borderRadius:16,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'}}>
              <Ionicons name={step>0?'arrow-back':'close'} size={20} color={COLORS.text2}/>
            </TouchableOpacity>
            <Text style={{fontSize:18,fontWeight:'700',color:COLORS.text}}>Añadir evento</Text>
            <Text style={{fontSize:12,color:COLORS.text3}}>Paso {step+1}/3</Text>
          </View>
          <View style={{flexDirection:'row',paddingHorizontal:16,paddingVertical:6,gap:4}}>
            {[0,1,2].map(i=>(<View key={i} style={{flex:1,height:3,borderRadius:2,backgroundColor:i<=step?COLORS.primary:COLORS.border}}/>))}
          </View>
          <ScrollView contentContainerStyle={{padding:16,paddingBottom:60}} keyboardShouldPersistTaps="handled">

            {/* Step 0: Title + description */}
            {step===0&&(<View style={{gap:10}}>
              <Text style={{fontSize:20,fontWeight:'700',color:COLORS.text,textAlign:'center'}}>Información del evento</Text>
              <Text style={{fontSize:12,fontWeight:'600',color:COLORS.text}}>Título *</Text>
              <TextInput style={st.input} value={title} onChangeText={setTitle} placeholder="Ej: Feria de Córdoba 2026" placeholderTextColor={COLORS.text3}/>
              <Text style={{fontSize:12,fontWeight:'600',color:COLORS.text}}>Descripción</Text>
              <TextInput style={[st.input,{height:80,textAlignVertical:'top'}]} value={description} onChangeText={setDescription}
                placeholder="Describe el evento..." placeholderTextColor={COLORS.text3} multiline/>
              <Text style={{fontSize:12,fontWeight:'600',color:COLORS.text}}>Enlace (web del evento)</Text>
              <TextInput style={st.input} value={url} onChangeText={setUrl} placeholder="https://..." placeholderTextColor={COLORS.text3} autoCapitalize="none"/>
              <TouchableOpacity style={[st.nextBtn,!title.trim()&&{opacity:0.4}]} onPress={()=>title.trim()&&setStep(1)} disabled={!title.trim()}>
                <Text style={{color:'#fff',fontWeight:'700',fontSize:16}}>Siguiente</Text>
              </TouchableOpacity>
            </View>)}

            {/* Step 1: Location + date + price */}
            {step===1&&(<View style={{gap:10}}>
              <Text style={{fontSize:20,fontWeight:'700',color:COLORS.text,textAlign:'center'}}>Lugar y fecha</Text>
              <Text style={{fontSize:12,fontWeight:'600',color:COLORS.text}}>Ciudad *</Text>
              <TextInput style={st.input} value={city} onChangeText={setCity} placeholder="Ej: Córdoba" placeholderTextColor={COLORS.text3}/>
              <Text style={{fontSize:12,fontWeight:'600',color:COLORS.text}}>Lugar / Recinto</Text>
              <TextInput style={st.input} value={venue} onChangeText={setVenue} placeholder="Ej: Plaza de las Tendillas" placeholderTextColor={COLORS.text3}/>
              <Text style={{fontSize:12,fontWeight:'600',color:COLORS.text}}>Fecha *</Text>
              <TextInput style={st.input} value={date} onChangeText={setDate} placeholder="DD/MM/AAAA" placeholderTextColor={COLORS.text3}/>
              <View style={{flexDirection:'row',gap:8,marginTop:4}}>
                <TouchableOpacity style={{flex:1,paddingVertical:10,borderRadius:10,alignItems:'center',borderWidth:1.5,
                  borderColor:isFree?COLORS.success:COLORS.border,backgroundColor:isFree?COLORS.successLight:COLORS.bg}}
                  onPress={()=>{setIsFree(true);setPriceFrom('');}}>
                  <Text style={{fontSize:13,fontWeight:'600',color:isFree?COLORS.success:COLORS.text2}}>Gratis</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{flex:1,paddingVertical:10,borderRadius:10,alignItems:'center',borderWidth:1.5,
                  borderColor:!isFree?COLORS.primary:COLORS.border,backgroundColor:!isFree?COLORS.primaryLight:COLORS.bg}}
                  onPress={()=>setIsFree(false)}>
                  <Text style={{fontSize:13,fontWeight:'600',color:!isFree?COLORS.primary:COLORS.text2}}>De pago</Text>
                </TouchableOpacity>
              </View>
              {!isFree&&(<><Text style={{fontSize:12,fontWeight:'600',color:COLORS.text}}>Precio desde (€)</Text>
              <TextInput style={st.input} value={priceFrom} onChangeText={setPriceFrom} placeholder="0,00" placeholderTextColor={COLORS.text3} keyboardType="decimal-pad"/></>)}
              <TouchableOpacity style={[st.nextBtn,(!city.trim()||!date.trim())&&{opacity:0.4}]}
                onPress={()=>(city.trim()&&date.trim())&&setStep(2)} disabled={!city.trim()||!date.trim()}>
                <Text style={{color:'#fff',fontWeight:'700',fontSize:16}}>Siguiente</Text>
              </TouchableOpacity>
            </View>)}

            {/* Step 2: Category + images + publish */}
            {step===2&&(<View style={{gap:10}}>
              <Text style={{fontSize:20,fontWeight:'700',color:COLORS.text,textAlign:'center'}}>Categoría y fotos</Text>
              <Text style={{fontSize:12,fontWeight:'600',color:COLORS.text}}>Categoría</Text>
              <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
                {CATS.filter(c=>c.key!=='all').map(c=>(
                  <TouchableOpacity key={c.key} style={{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:10,paddingVertical:7,borderRadius:10,
                    borderWidth:1.5,borderColor:category===c.key?COLORS.primary:COLORS.border,backgroundColor:category===c.key?COLORS.primaryLight:COLORS.bg}}
                    onPress={()=>setCategory(c.key)}>
                    <Ionicons name={c.icon} size={13} color={category===c.key?COLORS.primary:COLORS.text2}/>
                    <Text style={{fontSize:11,fontWeight:'600',color:category===c.key?COLORS.primary:COLORS.text2}}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{fontSize:12,fontWeight:'600',color:COLORS.text,marginTop:4}}>Fotos del evento</Text>
              <View style={{flexDirection:'row',gap:10,flexWrap:'wrap'}}>
                {images.map((img,i)=>(
                  <View key={i} style={{width:90,height:90,borderRadius:12,overflow:'hidden',borderWidth:1,borderColor:COLORS.border}}>
                    <Image source={{uri:img.uri}} style={{width:'100%',height:'100%'}} resizeMode="cover"/>
                    <TouchableOpacity style={{position:'absolute',top:4,right:4,width:20,height:20,borderRadius:10,backgroundColor:'rgba(0,0,0,0.6)',alignItems:'center',justifyContent:'center'}}
                      onPress={()=>setImages(prev=>prev.filter((_,j)=>j!==i))}><Ionicons name="close" size={12} color="#fff"/></TouchableOpacity>
                  </View>
                ))}
                {images.length<3&&(
                  <TouchableOpacity style={{width:90,height:90,borderRadius:12,borderWidth:2,borderColor:COLORS.border,borderStyle:'dashed',alignItems:'center',justifyContent:'center',backgroundColor:COLORS.bg3}}
                    onPress={pickImage}><Ionicons name="camera-outline" size={24} color={COLORS.text3}/></TouchableOpacity>
                )}
              </View>
              {error?<View style={{backgroundColor:COLORS.dangerLight,borderRadius:10,padding:10}}><Text style={{color:COLORS.danger,fontSize:13}}>{error}</Text></View>:null}
              <TouchableOpacity style={[st.nextBtn,loading&&{opacity:0.7}]} onPress={submit} disabled={loading}>
                {loading?<ActivityIndicator color="#fff"/>:(
                  <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                    <Ionicons name="checkmark-circle" size={20} color="#fff"/>
                    <Text style={{color:'#fff',fontWeight:'700',fontSize:16}}>Publicar evento</Text>
                  </View>)}
              </TouchableOpacity>
            </View>)}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:COLORS.bg},
  header:{backgroundColor:COLORS.bg2,borderBottomWidth:0.5,borderBottomColor:COLORS.border},
  headerRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:14,paddingTop:10,paddingBottom:6},
  headerBtn:{width:36,height:36,borderRadius:18,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'},
  card:{backgroundColor:COLORS.bg2,borderRadius:14,borderWidth:0.5,borderColor:COLORS.border,overflow:'hidden'},
});

const st = StyleSheet.create({
  input:{backgroundColor:COLORS.bg3,borderRadius:12,borderWidth:1,borderColor:COLORS.border,paddingHorizontal:14,paddingVertical:10,fontSize:14,color:COLORS.text},
  nextBtn:{backgroundColor:COLORS.primary,borderRadius:14,padding:16,alignItems:'center',marginTop:12},
});
