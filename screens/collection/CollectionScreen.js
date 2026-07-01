import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, SafeAreaView, StatusBar, ActivityIndicator,
  RefreshControl, Animated,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '../../config/supabase'
import { useCollection } from '../../contexts/CollectionContext'
import { ExperienceCard } from '../../components/ExperienceCard'
import { COLORS, CATEGORIES, RARITY } from '../../config/constants'

const RARITY_FILTERS = [
  { key: null, label: 'Todas' },
  { key: 'legendary', label: '⭐ Legendaria' },
  { key: 'epic', label: '🟣 Épica' },
  { key: 'rare', label: '🔵 Rara' },
  { key: 'uncommon', label: '🟢 Poco Común' },
  { key: 'common', label: '⚪ Común' },
]

export default function CollectionScreen({ navigation }) {
  const { isCollected, getMyCard } = useCollection()
  const [experiences, setExperiences] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedRarity, setSelectedRarity] = useState(null)
  const [showCollectedOnly, setShowCollectedOnly] = useState(false)

  const searchAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    loadExperiences()
  }, [])

  async function loadExperiences() {
    try {
      const { data } = await supabase
        .from('experiences')
        .select(`
          id, title, description, rarity, difficulty, cost_level,
          category_id, template_url, card_count, city, region,
          category:categories(key, name_es, icon, color)
        `)
        .eq('is_active', true)
        .eq('country_id', 'ES')
        .order('rarity', { ascending: false })
      setExperiences(data ?? [])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const filtered = useMemo(() => {
    return experiences.filter(exp => {
      if (selectedCategory && exp.category?.key !== selectedCategory) return false
      if (selectedRarity && exp.rarity !== selectedRarity) return false
      if (showCollectedOnly && !isCollected(exp.id)) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return exp.title.toLowerCase().includes(q) || exp.category?.name_es?.toLowerCase().includes(q)
      }
      return true
    })
  }, [experiences, selectedCategory, selectedRarity, showCollectedOnly, search, isCollected])

  const collectedCount = useMemo(() =>
    experiences.filter(e => isCollected(e.id)).length,
    [experiences, isCollected]
  )

  const renderItem = useCallback(({ item }) => (
    <ExperienceCard
      experience={item}
      userCard={getMyCard(item.id)}
      onPress={() => navigation.navigate('ExperienceDetail', { experience: item })}
    />
  ), [getMyCard, navigation])

  const keyExtractor = useCallback(item => item.id, [])

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

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Colección</Text>
            <Text style={styles.headerSub}>
              {collectedCount}/{experiences.length} conseguidas
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.collectedBtn, showCollectedOnly && styles.collectedBtnActive]}
            onPress={() => setShowCollectedOnly(v => !v)}
          >
            <Text style={styles.collectedBtnText}>
              {showCollectedOnly ? '✦ Mis cartas' : '☐ Mis cartas'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar experiencias..."
            placeholderTextColor={COLORS.textMuted}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category filter */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ key: null, label: 'Todo', icon: '✦' }, ...CATEGORIES]}
          keyExtractor={item => String(item.key)}
          contentContainerStyle={styles.catList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.catChip, selectedCategory === item.key && styles.catChipActive]}
              onPress={() => setSelectedCategory(item.key === selectedCategory ? null : item.key)}
              activeOpacity={0.8}
            >
              <Text style={styles.catIcon}>{item.icon ?? '✦'}</Text>
              <Text style={[styles.catLabel, selectedCategory === item.key && styles.catLabelActive]}>
                {item.label ?? 'Todo'}
              </Text>
            </TouchableOpacity>
          )}
          style={styles.catScroll}
        />

        {/* Rarity filter */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={RARITY_FILTERS}
          keyExtractor={item => String(item.key)}
          contentContainerStyle={styles.rarityList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.rarityChip,
                selectedRarity === item.key && styles.rarityChipActive,
                item.key && { borderColor: RARITY[item.key]?.color + '66' },
              ]}
              onPress={() => setSelectedRarity(item.key === selectedRarity ? null : item.key)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.rarityChipText,
                selectedRarity === item.key && styles.rarityChipTextActive,
                item.key && { color: RARITY[item.key]?.color },
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          style={styles.rarityScroll}
        />

        {/* Results count */}
        {(selectedCategory || selectedRarity || search || showCollectedOnly) && (
          <Text style={styles.resultsText}>{filtered.length} experiencias</Text>
        )}

        {/* Grid */}
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={2}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadExperiences() }}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🗺️</Text>
              <Text style={styles.emptyTitle}>Sin resultados</Text>
              <Text style={styles.emptyText}>Prueba con otros filtros</Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  safe: { flex: 1 },
  center: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  headerSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  collectedBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  collectedBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '22',
  },
  collectedBtnText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    borderRadius: 12,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
  },

  catScroll: { flexGrow: 0 },
  catList: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '22' },
  catIcon: { fontSize: 14 },
  catLabel: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  catLabelActive: { color: COLORS.primary },

  rarityScroll: { flexGrow: 0 },
  rarityList: { paddingHorizontal: 16, gap: 8, paddingTop: 8, paddingBottom: 8 },
  rarityChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rarityChipActive: { backgroundColor: 'rgba(123,47,190,0.2)' },
  rarityChipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  rarityChipTextActive: { color: COLORS.primary },

  resultsText: {
    color: COLORS.textMuted,
    fontSize: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },

  grid: { paddingHorizontal: 10, paddingBottom: 100 },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },
})
