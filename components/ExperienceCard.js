import React from 'react'
import {
  View, Text, Image, StyleSheet, TouchableOpacity,
  Dimensions, ImageBackground,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, RARITY } from '../config/constants'

const { width } = Dimensions.get('window')
const CARD_WIDTH = (width - 48) / 2
const CARD_HEIGHT = CARD_WIDTH * 1.45

export function ExperienceCard({ experience, userCard, onPress, style, compact = false }) {
  const rarity = RARITY[experience.rarity] ?? RARITY.common
  const collected = !!userCard
  const category = experience.category

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.wrapper, style]}
    >
      <View style={[styles.card, { width: compact ? 120 : CARD_WIDTH, height: compact ? 170 : CARD_HEIGHT }]}>
        {/* Card background */}
        {userCard?.photo_url ? (
          <ImageBackground
            source={{ uri: userCard.photo_url }}
            style={styles.cardBg}
            imageStyle={styles.cardBgImg}
          >
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.85)']}
              style={styles.cardGradient}
            />
          </ImageBackground>
        ) : experience.template_url ? (
          <ImageBackground
            source={{ uri: experience.template_url }}
            style={styles.cardBg}
            imageStyle={[styles.cardBgImg, !collected && styles.lockedImg]}
          >
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.85)']}
              style={styles.cardGradient}
            />
            {!collected && (
              <View style={styles.lockOverlay}>
                <Ionicons name="lock-closed" size={28} color="rgba(255,255,255,0.5)" />
              </View>
            )}
          </ImageBackground>
        ) : (
          <LinearGradient
            colors={collected ? rarity.gradient : ['#1A1A2E', '#0A0A14']}
            style={styles.cardBg}
          >
            <View style={styles.cardPlaceholder}>
              <Text style={styles.categoryIcon}>{category?.icon ?? '⭐'}</Text>
              {!collected && (
                <Ionicons name="lock-closed" size={24} color="rgba(255,255,255,0.3)" style={{ marginTop: 8 }} />
              )}
            </View>
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.cardGradient}
            />
          </LinearGradient>
        )}

        {/* Rarity border glow */}
        <View style={[styles.rarityBorder, { borderColor: rarity.color + (collected ? 'CC' : '44') }]} />

        {/* Top badges */}
        <View style={styles.topRow}>
          <View style={[styles.rarityDot, { backgroundColor: rarity.color }]} />
          {userCard?.card_number && (
            <View style={styles.numberBadge}>
              <Text style={styles.numberText}>#{userCard.card_number}</Text>
            </View>
          )}
        </View>

        {/* Bottom info */}
        <View style={styles.cardFooter}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {experience.title}
          </Text>
          <View style={styles.bottomRow}>
            <Text style={styles.rarityLabel}>{rarity.label}</Text>
            <View style={styles.diffRow}>
              {[1, 2, 3, 4, 5].map(i => (
                <View
                  key={i}
                  style={[styles.diffDot, i <= experience.difficulty && { backgroundColor: rarity.color }]}
                />
              ))}
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

export function LargeExperienceCard({ experience, userCard, style }) {
  const rarity = RARITY[experience.rarity] ?? RARITY.common
  const collected = !!userCard
  const category = experience.category

  return (
    <View style={[styles.largeCard, style]}>
      {/* Background */}
      {(userCard?.photo_url || experience.template_url) ? (
        <ImageBackground
          source={{ uri: userCard?.photo_url || experience.template_url }}
          style={styles.largeBg}
          imageStyle={[styles.largeBgImg, !collected && styles.lockedImg]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.9)']}
            style={styles.largeGradient}
          />
        </ImageBackground>
      ) : (
        <LinearGradient
          colors={collected ? rarity.gradient : ['#1A1A2E', '#0A0A14']}
          style={styles.largeBg}
        >
          <View style={styles.largeIconCenter}>
            <Text style={{ fontSize: 64 }}>{category?.icon ?? '⭐'}</Text>
          </View>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.largeGradient}
          />
        </LinearGradient>
      )}

      <View style={[styles.largeBorder, { borderColor: rarity.color + 'AA' }]} />

      {/* Top row */}
      <View style={styles.largeTopRow}>
        <View style={[styles.rarityPill, { backgroundColor: rarity.color + '33', borderColor: rarity.color }]}>
          <Text style={[styles.rarityPillText, { color: rarity.color }]}>{rarity.icon} {rarity.label.toUpperCase()}</Text>
        </View>
        {!collected && (
          <View style={styles.lockedPill}>
            <Ionicons name="lock-closed" size={12} color={COLORS.textMuted} />
            <Text style={styles.lockedPillText}>Sin conseguir</Text>
          </View>
        )}
      </View>

      {/* Card number */}
      {userCard?.card_number && (
        <View style={styles.cardNumBadge}>
          <Text style={styles.cardNumText}>#{userCard.card_number} en el mundo</Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.largeFooter}>
        <Text style={styles.largeCategoryLabel}>{category?.icon} {category?.name_es}</Text>
        <Text style={styles.largeTitleText}>{experience.title}</Text>
        <View style={styles.largeDiffRow}>
          <DifficultyStars value={experience.difficulty} color={rarity.color} label="Dificultad" />
          <DifficultyStars value={experience.cost_level} color={COLORS.gold} label="Coste" icon="💰" />
        </View>
      </View>
    </View>
  )
}

function DifficultyStars({ value, color, label, icon }) {
  return (
    <View style={styles.diffBlock}>
      <Text style={styles.diffLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <View key={i} style={[styles.diffDotLg, i <= value && { backgroundColor: color }]} />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { margin: 6 },
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: COLORS.bgCard,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  cardBg: { ...StyleSheet.absoluteFillObject },
  cardBgImg: { borderRadius: 14 },
  lockedImg: { opacity: 0.35 },
  cardGradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '60%',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  cardPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIcon: { fontSize: 40 },
  rarityBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  topRow: {
    position: 'absolute',
    top: 8, left: 8, right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rarityDot: { width: 8, height: 8, borderRadius: 4 },
  numberBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  numberText: { color: COLORS.gold, fontSize: 10, fontWeight: '700' },
  cardFooter: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: 10,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    marginBottom: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rarityLabel: { color: COLORS.textSecondary, fontSize: 10 },
  diffRow: { flexDirection: 'row', gap: 2 },
  diffDot: {
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // Large card
  largeCard: {
    width: '100%',
    height: 420,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.bgCard,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  largeBg: { ...StyleSheet.absoluteFillObject },
  largeBgImg: { borderRadius: 20 },
  largeGradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '55%',
  },
  largeBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  largeTopRow: {
    position: 'absolute',
    top: 16, left: 16, right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rarityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  rarityPillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  lockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  lockedPillText: { color: COLORS.textMuted, fontSize: 11 },
  cardNumBadge: {
    position: 'absolute',
    top: 60, right: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gold + '66',
  },
  cardNumText: { color: COLORS.gold, fontSize: 12, fontWeight: '700' },
  largeIconCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeFooter: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: 20,
  },
  largeCategoryLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 4,
  },
  largeTitleText: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
  },
  largeDiffRow: { flexDirection: 'row', gap: 20 },
  diffBlock: { gap: 4 },
  diffLabel: { color: COLORS.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  diffDotLg: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
})
