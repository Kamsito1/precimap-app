import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, apiPost, API_BASE } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_IOS_CLIENT_ID = '720920708096-e0eiit32bknduqv1brf3ec3e4fu1kbj3.apps.googleusercontent.com';
const GOOGLE_WEB_CLIENT_ID = '720920708096-s7smse438qmqlgcbi5kt8th7m128p645.apps.googleusercontent.com';

const MODES = { login: 'login', register: 'register', forgot: 'forgot', reset: 'reset' };

export default function AuthModal({ visible, onClose }) {
  const { login } = useAuth();
  const [mode, setMode]     = useState(MODES.login);
  const [name, setName]     = useState('');
  const [email, setEmail]   = useState('');
  const [pass, setPass]     = useState('');
  const [pass2, setPass2]   = useState('');
  const [code, setCode]     = useState('');
  const [newPass, setNewPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  // ── Google OAuth ──────────────────────────────────────────────────────────
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleAuth(response.authentication?.accessToken);
    }
  }, [response]);

  async function handleGoogleAuth(accessToken) {
    if (!accessToken) return;
    setGoogleLoading(true);
    try {
      // Get Google user info
      const userInfoRes = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const googleUser = await userInfoRes.json();
      if (!googleUser.email) { setError('No se pudo obtener el email de Google'); setGoogleLoading(false); return; }

      // Send to our backend — it will create or login the user
      const res = await apiPost('/api/auth/google', {
        email: googleUser.email,
        name: googleUser.name || googleUser.given_name || 'Usuario',
        google_id: googleUser.id,
        avatar_url: googleUser.picture || null,
      });

      if (res.error) { setError(res.error); setGoogleLoading(false); return; }
      if (!res.token) { setError('Error al iniciar sesión con Google'); setGoogleLoading(false); return; }

      await login(res.token, res.user);
      setGoogleLoading(false);
      onClose(); reset();
    } catch (e) {
      setError(`Error Google: ${e.message}`);
      setGoogleLoading(false);
    }
  }

  // ── Apple Sign-In ─────────────────────────────────────────────────────────
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => setAppleAvailable(false));
    }
  }, []);

  async function handleAppleAuth() {
    setAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      // Apple solo devuelve email y nombre en el PRIMER login. Después son null.
      const email = credential.email;
      const firstName = credential.fullName?.givenName || '';
      const lastName  = credential.fullName?.familyName || '';
      const name = [firstName, lastName].filter(Boolean).join(' ') || 'Usuario Apple';
      const appleId = credential.user; // identificador único estable

      if (!email && !appleId) { setError('No se pudo obtener información de Apple'); setAppleLoading(false); return; }

      const res = await apiPost('/api/auth/apple', {
        apple_id: appleId,
        email: email || null,
        name,
        identity_token: credential.identityToken,
      });
      if (res.error) { setError(res.error); setAppleLoading(false); return; }
      if (!res.token) { setError('Error al iniciar sesión con Apple'); setAppleLoading(false); return; }
      await login(res.token, res.user);
      setAppleLoading(false);
      onClose(); reset();
    } catch (e) {
      if (e.code === 'ERR_REQUEST_CANCELED') {
        // El usuario canceló — no mostrar error
      } else {
        setError(`Error Apple: ${e.message}`);
      }
      setAppleLoading(false);
    }
  }

  function reset(nextMode = MODES.login) {
    setMode(nextMode); setError('');
    setName(''); setPass(''); setPass2(''); setCode(''); setNewPass('');
  }

  async function submit() {
    setError('');
    const em = email.trim().toLowerCase();
    if (!em) return setError('Introduce tu email');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return setError('El email no tiene formato válido');

    if (mode === MODES.forgot) {
      setLoading(true);
      const res = await apiPost('/api/auth/forgot-password', { email: em }).catch(()=>({error:'Sin conexión'}));
      setLoading(false);
      if (res.error && !res.ok) return setError(res.error);
      Alert.alert(
        '📩 Código enviado',
        'Si el email está registrado, recibirás el código en breve.\n\n(Modo desarrollo: el código aparece en los logs del servidor)',
        [{ text: 'Entendido' }]
      );
      setMode(MODES.reset);
      return;
    }

    if (mode === MODES.reset) {
      if (!code || !newPass) return setError('Introduce el código y la nueva contraseña');
      if (newPass.length < 6) return setError('Mínimo 6 caracteres');
      setLoading(true);
      const res = await apiPost('/api/auth/reset-password', { email: em, code, new_password: newPass }).catch(()=>({error:'Sin conexión'}));
      setLoading(false);
      if (res.error) return setError(res.error);
      await login(res.token, res.user);
      onClose(); reset();
      return;
    }

    if (!pass) return setError('Introduce tu contraseña');
    if (mode === MODES.register) {
      if (!name.trim()) return setError('Introduce tu nombre');
      if (pass.length < 6) return setError('Contraseña mínimo 6 caracteres');
      if (pass !== pass2) return setError('Las contraseñas no coinciden');
    }
    setLoading(true);
    try {
      const endpoint = mode === MODES.login ? '/api/auth/login' : '/api/auth/register';
      const body = mode === MODES.login
        ? { email: em, password: pass }
        : { name: name.trim(), email: em, password: pass };
      
      let res;
      try {
        res = await apiPost(endpoint, body);
      } catch(networkErr) {
        setLoading(false);
        return setError(`Sin conexión al servidor (${networkErr.message}). Asegúrate de estar en la misma WiFi.`);
      }
      
      if (!res) { setLoading(false); return setError('Respuesta vacía del servidor'); }
      if (res.error) { setLoading(false); return setError(res.error); }
      if (!res.token) { setLoading(false); return setError('No se recibió token. Inténtalo de nuevo.'); }
      
      await login(res.token, res.user);
      setLoading(false);
      onClose(); reset();
    } catch(e) {
      setLoading(false);
      setError(`Error: ${e.message}`);
    }
  }

  const BENEFITS = [
    '🔥 Vota chollos caliente / frío',
    '💬 Comenta y pregunta en tiempo real',
    '📍 Reporta precios y gana puntos',
    '🔔 Alertas cuando baje el precio',
    '🏆 Ranking y badges exclusivos',
    '🖼️ Foto de perfil y comunidad',
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':'height'}>
        <View style={s.wrap}>
          <View style={s.handle}/>
          <View style={s.header}>
            <Text style={s.title}>
              {mode===MODES.login?'Iniciar sesión':mode===MODES.register?'Crear cuenta':mode===MODES.forgot?'Recuperar contraseña':'Nueva contraseña'}
            </Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{top:8,bottom:8,left:8,right:8}}>
              <Ionicons name="close" size={22} color={COLORS.text2}/>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {mode === MODES.register && (
              <View style={s.benefitsBox}>
                {BENEFITS.map(b=><Text key={b} style={s.benefit}>{b}</Text>)}
              </View>
            )}

            {/* GOOGLE SIGN-IN — Principal, arriba del form */}
            {(mode === MODES.login || mode === MODES.register) && (
              <View style={{marginBottom:16}}>
                {/* APPLE SIGN-IN — Solo iOS, obligatorio por guideline 4.8 */}
                {appleAvailable && (
                  <TouchableOpacity
                    style={[s.appleBtn, appleLoading && {opacity:0.6}]}
                    onPress={handleAppleAuth}
                    disabled={appleLoading}
                    activeOpacity={0.85}>
                    {appleLoading ? (
                      <ActivityIndicator color="#fff" size="small"/>
                    ) : (
                      <>
                        <Ionicons name="logo-apple" size={20} color="#fff"/>
                        <Text style={s.appleBtnTxt}>Continuar con Apple</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[s.googleBtn, (googleLoading || !request) && {opacity:0.6}]}
                  onPress={() => promptAsync()}
                  disabled={googleLoading || !request}
                  activeOpacity={0.85}>
                  {googleLoading ? (
                    <ActivityIndicator color="#4285F4" size="small"/>
                  ) : (
                    <>
                      <Text style={{fontSize:20}}>G</Text>
                      <Text style={s.googleBtnTxt}>Continuar con Google</Text>
                    </>
                  )}
                </TouchableOpacity>
                <View style={s.dividerRow}>
                  <View style={s.dividerLine}/>
                  <Text style={s.dividerTxt}>o con email</Text>
                  <View style={s.dividerLine}/>
                </View>
              </View>
            )}

            {/* REGISTER: Name */}
            {mode === MODES.register && (
              <View style={s.field}>
                <Text style={s.label}>Tu nombre</Text>
                <TextInput style={s.input} value={name} onChangeText={setName}
                  placeholder="Juan García" placeholderTextColor={COLORS.text3} autoCapitalize="words"/>
              </View>
            )}

            {/* EMAIL */}
            {(mode === MODES.login || mode === MODES.register || mode === MODES.forgot) && (
              <View style={s.field}>
                <Text style={s.label}>Email</Text>
                <TextInput style={s.input} value={email} onChangeText={setEmail}
                  placeholder="tu@email.com" placeholderTextColor={COLORS.text3}
                  keyboardType="email-address" autoCapitalize="none" autoCorrect={false}/>
              </View>
            )}

            {/* PASSWORD */}
            {(mode === MODES.login || mode === MODES.register) && (
              <View style={s.field}>
                <Text style={s.label}>Contraseña</Text>
                <View style={s.passRow}>
                  <TextInput style={[s.input,{flex:1,marginBottom:0}]} value={pass} onChangeText={setPass}
                    placeholder={mode===MODES.register?'Mínimo 6 caracteres':'Tu contraseña'}
                    autoCorrect={false} autoCapitalize="none" placeholderTextColor={COLORS.text3} secureTextEntry={!showPass}/>
                  <TouchableOpacity style={s.eyeBtn} onPress={()=>setShowPass(!showPass)}>
                    <Ionicons name={showPass?'eye-off-outline':'eye-outline'} size={20} color={COLORS.text3}/>
                  </TouchableOpacity>
                </View>
                {/* Password strength bar — only on register */}
                {mode === MODES.register && pass.length > 0 && (() => {
                  const strength = pass.length >= 12 && /[A-Z]/.test(pass) && /[0-9]/.test(pass) ? 3
                    : pass.length >= 8 ? 2 : pass.length >= 6 ? 1 : 0;
                  const colors = ['#DC2626','#D97706','#16A34A','#16A34A'];
                  const labels = ['Muy débil','Débil','Buena','Fuerte'];
                  return (
                    <View style={{flexDirection:'row',gap:3,marginTop:6,alignItems:'center'}}>
                      {[0,1,2].map(i=>(
                        <View key={i} style={{flex:1,height:4,borderRadius:2,backgroundColor:i<=strength-1?colors[strength]:'#E2E8F0'}}/>
                      ))}
                      <Text style={{fontSize:10,color:colors[strength],fontWeight:'600',marginLeft:4}}>{labels[strength]}</Text>
                    </View>
                  );
                })()}
              </View>
            )}

            {/* CONFIRM PASSWORD */}
            {mode === MODES.register && (
              <View style={s.field}>
                <Text style={s.label}>Confirmar contraseña</Text>
                <TextInput style={s.input} value={pass2} onChangeText={setPass2}
                  placeholder="Repite la contraseña" autoCorrect={false} autoCapitalize="none" placeholderTextColor={COLORS.text3} secureTextEntry/>
              </View>
            )}

            {/* RESET: code + new password */}
            {mode === MODES.reset && (
              <>
                <View style={s.field}>
                  <Text style={s.label}>Código de verificación (6 dígitos)</Text>
                  <TextInput style={s.input} value={code} onChangeText={setCode}
                    placeholder="123456" placeholderTextColor={COLORS.text3} keyboardType="number-pad" maxLength={6}/>
                </View>
                <View style={s.field}>
                  <Text style={s.label}>Nueva contraseña</Text>
                  <TextInput style={s.input} value={newPass} onChangeText={setNewPass}
                    placeholder="Mínimo 6 caracteres" autoCorrect={false} autoCapitalize="none" placeholderTextColor={COLORS.text3} secureTextEntry/>
                </View>
              </>
            )}

            {/* ERROR */}
            {!!error && (
              <View style={s.errBox}>
                <Ionicons name="alert-circle-outline" size={15} color={COLORS.danger}/>
                <Text style={s.errTxt}>{error}</Text>
              </View>
            )}

            {/* SUBMIT */}
            <TouchableOpacity style={[s.btn, loading&&{opacity:0.7}]} onPress={submit} disabled={loading} activeOpacity={0.85}>
              {loading
                ? <ActivityIndicator color="#fff"/>
                : <Text style={s.btnTxt}>{mode===MODES.login?'Entrar':mode===MODES.register?'Crear cuenta gratis':mode===MODES.forgot?'Enviar código':'Cambiar contraseña'}</Text>
              }
            </TouchableOpacity>

            {/* FOOTER LINKS */}
            <View style={s.footer}>
              {mode === MODES.login && <>
                <TouchableOpacity onPress={()=>reset(MODES.register)} style={s.link}>
                  <Text style={s.linkTxt}>¿Sin cuenta? <Text style={{color:COLORS.primary,fontWeight:'700'}}>Regístrate gratis</Text></Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={()=>reset(MODES.forgot)} style={s.link}>
                  <Text style={s.linkTxt2}>¿Olvidaste la contraseña?</Text>
                </TouchableOpacity>
              </>}
              {mode !== MODES.login && (
                <TouchableOpacity onPress={()=>reset(MODES.login)} style={s.link}>
                  <Text style={s.linkTxt}>← Volver al inicio de sesión</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={()=>{onClose();reset();}} style={s.link}>
                <Text style={s.linkTxt2}>Continuar sin cuenta</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap:{flex:1,backgroundColor:COLORS.bg2},
  handle:{width:40,height:4,borderRadius:2,backgroundColor:COLORS.border,alignSelf:'center',marginTop:12},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:20,paddingVertical:16,borderBottomWidth:0.5,borderBottomColor:COLORS.border},
  title:{fontSize:18,fontWeight:'700',color:COLORS.text},
  closeBtn:{width:32,height:32,borderRadius:16,backgroundColor:COLORS.bg3,alignItems:'center',justifyContent:'center'},
  body:{padding:20,paddingBottom:60},
  benefitsBox:{backgroundColor:COLORS.primaryLight,borderRadius:16,padding:16,marginBottom:20,gap:8},
  benefit:{fontSize:13,color:COLORS.primary,fontWeight:'500'},
  field:{marginBottom:16},
  label:{fontSize:13,fontWeight:'600',color:COLORS.text,marginBottom:6},
  input:{backgroundColor:COLORS.bg3,borderRadius:12,borderWidth:1.5,borderColor:COLORS.border,paddingHorizontal:14,paddingVertical:13,fontSize:15,color:COLORS.text},
  passRow:{flexDirection:'row',alignItems:'center',gap:8},
  eyeBtn:{padding:10,backgroundColor:COLORS.bg3,borderRadius:12,borderWidth:1.5,borderColor:COLORS.border},
  errBox:{flexDirection:'row',alignItems:'flex-start',gap:8,backgroundColor:COLORS.dangerLight,borderRadius:10,padding:12,marginBottom:12},
  errTxt:{flex:1,color:COLORS.danger,fontSize:13,lineHeight:18},
  btn:{backgroundColor:COLORS.primary,borderRadius:14,paddingVertical:16,alignItems:'center',marginTop:4,shadowColor:COLORS.primary,shadowOffset:{width:0,height:4},shadowOpacity:0.3,shadowRadius:8,elevation:4},
  btnTxt:{color:'#fff',fontWeight:'700',fontSize:16,letterSpacing:0.2},
  footer:{gap:4,marginTop:20,alignItems:'center'},
  link:{paddingVertical:8},
  linkTxt:{fontSize:14,color:COLORS.text2},
  linkTxt2:{fontSize:13,color:COLORS.text3},
  googleBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,backgroundColor:'#fff',borderRadius:14,paddingVertical:15,borderWidth:1.5,borderColor:'#DADCE0',shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.1,shadowRadius:3,elevation:2},
  googleBtnTxt:{fontSize:15,fontWeight:'600',color:'#3C4043'},
  appleBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,backgroundColor:'#000',borderRadius:14,paddingVertical:15,marginBottom:10},
  appleBtnTxt:{fontSize:15,fontWeight:'600',color:'#fff'},
  dividerRow:{flexDirection:'row',alignItems:'center',gap:12,marginTop:16},
  dividerLine:{flex:1,height:0.5,backgroundColor:COLORS.border},
  dividerTxt:{fontSize:12,color:COLORS.text3},
});
