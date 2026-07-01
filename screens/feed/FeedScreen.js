import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, SafeAreaView, StatusBar, ActivityIndicator,
  RefreshControl, Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { COLORS, RARITY } from '../../config/constants'

export default function FeedScreen({ navigation }) {
  const { user, isLoggedIn, profile } = useAuth()
  const [feedItems, setFeedItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [likedIds, setLikedIds] = useState(new Set())

  useEffect(() => {
    if (isLoggedIn) loadFeed()
  }, [isLoggedIn])

  async function loadFeed() {
    try {
      // Get friend IDs
      const { data: friends } = await supabase
        .from('friendships')
        .select('requester_id, receiver_id')
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted')

      const friendIds = (friends ?? []).map(f =>
        f.requester_id === user.id ? f.receiver_id : f.requester_id
      )

      if (friendIds.length === 0) {
        setFeedItems([])
        setLoading(false)
        setRefreshing(false)
        return
      }

      // Get recent cards from friends
      const { data } = await supabase
        .from('user_experiences')
        .select(`
          id, photo_url, card_number, points_earned, obtained_at,
          user:profiles(id, username, display_name, avatar_url, rank_key),
          experience:experiences(
            id, title, rarity, template_url,
            category:categories(key, name_es, icon)
          )
        `)
        .in('user_id', friendIds)
        .order('obtained_at', { ascending: false })
        .limit(50)

      setFeedItems(data ?? [])

      // Get liked IDs
      if (data?.length) {
        const { data: likes } = await supabase
          .from('experience_likes')
          .select('user_experience_id')
          .eq('user_id', user.id)
          .in('user_experience_id', data.map(d => d.id))
        setLikedIds(new Set((likes ?? []).map(l => l.user_experience_id)))
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function handleLike(itemId) {
    if (!isLoggedIn) return
    const isLiked = likedIds.has(itemId)
    setLikedIds(prev => {
      const next = new Set(prev)
      isLiked ? next.delete(itemId) : next.add(itemId)
      return next
    })
    try {
      if (isLiked) {
        await supabase
          .from('experience_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('user_experience_id', itemId)
      } else {
        await supabase
          .from('experience_likes')
          .insert({ user_id: user.id, user_experience_id: itemId })
      }
    } catch {}
  }

  const renderItem = useCallback(({ item }) => (
    <FeedCard
      item={item}
      liked={likedIds.has(item.id)}
      onLike={() => handleLike(item.id)}
      onPress={() => navigation.navigate('Collection', {
        screen: 'ExperienceDetail',
        params: { experience: item.experience },
      })}
    />
  ), [likedIds, navigation])

  if (!isLoggedIn) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safe}>
          <AuthPrompt onPress={() => navigation.navigate('AuthStack')} />
        </SafeAreaView>
      </View>
    )
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Feed</Text>
          <TouchableOpacity
            style={styles.addFriendsBtn}
            onPress={() => Alert.alert('Añadir amigos', 'Busca amigos por @usuario — próximamente')}
          >
            <Ionicons name="person-add-outline" size={18} color={COLORS.primary} />
            <Text style={styles.addFriendsBtnText}>Añadir</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={feedItems}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadFeed() }}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={<EmptyFeed />}
        />
      </SafeAreaView>
    </View>
  )
}

function FeedCard({ item, liked, onLike, onPress }) {
  const rarity = RARITY[item.experience?.rarity] ?? RARITY.common
  const timeAgo = getTimeAgo(item.obtained_at)
  const user = item.user

  return (
    <View style={styles.card}>
      {/* User row */}
      <View style={styles.cardHeader}>
        <View style={styles.avatarWrap}>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.avatarPlaceholder}
            >
              <Text style={styles.avatarInitial}>
                {(user?.display_name ?? user?.username ?? 'U')[0].toUpperCase()}
              </Text>
            </LinearGradient>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{user?.display_name ?? user?.username}</Text>
          <Text style={styles.timeAgo}>{timeAgo}</Text>
        </View>
        <View style={[styles.rarityPill, { borderColor: rarity.color + '66' }]}>
          <Text style={[styles.rarityPillText, { color: rarity.color }]}>{rarity.icon}</Text>
        </View>
      </View>

      {/* Card image */}
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        <View style={styles.cardImage}>
          {item.photo_url ? (
            <Image
              source={{ uri: item.photo_url }}
              style={styles.cardImg}
              resizeMode="cover"
            />
          ) : item.experience?.template_url ? (
            <Image
              source={{ uri: item.experience.template_url }}
              style={styles.cardImg}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={rarity.gradient}
              style={[styles.cardImg, styles.cardImgPlaceholder]}
            >
              <Text style={{ fontSize: 48 }}>{item.experience?.category?.icon ?? '⭐'}</Text>
            </LinearGradient>
          )}
          {/* Overlay info */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.cardImgGradient}
          />
          {item.card_number && (
            <View style={styles.cardNumBadge}>
              <Text style={styles.cardNumText}>#{item.card_number} en el mundo</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View style={{ flex: 1 }}>
          <Text style={styles.expTitle}>{item.experience?.title}</Text>
          <Text style={styles.expCategory}>
            {item.experience?.category?.icon} {item.experience?.category?.name_es}
          </Text>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={onLike} style={styles.likeBtn}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={24}
              color={liked ? '#EF4444' : COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

function EmptyFeed() {
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyIcon}>👥</Text>
      <Text style={styles.emptyTitle}>Sin actividad aún</Text>
      <Text style={styles.emptyText}>
        Añade amigos para ver sus cartas aquí.{'\n'}
        Puedes buscarlos por su @usuario.
      </Text>
    </View>
  )
}

function AuthPrompt({ onPress }) {
  return (
    <View style={styles.authPrompt}>
      <Text style={styles.authIcon}>🃏</Text>
      <Text style={styles.authTitle}>Ve las cartas de tus amigos</Text>
      <Text style={styles.authText}>Inicia sesión para ver el feed de experiencias</Text>
      <TouchableOpacity onPress={onPress} style={styles.authBtn}>
        <Text style={styles.authBtnText}>Entrar</Text>
      </TouchableOpacity>
    </View>
  )
}

function getTimeAgo(dateStr) {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = (now - date) / 1000
  if (diff < 60) return 'ahora mismo'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)} días`
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
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
  headerTitle: { fontSize: 26, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: -0.5 },
  addFriendsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primary + '66',
    backgroundColor: COLORS.primary + '11',
  },
  addFriendsBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },

  list: { paddingBottom: 100 },

  card: {
    backgroundColor: COLORS.bgCard,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  avatarWrap: { width: 40, height: 40 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  userName: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  timeAgo: { color: COLORS.textMuted, fontSize: 12 },
  rarityPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  rarityPillText: { fontSize: 16 },

  cardImage: { height: 280, position: 'relative' },
  cardImg: { width: '100%', height: '100%' },
  cardImgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardImgGradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 80,
  },
  cardNumBadge: {
    position: 'absolute',
    bottom: 12, left: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(240,165,0,0.4)',
  },
  cardNumText: { color: '#F0A500', fontSize: 11, fontWeight: '700' },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  expTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  expCategory: { color: COLORS.textSecondary, fontSize: 12 },
  actionsRow: { flexDirection: 'row', gap: 4 },
  likeBtn: { padding: 4 },

  emptyWrap: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },

  authPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  authIcon: { fontSize: 64, marginBottom: 20 },
  authTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8, textAlign: 'center' },
  authText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  authBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
  },
  authBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
})
