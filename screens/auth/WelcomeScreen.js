import React from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, SafeAreaView, Dimensions, Image,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS } from '../../config/constants'

const { width, height } = Dimensions.get('window')

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Background gradient */}
      <LinearGradient
        colors={['#12003A', '#0A0A14', '#12003A']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating card previews */}
      <View style={styles.cardPreviewArea}>
        <View style={[styles.floatCard, styles.floatCard1]}>
          <LinearGradient colors={['#7E22CE', '#581C87']} style={styles.floatCardInner}>
            <Text style={styles.floatIcon}>🧗</Text>
          </LinearGradient>
        </View>
        <View style={[styles.floatCard, styles.floatCard2]}>
          <LinearGradient colors={['#D97706', '#92400E']} style={styles.floatCardInner}>
            <Text style={styles.floatIcon}>⭐</Text>
          </LinearGradient>
        </View>
        <View style={[styles.floatCard, styles.floatCard3]}>
          <LinearGradient colors={['#1D4ED8', '#1E3A8A']} style={styles.floatCardInner}>
            <Text style={styles.floatIcon}>😱</Text>
          </LinearGradient>
        </View>
        <View style={[styles.floatCard, styles.floatCard4]}>
          <LinearGradient colors={['#15803D', '#14532D']} style={styles.floatCardInner}>
            <Text style={styles.floatIcon}>🏃</Text>
          </LinearGradient>
        </View>
      </View>

      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>✦</Text>
          </View>
        </View>

        {/* Main content */}
        <View style={styles.content}>
          <Text style={styles.title}>Colecciona{'\n'}tu vida</Text>
          <Text style={styles.subtitle}>
            Convierte cada experiencia en una carta única. Sube de rango. Comparte con el mundo.
          </Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <StatItem icon="🎴" label="Cartas" value="200+" />
            <View style={styles.statDivider} />
            <StatItem icon="😱" label="Categorías" value="8" />
            <View style={styles.statDivider} />
            <StatItem icon="🏆" label="Rangos" value="7" />
          </View>
        </View>

        {/* CTA */}
        <View style={styles.cta}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>Empezar aventura →</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.secondaryBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryBtnText}>Ya tengo cuenta</Text>
          </TouchableOpacity>
        </View>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  safe: { flex: 1 },

  cardPreviewArea: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: height * 0.55,
  },
  floatCard: {
    position: 'absolute',
    width: 100,
    height: 145,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  floatCard1: { top: 80, left: width * 0.08, transform: [{ rotate: '-12deg' }] },
  floatCard2: { top: 60, left: width * 0.35, transform: [{ rotate: '5deg' }] },
  floatCard3: { top: 100, right: width * 0.08, transform: [{ rotate: '-8deg' }] },
  floatCard4: { top: 220, left: width * 0.2, transform: [{ rotate: '10deg' }] },
  floatCardInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  floatIcon: { fontSize: 40 },

  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    alignItems: 'center',
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: { fontSize: 20, color: '#FFF' },

  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: 52,
    fontWeight: '900',
    color: COLORS.textPrimary,
    lineHeight: 58,
    marginBottom: 16,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.1)' },

  cta: { paddingHorizontal: 24, paddingBottom: 32, gap: 12 },
  primaryBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
})
