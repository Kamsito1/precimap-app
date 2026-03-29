# 💰 MapaTacaño

> Tu compañero de ahorro en España. Compara precios de gasolina, encuentra chollos, descubre eventos gratuitos y ahorra +100€/mes.

## 📱 Disponible en iOS

[Descargar en App Store](https://apps.apple.com/app/mapatacano/id6761061197) · [TestFlight Beta](https://testflight.apple.com/join/XXXXX)

## ✨ Features

- **🗺️ Mapa de precios** — 12.000+ gasolineras con precios en tiempo real del Ministerio de Energía
- **🔥 Chollos** — Ofertas de la comunidad con códigos descuento, votos y sistema de temperatura
- **🛒 Ahorro en supermercados** — Ranking por CCAA con datos OCU
- **🎭 Eventos gratuitos** — Culturales, deportivos y musicales por ciudad
- **🏆 Gamificación** — Puntos, insignias y ranking comunitario
- **🏪 Servicios** — Farmacias, peluquerías, veterinarios con indicadores de precio

## 🛠️ Tech Stack

- **Frontend:** React Native + Expo SDK 54
- **Backend:** Node.js + Express (Railway)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Google Sign-In + Sign in with Apple
- **Ads:** Google AdMob + banners propios de referidos

## 📁 Project Structure

```
screens/
  MapScreen.js        — Mapa de gasolineras y servicios
  DealsScreen.js      — Chollos y ofertas
  AhorroScreen.js     — Supermercados + apps de ahorro
  EventsScreen.js     — Eventos gratuitos
  ProfileScreen.js    — Perfil + ajustes
  RankingScreen.js    — Ranking comunitario

components/
  AddDealModal.js     — Crear chollo (4 pasos)
  AddGasStationModal.js — Añadir lugar (3 pasos)
  AuthModal.js        — Login (Google + Apple)
  CommentsModal.js    — Comentarios de chollos
  OnboardingSlider.js — Onboarding (4 slides)
  AdBanner.js         — Banners de referidos

utils/index.js        — API helpers, auth, constants
```

## 🚀 Development

```bash
npm install
npx expo start
```

## 📦 Build & Deploy

```bash
./deploy.sh 90  # Builds, exports IPA, submits to TestFlight
```

## 📄 License

© 2026 MapaTacaño. All rights reserved.
