import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Image, RefreshControl, TextInput,
  Modal, KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, apiGet, apiPost, apiPatch, apiUpload, API_BASE } from '../utils';
import PrivacyScreen from './PrivacyScreen';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from '../components/AuthModal';

// ─── Badge definitions ────────────────────────────────────────────────────────
const BADGES_DEF = [
  { key:'primer_reporte',  emoji:'📍', name:'Primer Reporte',     desc:'Reportaste tu primer precio',          pts:5   },
  { key:'diez_reportes',   emoji:'📊', name:'Reportero',          desc:'10 precios reportados',                pts:15  },
  { key:'cincuenta',       emoji:'🌟', name:'Experto Local',      desc:'50 precios reportados',                pts:50  },
  { key:'cien_reportes',   emoji:'💎', name:'Maestro Ahorro',     desc:'100 precios reportados',               pts:100 },
  { key:'primer_chollo',   emoji:'🔥', name:'Cazachollos',        desc:'Publicaste tu primer chollo',          pts:10  },
  { key:'cinco_chollos',   emoji:'🎯', name:'Chollero',           desc:'5 chollos publicados',                 pts:25  },
  { key:'chollo_viral',    emoji:'🚀', name:'Viral',              desc:'Un chollo tuyo superó 50 votos',       pts:50  },
  { key:'racha_7',         emoji:'🔥', name:'Racha Semanal',      desc:'7 días consecutivos activo',           pts:15  },
  { key:'racha_30',        emoji:'📅', name:'Mes Constante',      desc:'30 días consecutivos activo',          pts:50  },
  { key:'primer_voto',     emoji:'👍', name:'Votante',            desc:'Votaste por primera vez',              pts:2   },
  { key:'precio_aprobado', emoji:'✅', name:'Verificador',        desc:'Un cambio de precio fue aprobado',     pts:20  },
  { key:'madrugador',      emoji:'🌅', name:'Madrugador',         desc:'Reportaste precio antes de las 8am',  pts:10  },
  { key:'explorador',      emoji:'🗺️', name:'Explorador',         desc:'Reportaste en 5 ciudades distintas',  pts:30  },
];

