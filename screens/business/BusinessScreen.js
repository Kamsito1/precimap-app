import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, TextInput, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { COLORS } from '../../config/constants'

const BUSINESS_TYPES = [
  'Aventura / Deportes extremos',
  'Hostelería / Restauración',
  'Turismo / Excursiones',
  'Cultura / Entretenimiento',
  'Salud / Bienestar',
  'Deportes / Fitness',
  'Otros',
]

const BENEFITS = [
  { icon: '🗺️', title: 'Visibilidad en el mapa', desc: 'Tu experiencia aparece en la app para miles de usuarios' },
  { icon: '🎴', title: 'Carta coleccionable propia', desc: 'Diseñamos tu carta exclusiva con tu branding' },
  { icon: '📊', title: 'Analytics detallado', desc: 'Ve cuántos usuarios han conseguido tu carta y cuándo' },
  { icon: '🔗', title: 'Link de reserva directo', desc: 'Los usuarios pueden reservar directamente desde la carta' },
  { icon: '✦', title: 'Badge de empresa verificada', desc: 'Sello de confianza que aumenta conversiones' },
]

export default function BusinessScreen({ navigation }) {
  const { user, isLoggedIn, profile } = useAuth()
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    business_name: '',
    contact_name: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    business_type: '',
    tax_id: '',
  })
  const [showForm, setShowForm] = useState(false)
  const [selectedType, setSelectedType] = useState(null)

  useEffect(() => {
    if (isLoggedIn) checkExistingBusiness()
    else setLoading(false)
  }, [isLoggedIn])

  async function checkExistingBusiness() {
    try {
      const { data } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .single()
      setBusiness(data)
    } catch {} finally {
      setLoading(false)
    }
  }

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }))
  }

  async function handleSubmit() {
    if (!form.business_name.trim() || !form.contact_name.trim() || !form.email.trim()) {
      Alert.alert('Campos requeridos', 'Rellena nombre de empresa, contacto y email')
      return
    }
    if (!selectedType) {
      Alert.alert('Tipo de empresa', 'Selecciona el tipo de empresa')
      return
    }

    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('businesses')
        .insert({
          owner_id: user.id,
          ...form,
          business_type: selectedType,
          subscription_status: 'pending',
        })
        .select()
        .single()
      if (error) throw error
      setBusiness(data)
      setShowForm(false)
      Alert.alert(
        '¡Solicitud enviada! ✦',
        'Revisaremos tu empresa en 24-48h. Te contactaremos en el email proporcionado para procesar el pago y la verificación.',
        [{ text: 'Entendido' }]
      )
    } catch (err) {
      Alert.alert('Error', err.message ?? 'No se pudo enviar la solicitud')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Hero */}
            <LinearGradient
              colors={[COLORS.primary + '33', COLORS.bg]}
              style={styles.hero}
            >
              <Text style={styles.heroIcon}>🏢</Text>
              <Text style={styles.heroTitle}>¿Eres una empresa?</Text>
              <Text style={styles.heroText}>
                Convierte tu negocio en una experiencia coleccionable. Llega a miles de usuarios que buscan vivir aventuras únicas.
              </Text>
            </LinearGradient>

            {/* Existing business status */}
            {business && (
              <View style={styles.statusCard}>
                <View style={styles.statusHeader}>
                  <Text style={styles.statusTitle}>Tu empresa</Text>
                  <View style={[
                    styles.statusBadge,
                    business.is_verified ? styles.statusVerified : styles.statusPending
                  ]}>
                    <Text style={styles.statusBadgeText}>
                      {business.is_verified ? '✦ Verificada' : '⏳ Pendiente'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.businessName}>{business.business_name}</Text>
                <Text style={styles.businessEmail}>{business.email}</Text>
                {!business.is_verified && (
                  <Text style={styles.pendingText}>
                    Estamos revisando tu solicitud. Te contactaremos en 24-48h para procesar el pago y completar la verificación.
                  </Text>
                )}
                {business.subscription_status === 'active' && (
                  <Text style={styles.activeText}>
                    ✦ Suscripción activa hasta {new Date(business.subscription_expires_at).toLocaleDateString('es-ES')}
                  </Text>
                )}
              </View>
            )}

            {/* Benefits */}
            {!business && (
              <>
                <Text style={styles.sectionTitle}>¿Qué obtienes?</Text>
                <View style={styles.benefitsList}>
                  {BENEFITS.map((b, i) => (
                    <View key={i} style={styles.benefitRow}>
                      <View style={styles.benefitIcon}>
                        <Text style={{ fontSize: 22 }}>{b.icon}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.benefitTitle}>{b.title}</Text>
                        <Text style={styles.benefitDesc}>{b.desc}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Pricing */}
                <View style={styles.pricingCard}>
                  <Text style={styles.pricingLabel}>PRECIO</Text>
                  <Text style={styles.pricingPrice}>Desde 99€ / mes</Text>
                  <Text style={styles.pricingNote}>
                    Incluye diseño de carta, publicación y analytics.{'\n'}
                    Sin permanencia. Precio final según tipo de empresa.
                  </Text>
                </View>

                {/* CTA or form */}
                {!showForm ? (
                  <TouchableOpacity
                    onPress={() => {
                      if (!isLoggedIn) {
                        Alert.alert('Inicia sesión', 'Necesitas una cuenta para registrar tu empresa')
                        return
                      }
                      setShowForm(true)
                    }}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={[COLORS.primary, COLORS.primaryDark]}
                      style={styles.ctaBtn}
                    >
                      <Text style={styles.ctaBtnText}>Solicitar partnership →</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <BusinessForm
                    form={form}
                    set={set}
                    selectedType={selectedType}
                    setSelectedType={setSelectedType}
                    onSubmit={handleSubmit}
                    submitting={submitting}
                    onCancel={() => setShowForm(false)}
                  />
                )}
              </>
            )}

            {/* How it works */}
            <Text style={[styles.sectionTitle, { marginTop: 32 }]}>¿Cómo funciona?</Text>
            <HowItWorks />

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

function BusinessForm({ form, set, selectedType, setSelectedType, onSubmit, submitting, onCancel }) {
  return (
    <View style={styles.form}>
      <Text style={styles.formTitle}>Datos de tu empresa</Text>

      <Field label="Nombre de la empresa *" value={form.business_name} onChangeText={v => set('business_name', v)} placeholder="Ej: Adrenalina Aventura S.L." />
      <Field label="Nombre de contacto *" value={form.contact_name} onChangeText={v => set('contact_name', v)} placeholder="Tu nombre y apellido" />
      <Field label="Email de contacto *" value={form.email} onChangeText={v => set('email', v)} placeholder="empresa@email.com" keyboardType="email-address" autoCapitalize="none" />
      <Field label="Teléfono" value={form.phone} onChangeText={v => set('phone', v)} placeholder="+34 600 000 000" keyboardType="phone-pad" />
      <Field label="Web" value={form.website} onChangeText={v => set('website', v)} placeholder="https://tuempresa.com" keyboardType="url" autoCapitalize="none" />
      <Field label="Ciudad" value={form.city} onChangeText={v => set('city', v)} placeholder="Ej: Madrid" />
      <Field label="CIF/NIF" value={form.tax_id} onChangeText={v => set('tax_id', v)} placeholder="A12345678" autoCapitalize="characters" />

      <Text style={styles.label}>Tipo de empresa *</Text>
      <View style={styles.typeGrid}>
        {BUSINESS_TYPES.map(type => (
          <TouchableOpacity
            key={type}
            style={[styles.typeChip, selectedType === type && styles.typeChipActive]}
            onPress={() => setSelectedType(type)}
          >
            <Text style={[styles.typeChipText, selectedType === type && styles.typeChipTextActive]}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.formActions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSubmit}
          disabled={submitting}
          style={{ flex: 1 }}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={submitting ? ['#444', '#333'] : [COLORS.primary, COLORS.primaryDark]}
            style={styles.submitBtn}
          >
            {submitting
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.submitBtnText}>Enviar solicitud</Text>
            }
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function HowItWorks() {
  const steps = [
    { num: '01', title: 'Envía la solicitud', desc: 'Rellena el formulario con los datos de tu empresa' },
    { num: '02', title: 'Revisión (24-48h)', desc: 'Nuestro equipo verifica que cumples los requisitos' },
    { num: '03', title: 'Pago y activación', desc: 'Procesas el pago y tu empresa queda activa' },
    { num: '04', title: 'Tu carta en la app', desc: 'Diseñamos tu carta y apareces en el mapa de España' },
  ]
  return (
    <View style={styles.howList}>
      {steps.map(step => (
        <View key={step.num} style={styles.howRow}>
          <View style={styles.howNum}>
            <Text style={styles.howNumText}>{step.num}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.howTitle}>{step.title}</Text>
            <Text style={styles.howDesc}>{step.desc}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}

function Field({ label, ...props }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          placeholderTextColor={COLORS.textMuted}
          {...props}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  safe: { flex: 1 },
  center: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 40 },

  header: { paddingHorizontal: 16, paddingTop: 16, marginBottom: 8 },

  hero: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 0,
    marginBottom: 8,
  },
  heroIcon: { fontSize: 48, marginBottom: 16 },
  heroTitle: { fontSize: 28, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 12, textAlign: 'center', letterSpacing: -0.5 },
  heroText: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },

  statusCard: {
    marginHorizontal: 16,
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statusTitle: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusVerified: { backgroundColor: COLORS.success + '22', borderWidth: 1, borderColor: COLORS.success + '44' },
  statusPending: { backgroundColor: COLORS.warning + '22', borderWidth: 1, borderColor: COLORS.warning + '44' },
  statusBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  businessName: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  businessEmail: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 },
  pendingText: { fontSize: 13, color: COLORS.textMuted, lineHeight: 20 },
  activeText: { fontSize: 13, color: COLORS.success, fontWeight: '600' },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    paddingHorizontal: 16,
    marginBottom: 12,
    letterSpacing: -0.3,
  },

  benefitsList: { paddingHorizontal: 16, gap: 12, marginBottom: 24 },
  benefitRow: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  benefitIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.bgSurface,
    alignItems: 'center', justifyContent: 'center',
  },
  benefitTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  benefitDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },

  pricingCard: {
    marginHorizontal: 16,
    backgroundColor: COLORS.primary + '22',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.primary + '44',
    marginBottom: 20,
    alignItems: 'center',
  },
  pricingLabel: { color: COLORS.primary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  pricingPrice: { fontSize: 28, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 8 },
  pricingNote: { color: COLORS.textSecondary, fontSize: 12, textAlign: 'center', lineHeight: 18 },

  ctaBtn: {
    marginHorizontal: 16,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  ctaBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },

  form: {
    marginHorizontal: 16,
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  formTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 16, letterSpacing: -0.3 },
  label: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  fieldWrap: { marginBottom: 14 },
  inputWrap: {
    backgroundColor: COLORS.bgInput,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 46,
    justifyContent: 'center',
  },
  input: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '500' },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  typeChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '22' },
  typeChipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  typeChipTextActive: { color: COLORS.primary },

  formActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    height: 48, paddingHorizontal: 16, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  submitBtn: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  howList: { paddingHorizontal: 16, gap: 12 },
  howRow: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  howNum: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.primary + '22',
    borderWidth: 1, borderColor: COLORS.primary + '44',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  howNumText: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
  howTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  howDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
})
