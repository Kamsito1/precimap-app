import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

// ─── APP VERSION (single source of truth) ─────────────────────────────────────
export const APP_VERSION = '1.3.0';

// ─── CONFIG ───────────────────────────────────────────────────────────────────
// API URL — hardcoded para producción (Railway)
// En desarrollo local usa la IP del Mac
const DEV_API = 'http://192.168.18.139:3000';
const PROD_API = 'https://web-production-a8023.up.railway.app';

export const API_BASE = (() => {
  // Si hay variable de entorno, úsala
  if (process.env.EXPO_PUBLIC_API_BASE) return process.env.EXPO_PUBLIC_API_BASE;
  if (process.env.API_BASE) return process.env.API_BASE;
  // En web usa Railway siempre
  if (typeof window !== 'undefined' && typeof document !== 'undefined') return PROD_API;
  // En nativo: si __DEV__ es true = metro local, si no = producción (TestFlight/AppStore)
  if (typeof __DEV__ !== 'undefined' && !__DEV__) return PROD_API;
  return DEV_API;
})();

// ─── COLORS — Static light theme (used in StyleSheet.create) ─────────────────
// For dark mode support in individual components, use useThemeColors() hook
export const COLORS = {
  primary:      '#2563EB', primaryLight: '#EFF6FF', primaryDark:  '#1D4ED8',
  purple:       '#7C3AED', purpleLight:  '#F5F3FF',
  success:      '#16A34A', successLight: '#F0FDF4',
  warning:      '#D97706', warningLight: '#FFFBEB',
  danger:       '#DC2626', dangerLight:  '#FEF2F2',
  bg:           '#F8FAFC', bg2:          '#FFFFFF', bg3:          '#F1F5F9',
  border:       '#E2E8F0',
  text:         '#0F172A', text2:        '#475569', text3:        '#94A3B8',
  gasGreen:     '#16A34A', gasOrange:    '#D97706', gasRed:       '#DC2626',
};

// Dark theme overrides
const DARK_OVERRIDES = {
  bg: '#0F172A', bg2: '#1E293B', bg3: '#334155', border: '#334155',
  text: '#F1F5F9', text2: '#CBD5E1', text3: '#64748B',
  primaryLight: '#1E3A5F', purpleLight: '#2D1B69',
  successLight: '#14532D', warningLight: '#451A03', dangerLight: '#450A0A',
};

// Hook for components that need dynamic dark/light colors
export function useThemeColors() {
  const scheme = useColorScheme();
  if (scheme === 'dark') return { ...COLORS, ...DARK_OVERRIDES };
  return COLORS;
}

export const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
export const MONTHS_SHORT = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const Auth = {
  _token: null,
  _user:  null,

  async init() {
    try {
      const token = await AsyncStorage.getItem('precimap_token');
      const user  = await AsyncStorage.getItem('precimap_user');
      if (token) {
        this._token = token;
        try { this._user = user ? JSON.parse(user) : null; }
        catch { this._user = null; }
      }
    } catch(_) {}
  },

  async save(token, user) {
    this._token = token;
    this._user  = user;
    await AsyncStorage.setItem('precimap_token', token);
    await AsyncStorage.setItem('precimap_user', JSON.stringify(user));
  },

  async clear() {
    this._token = null;
    this._user  = null;
    await AsyncStorage.removeItem('precimap_token');
    await AsyncStorage.removeItem('precimap_user');
  },

  headers() {
    const h = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (this._token) h['Authorization'] = `Bearer ${this._token}`;
    return h;
  },

  get isLoggedIn() { return !!this._token; },
  get user()       { return this._user; },
};

// ─── API HELPERS ──────────────────────────────────────────────────────────────
export async function apiGet(path) {
  try {
    const r = await fetch(API_BASE + path, { headers: Auth.headers() });
    if (!r.ok) { const e = await r.json().catch(()=>({})); throw new Error(e.error||`HTTP ${r.status}`); }
    return r.json();
  } catch(e) {
    // Re-throw so callers using allSettled see the rejection
    throw e;
  }
}

export async function apiPost(path, body) {
  const r = await fetch(API_BASE + path, {
    method: 'POST', headers: Auth.headers(), body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok && !data.ok) { throw new Error(data.error || `HTTP ${r.status}`); }
  return data;
}

export async function apiPatch(path, body) {
  const r = await fetch(API_BASE + path, {
    method: 'PATCH', headers: Auth.headers(), body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok && !data.ok) { throw new Error(data.error || `HTTP ${r.status}`); }
  return data;
}

export async function apiDelete(path) {
  const r = await fetch(API_BASE + path, { method: 'DELETE', headers: Auth.headers() });
  const data = await r.json().catch(() => ({}));
  if (!r.ok && !data.ok) { throw new Error(data.error || `HTTP ${r.status}`); }
  return data;
}

export async function apiUpload(path, fields, fileUri, fieldName = 'image') {
  const h = Auth.headers();
  delete h['Content-Type'];
  if (!fileUri) return apiPost(path, fields);
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => { if (v != null) form.append(k, String(v)); });
  const ext = (fileUri.split('.').pop() || 'jpg').toLowerCase();
  const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
  form.append(fieldName, { uri: fileUri, type: mime, name: `upload.${ext}` });
  const r = await fetch(API_BASE + path, { method: 'POST', headers: h, body: form });
  return r.json();
}

// ─── FORMATTERS ───────────────────────────────────────────────────────────────
export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr), now = Date.now(), diff = now - d;
  if (diff < 30000)    return 'ahora mismo';
  if (diff < 60000)    return `hace ${Math.floor(diff/1000)}s`;
  if (diff < 3600000)  return `hace ${Math.floor(diff/60000)}min`;
  if (diff < 7200000)  return `hace 1h`;
  if (diff < 86400000) return `hace ${Math.floor(diff/3600000)}h`;
  if (diff < 172800000)return `ayer`;
  if (diff < 604800000)return `hace ${Math.floor(diff/86400000)} días`;
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

