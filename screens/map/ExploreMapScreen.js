import React, { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  StatusBar, Modal, ScrollView, ActivityIndicator, Dimensions,
} from 'react-native'
import MapView, { Marker, Callout, PROVIDER_DEFAULT } from 'react-native-maps'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import * as Location from 'expo-location'
import { supabase } from '../../config/supabase'
import { useCollection } from '../../contexts/CollectionContext'
import { COLORS, CATEGORIES, RARITY } from '../../config/constants'

const { width } = Dimensions.get('window')

// Spain center coordinates
const SPAIN_REGION = {
  latitude: 40.4168,
  longitude: -3.7038,
  latitudeDelta: 8,
  longitudeDelta: 8,
}

export default function ExploreMapScreen({ navigation }) {
  const { isCollected, getMyCard } = useCollection()
  const mapRef = useRef(null)
  const [experiences, setExperiences] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedExp, setSelectedExp] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [userLocation, setUserLocation] = useState(null)

  useEffect(() => {
    loadExperiences()
    requestLocation()
  }, [])

  async function loadExperiences() {
    try {
      const { data } = await supabase
        .from('experiences')
        .select(`
          id, title, rarity, difficulty, cost_level,
          latitude, longitude, city, region,
          category_id, template_url, card_count,
          category:categories(key, name_es, icon, color)
        `)
        .eq('is_active', true)
        .eq('country_id', 'ES')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
      setExperiences(data ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function requestLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') return
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
    setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude })
  }

  const filtered = experiences.filter(e =>
    !selectedCategory || e.category?.key === selectedCategory
  )

  function getMarkerColor(exp) {
    return RARITY[exp.rarity]?.color ?? COLORS.textMuted
  }

  function goToUserLocation() {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }, 500)
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* Map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        initialRegion={SPAIN_REGION}
        showsUserLocation={!!userLocation}
        showsMyLocationButton={false}
        mapType="standard"
      >
        {filtered.map(exp => (
          <Marker
            key={exp.id}
            coordinate={{ latitude: exp.latitude, longitude: exp.longitude }}
            onPress={() => setSelectedExp(exp)}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={[styles.marker, { borderColor: getMarkerColor(exp) }]}>
              <Text style={styles.markerIcon}>{exp.category?.icon ?? '⭐'}</Text>
            </View>
            {isCollected(exp.id) && (
              <View style={styles.collectedDot} />
            )}
          </Marker>
        ))}
      </MapView>

      {/* Overlay UI */}
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Explorar</Text>
            <Text style={styles.headerSub}>España · {filtered.length} experiencias</Text>
          </View>
        </View>

        {/* Category filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catList}
          style={styles.catScroll}
          pointerEvents="auto"
        >
          <TouchableOpacity
            style={[styles.catChip, !selectedCategory && styles.catChipActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={styles.catChipText}>Todo</Text>
          </TouchableOpacity>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.catChip, selectedCategory === cat.key && styles.catChipActive]}
              onPress={() => setSelectedCategory(selectedCategory === cat.key ? null : cat.key)}
            >
              <Text style={styles.catIcon}>{cat.icon}</Text>
              <Text style={styles.catChipText}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* My location button */}
        {userLocation && (
          <TouchableOpacity
            style={styles.myLocationBtn}
            onPress={goToUserLocation}
            pointerEvents="auto"
          >
            <Ionicons name="locate" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        )}

        {loading && (
          <View style={styles.loadingBadge}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        )}
      </SafeAreaView>

      {/* Experience Detail Bottom Sheet */}
      {selectedExp && (
        <ExperienceBottomSheet
          experience={selectedExp}
          collected={isCollected(selectedExp.id)}
          myCard={getMyCard(selectedExp.id)}
          onClose={() => setSelectedExp(null)}
          onDetail={() => {
            setSelectedExp(null)
            navigation.navigate('Collection', {
              screen: 'ExperienceDetail',
              params: { experience: selectedExp },
            })
          }}
        />
      )}
    </View>
  )
}