// ─── Edit Profile Modal ───────────────────────────────────────────────────────
function EditProfileModal({ visible, user, onClose, onSaved }) {
  const [name, setName]   = useState(user?.name || '');
  const [bio,  setBio]    = useState(user?.bio  || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (visible) { setName(user?.name||''); setBio(user?.bio||''); setError(''); } }, [visible]);

  async function save() {
    if (!name.trim() || name.trim().length < 2) return setError('El nombre debe tener al menos 2 caracteres');
    setLoading(true);
    try {
      const res = await apiPatch('/api/users/me', { name: name.trim(), bio: bio.trim() });
      if (res.error) { setError(res.error); return; }
      onSaved(res.user);
      onClose();
    } catch { setError('Error de conexión'); }
    finally { setLoading(false); }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':'height'}>
        <View style={em.wrap}>
          <View style={em.header}>
            <Text style={em.title}>✏️ Editar perfil</Text>
            <TouchableOpacity onPress={onClose} style={em.closeBtn}>
              <Ionicons name="close" size={20} color={COLORS.text2}/>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={em.body} keyboardShouldPersistTaps="handled">
            <Text style={em.label}>Nombre</Text>
            <TextInput style={em.input} value={name} onChangeText={setName}
              placeholder="Tu nombre" placeholderTextColor={COLORS.text3} autoCapitalize="words"/>
            <Text style={em.label}>Bio <Text style={em.optional}>(opcional · máx. 200 caracteres)</Text></Text>
            <TextInput style={[em.input, {height:90, textAlignVertical:'top'}]} value={bio} onChangeText={t=>setBio(t.slice(0,200))}
              placeholder="Cuéntanos algo sobre ti..." placeholderTextColor={COLORS.text3} multiline/>
            <Text style={em.charCount}>{bio.length}/200</Text>
            {!!error && <Text style={em.error}>{error}</Text>}
            <TouchableOpacity style={[em.btn, loading&&{opacity:0.6}]} onPress={save} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff"/> : <Text style={em.btnTxt}>Guardar cambios</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Change Password Modal ────────────────────────────────────────────────────
function ChangePasswordModal({ visible, onClose }) {
  const [current, setCurrent]   = useState('');
  const [newPass,  setNewPass]  = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showCur,  setShowCur]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => { if (!visible) { setCurrent(''); setNewPass(''); setConfirm(''); setError(''); } }, [visible]);

  async function save() {
    if (!current || !newPass || !confirm) return setError('Rellena todos los campos');
    if (newPass.length < 6) return setError('La nueva contraseña debe tener al menos 6 caracteres');
    if (newPass !== confirm) return setError('Las contraseñas no coinciden');
    if (current === newPass) return setError('La nueva contraseña debe ser diferente');
    setLoading(true);
    try {
      const res = await apiPost('/api/users/me/change-password', { current_password: current, new_password: newPass });
      if (res.error) { setError(res.error); return; }
      Alert.alert('✅ Contraseña cambiada', 'Tu contraseña se ha actualizado correctamente.');
      onClose();
    } catch { setError('Error de conexión'); }
    finally { setLoading(false); }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':'height'}>
        <View style={em.wrap}>
          <View style={em.header}>
            <Text style={em.title}>🔒 Cambiar contraseña</Text>
            <TouchableOpacity onPress={onClose} style={em.closeBtn}>
              <Ionicons name="close" size={20} color={COLORS.text2}/>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={em.body} keyboardShouldPersistTaps="handled">
            {[
              { label:'Contraseña actual', val:current, set:setCurrent, show:showCur, toggle:()=>setShowCur(!showCur) },
              { label:'Nueva contraseña',  val:newPass,  set:setNewPass,  show:showNew, toggle:()=>setShowNew(!showNew) },
              { label:'Confirmar nueva',   val:confirm,  set:setConfirm,  show:false,   toggle:null },
            ].map(f => (
              <View key={f.label}>
                <Text style={em.label}>{f.label}</Text>
                <View style={em.passRow}>
                  <TextInput style={[em.input, {flex:1, marginBottom:0}]} value={f.val} onChangeText={f.set}
                    secureTextEntry={!f.show} placeholderTextColor={COLORS.text3} placeholder="••••••"/>
                  {f.toggle && (
                    <TouchableOpacity style={em.eyeBtn} onPress={f.toggle}>
                      <Ionicons name={f.show ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.text3}/>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
            {!!error && <Text style={em.error}>{error}</Text>}
            <TouchableOpacity style={[em.btn, loading&&{opacity:0.6}]} onPress={save} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff"/> : <Text style={em.btnTxt}>Cambiar contraseña</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main ProfileScreen ───────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { user, isLoggedIn, logout, updateUser } = useAuth();
  const [showAuth,    setShowAuth]    = useState(false);
  const [showEdit,    setShowEdit]    = useState(false);
  const [showPassChg, setShowPassChg] = useState(false);
  const [profile,     setProfile]     = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);
  const [serverOk,    setServerOk]    = useState(null);
  const [uploading,   setUploading]   = useState(false);
  const [myDeals,     setMyDeals]     = useState([]);
  const [profileTab,  setProfileTab]  = useState('info');
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => { checkServer(); if (isLoggedIn) loadProfile(); }, [isLoggedIn]);

  async function checkServer() {
    try { const r = await fetch(`${API_BASE}/api/health`); setServerOk(r.ok); }
    catch { setServerOk(false); }
  }

  async function loadProfile() {
    setLoading(true);
    try {
      const [data, deals, lb] = await Promise.all([
        apiGet('/api/users/me'),
        apiGet('/api/users/me/deals'),
        apiGet('/api/leaderboard?period=all'),
      ]);
      setProfile(data);
      setMyDeals(Array.isArray(deals) ? deals : []);
      // Sync fresh data back to Auth context so header/stats are up-to-date
      if (data?.id) {
        updateUser({
          points: data.points,
          name: data.name,
          avatar_url: data.avatar_url,
          streak: data.streak,
          is_admin: data.is_admin,
        });
      }
      // Find rank position
      if (Array.isArray(lb) && data?.id) {
        const pos = lb.findIndex(u => u.id === data.id);
        if (pos >= 0) setProfile(p => ({...p, _rankPos: pos + 1, _rankTotal: lb.length}));
      }
      if ((data?.notifications||[]).some(n => !n.is_read)) {
        apiPost('/api/notifications/read', {}).catch(() => {});
      }
    }
    catch {} finally { setLoading(false); setRefreshing(false); }
  }

  const onRefresh = useCallback(() => { setRefreshing(true); loadProfile(); }, []);

  async function pickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1,1], quality: 0.75,
    });
    if (result.canceled) return;
    setUploading(true);
    try {
      const res = await apiUpload('/api/users/avatar', {}, result.assets[0].uri, 'avatar');
      if (res.avatar_url) {
        updateUser({ avatar_url: res.avatar_url });
        setProfile(p => p ? { ...p, avatar_url: res.avatar_url } : p);
      }
    } catch { Alert.alert('Error', 'No se pudo subir la imagen'); }
    finally { setUploading(false); }
  }

  function confirmLogout() {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text:'Cancelar', style:'cancel' },
      { text:'Salir', style:'destructive', onPress: logout },
    ]);
  }

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword]   = useState('');
  const [deleteError, setDeleteError]         = useState('');
  const [deleteLoading, setDeleteLoading]     = useState(false);

  function confirmDeleteAccount() {
    setDeletePassword(''); setDeleteError('');
    setShowDeleteModal(true);
  }

  async function executeDelete() {
    if (!deletePassword) return setDeleteError('Introduce tu contraseña');
    setDeleteLoading(true);
    try {
      // apiDelete doesn't send body — use apiPost instead
      const res = await apiPost('/api/users/me/delete', { password: deletePassword });
      if (res.error) { setDeleteError(res.error); return; }
      setShowDeleteModal(false);
      Alert.alert('Cuenta eliminada', 'Todos tus datos han sido eliminados. Hasta pronto.');
      logout();
    } catch { setDeleteError('Error de conexión'); }
    finally { setDeleteLoading(false); }
  }

  const initials = (n='?') => n.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  // Always prefer profile (fresh from API) over user (stale JWT)
  // While profile loads, show a loading skeleton instead of wrong data
  const u = profile ?? user;

  // ─── GUEST VIEW ─────────────────────────────────────────────────────────────
  if (!isLoggedIn) return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {serverOk === false && <ServerBanner url={API_BASE}/>}
      <ScrollView contentContainerStyle={s.guestScroll} showsVerticalScrollIndicator={false}>
        <View style={s.guestHero}>
          <Text style={{fontSize:60}}>🗺️</Text>
          <Text style={s.guestTitle}>PreciMap</Text>
          <Text style={s.guestSub}>La app de ahorro de España</Text>
        </View>
        <View style={s.statsRow}>
          {[['12.214+','Gasolineras'],['🆓','100% Gratis'],['🇪🇸','Toda España']].map(([n,l])=>(
            <View key={l} style={s.statBox}><Text style={s.statNum}>{n}</Text><Text style={s.statLbl}>{l}</Text></View>
          ))}
        </View>
        <View style={s.card}>
          <Text style={s.cardTitle}>¿Por qué crear cuenta?</Text>
          {[
            ['🔥','Vota chollos y ve los más calientes'],
            ['💬','Comenta y pregunta en la comunidad'],
            ['📍','Reporta precios y gana puntos'],
            ['🔔','Alertas cuando baje el precio'],
            ['🏆','Ranking y badges exclusivos'],
            ['🖼️','Foto de perfil personalizada'],
            ['🗑️','Eliminar tu cuenta cuando quieras (RGPD)'],
          ].map(([e,t])=>(
            <View key={t} style={s.benefitRow}>
              <Text style={s.bEmoji}>{e}</Text>
              <Text style={s.bTxt}>{t}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={s.mainBtn} onPress={()=>setShowAuth(true)}>
          <Text style={s.mainBtnTxt}>Crear cuenta gratis</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.secBtn} onPress={()=>setShowAuth(true)}>
          <Text style={s.secBtnTxt}>Ya tengo cuenta — iniciar sesión</Text>
        </TouchableOpacity>
        <Text style={s.note}>Solo necesitas email · 30 segundos</Text>
      </ScrollView>
      <AuthModal visible={showAuth} onClose={()=>setShowAuth(false)}/>
    </SafeAreaView>
  );

  if (loading && !profile) return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ActivityIndicator color={COLORS.primary} style={{marginTop:80}}/>
    </SafeAreaView>
  );

  const badges     = profile?.badges || [];
  const earnedKeys = badges.map(b => b.key);

  // ─── LOGGED IN VIEW ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {serverOk === false && <ServerBanner url={API_BASE}/>}
      <ScrollView
        contentContainerStyle={{paddingBottom:100}}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary}/>}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={s.profileHeader}>
          <TouchableOpacity style={s.avatarWrap} onPress={pickAvatar} activeOpacity={0.8}>
            {uploading
              ? <View style={s.avatar}><ActivityIndicator color="#fff"/></View>
              : u?.avatar_url
                ? <Image source={{uri:u.avatar_url}} style={s.avatar} resizeMode="cover"/>
                : (() => {
                    const pts=u?.points||0;
                    const lvlColor=pts>=1000?'#7C3AED':pts>=400?'#2563EB':pts>=150?'#0891B2':pts>=50?'#16A34A':'#6B7280';
                    return (
                      <View style={[s.avatar,{backgroundColor:lvlColor}]}>
                        <Text style={s.avatarTxt}>{initials(u?.name)}</Text>
                      </View>
                    );
                  })()
            }
            <View style={s.avatarEdit}><Ionicons name="camera" size={12} color="#fff"/></View>
          </TouchableOpacity>
          <Text style={s.profileName}>{u?.name}</Text>
          {u?.is_admin && (
            <View style={{backgroundColor:'#DC2626',borderRadius:99,paddingHorizontal:10,paddingVertical:3,marginTop:4}}>
              <Text style={{fontSize:11,fontWeight:'800',color:'#fff'}}>🛡️ ADMINISTRADOR</Text>
            </View>
          )}
          <Text style={s.profileEmail}>{u?.email}</Text>
          {u?.created_at && !isNaN(new Date(u.created_at)) && (
            <Text style={{fontSize:10,color:'rgba(255,255,255,0.5)',marginTop:2}}>
              Miembro desde {new Date(u.created_at).toLocaleDateString('es-ES',{month:'long',year:'numeric'})}
            </Text>
          )}
          {(() => {
            const pts = u?.points || 0;
            const lvls = [
              {min:0,name:'Novato',emoji:'🌱',color:'#6B7280'},
              {min:50,name:'Ahorrador',emoji:'💰',color:'#16A34A'},
              {min:150,name:'Experto',emoji:'⭐',color:'#D97706'},
              {min:400,name:'Gurú',emoji:'🏆',color:'#DC2626'},
              {min:1000,name:'Leyenda',emoji:'👑',color:'#7C3AED'},
            ];
            const lvl = lvls.slice().reverse().find(l => pts >= l.min) || lvls[0];
            return (
              <View style={{flexDirection:'row',alignItems:'center',gap:6,marginTop:4,backgroundColor:lvl.color+'15',borderRadius:99,paddingHorizontal:12,paddingVertical:4}}>
                <Text style={{fontSize:14}}>{lvl.emoji}</Text>
                <Text style={{fontSize:12,fontWeight:'700',color:lvl.color}}>{lvl.name}</Text>
                <Text style={{fontSize:11,color:COLORS.text3}}>· {pts} pts</Text>
              </View>
            );
          })()}
          {u?.bio ? <Text style={s.profileBio}>{u.bio}</Text> : null}

          {/* Stats */}
          <View style={s.profileStatsRow}>
            {[
              [u?.points||0,              'Puntos'],
              [profile?.stats?.reports||0,'Reportes'],
              [profile?.stats?.deals||0,  'Chollos'],
              [badges.length,             'Logros'],
            ].map(([n,l])=>(
              <View key={l} style={s.profileStat}>
                <Text style={s.profileStatN}>{n}</Text>
                <Text style={s.profileStatL}>{l}</Text>
              </View>
            ))}
          </View>
          {(u?.streak||0) > 0 && (
            <View style={s.streakBadge}>
              <Text style={{fontSize:15}}>🔥</Text>
              <Text style={s.streakTxt}>{u.streak} días de racha</Text>
            </View>
          )}
          {profile?._rankPos && (
            <View style={[s.streakBadge,{backgroundColor:'rgba(255,255,255,0.12)',marginTop:6}]}>
              <Text style={{fontSize:13}}>🏆</Text>
              <Text style={s.streakTxt}>
                Puesto #{profile._rankPos} de {profile._rankTotal} usuarios
              </Text>
            </View>
          )}

          {/* Quick action buttons */}
          <View style={s.profileActions}>
            <TouchableOpacity style={s.profileActionBtn} onPress={()=>setShowEdit(true)}>
              <Ionicons name="pencil-outline" size={15} color={COLORS.primary}/>
              <Text style={s.profileActionTxt}>Editar perfil</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.profileActionBtn} onPress={()=>setShowPassChg(true)}>
              <Ionicons name="lock-closed-outline" size={15} color={COLORS.primary}/>
              <Text style={s.profileActionTxt}>Contraseña</Text>
            </TouchableOpacity>
          </View>

          {/* Tab selector */}
          <View style={{flexDirection:'row',width:'100%',gap:6,marginTop:14}}>
            {[['info','📊 Info'],['aportaciones','🔥 Mis chollos']].map(([key,label])=>(
              <TouchableOpacity key={key}
                style={{flex:1,paddingVertical:8,borderRadius:10,alignItems:'center',
                  backgroundColor: profileTab===key ? COLORS.primary : COLORS.bg3,
                  borderWidth:1.5, borderColor: profileTab===key ? COLORS.primary : COLORS.border}}
                onPress={()=>setProfileTab(key)}>
                <Text style={{fontSize:12,fontWeight:'700',color: profileTab===key ? '#fff' : COLORS.text2}}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── TAB: Mis chollos ── */}
        {profileTab === 'aportaciones' && (
          <View style={{paddingTop:8}}>
            {myDeals.length === 0 ? (
              <View style={{alignItems:'center',paddingVertical:40,gap:10}}>
                <Text style={{fontSize:32}}>🔥</Text>
                <Text style={{fontSize:15,fontWeight:'700',color:COLORS.text}}>Aún no has publicado chollos</Text>
                <Text style={{fontSize:13,color:COLORS.text3,textAlign:'center',paddingHorizontal:30}}>
                  Ve a la pestaña Chollos y pulsa "Publicar" para compartir una oferta con la comunidad
                </Text>
              </View>
            ) : (
              myDeals.map(d => (
                <View key={d.id} style={{borderBottomWidth:0.5,borderBottomColor:COLORS.border,paddingHorizontal:16,paddingVertical:12,flexDirection:'row',gap:12,alignItems:'flex-start'}}>
                  <View style={{flex:1}}>
                    <Text style={{fontSize:14,fontWeight:'600',color:COLORS.text}} numberOfLines={2}>{d.title}</Text>
                    <View style={{flexDirection:'row',gap:8,marginTop:4,alignItems:'center'}}>
                      <Text style={{fontSize:15,fontWeight:'800',color:COLORS.primary}}>{d.deal_price?.toFixed(2)}€</Text>
                      {d.discount_percent > 0 && (
                        <View style={{backgroundColor:'#FEE2E2',borderRadius:4,paddingHorizontal:6,paddingVertical:2}}>
                          <Text style={{fontSize:11,fontWeight:'700',color:COLORS.danger}}>-{Math.round(d.discount_percent)}%</Text>
                        </View>
                      )}
                    </View>
                    <View style={{flexDirection:'row',gap:10,marginTop:4,alignItems:'center'}}>
                      <Text style={{fontSize:11,color:COLORS.text3}}>🔥 {d.votes_up||0} votos</Text>
                      <Text style={{fontSize:11,color:d.temperature==='🧊'?COLORS.primary:COLORS.danger}}>{d.temperature||'😐'}</Text>
                      {d.store && <Text style={{fontSize:11,color:COLORS.text3}}>· {d.store}</Text>}
                      <View style={{flex:1}}/>
                      {d.url && (
                        <TouchableOpacity
                          style={{backgroundColor:COLORS.primary,borderRadius:8,paddingHorizontal:10,paddingVertical:4}}
                          onPress={() => { const {openURL} = require('../utils'); openURL(d.url); }}>
                          <Text style={{fontSize:11,color:'#fff',fontWeight:'700'}}>Ver ↗</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Show main content only on info tab */}
        {profileTab === 'aportaciones' ? null : <>

        {/* ── Notificaciones ── */}
        {(profile?.notifications||[]).filter(n=>!n.is_read).length > 0 && (
          <Section title="🔔 NOTIFICACIONES">
            {profile.notifications.filter(n=>!n.is_read).slice(0,5).map(n=>(
              <View key={n.id} style={s.notif}>
                <Text style={s.notifTxt}>{n.message}</Text>
              </View>
            ))}
          </Section>
        )}

        {/* ── Nivel del usuario ── */}
        {(() => {
          const pts = u?.points || 0;
          const levels = [
            { name:'Novato',      min:0,    max:50,   emoji:'🌱', color:'#6B7280' },
            { name:'Ahorrador',   min:50,   max:150,  emoji:'💰', color:'#16A34A' },
            { name:'Experto',     min:150,  max:400,  emoji:'⭐', color:'#D97706' },
            { name:'Gurú',        min:400,  max:1000, emoji:'🏆', color:'#DC2626' },
            { name:'Leyenda',     min:1000, max:9999, emoji:'👑', color:'#7C3AED' },
          ];
          const lvl = levels.slice().reverse().find(l => pts >= l.min) || levels[0];
          const next = levels[levels.indexOf(lvl)+1];
          const progress = next ? Math.min(100, ((pts-lvl.min)/(next.min-lvl.min))*100) : 100;
          return (<>
            {/* Activity summary */}
            <Section title="📊 RESUMEN">
              <View style={{flexDirection:'row',gap:8}}>
                {[
                  [profile?.stats?.reports||0,'📍','Precios'],
                  [profile?.stats?.deals||0,'🔥','Chollos'],
                  [profile?.stats?.verified||0,'✅','Verif.'],
                  [u?.streak||0,'🔥','Racha'],
                ].map(([n,emoji,label])=>(
                  <View key={label} style={{flex:1,backgroundColor:COLORS.bg3,borderRadius:10,padding:8,alignItems:'center',borderWidth:1,borderColor:COLORS.border}}>
                    <Text style={{fontSize:16}}>{emoji}</Text>
                    <Text style={{fontSize:16,fontWeight:'800',color:COLORS.primary}}>{n}</Text>
                    <Text style={{fontSize:9,color:COLORS.text3,fontWeight:'600'}}>{label}</Text>
                  </View>
                ))}
              </View>
              {/* Estimated savings banner */}
              {(u?.points||0) > 0 && (
                <View style={{backgroundColor:'#DCFCE7',borderRadius:10,padding:10,marginTop:8,flexDirection:'row',alignItems:'center',gap:8}}>
                  <Text style={{fontSize:18}}>💰</Text>
                  <View style={{flex:1}}>
                    <Text style={{fontSize:12,fontWeight:'700',color:'#166534'}}>
                      Ahorro estimado a la comunidad: {(
                        (profile?.stats?.reports||0)*2.5 +
                        (profile?.stats?.deals||0)*18 +
                        (profile?.stats?.verified||0)*1.5
                      ).toFixed(0)}€
                    </Text>
                    <Text style={{fontSize:10,color:'#166534',opacity:0.8}}>
                      {profile?.stats?.reports||0} precios · {profile?.stats?.deals||0} chollos · {profile?.stats?.verified||0} verificados
                    </Text>
                  </View>
                </View>
              )}
            </Section>
            <Section title="🎮 TU NIVEL">
              <View style={{backgroundColor:lvl.color+'15',borderRadius:14,padding:14,borderWidth:1,borderColor:lvl.color+'44'}}>
                <View style={{flexDirection:'row',alignItems:'center',gap:12,marginBottom:12}}>
                  <Text style={{fontSize:40}}>{lvl.emoji}</Text>
                  <View style={{flex:1}}>
                    <Text style={{fontSize:20,fontWeight:'800',color:lvl.color}}>{lvl.name}</Text>
                    <Text style={{fontSize:13,color:COLORS.text2}}>{pts} puntos acumulados</Text>
                  </View>
                </View>
                <View style={{height:8,backgroundColor:COLORS.border,borderRadius:99,overflow:'hidden',marginBottom:6}}>
                  <View style={{width:`${progress}%`,height:'100%',backgroundColor:lvl.color,borderRadius:99}}/>
                </View>
                {next ? (
                  <Text style={{fontSize:11,color:COLORS.text3}}>
                    {next.min - pts} puntos para nivel {next.name} {next.emoji}
                  </Text>
                ) : <Text style={{fontSize:11,color:lvl.color,fontWeight:'700'}}>¡Nivel máximo alcanzado! 👑</Text>}
              </View>
            </Section>
          </>);
        })()}

        {/* ── Cómo ganar puntos ── */}
        <Section title="💰 CÓMO GANAR PUNTOS">
          {[
            ['⛽','Reportar precio en el mapa','+10 pts'],
            ['✅','Precio verificado por la comunidad','+20 pts extra'],
            ['🔥','Publicar chollo','+5 pts'],
            ['📍','Añadir un lugar nuevo','+5 pts'],
            ['💬','Comentar en un chollo','+1 pt'],
            ['👍','Votar un precio','+2 pts'],
            ['🗓️','Añadir un evento','+5 pts'],
          ].map(([e,a,p])=>(
            <View key={a} style={s.pointRow}>
              <Text style={{fontSize:18,width:28}}>{e}</Text>
              <Text style={s.pointAct}>{a}</Text>
              <Text style={s.pointPts}>{p}</Text>
            </View>
          ))}
          <View style={{backgroundColor:COLORS.primaryLight,borderRadius:10,padding:10,marginTop:8}}>
            <Text style={{fontSize:12,color:COLORS.primary,lineHeight:18}}>
              💡 Los puntos suben tu nivel y te posicionan en el ranking. ¡Los usuarios más activos aparecen en el top nacional!
            </Text>
          </View>
        </Section>

        {/* ── Ventajas por nivel ── */}
        <Section title="🎁 VENTAJAS POR NIVEL">
          {[
            {lvl:'Novato 🌱',    pts:'0',    color:'#6B7280', perks:['Ver el mapa de gasolineras','Consultar ranking de supermercados','Ver chollos de la comunidad']},
            {lvl:'Ahorrador 💰', pts:'50',   color:'#16A34A', perks:['Reportar precios','Votar chollos y comentar','Badge exclusivo en el ranking']},
            {lvl:'Experto ⭐',   pts:'150',  color:'#D97706', perks:['Publicar chollos propios','Añadir lugares al mapa','Proponer cambios de precio']},
            {lvl:'Gurú 🏆',      pts:'400',  color:'#DC2626', perks:['Badge dorado en el perfil','Prioridad en verificación de precios','Mención especial en el ranking']},
            {lvl:'Leyenda 👑',   pts:'1000', color:'#7C3AED', perks:['Perfil de leyenda permanente 👑','Top posición en ranking nacional','Acceso anticipado a nuevas funciones']},
          ].map(({lvl,pts,color,perks})=>(
            <View key={lvl} style={{backgroundColor:color+'10',borderRadius:12,padding:12,marginBottom:8,borderLeftWidth:3,borderLeftColor:color}}>
              <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                <Text style={{fontSize:14,fontWeight:'700',color}}>{lvl}</Text>
                <Text style={{fontSize:11,color:COLORS.text3}}>desde {pts} pts</Text>
              </View>
              {perks.map(p=>(
                <View key={p} style={{flexDirection:'row',alignItems:'flex-start',gap:6,marginBottom:4}}>
                  <Text style={{fontSize:11,color:color,marginTop:1}}>✓</Text>
                  <Text style={{fontSize:12,color:COLORS.text2,flex:1,lineHeight:17}}>{p}</Text>
                </View>
              ))}
            </View>
          ))}
        </Section>

        {/* ── Badges ── */}
        <Section title={`🎖️ LOGROS (${earnedKeys.length}/${BADGES_DEF.length})`}>
          {earnedKeys.length < BADGES_DEF.length && (
            <View style={{backgroundColor:COLORS.primaryLight,borderRadius:10,padding:10,marginBottom:10}}>
              <Text style={{fontSize:12,color:COLORS.primary,fontWeight:'600'}}>
                🎯 {BADGES_DEF.length - earnedKeys.length} logros por desbloquear — sigue activo para ganarlos todos
              </Text>
            </View>
          )}
          <View style={s.badgeGrid}>
            {BADGES_DEF.map(b => {
              const earned = earnedKeys.includes(b.key);
              return (
                <View key={b.key} style={[s.badgeCard, !earned && {opacity:0.35, borderStyle:'dashed'}]}>
                  {earned && <View style={s.badgeDot}/>}
                  <Text style={s.badgeEmoji}>{earned ? b.emoji : '🔒'}</Text>
                  <Text style={s.badgeName}>{b.name}</Text>
                  <Text style={s.badgeDesc}>{b.desc}</Text>
                  {b.pts > 0 && <Text style={[s.badgePts, !earned && {color:COLORS.text3}]}>+{b.pts} pts</Text>}
                </View>
              );
            })}
          </View>
        </Section>

        {/* ── Configuración ── */}
        <Section title="⚙️ CUENTA">
          <TouchableOpacity style={s.settingRow} onPress={()=>setShowEdit(true)}>
            <Ionicons name="person-outline" size={18} color={COLORS.primary}/>
            <Text style={s.settingTxt}>Editar nombre y bio</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.text3}/>
          </TouchableOpacity>
          <TouchableOpacity style={s.settingRow} onPress={()=>setShowPassChg(true)}>
            <Ionicons name="lock-closed-outline" size={18} color={COLORS.primary}/>
            <Text style={s.settingTxt}>Cambiar contraseña</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.text3}/>
          </TouchableOpacity>
          <View style={s.settingRow}>
            <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.success}/>
            <Text style={s.settingTxt}>Servidor: {serverOk ? '✅ Conectado' : '❌ Sin conexión'}</Text>
          </View>
          <Text style={s.settingNote}>IP: {API_BASE.replace('http://','').replace(':3000','')}</Text>
        </Section>

        {/* ── Panel ADMIN ── */}
        {u?.is_admin && (
          <Section title="🛡️ PANEL ADMINISTRADOR">
            <View style={{backgroundColor:'#FEF2F2',borderRadius:10,padding:10,marginBottom:10}}>
              <Text style={{fontSize:12,color:'#991B1B',fontWeight:'600'}}>Solo visible para ti · Tienes acceso completo de administrador</Text>
            </View>
            {[
              ['🗑️ Gestionar chollos (borrar directamente)', () => Alert.alert('Admin', 'Desde la pantalla de Chollos puedes borrar cualquiera con el botón de escudo rojo.')],
              ['🎭 Gestionar eventos (borrar directamente)', () => Alert.alert('Admin', 'Desde la pantalla de Eventos puedes borrar cualquiera con el botón de escudo rojo.')],
              ['💰 Aprobar cambios de precio', () => Alert.alert('Admin', 'Desde cualquier lugar del mapa → "Ver precios y cambios" → vota o aprueba directamente.')],
              ['🏅 Re-asignar badges a todos los usuarios', async () => {
                try {
                  const res = await apiPost('/api/admin/recheck-badges', {});
                  Alert.alert('✅ Badges rechecked', `${res.checked} usuarios procesados`);
                  loadProfile();
                } catch(e) { Alert.alert('Error', e.message); }
              }],
              ['🤖 Lanzar scraper de Amazon ahora', async () => {
                try {
                  await apiPost('/api/admin/run-scraper', {});
                  Alert.alert('✅ Scraper lanzado', 'Buscando chollos de Amazon en background...');
                } catch(e) { Alert.alert('Error', e.message); }
              }],
            ].map(([label, onPress]) => (
              <TouchableOpacity key={label} style={{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:12,borderBottomWidth:0.5,borderBottomColor:COLORS.border}} onPress={onPress}>
                <Text style={{fontSize:13,color:'#991B1B',flex:1}}>{label}</Text>
                <Ionicons name="chevron-forward" size={16} color="#991B1B"/>
              </TouchableOpacity>
            ))}
          </Section>
        )}

        {/* ── Peligroso ── */}
        <Section title="⚠️ ZONA PELIGROSA">
          <Text style={s.dangerNote}>Estas acciones son permanentes y no se pueden deshacer.</Text>
          <TouchableOpacity style={s.logoutBtn} onPress={confirmLogout}>
            <Ionicons name="log-out-outline" size={17} color={COLORS.danger}/>
            <Text style={s.logoutTxt}>Cerrar sesión</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.logoutBtn, {marginTop:8, borderColor:'#DC2626', backgroundColor:'#FEF2F2'}]} onPress={confirmDeleteAccount}>
            <Ionicons name="trash-outline" size={17} color="#DC2626"/>
            <Text style={[s.logoutTxt, {color:'#DC2626'}]}>Eliminar mi cuenta</Text>
          </TouchableOpacity>
          <Text style={s.gdprNote}>Cumple con el RGPD · Todos tus datos serán eliminados</Text>
        </Section>

        {/* ── Links legales ── */}
        <Section title="ℹ️ INFORMACIÓN LEGAL">
          {[
            ['Política de Privacidad', () => setShowPrivacy(true)],
            ['Términos de Uso', () => Linking.openURL('https://github.com/Kamsito1/precimap-app/blob/main/TERMS.md').catch(()=>{})],
            ['Código fuente (contribuir)', () => Linking.openURL('https://github.com/Kamsito1/precimap-app').catch(()=>{})],
          ].map(([label, onPress]) => (
            <TouchableOpacity key={label} style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:12,borderBottomWidth:0.5,borderBottomColor:COLORS.border}}
              onPress={onPress}>
              <Text style={{fontSize:14,color:COLORS.text2}}>{label}</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.text3}/>
            </TouchableOpacity>
          ))}
          <Text style={{fontSize:11,color:COLORS.text3,marginTop:10,textAlign:'center'}}>
            PreciMap v1.2.2 · Hecho con ❤️ en España
          </Text>
        </Section>

        </>}
      </ScrollView>

      <EditProfileModal
        visible={showEdit}
        user={u}
        onClose={()=>setShowEdit(false)}
        onSaved={(updated) => { updateUser(updated); setProfile(p => p ? {...p, ...updated} : p); }}
      />
      <ChangePasswordModal visible={showPassChg} onClose={()=>setShowPassChg(false)}/>

      {/* Privacy Policy Modal */}
      <Modal visible={showPrivacy} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setShowPrivacy(false)}>
        <PrivacyScreen onClose={()=>setShowPrivacy(false)}/>
      </Modal>
      <AuthModal visible={showAuth} onClose={()=>setShowAuth(false)}/>

      {/* Delete account confirmation modal */}
      <Modal visible={showDeleteModal} animationType="fade" transparent onRequestClose={()=>setShowDeleteModal(false)}>
        <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'center',padding:24}}>
          <View style={{backgroundColor:COLORS.bg2,borderRadius:20,padding:24}}>
            <Text style={{fontSize:20,fontWeight:'800',color:'#DC2626',marginBottom:8}}>⚠️ Eliminar cuenta</Text>
            <Text style={{fontSize:14,color:COLORS.text2,marginBottom:20,lineHeight:21}}>
              Esta acción es permanente e irreversible.{'\n'}Introduce tu contraseña para confirmar.
            </Text>
            <TextInput
              style={[em.input,{marginBottom:12}]}
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              placeholder="Tu contraseña actual"
              placeholderTextColor={COLORS.text3}
              autoFocus
            />
            {!!deleteError && <Text style={{color:COLORS.danger,fontSize:13,marginBottom:10}}>{deleteError}</Text>}
            <View style={{flexDirection:'row',gap:10}}>
              <TouchableOpacity
                style={{flex:1,padding:14,borderRadius:12,borderWidth:1.5,borderColor:COLORS.border,alignItems:'center'}}
                onPress={()=>setShowDeleteModal(false)}>
                <Text style={{fontWeight:'600',color:COLORS.text}}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{flex:1,padding:14,borderRadius:12,backgroundColor:'#DC2626',alignItems:'center',opacity:deleteLoading?0.6:1}}
                onPress={executeDelete} disabled={deleteLoading}>
                {deleteLoading
                  ? <ActivityIndicator color="#fff" size="small"/>
                  : <Text style={{fontWeight:'700',color:'#fff'}}>Eliminar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Section({ title, children }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ServerBanner({ url }) {
  return (
    <View style={s.serverBanner}>
      <Ionicons name="warning-outline" size={14} color="#92400E"/>
      <Text style={s.serverBannerTxt}>Sin conexión al servidor · Asegúrate de estar en la misma WiFi que el Mac ({url.replace('http://','').replace(':3000','')})</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:COLORS.bg},
  serverBanner:{flexDirection:'row',gap:8,alignItems:'flex-start',backgroundColor:'#FEF3C7',paddingHorizontal:14,paddingVertical:10,borderBottomWidth:0.5,borderBottomColor:'#FDE68A'},
  serverBannerTxt:{flex:1,fontSize:11,color:'#92400E',lineHeight:16},
  guestScroll:{padding:20,paddingBottom:80},
  guestHero:{alignItems:'center',paddingVertical:20,gap:4},
  guestTitle:{fontSize:30,fontWeight:'800',color:COLORS.text},
  guestSub:{fontSize:14,color:COLORS.text3},
  statsRow:{flexDirection:'row',gap:10,marginBottom:20},
  statBox:{flex:1,backgroundColor:COLORS.bg2,borderRadius:14,padding:12,alignItems:'center',borderWidth:0.5,borderColor:COLORS.border},
  statNum:{fontSize:17,fontWeight:'800',color:COLORS.primary},
  statLbl:{fontSize:10,color:COLORS.text3,marginTop:2,textAlign:'center'},
  card:{backgroundColor:COLORS.bg2,borderRadius:18,padding:18,marginBottom:16,borderWidth:0.5,borderColor:COLORS.border},
  cardTitle:{fontSize:15,fontWeight:'700',color:COLORS.text,marginBottom:12},
  benefitRow:{flexDirection:'row',alignItems:'center',paddingVertical:9,borderBottomWidth:0.5,borderBottomColor:COLORS.border},
  bEmoji:{fontSize:20,width:32},
  bTxt:{fontSize:13,color:COLORS.text,flex:1},
  mainBtn:{backgroundColor:COLORS.primary,borderRadius:14,padding:16,alignItems:'center',marginBottom:10,shadowColor:COLORS.primary,shadowOffset:{width:0,height:4},shadowOpacity:0.3,shadowRadius:8,elevation:4},
  mainBtnTxt:{color:'#fff',fontWeight:'700',fontSize:16},
  secBtn:{backgroundColor:COLORS.bg2,borderRadius:14,padding:14,alignItems:'center',borderWidth:1.5,borderColor:COLORS.border,marginBottom:8},
  secBtnTxt:{color:COLORS.primary,fontWeight:'600',fontSize:14},
  note:{fontSize:12,color:COLORS.text3,textAlign:'center'},
  profileHeader:{backgroundColor:COLORS.primary,padding:24,alignItems:'center',paddingBottom:20},
  avatarWrap:{marginBottom:10,position:'relative'},
  avatar:{width:88,height:88,borderRadius:44,backgroundColor:'rgba(255,255,255,0.25)',alignItems:'center',justifyContent:'center',borderWidth:3,borderColor:'rgba(255,255,255,0.5)'},
  avatarTxt:{fontSize:30,fontWeight:'800',color:'#fff'},
  avatarEdit:{position:'absolute',bottom:2,right:2,width:26,height:26,borderRadius:13,backgroundColor:COLORS.primaryDark,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:'#fff'},
  profileName:{fontSize:21,fontWeight:'700',color:'#fff',marginBottom:2},
  profileEmail:{fontSize:12,color:'rgba(255,255,255,0.75)'},
  profileBio:{fontSize:13,color:'rgba(255,255,255,0.85)',marginTop:5,textAlign:'center',paddingHorizontal:20},
  profileStatsRow:{flexDirection:'row',marginTop:14,width:'100%'},
  profileStat:{flex:1,alignItems:'center',borderRightWidth:1,borderRightColor:'rgba(255,255,255,0.2)'},
  profileStatN:{fontSize:20,fontWeight:'800',color:'#fff'},
  profileStatL:{fontSize:10,color:'rgba(255,255,255,0.7)',marginTop:1},
  streakBadge:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'rgba(255,255,255,0.15)',borderRadius:99,paddingHorizontal:14,paddingVertical:6,marginTop:10},
  streakTxt:{fontSize:13,color:'#fff',fontWeight:'600'},
  profileActions:{flexDirection:'row',gap:8,marginTop:14,width:'100%'},
  profileActionBtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,backgroundColor:'rgba(255,255,255,0.2)',borderRadius:10,paddingVertical:9,borderWidth:1,borderColor:'rgba(255,255,255,0.3)'},
  profileActionTxt:{color:'#fff',fontWeight:'600',fontSize:13},
  section:{backgroundColor:COLORS.bg2,marginTop:10,paddingHorizontal:16,paddingVertical:16,borderTopWidth:0.5,borderBottomWidth:0.5,borderColor:COLORS.border},
  sectionTitle:{fontSize:11,fontWeight:'700',color:COLORS.text3,letterSpacing:0.8,marginBottom:14},
  notif:{backgroundColor:COLORS.primaryLight,borderRadius:10,padding:12,marginBottom:6},
  notifTxt:{fontSize:13,color:COLORS.primary},
  pointRow:{flexDirection:'row',alignItems:'center',paddingVertical:10,borderBottomWidth:0.5,borderBottomColor:COLORS.border},
  pointAct:{flex:1,fontSize:13,color:COLORS.text},
  pointPts:{fontSize:13,fontWeight:'700',color:COLORS.success},
  badgeGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},
  badgeCard:{width:'30%',backgroundColor:COLORS.bg,borderRadius:14,padding:10,alignItems:'center',borderWidth:0.5,borderColor:COLORS.border,position:'relative'},
  badgeDot:{position:'absolute',top:6,right:6,width:8,height:8,borderRadius:4,backgroundColor:COLORS.success},
  badgeEmoji:{fontSize:26,marginBottom:4},
  badgeName:{fontSize:10,fontWeight:'700',color:COLORS.text,textAlign:'center'},
  badgeDesc:{fontSize:9,color:COLORS.text3,textAlign:'center',marginTop:2},
  badgePts:{fontSize:10,color:COLORS.success,marginTop:3,fontWeight:'600'},
  settingRow:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:13,borderBottomWidth:0.5,borderBottomColor:COLORS.border},
  settingTxt:{flex:1,fontSize:14,color:COLORS.text},
  settingNote:{fontSize:11,color:COLORS.text3,marginTop:8},
  dangerNote:{fontSize:12,color:COLORS.text3,marginBottom:12,lineHeight:17},
  logoutBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,padding:13,borderRadius:12,borderWidth:1.5,borderColor:'#FECACA',backgroundColor:'#FFF5F5'},
  logoutTxt:{color:COLORS.danger,fontWeight:'700',fontSize:14},
  gdprNote:{fontSize:11,color:COLORS.text3,textAlign:'center',marginTop:8},
});

