# Pokédex de Experiencias — CONTEXTO PERMANENTE

## Qué es esta app
App gamificada donde los usuarios coleccionan experiencias de vida como cartas coleccionables premium (NO copiar visualmente Pokémon). El usuario Kamsito tiene 300K seguidores → CAC = €0 en lanzamiento.

## DECISIONES PERMANENTES (tener en cuenta en cada decisión)
- **Apple (iOS) PRIMERO**, luego Android
- **España solamente** al inicio; estructura de BD preparada para más países (campo country_id en todo)
- **Sin IA** para generación de cartas — solo template predefinido + foto del usuario
- **Sin experiencias de empresa sin pago** y verificación de admin
- **Diseño gamificado** pero identidad visual propia (no Pokémon)
- El usuario va a proporcionar los diseños generados con IA externamente

## Sistema de Cartas
- Template predefinido (imagen de fondo + overlay) — el usuario SOLO añade su foto
- Numeración: "Fuiste la persona #X en conseguir esta carta" (global)
- Rarities: common, uncommon, rare, epic, legendary
- Compartible a Stories/TikTok como imagen
- Las cartas se comparten como imagen compuesta (template + foto usuario)

## Puntos por Rareza
- Common: 10 pts | Uncommon: 25 pts | Rare: 50 pts | Epic: 100 pts | Legendary: 200 pts
- Bonus: +100 pts si eres el 1º | +50 pts si eres top 10

## Sistema de Rangos (estilo Valorant)
- EXPLORADOR → 0-100 pts
- AVENTURERO → 101-300 pts
- OSADO → 301-600 pts
- INTRÉPIDO → 601-1000 pts
- LEYENDA → 1001-2000 pts
- ÍCONO → 2001-5000 pts
- MÍTICO → 5001+ pts

## Stack Técnico
- React Native + Expo 54 (managed workflow)
- Supabase (PostgreSQL + Auth + Storage + Realtime)
- React Navigation (Bottom Tabs + Stack)
- Apple Maps (MapKit via react-native-maps, gratis en iOS)
- Stripe para pagos B2B
- expo-linear-gradient para efectos de rareza en cartas
- expo-sharing para compartir cartas

## Variables de Entorno Necesarias
- SUPABASE_URL → en config/supabase.js
- SUPABASE_ANON_KEY → en config/supabase.js
- STRIPE_PUBLISHABLE_KEY → cuando se integre Stripe

## Categorías de Experiencias
- Miedo (hablar en público, paracaídas, etc.)
- Aventura (senderismo, deportes extremos, etc.)
- Cultura (museos, festivales, conciertos, etc.)
- Gastronomía (restaurantes Michelin, tapas, etc.)
- Deporte (maratones, triatlones, etc.)
- Social (open mic, improv, teatro, etc.)
- Naturaleza (avistamiento fauna, senderismo, etc.)
- Viajes (capitales, pueblos con encanto, etc.)

## B2B
- Empresas DEBEN pagar (Stripe) y ser verificadas por admin
- Sin experiencias gratis de empresas
- Panel de admin para verificar y gestionar empresas

## Legal (acción del usuario)
- Registrar marca en OEPM España: ~€600 para clases 9, 38, 42
- Registrar .com, .es, .app domains HOY
- Marca EU con EUIPO: ~€850-1000 en meses 2-3