export function formatPrice(price) {
  if (price == null || isNaN(price)) return '—';
  return `${Number(price).toFixed(2)}€`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()].slice(0,3)} ${d.getFullYear()}`;
}

export function gasPriceColor(price, avg = 1.65) {
  if (!price || isNaN(price) || price <= 0) return { bg: '#6B7280', text: '#fff', label: 'Sin datos' };
  if (price < avg * 0.97) return { bg: '#16A34A', text: '#fff', label: 'Barato' };
  if (price < avg * 1.03) return { bg: '#D97706', text: '#fff', label: 'Normal' };
  return { bg: '#DC2626', text: '#fff', label: 'Caro' };
}

export function detectStore(url) {
  if (!url) return null;
  const u = url.toLowerCase();
  if (u.includes('amazon')) return 'Amazon';
  if (u.includes('pccomponentes')) return 'PcComponentes';
  if (u.includes('mediamarkt')) return 'MediaMarkt';
  if (u.includes('elcorteingles') || u.includes('el-corte-ingles')) return 'El Corte Inglés';
  if (u.includes('fnac')) return 'Fnac';
  if (u.includes('carrefour')) return 'Carrefour';
  if (u.includes('mercadona')) return 'Mercadona';
  if (u.includes('zara')) return 'Zara';
  if (u.includes('booking')) return 'Booking';
  if (u.includes('aliexpress')) return 'AliExpress';
  return null;
}

// Web-safe URL opener — usa expo-web-browser en iOS para mejor compatibilidad con Amazon
export async function openURL(url) {
  if (!url) return;
  const TAG = 'juanantonioex-21';
  try {
    const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';
    if (isWeb) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    const { Linking } = require('react-native');
    // Amazon: usar Universal Link con tag — iOS abre app nativa si está instalada
    const isAmazon = /amazon\.(es|com|co\.uk|de|fr|it)|amzn\.to|amzn\.eu/i.test(url);
    if (isAmazon) {
      const asinMatch = url.match(/\/(?:dp|gp\/product|ASIN)\/([A-Z0-9]{10})/i);
      const asin = asinMatch ? asinMatch[1] : null;
      const targetUrl = asin
        ? `https://www.amazon.es/dp/${asin}?tag=${TAG}`
        : url;
      await Linking.openURL(targetUrl);
      return;
    }
    // Resto de URLs
    await Linking.openURL(url).catch(() => {});
  } catch(_) {}
}

export function applyAffiliateTag(url, tag = 'juanantonioex-21') {
  if (!url) return url;
  try {
    if (url.includes('amazon.es') || url.includes('amazon.com') || url.includes('amzn.to')) {
      const u = new URL(url.startsWith('http') ? url : 'https://' + url);
      u.searchParams.set('tag', tag);
      return u.toString();
    }
  } catch(_) {}
  return url;
}

// ─── MAP HELPERS (used by MapScreen) ─────────────────────────────────────────
export function distanceKm(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return 999;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export function stationMinPrice(prices = {}) {
  if (!prices) return null;
  const vals = [prices.g95, prices.diesel, prices.g98].filter(v => v && !isNaN(v) && v > 0);
  return vals.length ? Math.min(...vals) : null;
}

export const FUEL_LABELS = {
  g95: 'Gasolina 95', g98: 'Gasolina 98', diesel: 'Diésel A',
  diesel_plus: 'Diésel+', glp: 'GLP/Autogas', gnc: 'Gas Natural', all: 'Todos',
};

export const CATEGORY_INFO = {
  gasolinera:   { emoji: '⛽', bg: '#FEF3C7', text: '#92400E',  color: '#F59E0B', label: 'Gasolinera' },
  supermercado: { emoji: '🛒', bg: '#ECFDF5', text: '#065F46',  color: '#16A34A', label: 'Supermercado' },
  gimnasio:     { emoji: '💪', bg: '#EDE9FE', text: '#4C1D95',  color: '#7C3AED', label: 'Gimnasio' },
  bar:          { emoji: '🍺', bg: '#FEF3C7', text: '#92400E',  color: '#D97706', label: 'Bar' },
  cafe:         { emoji: '☕', bg: '#FFF7ED', text: '#9A3412',  color: '#EA580C', label: 'Café' },
  farmacia:     { emoji: '💊', bg: '#EFF6FF', text: '#1E40AF',  color: '#2563EB', label: 'Farmacia' },
  restaurante:  { emoji: '🍽️', bg: '#FFF1F2', text: '#9F1239',  color: '#E11D48', label: 'Bar / Restaurante' },
  // Subtipos de restaurante — se usan cuando hay activeCatKey específico
  restaurante_cafe:     { emoji: '☕', bg: '#FFF7ED', text: '#9A3412', color: '#EA580C', label: 'Café' },
  restaurante_cerveza:  { emoji: '🍺', bg: '#FFFBEB', text: '#92400E', color: '#D97706', label: 'Bar' },
  restaurante_menu:     { emoji: '🍽️', bg: '#FFF1F2', text: '#9F1239', color: '#E11D48', label: 'Restaurante' },
  panaderia:    { emoji: '🥖', bg: '#FFFBEB', text: '#92400E',  color: '#B45309', label: 'Panadería' },
  default:      { emoji: '📍', bg: '#F8FAFC', text: '#475569',  color: '#64748B', label: 'Lugar' },
};
