import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal,
  ActivityIndicator, Alert, Image, RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, apiGet, apiPost, apiPatch, apiDelete, apiUpload, API_BASE, APP_VERSION, timeAgo, openURL, fmtP } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from '../components/AuthModal';
import PrivacyScreen from './PrivacyScreen';

const LEVELS = [
  {min:0,name:'Novato',color:'#94A3B8',icon:'leaf-outline'},
  {min:50,name:'Ahorrador',color:'#16A34A',icon:'wallet-outline'},
  {min:200,name:'Cazador',color:'#3B82F6',icon:'search-outline'},
  {min:500,name:'Experto',color:'#7C3AED',icon:'star-outline'},
  {min:1000,name:'Leyenda',color:'#F59E0B',icon:'trophy-outline'},
];

function getLevel(pts) {
  for (let i=LEVELS.length-1;i>=0;i--) if(pts>=LEVELS[i].min) return LEVELS[i];
  return LEVELS[0];
}

export default function ProfileScreen() {
  const { isLoggedIn, user, login, logout, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [serverOk, setServerOk] = useState(null);
  const [myDeals, setMyDeals] = useState([]);
  const [myPlaces, setMyPlaces] = useState([]);
  const [myPrices, setMyPrices] = useState([]);
  const [favSupers, setFavSupers] = useState([]);
  const [editingPlace, setEditingPlace] = useState(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editPriceRange, setEditPriceRange] = useState(null);
  const [editMonthlyFee, setEditMonthlyFee] = useState('');
  const [profileTab, setProfileTab] = useState('info');
  const [dealsPage, setDealsPage] = useState(1);
  const [placesPage, setPlacesPage] = useState(1);
  const [pricesPage, setPricesPage] = useState(1);

  const [showAuth, setShowAuth] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [adminReports, setAdminReports] = useState([]);
  const [viewDeal, setViewDeal] = useState(null);
  const [viewPlace, setViewPlace] = useState(null);
  const [viewProduct, setViewProduct] = useState(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePass, setShowChangePass] = useState(false);
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileBio, setEditProfileBio] = useState('');
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { checkServer(); if (isLoggedIn) loadProfile(); loadFavSupers(); }, [isLoggedIn]);

  async function checkServer() {
    try { const r = await fetch(`${API_BASE}/api/health`); setServerOk(r.ok); } catch(_) { setServerOk(false); }
  }
  async function loadFavSupers() {
    try { const r = await AsyncStorage.getItem('fav_supers'); setFavSupers(r?JSON.parse(r):[]); } catch(_) {}
  }

  async function loadProfile() {
    setLoading(true);
    try {
      const [dataRes,dealsRes,lbRes,placesRes,pricesRes] = await Promise.allSettled([
        apiGet('/api/users/me'), apiGet('/api/users/me/deals'),
        apiGet('/api/leaderboard?period=all'), apiGet('/api/users/me/places'),
        apiGet('/api/users/me/prices'),
      ]);
      const data=dataRes.status==='fulfilled'?dataRes.value:null;
      const deals=dealsRes.status==='fulfilled'?dealsRes.value:[];
      const lb=lbRes.status==='fulfilled'?lbRes.value:[];
      const places=placesRes.status==='fulfilled'?placesRes.value:[];
      const prices=pricesRes.status==='fulfilled'?pricesRes.value:[];
      if(data){
        setProfile(data);
        updateUser({points:data.points,name:data.name,avatar_url:data.avatar_url,streak:data.streak,is_admin:data.is_admin});
        setNotificationsOn(data.notifications_enabled!==0);
      } else if(dataRes.status==='rejected'){
        const err=dataRes.reason?.message||'';
        if(err.includes('404')||err.includes('401')){logout();return;}
        setServerOk(false);
      }
      setMyDeals(Array.isArray(deals)?deals:[]);
      setMyPlaces(Array.isArray(places)?places:[]);
      setMyPrices(Array.isArray(prices)?prices:[]);
      setLeaderboard(Array.isArray(lb)?lb.slice(0,10):[]);
      if(data?.is_admin){try{setAdminReports(await apiGet('/api/admin/reports')||[]);}catch(_){}}
    } catch(_) {} finally { setLoading(false); setRefreshing(false); }
  }
  const onRefresh = useCallback(()=>{setRefreshing(true);loadProfile();},[]);

  async function pickAvatar() {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({mediaTypes:ImagePicker.MediaTypeOptions.Images,allowsEditing:true,aspect:[1,1],quality:0.7});
      if(r.canceled) return;
      setUploading(true);
      const form = new FormData();
      form.append('avatar',{uri:r.assets[0].uri,type:'image/jpeg',name:'avatar.jpg'});
      await apiUpload('/api/users/me/avatar',form);
      loadProfile();
    } catch(_) { Alert.alert('Error','No se pudo subir la foto'); }
    finally { setUploading(false); }
  }

  async function saveProfile() {
    try {
      await apiPatch('/api/users/me',{name:editProfileName.trim(),bio:editProfileBio.trim()});
      setShowEditProfile(false); loadProfile();
    } catch(_) { Alert.alert('Error','No se pudo guardar'); }
  }

  async function toggleNotifications() {
    const next=!notificationsOn;
    setNotificationsOn(next);
    apiPatch('/api/users/me',{notifications_enabled:next}).catch(()=>setNotificationsOn(!next));
  }

  async function changePassword(current,newPass) {
    try {
      const res = await apiPost('/api/users/me/change-password',{current_password:current,new_password:newPass});
      if(res?.error) return Alert.alert('Error',res.error);
      Alert.alert('Hecho','Contraseña actualizada');
      setShowChangePass(false);
    } catch(_) { Alert.alert('Error','No se pudo cambiar'); }
  }

  async function deleteAccount() {
    Alert.alert('Eliminar cuenta','Esta acción es permanente. ¿Seguro?',[
      {text:'Cancelar',style:'cancel'},
      {text:'Eliminar',style:'destructive',onPress:async()=>{
        try { await apiPost('/api/users/me/delete'); logout(); } catch(_) {}
      }},
    ]);
  }

  // Not logged in
  if (!isLoggedIn) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={{flex:1,justifyContent:'center',alignItems:'center',padding:32}}>
          <Ionicons name="person-circle-outline" size={60} color={COLORS.text3}/>
          <Text style={{fontSize:22,fontWeight:'800',color:COLORS.text,marginTop:12}}>Tu perfil</Text>
          <Text style={{fontSize:14,color:COLORS.text3,textAlign:'center',marginTop:8}}>Inicia sesión para guardar tus aportaciones y subir en el ranking.</Text>
          <TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:14,paddingVertical:14,paddingHorizontal:32,marginTop:20}}
            onPress={()=>setShowAuth(true)}>
            <Text style={{color:'#fff',fontWeight:'700',fontSize:16}}>Iniciar sesión</Text>
          </TouchableOpacity>
        </View>
        <AuthModal visible={showAuth} onClose={()=>setShowAuth(false)}/>
      </SafeAreaView>
    );
  }

  const pts = profile?.points||0;
  const lvl = getLevel(pts);
  const nextLvl = LEVELS.find(l=>l.min>pts);

  if (showPrivacy) return <PrivacyScreen onBack={()=>setShowPrivacy(false)}/>;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>}
        contentContainerStyle={{paddingBottom:40}}>

        {/* Profile card */}
        <View style={s.profileCard}>
          <TouchableOpacity onPress={pickAvatar} style={s.avatarWrap}>
            {profile?.avatar_url ? (
              <Image source={{uri:profile.avatar_url}} style={s.avatar}/>
            ) : (
              <View style={[s.avatar,{backgroundColor:COLORS.primary,alignItems:'center',justifyContent:'center'}]}>
                <Text style={{fontSize:28,color:'#fff',fontWeight:'800'}}>{(profile?.name||'U')[0].toUpperCase()}</Text>
              </View>
            )}
            <View style={s.avatarEdit}>
              <Ionicons name="camera" size={12} color="#fff"/>
            </View>
            {uploading&&<ActivityIndicator style={{position:'absolute'}} color="#fff"/>}
          </TouchableOpacity>

          <Text style={s.userName}>{profile?.name||'Usuario'}</Text>
          {profile?.bio&&<Text style={s.userBio}>{profile.bio}</Text>}
          {profile?.is_admin===1&&(
            <View style={{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:'#FEF3C7',borderRadius:6,paddingHorizontal:8,paddingVertical:3,marginTop:4}}>
              <Ionicons name="shield-checkmark" size={12} color="#92400E"/>
              <Text style={{fontSize:10,fontWeight:'700',color:'#92400E'}}>ADMIN</Text>
            </View>
          )}

          {/* Level + stats */}
          <View style={s.statsRow}>
            <View style={s.statBox}>
              <Ionicons name={lvl.icon} size={16} color={lvl.color}/>
              <Text style={[s.statLabel,{color:lvl.color}]}>{lvl.name}</Text>
            </View>
            <View style={s.statBox}>
              <Ionicons name="star-outline" size={16} color={COLORS.primary}/>
              <Text style={s.statValue}>{pts}</Text>
              <Text style={s.statLabel}>pts</Text>
            </View>
            <View style={s.statBox}>
              <Ionicons name="flame-outline" size={16} color="#DC2626"/>
              <Text style={s.statValue}>{profile?.streak||0}</Text>
              <Text style={s.statLabel}>racha</Text>
            </View>
          </View>

          {/* Progress bar to next level */}
          {nextLvl && (
            <View style={{width:'100%',marginTop:8}}>
              <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:4}}>
                <Text style={{fontSize:10,color:COLORS.text3}}>{pts} pts</Text>
                <Text style={{fontSize:10,color:COLORS.text3}}>{nextLvl.name} — {nextLvl.min} pts</Text>
              </View>
              <View style={{height:4,backgroundColor:COLORS.border,borderRadius:99,overflow:'hidden'}}>
                <View style={{height:'100%',backgroundColor:lvl.color,borderRadius:99,width:`${Math.min(100,((pts-lvl.min)/(nextLvl.min-lvl.min))*100)}%`}}/>
              </View>
            </View>
          )}

          {/* Quick actions */}
          <View style={{flexDirection:'row',gap:8,marginTop:12,width:'100%'}}>
            <TouchableOpacity style={s.quickBtn} onPress={()=>{setEditProfileName(profile?.name||'');setEditProfileBio(profile?.bio||'');setShowEditProfile(true);}}>
              <Ionicons name="create-outline" size={16} color={COLORS.primary}/>
              <Text style={s.quickTxt}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.quickBtn} onPress={()=>setShowChangePass(true)}>
              <Ionicons name="lock-closed-outline" size={16} color={COLORS.primary}/>
              <Text style={s.quickTxt}>Contraseña</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.quickBtn} onPress={toggleNotifications}>
              <Ionicons name={notificationsOn?'notifications':'notifications-off-outline'} size={16} color={notificationsOn?COLORS.primary:COLORS.text3}/>
              <Text style={s.quickTxt}>{notificationsOn?'On':'Off'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:14,gap:6,paddingVertical:10}}>
          {[['info','Info','information-circle-outline'],['aportaciones','Chollos','flame-outline'],['mis_sitios','Sitios','location-outline'],['mis_productos','Productos','pricetag-outline']].map(([key,label,icon])=>(
            <TouchableOpacity key={key} style={[s.tab,profileTab===key&&s.tabOn]} onPress={()=>setProfileTab(key)}>
              <Ionicons name={icon} size={14} color={profileTab===key?'#fff':COLORS.text2}/>
              <Text style={[s.tabTxt,profileTab===key&&{color:'#fff'}]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{paddingHorizontal:14}}>

          {/* TAB: Info */}
          {profileTab==='info'&&(
            <View style={{gap:12}}>
              {/* Mini leaderboard */}
              {leaderboard.length>0&&(
                <View style={s.section}>
                  <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:8}}>
                    <Ionicons name="trophy-outline" size={16} color="#F59E0B"/>
                    <Text style={s.sectionTitle}>Top ahorradores</Text>
                  </View>
                  {leaderboard.slice(0,5).map((u,i)=>(
                    <View key={u.id||i} style={{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:6,borderBottomWidth:i<4?0.5:0,borderBottomColor:COLORS.border}}>
                      <Text style={{fontSize:13,fontWeight:'800',color:i<3?'#F59E0B':COLORS.text3,width:20,textAlign:'center'}}>{i+1}</Text>
                      <View style={{flex:1}}>
                        <Text style={{fontSize:13,fontWeight:'600',color:COLORS.text}}>{u.name||'Usuario'}</Text>
                      </View>
                      <Text style={{fontSize:12,fontWeight:'700',color:COLORS.primary}}>{u.points||0} pts</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Badges */}
              {(profile?.badges||[]).length>0&&(
                <View style={s.section}>
                  <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:8}}>
                    <Ionicons name="ribbon-outline" size={16} color="#7C3AED"/>
                    <Text style={s.sectionTitle}>Insignias</Text>
                  </View>
                  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
                    {(profile.badges).map(b=>{
                      const BADGE_NAMES={primer_reporte:'Primer Reporte',diez_reportes:'Reportero',cincuenta:'Experto Local',
                        cien_reportes:'Maestro Ahorro',primer_chollo:'Cazachollos',cinco_chollos:'Chollero',
                        chollo_viral:'Viral',racha_7:'Racha 7 días',racha_30:'Mes Constante',
                        primer_voto:'Votante',precio_aprobado:'Verificador',madrugador:'Madrugador',explorador:'Explorador'};
                      const BADGE_ICONS={primer_reporte:'location-outline',diez_reportes:'bar-chart-outline',
                        cincuenta:'star-outline',cien_reportes:'diamond-outline',primer_chollo:'flame-outline',
                        cinco_chollos:'bonfire-outline',chollo_viral:'rocket-outline',racha_7:'flash-outline',
                        racha_30:'calendar-outline',primer_voto:'thumbs-up-outline',precio_aprobado:'checkmark-circle-outline',
                        madrugador:'sunny-outline',explorador:'map-outline'};
                      return (
                        <View key={b.key||b.id} style={{alignItems:'center',padding:10,backgroundColor:'#F3E8FF',borderRadius:14,minWidth:76,borderWidth:1,borderColor:'#7C3AED22'}}>
                          <Ionicons name={BADGE_ICONS[b.key]||'star-outline'} size={24} color="#7C3AED"/>
                          <Text style={{fontSize:10,fontWeight:'700',color:COLORS.text,marginTop:4,textAlign:'center'}}>{BADGE_NAMES[b.key]||b.name||b.key}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Notifications */}
              {(profile?.notifications||[]).filter(n=>!n.is_read).length>0&&(
                <View style={s.section}>
                  <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:8}}>
                    <Ionicons name="notifications-outline" size={16} color={COLORS.primary}/>
                    <Text style={s.sectionTitle}>Notificaciones ({(profile.notifications||[]).filter(n=>!n.is_read).length})</Text>
                  </View>
                  {(profile.notifications||[]).filter(n=>!n.is_read).slice(0,8).map(n=>(
                    <View key={n.id} style={{flexDirection:'row',alignItems:'flex-start',gap:8,paddingVertical:8,borderBottomWidth:0.5,borderBottomColor:COLORS.border}}>
                      <Ionicons name={
                        n.type==='badge'?'ribbon-outline':
                        n.type==='comment'?'chatbubble-outline':
                        n.type==='vote'?'thumbs-up-outline':
                        n.type==='level_up'?'arrow-up-circle-outline':
                        'notifications-outline'
                      } size={16} color={COLORS.primary} style={{marginTop:2}}/>
                      <View style={{flex:1}}>
                        <Text style={{fontSize:13,fontWeight:'600',color:COLORS.text}}>{n.title||n.message||'Notificación'}</Text>
                        {n.body&&<Text style={{fontSize:11,color:COLORS.text3,marginTop:1}}>{n.body}</Text>}
                        <Text style={{fontSize:10,color:COLORS.text3,marginTop:2}}>{timeAgo(n.created_at)}</Text>
                      </View>
                      <TouchableOpacity style={{width:24,height:24,borderRadius:12,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'}}
                        onPress={()=>{apiPost('/api/notifications/'+n.id+'/read').then(()=>{
                          setProfile(prev=>({...prev,notifications:(prev.notifications||[]).map(x=>x.id===n.id?{...x,is_read:1}:x)}));
                        }).catch(()=>{});}}>
                        <Ionicons name="close" size={14} color={COLORS.text3}/>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Admin Reports Panel */}
              {profile?.is_admin && adminReports.length>0 && (
                <View style={s.section}>
                  <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:8}}>
                    <Ionicons name="shield-outline" size={16} color={COLORS.danger}/>
                    <Text style={s.sectionTitle}>Admin — Reportes ({adminReports.filter(r=>!r.is_read).length})</Text>
                  </View>
                  {adminReports.filter(r=>!r.is_read).slice(0,10).map(r=>{
                    let parsed={}; try{parsed=JSON.parse(r.message||'{}');}catch(_){}
                    return (
                      <View key={r.id} style={{flexDirection:'row',alignItems:'flex-start',gap:8,paddingVertical:8,borderBottomWidth:0.5,borderBottomColor:COLORS.border}}>
                        <Ionicons name="flag" size={14} color={COLORS.danger} style={{marginTop:2}}/>
                        <View style={{flex:1}}>
                          <Text style={{fontSize:13,fontWeight:'700',color:COLORS.text}}>{r.title||'Reporte'}</Text>
                          <Text style={{fontSize:12,color:COLORS.text2,marginTop:1}}>{r.body||parsed.reason||''}</Text>
                          <Text style={{fontSize:10,color:COLORS.text3,marginTop:2}}>
                            {parsed.report_type||''} #{parsed.target_id||''} · {timeAgo(r.created_at)}
                          </Text>
                        </View>
                        <View style={{flexDirection:'row',gap:4}}>
                          <TouchableOpacity style={{width:28,height:28,borderRadius:14,backgroundColor:COLORS.successLight,alignItems:'center',justifyContent:'center'}}
                            onPress={async()=>{try{await apiPatch('/api/admin/reports/'+r.id,{});setAdminReports(prev=>prev.map(x=>x.id===r.id?{...x,is_read:1}:x));}catch(_){}}}>
                            <Ionicons name="checkmark" size={16} color={COLORS.success}/>
                          </TouchableOpacity>
                          {parsed.report_type==='place'&&parsed.target_id&&(
                            <TouchableOpacity style={{width:28,height:28,borderRadius:14,backgroundColor:'#FEF2F2',alignItems:'center',justifyContent:'center'}}
                              onPress={()=>Alert.alert('Eliminar sitio','¿Eliminar el sitio #'+parsed.target_id+'?',[{text:'No'},{text:'Eliminar',style:'destructive',onPress:async()=>{
                                try{await apiDelete('/api/users/me/places/'+parsed.target_id);await apiPatch('/api/admin/reports/'+r.id,{});
                                setAdminReports(prev=>prev.map(x=>x.id===r.id?{...x,is_read:1}:x));Alert.alert('Eliminado');}catch(_){Alert.alert('Error');}
                              }}])}>
                              <Ionicons name="trash" size={14} color={COLORS.danger}/>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Settings section */}
              <View style={s.section}>
                <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:8}}>
                  <Ionicons name="settings-outline" size={16} color={COLORS.text2}/>
                  <Text style={s.sectionTitle}>Ajustes</Text>
                </View>
                {[
                  ['Política de privacidad','shield-checkmark-outline',()=>setShowPrivacy(true)],
                  ['Cerrar sesión','log-out-outline',()=>Alert.alert('Cerrar sesión','¿Seguro?',[{text:'Cancelar'},{text:'Cerrar',onPress:logout}])],
                  ['Eliminar cuenta','trash-outline',deleteAccount],
                ].map(([label,icon,action])=>(
                  <TouchableOpacity key={label} style={s.settingsRow} onPress={action}>
                    <Ionicons name={icon} size={18} color={label.includes('Eliminar')?COLORS.danger:COLORS.text2}/>
                    <Text style={[s.settingsLabel,label.includes('Eliminar')&&{color:COLORS.danger}]}>{label}</Text>
                    <Ionicons name="chevron-forward" size={14} color={COLORS.text3}/>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{fontSize:10,color:COLORS.text3,textAlign:'center',marginTop:8}}>Mapa Tacaño v{APP_VERSION}</Text>
            </View>
          )}

          {/* TAB: Chollos */}
          {profileTab==='aportaciones'&&(
            <View style={{gap:10}}>
              {myDeals.length===0?(
                <View style={{alignItems:'center',paddingVertical:30,gap:8}}>
                  <Ionicons name="flame-outline" size={40} color={COLORS.text3}/>
                  <Text style={{fontSize:15,fontWeight:'700',color:COLORS.text}}>No has publicado chollos</Text>
                  <Text style={{fontSize:13,color:COLORS.text3,textAlign:'center'}}>Ve a Chollos y pulsa + para compartir una oferta.</Text>
                </View>
              ):(
                <>
                {myDeals.slice(0,dealsPage*10).map(d=>(
                  <TouchableOpacity key={d.id} style={s.listCard} onPress={()=>setViewDeal(d)}>
                    <View style={{flex:1}}>
                      <Text style={{fontSize:14,fontWeight:'600',color:COLORS.text}} numberOfLines={2}>{d.title}</Text>
                      <View style={{flexDirection:'row',gap:6,marginTop:4,alignItems:'center'}}>
                        <Text style={{fontSize:15,fontWeight:'800',color:COLORS.primary}}>{d.deal_price===0?'GRATIS':d.deal_price?.toFixed(2).replace(".",",")+'€'}</Text>
                        {d.discount_percent>0&&<View style={{backgroundColor:'#FEE2E2',borderRadius:4,paddingHorizontal:5,paddingVertical:1}}>
                          <Text style={{fontSize:10,fontWeight:'700',color:COLORS.danger}}>-{Math.round(d.discount_percent)}%</Text>
                        </View>}
                      </View>
                      <View style={{flexDirection:'row',alignItems:'center',gap:6,marginTop:3}}>
                        <Ionicons name="flame-outline" size={11} color="#DC2626"/>
                        <Text style={{fontSize:11,color:COLORS.text3}}>{d.votes_up||0} votos</Text>
                        {d.store&&<Text style={{fontSize:11,color:COLORS.text3}}>{d.store}</Text>}
                        <View style={{flex:1}}/>
                        {d.url&&<TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:6,paddingHorizontal:8,paddingVertical:3}}
                          onPress={()=>openURL(d.url)}><Text style={{fontSize:10,color:'#fff',fontWeight:'700'}}>Ver</Text></TouchableOpacity>}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
                {myDeals.length>dealsPage*10&&(
                  <TouchableOpacity style={s.loadMore} onPress={()=>setDealsPage(p=>p+1)}>
                    <Text style={{fontSize:13,fontWeight:'600',color:COLORS.primary}}>Ver más ({myDeals.length-dealsPage*10})</Text>
                  </TouchableOpacity>
                )}
                </>
              )}
            </View>
          )}

          {/* TAB: Sitios */}
          {profileTab==='mis_sitios'&&(
            <View style={{gap:10}}>
              {myPlaces.filter(p=>p.is_active!==0).length===0?(
                <View style={{alignItems:'center',paddingVertical:30,gap:8}}>
                  <Ionicons name="location-outline" size={40} color={COLORS.text3}/>
                  <Text style={{fontSize:15,fontWeight:'700',color:COLORS.text}}>No has añadido sitios</Text>
                  <Text style={{fontSize:13,color:COLORS.text3,textAlign:'center'}}>Ve al mapa y pulsa + para añadir lugares.</Text>
                </View>
              ):(
                <>
                {myPlaces.filter(p=>p.is_active!==0).slice(0,placesPage*10).map(place=>{
                  const isEd=editingPlace===place.id;
                  const catIcons={restaurante:'restaurant-outline',supermercado:'cart-outline',farmacia:'medkit-outline',
                    gimnasio:'barbell-outline',peluqueria:'cut-outline',peluqueria_canina:'paw-outline',
                    veterinario:'medical-outline',carniceria:'flame-outline',fruteria:'leaf-outline',
                    panaderia:'nutrition-outline',pescaderia:'fish-outline',default:'location-outline'};
                  return (
                    <TouchableOpacity key={place.id} style={s.listCard} onPress={()=>setViewPlace(place)} activeOpacity={0.7}>
                      <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
                        <View style={{width:36,height:36,borderRadius:8,backgroundColor:COLORS.primaryLight,alignItems:'center',justifyContent:'center'}}>
                          <Ionicons name={catIcons[place.category]||catIcons.default} size={18} color={COLORS.primary}/>
                        </View>
                        <View style={{flex:1}}>
                          <Text style={{fontSize:14,fontWeight:'600',color:COLORS.text}} numberOfLines={1}>{place.name}</Text>
                          <Text style={{fontSize:11,color:COLORS.text3}}>{place.category}{place.city?` · ${place.city}`:''}</Text>
                        </View>
                        <TouchableOpacity style={s.iconBtn} onPress={()=>{
                          if(isEd){setEditingPlace(null);}
                          else{setEditingPlace(place.id);setEditName(place.name||'');setEditAddress(place.address||'');setEditCity(place.city||'');setEditPriceRange(place.price_range||null);setEditMonthlyFee(place.monthly_fee?String(place.monthly_fee):'');}
                        }}>
                          <Ionicons name={isEd?'close-outline':'create-outline'} size={14} color={COLORS.primary}/>
                        </TouchableOpacity>

                        <TouchableOpacity style={[s.iconBtn,{backgroundColor:'#FEE2E2'}]} onPress={()=>{
                          Alert.alert('Eliminar',`¿Eliminar "${place.name}"?`,[{text:'Cancelar'},{text:'Eliminar',style:'destructive',onPress:async()=>{
                            try{await apiDelete('/api/users/me/places/'+place.id);setMyPlaces(prev=>prev.filter(p=>p.id!==place.id));}catch(_){}
                          }}]);
                        }}>
                          <Ionicons name="trash-outline" size={14} color={COLORS.danger}/>
                        </TouchableOpacity>
                      </View>
                      {isEd&&(
                        <View style={{marginTop:10,gap:6,borderTopWidth:0.5,borderTopColor:COLORS.border,paddingTop:10}}>
                          <TextInput style={s.editInput} value={editName} onChangeText={setEditName} placeholder="Nombre"/>
                          <TextInput style={s.editInput} value={editAddress} onChangeText={setEditAddress} placeholder="Dirección"/>
                          <TextInput style={s.editInput} value={editCity} onChangeText={setEditCity} placeholder="Ciudad"/>
                          <TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:10,padding:10,alignItems:'center',marginTop:4}}
                            onPress={async()=>{
                              try{await apiPatch('/api/users/me/places/'+place.id,{name:editName,address:editAddress,city:editCity});
                              setMyPlaces(prev=>prev.map(p=>p.id===place.id?{...p,name:editName,address:editAddress,city:editCity}:p));setEditingPlace(null);}catch(_){}
                            }}>
                            <Text style={{color:'#fff',fontWeight:'700',fontSize:13}}>Guardar</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
                {myPlaces.filter(p=>p.is_active!==0).length>placesPage*10&&(
                  <TouchableOpacity style={s.loadMore} onPress={()=>setPlacesPage(p=>p+1)}>
                    <Text style={{fontSize:13,fontWeight:'600',color:COLORS.primary}}>Ver más</Text>
                  </TouchableOpacity>
                )}
                </>
              )}
            </View>
          )}

          {/* TAB: Productos */}
          {profileTab==='mis_productos'&&(
            <View style={{gap:10}}>
              {favSupers.length>0&&(
                <View style={s.section}>
                  <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:6}}>
                    <Ionicons name="heart" size={14} color={COLORS.danger}/>
                    <Text style={s.sectionTitle}>Supermercados favoritos</Text>
                  </View>
                  <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
                    {favSupers.map(n=>(
                      <View key={n} style={{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:COLORS.primaryLight,borderRadius:8,paddingHorizontal:8,paddingVertical:5}}>
                        <Ionicons name="cart-outline" size={11} color={COLORS.primary}/>
                        <Text style={{fontSize:11,fontWeight:'600',color:COLORS.primary}}>{n}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {myPrices.length===0?(
                <View style={{alignItems:'center',paddingVertical:30,gap:8}}>
                  <Ionicons name="basket-outline" size={40} color={COLORS.text3}/>
                  <Text style={{fontSize:15,fontWeight:'700',color:COLORS.text}}>No has añadido productos</Text>
                  <Text style={{fontSize:13,color:COLORS.text3,textAlign:'center'}}>Ve a Ahorro y pulsa + para añadir precios.</Text>
                </View>
              ):(
                <>
                {myPrices.slice(0,pricesPage*10).map(p=>(
                  <TouchableOpacity key={p.id} style={s.listCard} onPress={()=>setViewProduct(p)} activeOpacity={0.7}>
                    <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
                      <View style={{width:36,height:36,borderRadius:8,backgroundColor:'#DCFCE7',alignItems:'center',justifyContent:'center'}}>
                        <Ionicons name="pricetag-outline" size={16} color="#16A34A"/>
                      </View>
                      <View style={{flex:1}}>
                        <Text style={{fontSize:14,fontWeight:'600',color:COLORS.text}} numberOfLines={1}>{p.product}</Text>
                        <Text style={{fontSize:11,color:COLORS.text3}}>{p.places?.name||''}{p.places?.city?` · ${p.places.city}`:''}</Text>
                      </View>
                      <View style={{alignItems:'flex-end'}}>
                        <Text style={{fontSize:16,fontWeight:'800',color:COLORS.primary}}>{p.price?.toFixed(2).replace(".",",")}€</Text>
                        <View style={{flexDirection:'row',alignItems:'center',gap:3}}>
                          <Ionicons name={p.status==='verified'?'checkmark-circle':'time-outline'} size={10} color={p.status==='verified'?COLORS.success:COLORS.warning}/>
                          <Text style={{fontSize:9,color:p.status==='verified'?COLORS.success:COLORS.warning}}>{p.status==='verified'?'Verificado':'Pendiente'}</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
                {myPrices.length>pricesPage*10&&(
                  <TouchableOpacity style={s.loadMore} onPress={()=>setPricesPage(p=>p+1)}>
                    <Text style={{fontSize:13,fontWeight:'600',color:COLORS.primary}}>Ver más ({myPrices.length-pricesPage*10})</Text>
                  </TouchableOpacity>
                )}
                </>
              )}
            </View>
          )}

        </View>
      </ScrollView>

      {/* Edit profile modal */}
      <Modal visible={showEditProfile} animationType="slide" transparent>
        <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.4)',justifyContent:'flex-end'}}>
          <View style={{backgroundColor:COLORS.bg2,borderTopLeftRadius:20,borderTopRightRadius:20,padding:20,gap:12}}>
            <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
              <Text style={{fontSize:18,fontWeight:'700',color:COLORS.text}}>Editar perfil</Text>
              <TouchableOpacity onPress={()=>setShowEditProfile(false)}><Ionicons name="close" size={22} color={COLORS.text2}/></TouchableOpacity>
            </View>
            <Text style={{fontSize:12,fontWeight:'600',color:COLORS.text}}>Nombre</Text>
            <TextInput style={s.editInput} value={editProfileName} onChangeText={setEditProfileName}/>
            <Text style={{fontSize:12,fontWeight:'600',color:COLORS.text}}>Bio</Text>
            <TextInput style={[s.editInput,{height:60,textAlignVertical:'top'}]} value={editProfileBio} onChangeText={t=>setEditProfileBio(t.slice(0,200))} multiline/>
            <TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:12,padding:14,alignItems:'center'}} onPress={saveProfile}>
              <Text style={{color:'#fff',fontWeight:'700',fontSize:15}}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Change password modal */}
      <Modal visible={showChangePass} animationType="slide" transparent>
        <ChangePassModal onClose={()=>setShowChangePass(false)} onSubmit={changePassword}/>
      </Modal>
      <AuthModal visible={showAuth} onClose={()=>setShowAuth(false)}/>

      {/* Deal Detail Modal */}
      <Modal visible={!!viewDeal} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setViewDeal(null)}>
        {viewDeal&&(
          <View style={{flex:1,backgroundColor:COLORS.bg2}}>
            <View style={{width:40,height:4,borderRadius:99,backgroundColor:COLORS.border,alignSelf:'center',marginTop:10}}/>
            <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:16}}>
              <Text style={{fontSize:16,fontWeight:'700',color:COLORS.text}}>Mi chollo</Text>
              <TouchableOpacity onPress={()=>setViewDeal(null)} style={{width:32,height:32,borderRadius:16,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'}}>
                <Ionicons name="close" size={20} color={COLORS.text2}/></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{padding:16,gap:10}}>
              <Text style={{fontSize:22,fontWeight:'800',color:COLORS.text}}>{viewDeal.title}</Text>
              {viewDeal.store&&<Text style={{fontSize:13,color:COLORS.primary,fontWeight:'600'}}>{viewDeal.store}</Text>}
              <View style={{flexDirection:'row',alignItems:'baseline',gap:8}}>
                <Text style={{fontSize:24,fontWeight:'800',color:COLORS.success}}>{viewDeal.deal_price===0?'GRATIS':viewDeal.deal_price?.toFixed(2).replace(".",",")+'€'}</Text>
                {viewDeal.original_price>0&&<Text style={{fontSize:16,color:COLORS.text3,textDecorationLine:'line-through'}}>{viewDeal.original_price?.toFixed(2).replace(".",",")}€</Text>}
              </View>
              {viewDeal.description&&<Text style={{fontSize:14,color:COLORS.text2,lineHeight:20,marginTop:8}}>{viewDeal.description}</Text>}
              <View style={{flexDirection:'row',alignItems:'center',gap:12,marginTop:8}}>
                <View style={{flexDirection:'row',alignItems:'center',gap:4}}><Ionicons name="flame" size={16} color="#DC2626"/><Text style={{fontWeight:'700',color:COLORS.text}}>{viewDeal.votes_up||0}</Text></View>
                <Text style={{fontSize:12,color:COLORS.text3}}>{timeAgo(viewDeal.created_at)}</Text>
              </View>
              {viewDeal.url&&(
                <TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:14,padding:14,alignItems:'center',marginTop:12,flexDirection:'row',justifyContent:'center',gap:8}}
                  onPress={()=>openURL(viewDeal.url)}>
                  <Ionicons name="open-outline" size={18} color="#fff"/><Text style={{color:'#fff',fontWeight:'700',fontSize:15}}>Ir al chollo</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Place Detail Modal */}
      <Modal visible={!!viewPlace} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setViewPlace(null)}>
        {viewPlace&&(
          <View style={{flex:1,backgroundColor:COLORS.bg2}}>
            <View style={{width:40,height:4,borderRadius:99,backgroundColor:COLORS.border,alignSelf:'center',marginTop:10}}/>
            <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:16}}>
              <Text style={{fontSize:16,fontWeight:'700',color:COLORS.text}}>Mi sitio</Text>
              <TouchableOpacity onPress={()=>setViewPlace(null)} style={{width:32,height:32,borderRadius:16,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'}}>
                <Ionicons name="close" size={20} color={COLORS.text2}/></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{padding:16,gap:10}}>
              <Text style={{fontSize:22,fontWeight:'800',color:COLORS.text}}>{viewPlace.name}</Text>
              <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                <Ionicons name="location-outline" size={14} color={COLORS.text3}/>
                <Text style={{fontSize:13,color:COLORS.text2}}>{viewPlace.city||''}{viewPlace.address?' · '+viewPlace.address:''}</Text>
              </View>
              <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                <Ionicons name="grid-outline" size={14} color={COLORS.text3}/>
                <Text style={{fontSize:13,color:COLORS.text2}}>{viewPlace.category||'Lugar'}</Text>
              </View>
              {viewPlace.price_range&&<View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                <Ionicons name="wallet-outline" size={14} color={COLORS.text3}/>
                <Text style={{fontSize:13,fontWeight:'700',color:COLORS.primary}}>{'€'.repeat(viewPlace.price_range)}</Text>
              </View>}
              {viewPlace.lat&&viewPlace.lng&&(
                <TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:14,padding:14,alignItems:'center',marginTop:12,flexDirection:'row',justifyContent:'center',gap:8}}
                  onPress={()=>openURL(`https://www.google.com/maps/dir/?api=1&destination=${viewPlace.lat},${viewPlace.lng}`)}>
                  <Ionicons name="navigate-outline" size={18} color="#fff"/><Text style={{color:'#fff',fontWeight:'700',fontSize:15}}>Cómo llegar</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Product Detail Modal */}
      <Modal visible={!!viewProduct} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setViewProduct(null)}>
        {viewProduct&&(
          <View style={{flex:1,backgroundColor:COLORS.bg2}}>
            <View style={{width:40,height:4,borderRadius:99,backgroundColor:COLORS.border,alignSelf:'center',marginTop:10}}/>
            <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:16}}>
              <Text style={{fontSize:16,fontWeight:'700',color:COLORS.text}}>Mi producto</Text>
              <TouchableOpacity onPress={()=>setViewProduct(null)} style={{width:32,height:32,borderRadius:16,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'}}>
                <Ionicons name="close" size={20} color={COLORS.text2}/></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{padding:16,gap:10}}>
              <Text style={{fontSize:22,fontWeight:'800',color:COLORS.text}}>{viewProduct.product}</Text>
              <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                <Ionicons name="cart-outline" size={14} color={COLORS.text3}/>
                <Text style={{fontSize:13,color:COLORS.text2}}>{viewProduct.places?.name||'Supermercado'}{viewProduct.places?.city?' · '+viewProduct.places.city:''}</Text>
              </View>
              <Text style={{fontSize:28,fontWeight:'900',color:COLORS.primary,marginTop:8}}>{viewProduct.price?.toFixed(2).replace(".",",")}€<Text style={{fontSize:14,fontWeight:'500',color:COLORS.text3}}>/{viewProduct.unit||'ud'}</Text></Text>
              <View style={{flexDirection:'row',alignItems:'center',gap:6,marginTop:4}}>
                <Ionicons name={viewProduct.status==='verified'?'checkmark-circle':'time-outline'} size={14} color={viewProduct.status==='verified'?COLORS.success:COLORS.warning}/>
                <Text style={{fontSize:13,color:viewProduct.status==='verified'?COLORS.success:COLORS.warning}}>{viewProduct.status==='verified'?'Verificado':'Pendiente'}</Text>
              </View>
              <Text style={{fontSize:11,color:COLORS.text3,marginTop:4}}>{timeAgo(viewProduct.reported_at)}</Text>
            </ScrollView>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

function ChangePassModal({onClose,onSubmit}){
  const [cur,setCur]=useState('');const [np,setNp]=useState('');
  return (
    <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.4)',justifyContent:'flex-end'}}>
      <View style={{backgroundColor:COLORS.bg2,borderTopLeftRadius:20,borderTopRightRadius:20,padding:20,gap:12}}>
        <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
          <Text style={{fontSize:18,fontWeight:'700',color:COLORS.text}}>Cambiar contraseña</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={COLORS.text2}/></TouchableOpacity>
        </View>
        <TextInput style={{backgroundColor:COLORS.bg3,borderRadius:10,padding:12,fontSize:14,color:COLORS.text,borderWidth:1,borderColor:COLORS.border}}
          value={cur} onChangeText={setCur} placeholder="Contraseña actual" secureTextEntry placeholderTextColor={COLORS.text3}/>
        <TextInput style={{backgroundColor:COLORS.bg3,borderRadius:10,padding:12,fontSize:14,color:COLORS.text,borderWidth:1,borderColor:COLORS.border}}
          value={np} onChangeText={setNp} placeholder="Nueva contraseña" secureTextEntry placeholderTextColor={COLORS.text3}/>
        <TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:12,padding:14,alignItems:'center'}}
          onPress={()=>onSubmit(cur,np)}>
          <Text style={{color:'#fff',fontWeight:'700',fontSize:15}}>Cambiar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:COLORS.bg},
  profileCard:{backgroundColor:COLORS.bg2,marginHorizontal:14,marginTop:14,borderRadius:18,padding:20,alignItems:'center',borderWidth:0.5,borderColor:COLORS.border},
  avatarWrap:{position:'relative',marginBottom:10},
  avatar:{width:72,height:72,borderRadius:36},
  avatarEdit:{position:'absolute',bottom:0,right:0,width:24,height:24,borderRadius:12,backgroundColor:COLORS.primary,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:COLORS.bg2},
  userName:{fontSize:20,fontWeight:'800',color:COLORS.text},
  userBio:{fontSize:13,color:COLORS.text3,marginTop:2,textAlign:'center'},
  statsRow:{flexDirection:'row',gap:16,marginTop:12},
  statBox:{alignItems:'center',gap:2},
  statValue:{fontSize:16,fontWeight:'800',color:COLORS.text},
  statLabel:{fontSize:10,fontWeight:'600',color:COLORS.text3},
  quickBtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:4,backgroundColor:COLORS.bg3,borderRadius:10,paddingVertical:8,borderWidth:1,borderColor:COLORS.border},
  quickTxt:{fontSize:11,fontWeight:'600',color:COLORS.primary},
  tab:{flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:14,paddingVertical:8,borderRadius:99,borderWidth:1.5,borderColor:COLORS.border,backgroundColor:COLORS.bg2},
  tabOn:{backgroundColor:COLORS.primary,borderColor:COLORS.primary},
  tabTxt:{fontSize:12,fontWeight:'600',color:COLORS.text2},
  section:{backgroundColor:COLORS.bg2,borderRadius:14,padding:14,borderWidth:0.5,borderColor:COLORS.border},
  sectionTitle:{fontSize:13,fontWeight:'700',color:COLORS.text},
  listCard:{backgroundColor:COLORS.bg2,borderRadius:14,padding:12,borderWidth:0.5,borderColor:COLORS.border},
  loadMore:{padding:12,alignItems:'center'},
  settingsRow:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:12,borderBottomWidth:0.5,borderBottomColor:COLORS.border},
  settingsLabel:{flex:1,fontSize:14,fontWeight:'500',color:COLORS.text},
  iconBtn:{width:28,height:28,borderRadius:8,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'},
  editInput:{backgroundColor:COLORS.bg3,borderRadius:10,paddingHorizontal:12,paddingVertical:8,fontSize:14,color:COLORS.text,borderWidth:1,borderColor:COLORS.border},
});
