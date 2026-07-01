import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, RANKS, getRankForPoints } from '../config/constants'

export function RankBadge({ points = 0, size = 'medium', showLabel = true }) {
  const rank = getRankForPoints(points)
  const sizes = {
    small: { icon: 16, label: 10, pad: 6 },
    medium: { icon: 22, label: 12, pad: 8 },
    large: { icon: 32, label: 15, pad: 12 },
  }
  const s = sizes[size] ?? sizes.medium

  return (
    <LinearGradient
      colors={rank.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.badge, { padding: s.pad, borderRadius: s.pad + 4 }]}
    >
      <Text style={{ fontSize: s.icon }}>{rank.icon}</Text>
      {showLabel && (
        <Text style={[styles.label, { fontSize: s.label, color: rank.color }]}>
          {rank.label.toUpperCase()}
        </Text>
      )}
    </LinearGradient>
  )
}

export function RankProgressBar({ points = 0 }) {
  const rank = getRankForPoints(points)
  const rankIndex = RANKS.findIndex(r => r.key === rank.key)
  const nextRank = RANKS[rankIndex + 1]

  if (!nextRank) {
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>MÍTICO MAX</Text>
          <Text style={styles.progressPoints}>{points.toLocaleString()} pts</Text>
        </View>
        <View style={styles.progressBg}>
          <LinearGradient
            colors={rank.gradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: '100%' }]}
          />
        </View>
      </View>
    )
  }

  const range = nextRank.minPoints - rank.minPoints
  const progress = points - rank.minPoints
  const pct = Math.min(1, progress / range)
  const remaining = nextRank.minPoints - points

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>Próximo: {nextRank.icon} {nextRank.label}</Text>
        <Text style={styles.progressPoints}>{remaining} pts para subir</Text>
      </View>
      <View style={styles.progressBg}>
        <LinearGradient
          colors={rank.gradient}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${pct * 100}%` }]}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  label: {
    fontWeight: '800',
    letterSpacing: 1,
  },
  progressContainer: { gap: 6 },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  progressPoints: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  progressBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
})
