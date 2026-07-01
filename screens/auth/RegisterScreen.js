import React, { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, SafeAreaView, StatusBar, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../contexts/AuthContext'
import { COLORS } from '../../config/constants'

const GENDERS = [
  { key: 'male', label: 'Chico', icon: '♂' },
  { key: 'female', label: 'Chica', icon: '♀' },
  { key: 'prefer_not_to_say', label: 'Prefiero no decir', icon: '◎' },
]

export default function RegisterScreen({ navigation }) {
  const { signUp } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const [form, setForm] = useState({
    username: '',
    displayName: '',
    email: '',
    password: '',
    gender: null,
  })
  const [errors, setErrors] = useState({})

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }))
    setErrors(e => ({ ...e, [field]: null }))
  }

  function validateStep1() {
    const e = {}
    if (!form.displayName.trim()) e.displayName = 'Pon tu nombre'
    if (!form.username.trim() || form.username.length < 3)
      e.username = 'Mínimo 3 caracteres'
    if (!/^[a-zA-Z0-9_]+$/.test(form.username))
      e.username = 'Solo letras, números y _'
    if (!form.gender) e.gender = 'Elige una opción'
    return e
  }

  function validateStep2() {
    const e = {}
    if (!form.email.includes('@')) e.email = 'Email no válido'
    if (form.password.length < 6) e.password = 'Mínimo 6 caracteres'
    return e
  }

  function nextStep() {
    const e = validateStep1()
    if (Object.keys(e).length) { setErrors(e); return }
    setStep(2)
  }

  async function submit() {
    const e = validateStep2()
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true)
    try {
      await signUp(form)
    } catch (err) {
      Alert.alert('Error', err.message ?? 'No se pudo crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#12003A', '#0A0A14']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => step === 2 ? setStep(1) : navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <View style={styles.stepRow}>
                <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
                <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
                <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
              </View>
            </View>

            {step === 1 ? (
              <Step1
                form={form}
                errors={errors}
                set={set}
                onNext={nextStep}
              />
            ) : (
              <Step2
                form={form}
                errors={errors}
                set={set}
                showPass={showPass}
                setShowPass={setShowPass}
                loading={loading}
                onSubmit={submit}
              />
            )}

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>¿Ya tienes cuenta? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Entrar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

function Step1({ form, errors, set, onNext }) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Crea tu perfil</Text>
      <Text style={styles.stepSubtitle}>¿Cómo quieres que te conozcan?</Text>

      <Field
        label="Nombre o apodo"
        value={form.displayName}
        onChangeText={v => set('displayName', v)}
        placeholder="Ej: Kamsito"
        error={errors.displayName}
        autoFocus
      />
      <Field
        label="Nombre de usuario"
        value={form.username}
        onChangeText={v => set('username', v.toLowerCase().replace(/\s/g, ''))}
        placeholder="Ej: kamsito"
        error={errors.username}
        prefix="@"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Género</Text>
      <View style={styles.genderRow}>
        {GENDERS.map(g => (
          <TouchableOpacity
            key={g.key}
            style={[styles.genderBtn, form.gender === g.key && styles.genderBtnActive]}
            onPress={() => set('gender', g.key)}
            activeOpacity={0.8}
          >
            <Text style={styles.genderIcon}>{g.icon}</Text>
            <Text style={[styles.genderLabel, form.gender === g.key && styles.genderLabelActive]}>
              {g.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}

      <TouchableOpacity onPress={onNext} activeOpacity={0.85} style={{ marginTop: 24 }}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.btn}
        >
          <Text style={styles.btnText}>Continuar →</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  )
}

function Step2({ form, errors, set, showPass, setShowPass, loading, onSubmit }) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Tu cuenta</Text>
      <Text style={styles.stepSubtitle}>Email y contraseña para entrar</Text>

      <Field
        label="Email"
        value={form.email}
        onChangeText={v => set('email', v.trim())}
        placeholder="tu@email.com"
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoFocus
      />
      <Field
        label="Contraseña"
        value={form.password}
        onChangeText={v => set('password', v)}
        placeholder="Mínimo 6 caracteres"
        error={errors.password}
        secureTextEntry={!showPass}
        rightIcon={
          <TouchableOpacity onPress={() => setShowPass(v => !v)}>
            <Ionicons
              name={showPass ? 'eye-off' : 'eye'}
              size={20}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>
        }
      />

      <Text style={styles.legalText}>
        Al registrarte aceptas nuestros{' '}
        <Text style={styles.legalLink}>Términos de Servicio</Text>
        {' '}y{' '}
        <Text style={styles.legalLink}>Política de Privacidad</Text>.
      </Text>

      <TouchableOpacity onPress={onSubmit} disabled={loading} activeOpacity={0.85} style={{ marginTop: 16 }}>
        <LinearGradient
          colors={loading ? ['#444', '#333'] : [COLORS.primary, COLORS.primaryDark]}
          style={styles.btn}
        >
          {loading
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.btnText}>Crear cuenta ✦</Text>
          }
        </LinearGradient>
      </TouchableOpacity>
    </View>
  )
}

function Field({ label, error, prefix, rightIcon, style, ...props }) {
  return (
    <View style={[styles.fieldWrap, style]}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, error && styles.inputWrapError]}>
        {prefix && <Text style={styles.inputPrefix}>{prefix}</Text>}
        <TextInput
          style={styles.input}
          placeholderTextColor={COLORS.textMuted}
          {...props}
        />
        {rightIcon}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    marginBottom: 32,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  stepDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  stepDotActive: { backgroundColor: COLORS.primary, width: 12, height: 12, borderRadius: 6 },
  stepLine: { width: 40, height: 2, backgroundColor: 'rgba(255,255,255,0.15)' },
  stepLineActive: { backgroundColor: COLORS.primary },

  stepContainer: { flex: 1 },
  stepTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  stepSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 32,
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
  inputWrapError: { borderColor: COLORS.error },
  inputPrefix: { color: COLORS.textMuted, fontSize: 16, marginRight: 2 },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: { color: COLORS.error, fontSize: 12, marginTop: 4 },

  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 0 },
  genderBtn: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  genderBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '22' },
  genderIcon: { fontSize: 20 },
  genderLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', textAlign: 'center' },
  genderLabelActive: { color: COLORS.primary },

  legalText: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 8 },
  legalLink: { color: COLORS.primary },

  btn: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },

  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  loginText: { color: COLORS.textMuted, fontSize: 14 },
  loginLink: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
})