function ExperienceBottomSheet({ experience, collected, myCard, onClose, onDetail }) {
  const rarity = RARITY[experience.rarity] ?? RARITY.common
  return (
    <View style={styles.sheet}>
      <View style={styles.sheetHandle} />

      {/* Close */}
      <TouchableOpacity style={styles.sheetClose} onPress={onClose}>
        <Ionicons name="close" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.sheetContent}>
        {/* Left: category icon */}
        <LinearGradient
          colors={rarity.gradient}
          style={styles.sheetIcon}
        >
          <Text style={{ fontSize: 32 }}>{experience.category?.icon ?? '⭐'}</Text>
        </LinearGradient>

        {/* Right: info */}
        <View style={{ flex: 1 }}>
          <View style={styles.sheetRarityRow}>
            <View style={[styles.sheetRarityDot, { backgroundColor: rarity.color }]} />
            <Text style={[styles.sheetRarityText, { color: rarity.color }]}>
              {rarity.label}
            </Text>
            {collected && (
              <View style={styles.collectedPill}>
                <Text style={styles.collectedPillText}>✦ Conseguida</Text>
              </View>
            )}
          </View>
          <Text style={styles.sheetTitle}>{experience.title}</Text>
          <Text style={styles.sheetLocation}>
            <Ionicons name="location-outline" size={12} /> {' '}
            {[experience.city, experience.region].filter(Boolean).join(', ') || 'España'}
          </Text>
          <Text style={styles.sheetStats}>
            👥 {experience.card_count ?? 0} personas · ⚡ {'★'.repeat(experience.difficulty)}
          </Text>
        </View>
      </View>

      {myCard?.card_number && (
        <View style={styles.cardNumRow}>
          <Text style={styles.cardNumText}>⭐ Fuiste la persona #{myCard.card_number} en conseguirla</Text>
        </View>
      )}

      <TouchableOpacity onPress={onDetail} activeOpacity={0.85}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.sheetCta}
        >
          <Text style={styles.sheetCtaText}>Ver experiencia →</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: {
    flex: 1,
    pointerEvents: 'box-none',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: 'rgba(10,10,20,0.85)',
    borderRadius: 16,
    padding: 12,
  },
  headerLeft: {},
  headerTitle: { fontSize: 20, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: COLORS.textSecondary },

  catScroll: { flexGrow: 0, marginTop: 10 },
  catList: { paddingHorizontal: 16, gap: 8 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(10,10,20,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  catChipActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(123,47,190,0.4)' },
  catIcon: { fontSize: 14 },
  catChipText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600' },

  myLocationBtn: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  loadingBadge: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
    backgroundColor: COLORS.bgCard,
    padding: 8,
    borderRadius: 20,
  },

  marker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  markerIcon: { fontSize: 20 },
  collectedDot: {
    position: 'absolute',
    top: 0, right: 0,
    width: 12, height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: '#FFF',
  },

  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetClose: {
    position: 'absolute',
    top: 16, right: 16,
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetContent: { flexDirection: 'row', gap: 14, marginBottom: 12 },
  sheetIcon: {
    width: 80, height: 110,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetRarityRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  sheetRarityDot: { width: 8, height: 8, borderRadius: 4 },
  sheetRarityText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  collectedPill: {
    backgroundColor: COLORS.primary + '22',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary + '44',
  },
  collectedPillText: { color: COLORS.primary, fontSize: 10, fontWeight: '700' },
  sheetTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  sheetLocation: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 4 },
  sheetStats: { color: COLORS.textMuted, fontSize: 12 },

  cardNumRow: {
    backgroundColor: COLORS.bgSurface,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.gold + '33',
  },
  cardNumText: { color: COLORS.gold, fontSize: 12, fontWeight: '600' },

  sheetCta: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCtaText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
})
