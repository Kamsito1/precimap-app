export const COLORS = {
  bg: '#0A0A14',
  bgCard: '#12121E',
  bgSurface: '#1A1A2E',
  bgInput: '#1E1E30',
  border: '#2A2A40',

  primary: '#7B2FBE',
  primaryLight: '#9B4FDE',
  primaryDark: '#5B1F9E',

  gold: '#F0A500',

  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B0',
  textMuted: '#606070',

  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
}

export const RARITY = {
  common: {
    key: 'common',
    label: 'Común',
    color: '#9CA3AF',
    gradient: ['#374151', '#1F2937'],
    points: 10,
    icon: '⚪',
  },
  uncommon: {
    key: 'uncommon',
    label: 'Poco Común',
    color: '#22C55E',
    gradient: ['#15803D', '#14532D'],
    points: 25,
    icon: '🟢',
  },
  rare: {
    key: 'rare',
    label: 'Rara',
    color: '#3B82F6',
    gradient: ['#1D4ED8', '#1E3A8A'],
    points: 50,
    icon: '🔵',
  },
  epic: {
    key: 'epic',
    label: 'Épica',
    color: '#A855F7',
    gradient: ['#7E22CE', '#581C87'],
    points: 100,
    icon: '🟣',
  },
  legendary: {
    key: 'legendary',
    label: 'Legendaria',
    color: '#F59E0B',
    gradient: ['#D97706', '#92400E'],
    points: 200,
    icon: '⭐',
  },
}

export const RANKS = [
  {
    key: 'explorer',
    label: 'Explorador',
    minPoints: 0,
    maxPoints: 100,
    color: '#9CA3AF',
    gradient: ['#374151', '#1F2937'],
    icon: '🗺️',
  },
  {
    key: 'adventurer',
    label: 'Aventurero',
    minPoints: 101,
    maxPoints: 300,
    color: '#22C55E',
    gradient: ['#15803D', '#14532D'],
    icon: '🎒',
  },
  {
    key: 'daring',
    label: 'Osado',
    minPoints: 301,
    maxPoints: 600,
    color: '#3B82F6',
    gradient: ['#1D4ED8', '#1E3A8A'],
    icon: '⚡',
  },
  {
    key: 'fearless',
    label: 'Intrépido',
    minPoints: 601,
    maxPoints: 1000,
    color: '#A855F7',
    gradient: ['#7E22CE', '#581C87'],
    icon: '🔥',
  },
  {
    key: 'legend',
    label: 'Leyenda',
    minPoints: 1001,
    maxPoints: 2000,
    color: '#F59E0B',
    gradient: ['#D97706', '#92400E'],
    icon: '👑',
  },
  {
    key: 'icon',
    label: 'Ícono',
    minPoints: 2001,
    maxPoints: 5000,
    color: '#EC4899',
    gradient: ['#BE185D', '#831843'],
    icon: '💎',
  },
  {
    key: 'mythic',
    label: 'Mítico',
    minPoints: 5001,
    maxPoints: Infinity,
    color: '#06B6D4',
    gradient: ['#0E7490', '#164E63'],
    icon: '🌟',
  },
]

export const CATEGORIES = [
  { key: 'fear', label: 'Miedo', icon: '😱', color: '#DC2626' },
  { key: 'adventure', label: 'Aventura', icon: '🧗', color: '#D97706' },
  { key: 'culture', label: 'Cultura', icon: '🎭', color: '#7C3AED' },
  { key: 'gastronomy', label: 'Gastronomía', icon: '🍽️', color: '#059669' },
  { key: 'sport', label: 'Deporte', icon: '🏃', color: '#2563EB' },
  { key: 'social', label: 'Social', icon: '🎤', color: '#DB2777' },
  { key: 'nature', label: 'Naturaleza', icon: '🌿', color: '#16A34A' },
  { key: 'travel', label: 'Viajes', icon: '✈️', color: '#0891B2' },
]

export const COUNTRIES = {
  ES: { name: 'España', flag: '🇪🇸', active: true },
}

export const ACTIVE_COUNTRY = 'ES'

export const APP_VERSION = '1.0.0'

export function getRankForPoints(points) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (points >= RANKS[i].minPoints) return RANKS[i]
  }
  return RANKS[0]
}

export function getPointsForRarity(rarity, cardNumber = null) {
  const base = RARITY[rarity]?.points ?? 10
  if (cardNumber === 1) return base + 100
  if (cardNumber <= 10) return base + 50
  return base
}
