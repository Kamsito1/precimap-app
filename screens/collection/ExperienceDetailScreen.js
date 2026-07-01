import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, Alert, ActivityIndicator,
  Share, Linking,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import * as ImagePicker from 'expo-image-picker'
import * as ExpoSharing from 'expo-sharing'
import { LargeExperienceCard } from '../../components/ExperienceCard'
import { useCollection } from '../../contexts/CollectionContext'
import { useAuth } from '../../contexts/AuthContext'
import { COLORS, RARITY } from '../../config/constants'

export default function ExperienceDetailScreen({ route, navigation }) {
  const { experience } = route.params
  const { isCollected, getMyCard, collectCard, updateCardPhoto } = useCollection()
  const { isLoggedIn } = useAuth()
  const [loading, setLoading] = useState(false)

  const collected = isCollected(experience.id)
  const myCard = getMyCard(experience.id)
  const rarity = RARITY[experience.rarity] ?? RARITY.common

  async function handleAddPhoto() {
    if (!isLoggedIn) {
      Alert.alert('Inicia sesión', 'Necesitas una cuenta para registrar tus experiencias')
      return
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería para añadir la foto')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [2, 3],
    })

    if (result.canceled) return

    setLoading(true)
    try {
      if (collected && myCard) {
        await updateCardPhoto(myCard.id, result.assets[0].uri)
      } else {
        await collectCard(experience.id, result.assets[0].uri)
      }
      Alert.alert('¡Conseguida! 🎴', `Has añadido "${experience.title}" a tu colección`)
    } catch (err) {
      Alert.alert('Error', err.message ?? 'No se pudo guardar la foto')
    } finally {
      setLoading(false)
    }
  }

  async function handleCollectWithoutPhoto() {
    if (!isLoggedIn) {
      Alert.alert('Inicia sesión', 'Necesitas una cuenta para registrar tus experiencias')
      return
    }
    if (collected) return

    setLoading(true)
    try {
      await collectCard(experience.id, null)
      Alert.alert('¡Conseguida! 🎴', `"${experience.title}" añadida a tu colección\nAñade tu foto después desde tu colección`)
    } catch (err) {
      Alert.alert('Error', err.message ?? 'No se pudo registrar la experiencia')
    } finally {
      setLoading(false)
    }
  }

  async function handleShare() {
    try {
      await Share.share({
        message: `Acabo de conseguir la carta "${experience.title}" 🎴\nDescarga la app y empieza tu colección de experiencias`,
        title: experience.title,
      })
    } catch (err) {}
  }

  async function handleBooking() {
    if (experience.booking_url) {
      await Linking.openURL(experience.booking_url)
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>

          {/* Large card */}
          <View style={styles.cardWrap}>
            <LargeExperienceCard
              experience={experience}
              userCard={myCard}
            />
          </View>

          {/* Action buttons */}
          <View style={styles.actions}>
            {!collected ? (
              <>
                <TouchableOpacity
                  onPress={handleAddPhoto}
                  disabled={loading}
                  activeOpacity={0.85}
                  style={{ flex: 1 }}
                >
                  <LinearGradient
                    colors={loading ? ['#444', '#333'] : [rarity.color, rarity.gradient[1]]}
                    style={styles.primaryAction}
                  >
                    {loading
                      ? <ActivityIndicator color="#FFF" />
                      : <>
                          <Ionicons name="camera" size={20} color="#FFF" />
                          <Text style={styles.primaryActionText}>Añadir foto</Text>
                        </>
                    }
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleCollectWithoutPhoto}
                  disabled={loading}
                  style={styles.secondaryAction}
                  activeOpacity={0.8}
                >
                  <Text style={styles.secondaryActionText}>Sin foto</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  onPress={handleAddPhoto}
                  disabled={loading}
                  style={styles.updatePhotoBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.updatePhotoText}>Cambiar foto</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleShare}
                  style={styles.shareBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons name="share-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.shareBtnText}>Compartir</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Collected badge */}
          {collected && myCard && (
            <View style={styles.collectedBadge}>
              <Text style={styles.collectedIcon}>✦</Text>
              <View>
                <Text style={styles.collectedTitle}>¡Carta conseguida!</Text>
                <Text style={styles.collectedSub}>
                  Fuiste la persona #{myCard.card_number} en conseguirla
                </Text>
              </View>
              <Text style={styles.pointsEarned}>+{myCard.points_earned} pts</Text>
            </View>
          )}

          {/* Info section */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>¿Qué es?</Text>
            <Text style={styles.descText}>{experience.description}</Text>
          </View>

          {experience.instructions && (
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>¿Cómo conseguirla?</Text>
              <Text style={styles.descText}>{experience.instructions}</Text>
            </View>
          )}

          {experience.validation_tip && (
            <View style={[styles.infoSection, styles.validationBox]}>
              <View style={styles.validationHeader}>
                <Ionicons name="camera" size={16} color={COLORS.gold} />
                <Text style={styles.validationTitle}>Foto para la carta</Text>
              </View>
              <Text style={styles.validationText}>{experience.validation_tip}</Text>
            </View>
          )}

          {/* Stats row */}
          <View style={styles.statsRow}>
            <StatItem
              icon="👥"
              label="Personas"
              value={experience.card_count?.toLocaleString() ?? '0'}
            />
            <StatItem
              icon="⚡"
              label="Dificultad"
              value={'★'.repeat(experience.difficulty) + '☆'.repeat(5 - experience.difficulty)}
            />
            <StatItem
              icon="💰"
              label="Coste"
              value={'€'.repeat(experience.cost_level) + '·'.repeat(5 - experience.cost_level)}
            />
          </View>

          {/* Location */}
          {(experience.city || experience.region) && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.locationText}>
                {[experience.city, experience.region].filter(Boolean).join(', ')} · España
              </Text>
            </View>
          )}

          {/* Hiking info */}
          {experience.hiking_info && experience.is_outdoor && (() => {
            try {
              const info = typeof experience.hiking_info === 'string'
                ? JSON.parse(experience.hiking_info)
                : experience.hiking_info
              return (
                <View style={styles.hikingBox}>
                  <Text style={styles.sectionTitle}>🥾 Info de ruta</Text>
                  {info.distance_km && <InfoRow icon="📏" label="Distancia" value={`${info.distance_km} km`} />}
                  {info.days && <InfoRow icon="📅" label="Días estimados" value={`${info.days} días`} />}
                  {info.difficulty && <InfoRow icon="⚡" label="Nivel" value={info.difficulty} />}
                  {info.best_months && (
                    <InfoRow icon="🌤️" label="Mejor época" value={info.best_months.join(', ')} />
                  )}
                  {info.starting_point && (
                    <InfoRow icon="📍" label="Inicio" value={info.starting_point} />
                  )}
                </View>
              )
            } catch { return null }
          })()}

          {/* Booking CTA */}
          {experience.booking_url && (
            <TouchableOpacity
              onPress={handleBooking}
              style={styles.bookingBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
              <Text style={styles.bookingBtnText}>Reservar experiencia</Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

function StatItem({ icon, label, value }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{icon} {label}</Text>
    </View>
  )
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoRowIcon}>{icon}</Text>
      <Text style={styles.infoRowLabel}>{label}:</Text>
      <Text style={styles.infoRowValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  safe: { flex: 1 },
  scroll: { paddingBottom: 40 },

  backBtn: {
    margin: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardWrap: { paddingHorizontal: 16, marginBottom: 20 },

  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
    alignItems: 'center',
  },
  primaryAction: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  secondaryAction: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  updatePhotoBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  updatePhotoText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  shareBtn: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  shareBtnText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },

  collectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: COLORS.primary + '22',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.primary + '44',
    padding: 14,
  },
  collectedIcon: { fontSize: 24 },
  collectedTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  collectedSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  pointsEarned: { marginLeft: 'auto', color: COLORS.gold, fontSize: 16, fontWeight: '800' },

  infoSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  descText: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 22 },

  validationBox: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.gold + '44',
    padding: 14,
    marginHorizontal: 16,
  },
  validationHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  validationTitle: { color: COLORS.gold, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  validationText: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },

  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 2 },
  statLabel: { color: COLORS.textMuted, fontSize: 11 },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  locationText: { color: COLORS.textSecondary, fontSize: 13 },

  hikingBox: {
    marginHorizontal: 16,
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoRowIcon: { fontSize: 14, width: 20 },
  infoRowLabel: { color: COLORS.textMuted, fontSize: 13, width: 120 },
  infoRowValue: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', flex: 1 },

  bookingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 16,
    backgroundColor: COLORS.primary + '11',
  },
  bookingBtnText: { flex: 1, color: COLORS.primary, fontSize: 15, fontWeight: '700' },
})
