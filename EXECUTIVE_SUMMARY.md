# MapaTacaño v2.0.0 — Resumen Ejecutivo

## Qué es
App iOS de ahorro para España. Compara precios de gasolina, encuentra chollos, descubre eventos gratuitos y ahorra +100€/mes.

## Datos clave
- **36.421 ubicaciones** en toda España
- **12.225 gasolineras** con precios en tiempo real (Ministerio de Energía)
- **18 chollos** activos con códigos de descuento
- **53 eventos** próximos en 12 ciudades
- **Build 91** en TestFlight (29 marzo 2026)

## Stack técnico
- **Frontend:** React Native + Expo SDK 54 (iOS)
- **Backend:** Node.js + Express v4.0.0 (Railway)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Google Sign-In + Sign in with Apple
- **Ads:** Google AdMob + banners propios de referidos

## Monetización
- AdMob banners (no intrusivos)
- Referidos: Trade Republic, MyInvestor, Revolut, iGraal, Attapoll, WeWard
- Afiliado Amazon: juanantonioex-21

## URLs
- **Server:** https://web-production-a8023.up.railway.app
- **Privacy:** https://web-production-a8023.up.railway.app/privacy
- **Terms:** https://web-production-a8023.up.railway.app/terms
- **TestFlight:** https://appstoreconnect.apple.com/apps/6761061197/testflight/ios
- **GitHub App:** https://github.com/Kamsito1/precimap-app
- **GitHub Server:** https://github.com/Kamsito1/precimap-server

## Comandos útiles

```bash
# Hacer nueva build y subir a TestFlight
cd ~/precimap-app && ./deploy.sh 92

# Correr API tests
bash ~/precimap/test_api.sh

# Ver estado del servidor
curl https://web-production-a8023.up.railway.app/api/health

# Seedear datos (desde directorio del servidor)
cd ~/precimap && node seed_script.js
```

## Archivos importantes
- `APP_STORE_METADATA.md` — Texto para App Store Connect
- `REVIEW_GUIDE.md` — Guía de Apple Review + privacidad
- `TESTING_CHECKLIST.md` — Checklist de testing para TestFlight
- `deploy.sh` — Script de build y deploy automatizado
- `test_api.sh` — 15 tests de la API (en ~/precimap/)

## Credenciales
- Apple ID: sitoexpositorodriguez@gmail.com
- Team ID: 6G97KZY6FD
- Bundle ID: com.kamsito.precimap
- ASC App ID: 6761061197
- EAS Project: eebf715f-1226-4c39-a0c3-53dbb363bd13
- Supabase: hhmorsfzxuunzbndjdyt
- Railway: web-production-a8023

## Roadmap v2.1
- [ ] CarPlay (necesita entitlement com.apple.developer.carplay-fuel)
- [ ] Push notifications (Expo Push)
- [ ] OTA updates (expo-updates)
- [ ] Scraper automático de eventos
- [ ] Más datos de Google Places
- [ ] Android version
