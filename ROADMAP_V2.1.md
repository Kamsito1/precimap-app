# MapaTacaño — Roadmap v2.1

## 🔴 Prioridad Alta (hacer antes del lanzamiento público)

### 1. Screenshots para App Store
- Capturar 5 screenshots en iPhone 15 Pro Max (6.7")
- Capturar 3 screenshots en iPhone 8 Plus (5.5")
- Screenshots sugeridos: Mapa, Chollos, Ahorro, Eventos, Perfil

### 2. Verificar ascAppId
- Confirmar que `6761061197` en eas.json corresponde a MapaTacaño/PreciMap
- Si es de SuperTracker, actualizar con el ID correcto

### 3. App Store Privacy Declaration
- Declarar datos recogidos en App Store Connect → App Privacy
- Seguir tabla en REVIEW_GUIDE.md

## 🟡 Prioridad Media (primera semana post-lanzamiento)

### 4. Push Notifications (Expo Push)
- Configurar expo-notifications
- Notificar chollos nuevos con >10 votos
- Notificar eventos en tu ciudad esta semana

### 5. Scraper automático de eventos
- Ejecutar scraper.js cada 24h en Railway (cron job)
- Scraping de ayuntamientos: Córdoba, Madrid, Sevilla, Barcelona, Valencia
- Auto-desactivar eventos pasados

### 6. OTA Updates (expo-updates)
- Configurar expo-updates en app.json
- Permite enviar actualizaciones JS sin rebuild
- Ideal para fixes rápidos y cambios de UI

### 7. Más datos de Google Places
- Ampliar peluquerías, veterinarios y bares
- Script automatizado para seedear por provincia
- Enriquecer con fotos y horarios de Google Places API

## 🟢 Prioridad Baja (primer mes)

### 8. CarPlay
- Solicitar entitlement `com.apple.developer.carplay-fuel`
- Mover CarPlaySceneDelegate.swift.disabled → ios/MapaTacano/
- Re-añadir UIApplicationSceneManifest a Info.plist
- Rebuild y submit

### 9. Android Version
- Expo soporta Android out of the box
- Configurar google-services.json para Firebase/AdMob
- Play Store listing con ASO optimizado

### 10. Premium Features (RevenueCat)
- Modo sin anuncios
- Alertas de precio personalizadas
- Historial de precios de gasolina
- Comparador avanzado de supermercados

### 11. Social Features
- Seguir a otros usuarios
- Feed de actividad de amigos
- Compartir listas de compra

## 📊 Métricas a trackear
- DAU / MAU
- Chollos creados por usuarios reales (no seedeados)
- Precios reportados por la comunidad
- Tasa de conversión de referidos
- Retención día 1, día 7, día 30
