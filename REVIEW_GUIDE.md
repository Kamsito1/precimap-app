# MapaTacaño — Guía de App Store Review

## Checklist antes de enviar a Review

### ✅ Ya completado
- [x] PrivacyInfo.xcprivacy con 4 categorías de API
- [x] NSLocationWhenInUseUsageDescription en español
- [x] NSCameraUsageDescription en español
- [x] NSPhotoLibraryUsageDescription en español
- [x] NSUserTrackingUsageDescription en español
- [x] Sign in with Apple (requerido si ofreces Google Sign-In)
- [x] CFBundleDisplayName = MapaTacaño
- [x] GADApplicationIdentifier configurado
- [x] SKAdNetworkItems configurado
- [x] URL de privacidad accesible
- [x] URL de términos accesible
- [x] Build 89 subida a TestFlight

### 📋 Pendiente en App Store Connect
- [ ] Screenshots 6.7" (iPhone 15 Pro Max) — mínimo 3, recomendado 5
- [ ] Screenshots 5.5" (iPhone 8 Plus) — mínimo 3
- [ ] Descripción (copiar de APP_STORE_METADATA.md)
- [ ] Keywords (copiar de APP_STORE_METADATA.md)
- [ ] Categoría: Finanzas
- [ ] Clasificación: 4+
- [ ] URL de privacidad: https://web-production-a8023.up.railway.app/privacy
- [ ] URL de soporte: mailto:sitoexpositorodriguez@gmail.com
- [ ] What's New (copiar de APP_STORE_METADATA.md)

### ⚠️ Posibles motivos de rechazo y cómo evitarlos

1. **Guideline 4.0 - Design**: La app debe ser funcional y útil
   - ✅ La app tiene 12.225 gasolineras reales + chollos + eventos
   - ✅ Todas las pantallas tienen contenido real

2. **Guideline 5.1.1 - Data Collection**: Debes informar de qué datos recoges
   - ✅ PrivacyInfo.xcprivacy configurado
   - ✅ Política de privacidad accesible en /privacy
   - ⚠️ En App Store Connect → App Privacy: declarar Email, Nombre, Ubicación

3. **Guideline 4.2 - Minimum Functionality**: No puede ser solo una web view
   - ✅ Es una app nativa con React Native, no web view
   - ✅ Tiene mapa, chollos, eventos, ranking — múltiples funcionalidades

4. **Guideline 2.1 - Performance**: No puede crashear
   - ✅ Build 89 compila sin errores
   - ✅ Manejo de errores en todas las llamadas API
   - ⚠️ Testear offline y con datos vacíos

5. **Guideline 3.1.1 - In-App Purchase**: Si vendes algo, debe ser IAP
   - ✅ No vendemos nada (la app es gratuita con ads)
   - ✅ Los ads son de AdMob + banners propios de referidos

6. **Guideline 4.0 - Sign in with Apple**: Requerido si ofreces login social
   - ✅ Sign in with Apple implementado junto con Google Sign-In

### 📸 Screenshots recomendados (orden)

1. **Mapa** — Gasolineras con precios verdes/rojos cerca de Córdoba
2. **Chollos** — Lista de ofertas con descuentos y fueguitos
3. **Ahorro** — Ranking de supermercados con precios
4. **Eventos** — Eventos culturales con filtros
5. **Perfil** — Ranking comunitario y badges

### 📝 Notas para el revisor de Apple

Texto sugerido para "Notes for Reviewer":

```
MapaTacaño es una app de ahorro para España.

Funcionalidades principales:
- Mapa con 12.000+ gasolineras y precios en tiempo real (datos del Ministerio de Energía)
- Chollos publicados por la comunidad con votos y verificación
- Ranking de supermercados por precio (datos OCU)
- Eventos culturales gratuitos por ciudad

Para probar la app:
- La app funciona sin login para ver precios de gasolina y chollos
- Para publicar chollos/votar, se necesita crear una cuenta
- La ubicación se usa para mostrar gasolineras cercanas

Cuenta de test: No necesaria (la app es gratuita y funcional sin login)
```

### 🔑 Credenciales

- Apple ID: sitoexpositorodriguez@gmail.com
- Team ID: 6G97KZY6FD
- Bundle ID: com.kamsito.precimap
- ASC App ID: 6761061197
- EAS Project: eebf715f-1226-4c39-a0c3-53dbb363bd13

## App Store Connect — Declaración de Privacidad

En App Store Connect → App Privacy, debes declarar:

### Datos recogidos:

| Tipo de dato | Uso | Linked to User |
|---|---|---|
| Email Address | App Functionality, Account | Yes |
| Name | App Functionality | Yes |
| Coarse Location | App Functionality | No |
| User ID | App Functionality | Yes |
| Product Interaction | Analytics | No |
| Advertising Data | Third-Party Advertising (AdMob) | No |

### Datos NO recogidos:
- Precise Location (solo usamos "When In Use", no Background)
- Health & Fitness
- Financial Info (no procesamos pagos)
- Sensitive Info
- Contacts
- Browsing History
- Search History
- Purchases

### Tracking:
- NSPrivacyTracking = false
- No hacemos tracking cross-app
- AdMob puede usar IDFA solo si el usuario acepta ATT
