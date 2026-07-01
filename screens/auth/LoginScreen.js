import React, { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  SafeAreaView, StatusBar, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../contexts/AuthContext'
import { COLORS } from '../../config/constants'

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Campos vacíos', 'Introduce email y contraseña')
      return
    }
    setLoading(true)
    try {
      await signIn({ email: email.trim(), password })
    } catch (err) {
      Alert.alert('Error', err.message ?? 'Email o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#12003A', '#0A0A14']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.title}>Bienvenido{'\n'}de vuelta</Text>
            <Text style={styles.subtitle}>Entra para continuar tu colección</Text>

            {/* Email */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="tu@email.com"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Contraseña</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Tu contraseña"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showPass}
                />
                <TouchableOpacity onPress={() => setShowPass(v => !v)}>
                  <Ionicons
                    name={showPass ? 'eye-off' : 'eye'}
                    size={20}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.forgotBtn}>
              <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
              <LinearGradient
                colors={loading ? ['#444', '#333'] : [COLORS.primary, COLORS.primaryDark]}
                style={styles.loginBtn}
              >
                {loading
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.loginBtnText}>Entrar</Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Apple Sign In placeholder - implement with expo-apple-authentication */}
            <TouchableOpacity style={styles.appleBtn} activeOpacity={0.85}>
              <Ionicons name="logo-apple" size={20} color="#000" />
              <Text style={styles.appleBtnText}>Continuar con Apple</Text>
            </TouchableOpacity>

            <View style={styles.registerRow}>
              <Text style={styles.registerText}>¿Sin cuenta? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerLink}>Crear una gratis</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 },

  header: { paddingTop: 16, marginBottom: 40 },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.textPrimary,
    lineHeight: 42,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 40,
  },

  label: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldWrap: { marginBottom: 20 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 52,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },

  forgotBtn: { alignSelf: 'flex-end', marginBottom: 24 },
  forgotText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },

  loginBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 24,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { color: COLORS.textMuted, fontSize: 13 },

  appleBtn: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  appleBtnText: { color: '#000', fontSize: 16, fontWeight: '600' },

  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  registerText: { color: COLORS.textMuted, fontSize: 14 },
  registerLink: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
})
