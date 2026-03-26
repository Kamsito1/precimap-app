# PreciMap 🗺️

**La app de ahorro de España** — Compara precios de gasolineras, supermercados y bancos.

![v1.0.2](https://img.shields.io/badge/version-1.0.2-blue)
![React Native](https://img.shields.io/badge/React%20Native-0.81-blue)
![Expo](https://img.shields.io/badge/Expo-SDK%2054-black)
![Tests](https://img.shields.io/badge/tests-20%2F20-brightgreen)

## 🚀 Estado del proyecto

```
App:    v1.0.2 · 5.600+ líneas · 32 commits git
Server: v3.4.0 · 1.347+ líneas · 13 commits git
BD:     35 chollos + 25 eventos + 15 lugares + 20 usuarios
        29 precios + 615 price_history + 12.213 gasolineras
```

## Features

### ⛽ Gasolineras
- **12.213 estaciones** del Ministerio de Energía (RITE)
- **6 combustibles**: G95, G98, Diesel, Diesel+, GLP, GNC
- Stats en tiempo real: min/avg/max por combustible
- **Viewport culling**: solo renderiza lo visible en pantalla
- Favoritas con ❤️, filtro showFavsOnly, banner sin-favs
- Badge de distancia coloreado: 🟢 <500m · 🟡 <1.5km
- Contador de gasolineras visibles en el mapa
- Hint de primer uso (AsyncStorage)
- Centrar mapa al tocar un marker

### 🔥 Chollos (Chollometro)
- **35 chollos** en 10 categorías
- **Temperatura Chollometro**: decay temporal estilo HN
- Sort: 🔥 Top / 🆕 Nuevo / 👑 Mejor / 💰 Precio
- Filtro por descuento mínimo: -20% / -30% / -50%
- Badge de descuento: gris/<30% · rojo/≥30% · morado/≥50%
- Badge **NUEVO** para deals de las últimas 24h
- **TENDENCIAS HOY**: carrusel horizontal con top 3
- Banner `TENDENCIA:` en el header con el deal más caliente
- Endpoint `/api/deals/trending` (top 5 últimos 7 días)
- Búsqueda con debounce · Progressive image loading
- Keyboard dismiss on drag · SaveEuros en AddDeal
- Autor del chollo visible en la tarjeta
- Empty state inteligente según filtros

### 🎭 Eventos
- **25 eventos** reales en 9+ ciudades españolas
- Filtros: 🆓 Gratis / 💰 De pago / búsqueda / ciudad / categoría
- 10 categorías: Música, Deporte, Cultura, Festival, Expo...
- Buscador con debounce conectado al servidor (`ilike`)
- Banner de próximo evento en el header
- Badge HOY / MAÑ en EventCard

### 💰 Ahorro
**Supermercados:**
- Ranking OCU 2024 (10 supermercados)
- Tabla 20 productos con precios Mercadona/Lidl/Aldi/Carrefour
- **Price history chart**: toca un producto → gráfica 60 días
- 615 registros históricos de precios
- Banner "Ahorra hasta 45€/mes" con fuente OCU

**Bancos:**
- 9 ofertas bancarias con TAE actual
- Calculadora de ahorro TAE integrada
- Filtro por categoría (cuentas/depósitos/inversión/tarjetas)

**Tip bar AhorroScreen**: 5 consejos de ahorro rotativos

### 🏆 Ranking
- **20 usuarios** con puntos y niveles reales
- Tab 🏆 Ranking + 🌍 Comunidad con stats globales
- Podio animado (top 3 con escala)
- Panel de precios G95 en tiempo real en Comunidad

### 👤 Perfil
- **5 niveles**: Novato → Ahorrador → Experto → Gurú → Leyenda 👑
- Sección **📊 RESUMEN**: precios/chollos/verificados/racha
- Posición en ranking: 🏆 Puesto #8 de 20 usuarios
- Fecha de registro: "Miembro desde marzo 2025"
- Avatar con color del nivel · Tabs Info/Mis chollos
- Editar nombre y bio

### 🔐 Auth y UX
- Registro con **indicador de fortaleza de contraseña**
- Dark mode automático (sistema)
- Política de Privacidad RGPD + Términos de Uso
- Icono 78KB + Splash 114KB con texto PreciMap
- Splash dinámico: "⛽ G95 desde X.XXX€/L · 🔥 35 chollos"

## Tech Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React Native 0.81 + Expo SDK 54 |
| Navigation | React Navigation (Bottom Tabs) |
| Maps | react-native-maps |
| State | useState/useContext |
| Storage | AsyncStorage (favoritas, onboarding) |
| Backend | Node.js/Express v3.4.0 |
| Base de datos | Supabase (PostgreSQL) |
| Auth | JWT (30 días) + bcrypt |

## Setup local

```bash
# 1. Clonar y configurar
cd precimap-app && npm install

# 2. Configurar API
# utils/index.js:
export const API_BASE = 'http://192.168.X.X:3000';  # tu IP local

# 3. Arrancar servidor
cd ~/precimap && node server.js

# 4. Arrancar Expo
cd ~/precimap-app && npx expo start --port 8085 --clear
```

## Build para TestFlight

```bash
# Login en EAS
npx eas login

# Build iOS preview (TestFlight)
npx eas build --platform ios --profile preview
```

## Variables de entorno del servidor (.env)

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_xxx
JWT_SECRET=tu_jwt_secret_muy_largo
AMAZON_AFFILIATE_TAG=juanantonioex-21
```

## API Endpoints

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/health` | Estado del servidor y número de gasolineras |
| `GET /api/gasolineras` | 12.213 estaciones (filtro lat/lng/radio/combustible) |
| `GET /api/gasolineras/stats` | Min/avg/max por los 6 combustibles |
| `GET /api/deals` | Chollos con temperatura Chollometro |
| `GET /api/deals/trending` | Top 5 más calientes (últimos 7 días) |
| `GET /api/events` | Eventos con filtros |
| `GET /api/events/trending` | Top 5 más votados próximos |
| `GET /api/tips` | 8 consejos de ahorro (filtro `?category=gasolina`) |
| `GET /api/search?q=X` | Búsqueda global: deals + events + places |
| `GET /api/leaderboard` | Ranking de usuarios (period: week/month/all) |
| `GET /api/stats` | Estadísticas globales + gas_stats G95 en tiempo real |
| `GET /api/places` | Lugares del mapa con precios |
| `GET /api/banks` | 9 ofertas bancarias con TAE |
| `GET /api/supermarkets/ranking` | Ranking OCU 2024 + productos |
| `POST /api/auth/register` | Registro de usuario |
| `POST /api/auth/login` | Login + JWT (30 días) |

## Despliegue en Railway

```bash
# 1. Crear repo GitHub
cd ~/precimap
git remote add origin https://github.com/kamsito/precimap-server.git
git push -u origin main

# 2. Railway: New Project → Deploy from GitHub
# 3. Añadir variables de .env en Settings → Variables
# 4. Actualizar API_BASE en la app → npx eas build
```

---

Hecho con ❤️ en España · MIT License
