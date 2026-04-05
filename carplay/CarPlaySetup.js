/**
 * CarPlay integration for Mapa Tacaño
 * Registers templates that appear on the car screen
 * Super simple: big buttons → auto-find nearest cheapest
 */
import { Linking, Platform } from 'react-native';
import { apiGet, distanceKm } from '../utils';

let CarPlay, GridTemplate, ListTemplate, InformationTemplate;
try {
  const cp = require('react-native-carplay');
  CarPlay = cp.CarPlay;
  GridTemplate = cp.GridTemplate;
  ListTemplate = cp.ListTemplate;
  InformationTemplate = cp.InformationTemplate;
} catch(_) {
  // Not available in Expo Go
}

let userLat = null, userLng = null;

async function refreshLocation() {
  try {
    const Location = require('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (loc?.coords) { userLat = loc.coords.latitude; userLng = loc.coords.longitude; }
    }
  } catch(_) {}
}

function navigateTo(lat, lng, name) {
  if (!lat || !lng) return;
  const url = `maps://maps.apple.com/?daddr=${lat},${lng}&q=${encodeURIComponent(name || '')}`;
  Linking.openURL(url).catch(() => {});
}

// Search nearest cheapest gas station
async function findCheapestGas(fuelKey) {
  if (!userLat) await refreshLocation();
  if (!userLat) return null;
  try {
    const data = await apiGet(`/api/gasolineras?lat=${userLat}&lng=${userLng}&radius=15`) || [];
    const filtered = data.filter(s => s.prices?.[fuelKey] > 0);
    const sorted = filtered.map(s => ({
      ...s,
      _dist: distanceKm(userLat, userLng, s.lat, s.lng),
      _price: s.prices[fuelKey],
    })).sort((a, b) => a._price - b._price);
    return sorted.slice(0, 5);
  } catch(_) { return []; }
}

// Search nearest place by category
async function findNearestPlace(category) {
  if (!userLat) await refreshLocation();
  if (!userLat) return null;
  try {
    return await apiGet(`/api/places?cat=${category}&lat=${userLat}&lng=${userLng}&radius=10&sort=price_proximity&limit=5`) || [];
  } catch(_) { return []; }
}

// Show fuel type selection
function showFuelPicker() {
  const fuels = [
    { key: 'g95', title: 'Gasolina 95' },
    { key: 'diesel', title: 'Diésel A' },
    { key: 'g98', title: 'Gasolina 98' },
    { key: 'glp', title: 'GLP / Autogas' },
  ];

  const listTemplate = new ListTemplate({
    title: 'Elige carburante',
    sections: [{
      header: 'Tipo de combustible',
      items: fuels.map(f => ({
        text: f.title,
        onPress: async () => {
          showLoading('Buscando...');
          const results = await findCheapestGas(f.key);
          showResults(results, f.title);
        },
      })),
    }],
    backButtonHidden: false,
  });

  CarPlay.pushTemplate(listTemplate);
}

// Show loading screen
function showLoading(text) {
  const info = new InformationTemplate({
    title: text || 'Buscando...',
    items: [{ title: 'Conectando con Mapa Tacaño', detail: 'Un momento...' }],
    actions: [],
  });
  CarPlay.pushTemplate(info);
}

// Show results list
function showResults(results, label) {
  CarPlay.popTemplate();
  if (!results || results.length === 0) {
    const empty = new InformationTemplate({
      title: 'Sin resultados',
      items: [{ title: 'No encontramos nada cerca', detail: 'Intenta con otro tipo' }],
      actions: [{ title: 'Volver', onPress: () => CarPlay.popToRootTemplate() }],
    });
    CarPlay.pushTemplate(empty);
    return;
  }

  const listTemplate = new ListTemplate({
    title: `${label} más barato`,
    sections: [{
      header: 'Resultados cerca de ti',
      items: results.slice(0, 5).map(r => {
        const name = r.name && r.name === r.name.toUpperCase()
          ? r.name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : r.name || 'Sin nombre';
        const dist = r._dist ? (r._dist < 1 ? `${Math.round(r._dist * 1000)}m` : `${r._dist.toFixed(1)}km`) : '';
        const price = r._price ? `${r._price.toFixed(3)}€/L` : (r.repPrice ? `${r.repPrice.toFixed(2)}€` : '');
        return {
          text: name,
          detailText: `${price} · ${dist}`,
          onPress: () => navigateTo(r.lat, r.lng, name),
        };
      }),
    }],
    backButtonHidden: false,
  });
  CarPlay.pushTemplate(listTemplate);
}

// Main CarPlay root template — what shows when the icon is tapped in the car
function createRootTemplate() {
  const gridTemplate = new GridTemplate({
    title: 'Mapa Tacaño',
    buttons: [
      {
        id: 'gas',
        titleVariants: ['Gasolinera'],
        onPress: () => showFuelPicker(),
      },
      {
        id: 'super',
        titleVariants: ['Supermercado'],
        onPress: async () => {
          showLoading('Buscando supermercados...');
          const results = await findNearestPlace('supermercado');
          showResults(results, 'Supermercado');
        },
      },
      {
        id: 'restaurant',
        titleVariants: ['Restaurante'],
        onPress: async () => {
          showLoading('Buscando restaurantes...');
          const results = await findNearestPlace('restaurante');
          showResults(results, 'Restaurante');
        },
      },
      {
        id: 'pharmacy',
        titleVariants: ['Farmacia'],
        onPress: async () => {
          showLoading('Buscando farmacias...');
          const results = await findNearestPlace('farmacia');
          showResults(results, 'Farmacia');
        },
      },
    ],
  });

  return gridTemplate;
}

// Initialize CarPlay — called from App.js
export function initCarPlay() {
  if (!CarPlay) return; // Not available in Expo Go
  CarPlay.registerOnConnect(() => {
    console.log('CarPlay connected');
    refreshLocation();
    const root = createRootTemplate();
    CarPlay.setRootTemplate(root);
  });

  CarPlay.registerOnDisconnect(() => {
    console.log('CarPlay disconnected');
  });
}

export default { initCarPlay };