// EditProfileModal styles
const em = StyleSheet.create({
  wrap:{flex:1,backgroundColor:COLORS.bg2},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:16,borderBottomWidth:0.5,borderBottomColor:COLORS.border},
  title:{fontSize:17,fontWeight:'700',color:COLORS.text},
  closeBtn:{width:32,height:32,borderRadius:16,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'},
  body:{padding:20,paddingBottom:60},
  label:{fontSize:13,fontWeight:'600',color:COLORS.text,marginBottom:6,marginTop:12},
  optional:{fontSize:12,fontWeight:'400',color:COLORS.text3},
  input:{backgroundColor:COLORS.bg3,borderRadius:12,borderWidth:1.5,borderColor:COLORS.border,paddingHorizontal:14,paddingVertical:13,fontSize:15,color:COLORS.text},
  charCount:{fontSize:11,color:COLORS.text3,textAlign:'right',marginTop:4},
  passRow:{flexDirection:'row',alignItems:'center',gap:8},
  eyeBtn:{padding:10,backgroundColor:COLORS.bg3,borderRadius:12,borderWidth:1.5,borderColor:COLORS.border},
  error:{color:COLORS.danger,fontSize:13,marginTop:10,marginBottom:4},
  btn:{backgroundColor:COLORS.primary,borderRadius:14,paddingVertical:15,alignItems:'center',marginTop:20,shadowColor:COLORS.primary,shadowOffset:{width:0,height:4},shadowOpacity:0.3,shadowRadius:8,elevation:4},
  btnTxt:{color:'#fff',fontWeight:'700',fontSize:15},
});
