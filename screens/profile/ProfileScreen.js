import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, SafeAreaView, StatusBar, RefreshControl,
  Alert, ActivityIndicator, FlatList,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollection } from '../../contexts/CollectionContext'
import { RankBadge, RankProgressBar } from '../../components/RankBadge'
import { ExperienceCard } from '../../components/ExperienceCard'
import { COLORS, RARITY } from '../../config/constants'

export default function ProfileScreen({ navigation }) {
  const { profile, isLoggedIn, signOut, updateProfile, refreshProfile } = useAuth()
  const { myCards, refresh: refreshCards } = useCollection()
  const [badges, setBadges] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState('cards') // 'cards' | 'badges'
  const [avatarLoading, setAvatarLoading] = useState(false)

  useEffect(() => {
    if (isLoggedIn) loadBadges()
  }, [isLoggedIn])

  async function loadBadges() {
    try {
      const { data } = await supabase
        .from('user_badges')
        .select('*, badge:badges(*)')
        .eq('user_id', profile?.id)
        .order('earned_at', { ascending: false })
      setBadges(data ?? [])
    } catch {}
  }

  async function onRefresh() {
    setRefreshing(true)
    await Promise.all([refreshProfile(), refreshCards(), loadBadges()])
    setRefreshing(false)
  }

  async function handleAvatarChange() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') return

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    })
    if (result.canceled) return

    setAvatarLoading(true)
    try {
      const uri = result.assets[0].uri
      const filename = `avatars/${profile.id}.jpg`
      const response = await fetch(uri)
      const blob = await response.blob()
      await supabase.storage.from('avatars').upload(filename, blob, { upsert: true, contentType: 'image/jpeg' })
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filename)
      await updateProfile({ avatar_url: publicUrl })
    } catch (err) {
      Alert.alert('Error', 'No se pudo actualizar la foto')
    } finally {
      setAvatarLoading(false)
    }
  }

  async function handleSignOut() {
    Alert.alert(
      'Cerrar sesión',
      '¿Seguro que quieres salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', style: 'destructive', onPress: signOut },
      ]
    )
  }

  if (!isLoggedIn) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safe}>
          <AuthPrompt onPress={() => navigation.navigate('AuthStack')} />
        </SafeAreaView>
      </View>
    )
  }

  const legendaryCount = myCards.filter(c => c.experience?.rarity === 'legendary').length
  const epicCount = myCards.filter(c => c.experience?.rarity === 'epic').length

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          contentContainerStyle={styles.scroll}
        >
          {/* Header actions */}
          <View style={styles.topRow}>
            <Text style={styles.screenTitle}>Perfil</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Business')}
                style={styles.iconBtn}
              >
                <Ionicons name="business-outline" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSignOut} style={styles.iconBtn}>
                <Ionicons name="log-out-outline" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Profile hero */}
          <View style={styles.profileHero}>
            {/* Avatar */}
            <TouchableOpacity onPress={handleAvatarChange} style={styles.avatarWrap}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
              ) : (
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  style={styles.avatarPlaceholder}
                >
                  <Text style={styles.avatarInitial}>
                    {(profile?.display_name ?? profile?.username ?? 'U')[0].toUpperCase()}
                  </Text>
                </LinearGradient>
              )}
              {avatarLoading ? (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color="#FFF" size="small" />
                </View>
              ) : (
                <View style={styles.cameraIcon}>
                  <Ionicons name="camera" size={12} color="#FFF" />
                </View>
              )}
            </TouchableOpacity>

            {/* Name + username */}
            <Text style={styles.displayName}>{profile?.display_name ?? profile?.username}</Text>
            <Text style={styles.username}>@{profile?.username}</Text>

            {/* Rank */}
            <View style={styles.rankWrap}>
              <RankBadge points={profile?.total_points ?? 0} size="medium" />
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <StatItem value={profile?.card_count ?? 0} label="Cartas" />
              <View style={styles.statDivider} />
              <StatItem value={legendaryCount} label="⭐ Legendarias" />
              <View style={styles.statDivider} />
              <StatItem value={profile?.streak_days ?? 0} label="🔥 Racha" />
            </View>

            {/* Rank progress */}
            <View style={styles.rankProgress}>
              <RankProgressBar points={profile?.total_points ?? 0} />
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, tab === 'cards' && styles.tabActive]}
              onPress={() => setTab('cards')}
            >
              <Text style={[styles.tabText, tab === 'cards' && styles.tabTextActive]}>
                Mis cartas ({myCards.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'badges' && styles.tabActive]}
              onPress={() => setTab('badges')}
            >
              <Text style={[styles.tabText, tab === 'badges' && styles.tabTextActive]}>
                Logros ({badges.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          {tab === 'cards' ? (
            <CardsGrid
              cards={myCards}
              onPress={card => navigation.navigate('Collection', {
                screen: 'ExperienceDetail',
                params: { experience: card.experience },
              })}
            />
          ) : (
            <BadgesGrid badges={badges} />
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

function CardsGrid({ cards, onPress }) {
  if (cards.length === 0) {
    return (
      <View style={styles.emptySection}>
        <Text style={styles.emptyIcon}>🎴</Text>
        <Text style={styles.emptyTitle}>Sin cartas aún</Text>
        <Text style={styles.emptyText}>Empieza a explorar para conseguir tu primera carta</Text>
      </View>
    )
  }

  return (
    <View style={styles.grid}>
      {cards.map(card => (
        <ExperienceCard
          key={card.id}
          experience={card.experience}
          userCard={card}
          onPress={() => onPress(card)}
        />
      ))}
    </View>
  )
}

function BadgesGrid({ badges }) {
  if (badges.length === 0) {
    return (
      <View style={styles.emptySection}>
        <Text style={styles.emptyIcon}>🏆</Text>
        <Text style={styles.emptyTitle}>Sin logros aún</Text>
        <Text style={styles.emptyText}>Consigue cartas para desbloquear logros</Text>
      </View>
    )
  }

  return (
    <View style={styles.badgesGrid}>
      {badges.map(ub => {
        const rarity = RARITY[ub.badge?.rarity] ?? RARITY.common
        return (
          <View key={ub.id} style={styles.badgeItem}>
            <LinearGradient
              colors={rarity.gradient}
              style={styles.badgeIconWrap}
            >
              <Text style={styles.badgeIcon}>{ub.badge?.icon ?? '🏅'}</Text>
            </LinearGradient>
            <Text style={styles.badgeName}>{ub.badge?.name}</Text>
          </View>
        )
      })}
    </View>
  )
}

function StatItem({ value, label }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{typeof value === 'number' ? value.toLocaleString() : value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function AuthPrompt({ onPress }) {
  return (
    <View style={styles.authPrompt}>
      <Text style={styles.authIcon}>👤</Text>
      <Text style={styles.authTitle}>Tu perfil te espera</Text>
      <Text style={styles.authText}>Inicia sesión para ver tu colección y rangos</Text>
      <TouchableOpacity onPress={onPress} style={styles.authBtn}>
        <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.authBtnInner}>
          <Text style={styles.authBtnText}>Entrar / Registrarse</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  safe: { flex: 1 },
  scroll: { paddingBottom: 100 },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  screenTitle: { fontSize: 26, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', gap: 4 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.bgCard,
  },

  profileHero: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  avatarWrap: { width: 88, height: 88, marginBottom: 12 },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarPlaceholder: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 36, color: '#FFF', fontWeight: '800' },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 2, right: 2,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.bg,
  },
  displayName: {
    fontSize: 22, fontWeight: '800', color: COLORS.textPrimary,
    marginBottom: 2,
  },
  username: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 12 },

  rankWrap: { marginBottom: 16 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: COLORS.border },

  rankProgress: {
    width: '100%',
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },

  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginTop: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    paddingTop: 8,
  },

  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  badgeItem: { alignItems: 'center', width: 72 },
  badgeIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  badgeIcon: { fontSize: 24 },
  badgeName: {
    color: COLORS.textSecondary,
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '600',
  },

  emptySection: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },

  authPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  authIcon: { fontSize: 64, marginBottom: 20 },
  authTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8, textAlign: 'center' },
  authText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  authBtn: { width: '100%' },
  authBtnInner: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  authBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
})
