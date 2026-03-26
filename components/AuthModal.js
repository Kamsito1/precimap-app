import React, { useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, apiPost } from '../utils';
import { useAuth } from '../contexts/AuthContext';

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

  function reset(nextMode = MODES.login) {
    setMode(nextMode); setError('');
    setName(''); setPass(''); setPass2(''); setCode(''); setNewPass('');
  }

  async function submit() {
    setError('');
    const em = email.trim().toLowerCase();
    if (!em) return setError('Introduce tu email');

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
                    placeholderTextColor={COLORS.text3} secureTextEntry={!showPass}/>
                  <TouchableOpacity style={s.eyeBtn} onPress={()=>setShowPass(!showPass)}>
                    <Ionicons name={showPass?'eye-off-outline':'eye-outline'} size={20} color={COLORS.text3}/>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* CONFIRM PASSWORD */}
            {mode === MODES.register && (
              <View style={s.field}>
                <Text style={s.label}>Confirmar contraseña</Text>
                <TextInput style={s.input} value={pass2} onChangeText={setPass2}
                  placeholder="Repite la contraseña" placeholderTextColor={COLORS.text3} secureTextEntry/>
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
                    placeholder="Mínimo 6 caracteres" placeholderTextColor={COLORS.text3} secureTextEntry/>
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
});
