# PreciMap 🗺️

**La app de ahorro de España** — Compara precios de gasolineras, supermercados y bancos.

![v1.0.2](https://img.shields.io/badge/version-1.0.2-blue)
![React Native](https://img.shields.io/badge/React%20Native-0.81-blue)
![Expo](https://img.shields.io/badge/Expo-SDK%2054-black)

## Features

### ⛽ Gasolineras
- 12.213 estaciones de servicio del Ministerio de Energía
- 6 combustibles: G95, G98, Diesel, Diesel+, GLP, GNC
- Precios min/avg/max en tiempo real
- Viewport culling (carga solo lo visible en pantalla)
- Favoritas con ❤️ y filtro
- Distancia en markers del mapa
- Compartir precio nativo

### 🔥 Chollos
- Temperatura Chollometro (decay temporal estilo HN)
- 25 chollos en 10 categorías
- Sort: caliente / nuevo / mejor / precio más bajo
- Filtro por descuento mínimo (-20%/-30%/-50%)
- Búsqueda por texto con debounce
- Badges de descuento codificados por color

### 🎭 Eventos
- 20 eventos reales en 9+ ciudades españolas
- Filtros: gratis / de pago / búsqueda / ciudad / categoría
- Banner del próximo evento en el header

### 💰 Ahorro
- **Supermercados**: Ranking OCU 2024, tabla 20 productos, comparativa Mercadona/Lidl/Aldi/Carrefour
- **Bancos**: 9 ofertas bancarias, calculadora de ahorro TAE
- Tip bar con 5 consejos de ahorro rotativos

### 👤 Perfil
- Niveles: Novato → Ahorrador → Experto → Gurú → Leyenda 👑
- Avatar con color del nivel actual
- Tabs: Info / Mis chollos
- Racha de días consecutivos

## Tech Stack

- **Frontend**: React Native + Expo SDK 54
- **Navigation**: React Navigation (Bottom Tabs)
- **Maps**: react-native-maps
- **Storage**: AsyncStorage (favoritas, onboarding)
- **Backend**: Node.js/Express + Supabase (PostgreSQL)

## Setup

```bash
# Instalar dependencias
cd precimap-app
npm install

# Configurar API
# En utils/index.js:
export const API_BASE = 'http://TU-IP:3000';  # local
# o
export const API_BASE = 'https://TU-APP.railway.app';  # producción

# Iniciar metro
npx expo start --port 8085 --clear
```

## Build para TestFlight

```bash
# Login en EAS
npx eas login

# Configurar proyecto (primera vez)
npx eas build:configure

# Build iOS (preview = TestFlight)
npx eas build --platform ios --profile preview
```

## Variables de entorno del servidor

Ver `/Users/kamsito/precimap/.env.example`

## Licencia

MIT — Hecho con ❤️ en España
