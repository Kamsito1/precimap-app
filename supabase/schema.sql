-- ============================================================
-- POKÉDEX DE EXPERIENCIAS — DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- for geo queries (optional)

-- ============================================================
-- COUNTRIES (global-ready structure)
-- ============================================================
CREATE TABLE countries (
  id TEXT PRIMARY KEY, -- ISO: 'ES', 'MX', 'US', etc.
  name TEXT NOT NULL,
  name_local TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  launch_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO countries (id, name, name_local, is_active, launch_date)
VALUES ('ES', 'Spain', 'España', TRUE, NOW());

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name_es TEXT NOT NULL,
  name_en TEXT,
  icon TEXT,
  color TEXT,
  country_id TEXT REFERENCES countries(id) DEFAULT 'ES',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO categories (key, name_es, name_en, icon, color, sort_order) VALUES
  ('fear', 'Miedo', 'Fear', '😱', '#DC2626', 1),
  ('adventure', 'Aventura', 'Adventure', '🧗', '#D97706', 2),
  ('culture', 'Cultura', 'Culture', '🎭', '#7C3AED', 3),
  ('gastronomy', 'Gastronomía', 'Gastronomy', '🍽️', '#059669', 4),
  ('sport', 'Deporte', 'Sport', '🏃', '#2563EB', 5),
  ('social', 'Social', 'Social', '🎤', '#DB2777', 6),
  ('nature', 'Naturaleza', 'Nature', '🌿', '#16A34A', 7),
  ('travel', 'Viajes', 'Travel', '✈️', '#0891B2', 8);

-- ============================================================
-- USER PROFILES
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  country_id TEXT REFERENCES countries(id) DEFAULT 'ES',
  total_points INTEGER DEFAULT 0,
  rank_key TEXT DEFAULT 'explorer',
  card_count INTEGER DEFAULT 0,
  legendary_count INTEGER DEFAULT 0,
  epic_count INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::TEXT, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Explorer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- BUSINESSES (B2B — must pay and be verified by admin)
-- ============================================================
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  region TEXT,
  country_id TEXT REFERENCES countries(id) DEFAULT 'ES',
  business_type TEXT,
  tax_id TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id),
  subscription_status TEXT DEFAULT 'pending'
    CHECK (subscription_status IN ('pending', 'active', 'inactive', 'cancelled')),
  subscription_expires_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EXPERIENCES (predefined catalog)
-- ============================================================
CREATE TABLE experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_en TEXT,
  description TEXT NOT NULL,
  description_en TEXT,
  category_id UUID REFERENCES categories(id),
  rarity TEXT NOT NULL DEFAULT 'common'
    CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  difficulty INTEGER DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  cost_level INTEGER DEFAULT 1 CHECK (cost_level BETWEEN 1 AND 5),
  country_id TEXT REFERENCES countries(id) DEFAULT 'ES',
  region TEXT,
  city TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  template_url TEXT,          -- Card background template image URL
  template_overlay_url TEXT,  -- Optional overlay design
  instructions TEXT,          -- How to complete this experience
  validation_tip TEXT,        -- How to prove/validate
  booking_url TEXT,           -- For B2B experiences
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  card_count INTEGER DEFAULT 0,  -- Total people who collected this
  is_active BOOLEAN DEFAULT TRUE,
  is_b2b BOOLEAN DEFAULT FALSE,
  is_outdoor BOOLEAN DEFAULT FALSE,
  hiking_info TEXT,           -- For outdoor/hiking experiences
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for geo queries
CREATE INDEX experiences_location_idx ON experiences (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX experiences_category_country_idx ON experiences (category_id, country_id, is_active);
CREATE INDEX experiences_rarity_idx ON experiences (rarity, is_active);

-- ============================================================
-- USER EXPERIENCES (collected cards)
-- ============================================================
CREATE TABLE user_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  experience_id UUID REFERENCES experiences(id) ON DELETE CASCADE,
  photo_url TEXT,        -- User's photo inserted into the card template
  card_number INTEGER,   -- "You were the Nth person" (global rank)
  points_earned INTEGER DEFAULT 0,
  obtained_at TIMESTAMPTZ DEFAULT NOW(),
  shared_count INTEGER DEFAULT 0,
  UNIQUE(user_id, experience_id)
);

-- Trigger: update card_count + user points + rank when card collected
CREATE OR REPLACE FUNCTION on_card_collected()
RETURNS TRIGGER AS $$
DECLARE
  v_rarity TEXT;
  v_points INTEGER;
  v_card_num INTEGER;
BEGIN
  SELECT rarity INTO v_rarity FROM experiences WHERE id = NEW.experience_id;

  -- Calculate card number (position in global leaderboard)
  SELECT COUNT(*) + 1 INTO v_card_num
  FROM user_experiences
  WHERE experience_id = NEW.experience_id AND id != NEW.id;

  -- Calculate points based on rarity and position
  v_points := CASE v_rarity
    WHEN 'common' THEN 10
    WHEN 'uncommon' THEN 25
    WHEN 'rare' THEN 50
    WHEN 'epic' THEN 100
    WHEN 'legendary' THEN 200
    ELSE 10
  END;

  IF v_card_num = 1 THEN v_points := v_points + 100;
  ELSIF v_card_num <= 10 THEN v_points := v_points + 50;
  END IF;

  NEW.card_number := v_card_num;
  NEW.points_earned := v_points;

  -- Update experience card count
  UPDATE experiences SET card_count = card_count + 1 WHERE id = NEW.experience_id;

  -- Update user profile
  UPDATE profiles SET
    total_points = total_points + v_points,
    card_count = card_count + 1,
    legendary_count = CASE WHEN v_rarity = 'legendary' THEN legendary_count + 1 ELSE legendary_count END,
    epic_count = CASE WHEN v_rarity = 'epic' THEN epic_count + 1 ELSE epic_count END,
    rank_key = CASE
      WHEN total_points + v_points >= 5001 THEN 'mythic'
      WHEN total_points + v_points >= 2001 THEN 'icon'
      WHEN total_points + v_points >= 1001 THEN 'legend'
      WHEN total_points + v_points >= 601 THEN 'fearless'
      WHEN total_points + v_points >= 301 THEN 'daring'
      WHEN total_points + v_points >= 101 THEN 'adventurer'
      ELSE 'explorer'
    END
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_user_experience_insert
  BEFORE INSERT ON user_experiences
  FOR EACH ROW EXECUTE FUNCTION on_card_collected();

-- ============================================================
-- BADGES
-- ============================================================
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  icon_url TEXT,
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER DEFAULT 1,
  rarity TEXT DEFAULT 'common',
  points_reward INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Seed initial badges
INSERT INTO badges (name, description, icon, requirement_type, requirement_value, rarity) VALUES
  ('Primera Carta', 'Consigue tu primera experiencia', '🎴', 'card_count', 1, 'common'),
  ('10 Experiencias', 'Colecciona 10 experiencias', '🌟', 'card_count', 10, 'uncommon'),
  ('Aventurero', 'Colecciona 25 experiencias', '🎒', 'card_count', 25, 'rare'),
  ('Leyenda', 'Colecciona 50 experiencias', '👑', 'card_count', 50, 'epic'),
  ('Primera Legendaria', 'Consigue tu primera carta legendaria', '⭐', 'legendary_count', 1, 'legendary'),
  ('Primero en el Mundo', 'Sé el primero en conseguir una carta', '🏆', 'first_card', 1, 'legendary'),
  ('Conquista el Miedo', 'Completa todas las experiencias de Miedo', '😱', 'category_complete_fear', 1, 'epic'),
  ('Viajero', 'Colecciona experiencias en 5 ciudades distintas', '✈️', 'city_count', 5, 'rare');

-- ============================================================
-- FRIENDSHIPS
-- ============================================================
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, receiver_id)
);

-- ============================================================
-- FEED LIKES
-- ============================================================
CREATE TABLE experience_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user_experience_id UUID REFERENCES user_experiences(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, user_experience_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Profiles: visible to all, editable by owner
CREATE POLICY "profiles_public_read" ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_own_write" ON profiles FOR UPDATE USING (auth.uid() = id);

-- User experiences: visible to all
CREATE POLICY "user_exp_public_read" ON user_experiences FOR SELECT USING (TRUE);
CREATE POLICY "user_exp_own_insert" ON user_experiences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_exp_own_update" ON user_experiences FOR UPDATE USING (auth.uid() = user_id);

-- User badges: visible to all
CREATE POLICY "user_badges_public_read" ON user_badges FOR SELECT USING (TRUE);

-- Friendships: visible to participants
CREATE POLICY "friendships_participant_read" ON friendships
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = receiver_id);
CREATE POLICY "friendships_insert" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "friendships_update" ON friendships
  FOR UPDATE USING (auth.uid() = receiver_id);

-- Likes: visible to all, own insert/delete
CREATE POLICY "likes_public_read" ON experience_likes FOR SELECT USING (TRUE);
CREATE POLICY "likes_own_insert" ON experience_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_own_delete" ON experience_likes FOR DELETE USING (auth.uid() = user_id);

-- Businesses: own read/write
CREATE POLICY "business_own_read" ON businesses FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "business_insert" ON businesses FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "business_own_update" ON businesses FOR UPDATE USING (auth.uid() = owner_id);

-- Experiences: public read (no RLS needed for catalog)
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "experiences_public_read" ON experiences FOR SELECT USING (is_active = TRUE);
CREATE POLICY "experiences_admin_all" ON experiences USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- ============================================================
-- SEED SAMPLE EXPERIENCES (Spain — for testing)
-- ============================================================
INSERT INTO experiences (title, description, category_id, rarity, difficulty, cost_level, country_id, region, city, instructions, validation_tip, is_outdoor, tags)
SELECT
  'Hablar en Público',
  'Da una charla o presentación ante un grupo de al menos 20 personas que no conoces',
  c.id, 'uncommon', 3, 1, 'ES', NULL, NULL,
  'Apúntate a un grupo de Toastmasters, da una charla en un meetup, o habla en un evento. Lo importante es que sean al menos 20 personas desconocidas.',
  'Foto tuya de frente al público con las caras visibles de fondo',
  FALSE, ARRAY['miedo', 'social', 'superación']
FROM categories c WHERE c.key = 'fear';

INSERT INTO experiences (title, description, category_id, rarity, difficulty, cost_level, country_id, region, city, latitude, longitude, instructions, validation_tip, is_outdoor, tags)
SELECT
  'Salto en Paracaídas',
  'Lánzate desde un avión a más de 4000m de altura en España',
  c.id, 'epic', 5, 4, 'ES', 'Madrid', 'Madrid',
  40.4168, -3.7038,
  'Reserva con una empresa homologada de paracaidismo. Las mejores zonas en España: Empuriabrava (Girona), Lillo (Toledo), Castellón. Debes saltar en tándem si es tu primera vez.',
  'Foto o vídeo en caída libre con la altitud visible',
  TRUE, ARRAY['miedo', 'extremo', 'adrenalina']
FROM categories c WHERE c.key = 'fear';

INSERT INTO experiences (title, description, category_id, rarity, difficulty, cost_level, country_id, region, city, instructions, validation_tip, is_outdoor, tags)
SELECT
  'Maratón Completo',
  'Completa los 42km de una maratón oficial en España',
  c.id, 'rare', 5, 2, 'ES', NULL, NULL,
  'Inscríbete en una maratón oficial (Madrid, Barcelona, Valencia, Sevilla). Tienes que llegar a la meta, no importa el tiempo. La maratón de Valencia en diciembre es la más rápida.',
  'Foto con la medalla de finisher y el dorsal visible',
  TRUE, ARRAY['deporte', 'resistencia', 'logro']
FROM categories c WHERE c.key = 'sport';

INSERT INTO experiences (title, description, category_id, rarity, difficulty, cost_level, country_id, region, city, latitude, longitude, instructions, validation_tip, is_outdoor, hiking_info, tags)
SELECT
  'Camino de Santiago Completo',
  'Camina alguno de los caminos oficiales de Santiago (mínimo el Camino Francés, 780km)',
  c.id, 'legendary', 5, 2, 'ES', 'Galicia', 'Santiago de Compostela',
  42.8805, -8.5457,
  'Inicia el Camino Francés desde Saint-Jean-Pied-de-Port. Necesitas la credencial del peregrino. La distancia mínima para la Compostela es 100km a pie o 200km en bici. Tiempo estimado: 33-35 días caminando.',
  'Foto con la Compostela (certificado oficial) en la Catedral de Santiago',
  TRUE,
  '{"distance_km": 780, "days": 33, "difficulty": "alta", "best_months": ["Abril", "Mayo", "Septiembre", "Octubre"], "starting_point": "Saint-Jean-Pied-de-Port, Francia"}',
  ARRAY['aventura', 'senderismo', 'espiritualidad', 'épico']
FROM categories c WHERE c.key = 'adventure';

INSERT INTO experiences (title, description, category_id, rarity, difficulty, cost_level, country_id, region, city, latitude, longitude, instructions, validation_tip, is_outdoor, tags)
SELECT
  'Subir al Teide',
  'Sube al pico del Teide, el volcán más alto de España (3.718m)',
  c.id, 'rare', 4, 2, 'ES', 'Canarias', 'Santa Cruz de Tenerife',
  28.2744, -16.6424,
  'Necesitas permiso previo gratuito para subir a la cima (reserva en el MAPA). El teleférico sube hasta los 3.555m, de ahí hay 163m a pie. La ruta por Montaña Blanca es la clásica sin teleférico (6-7h).',
  'Foto en la cima con el cartel del Teide y el paisaje de las Islas Canarias de fondo',
  TRUE, ARRAY['naturaleza', 'montaña', 'canarias']
FROM categories c WHERE c.key = 'nature';

INSERT INTO experiences (title, description, category_id, rarity, difficulty, cost_level, country_id, region, city, instructions, validation_tip, is_outdoor, tags)
SELECT
  'Restaurante con Estrella Michelin',
  'Cena en un restaurante con estrella Michelin en España',
  c.id, 'rare', 1, 5, 'ES', NULL, NULL,
  'España tiene más de 200 estrellas Michelin. Opciones más accesibles: El Celler de Can Roca (3*), Akelarre, Arzak, Quique Dacosta. Reserva con meses de antelación para los top.',
  'Foto con el menú o el plato principal del restaurante',
  FALSE, ARRAY['gastronomía', 'lujo', 'cultura']
FROM categories c WHERE c.key = 'gastronomy';

INSERT INTO experiences (title, description, category_id, rarity, difficulty, cost_level, country_id, region, city, instructions, validation_tip, is_outdoor, tags)
SELECT
  'Open Mic de Monólogo',
  'Sube al escenario y haz un monólogo de al menos 5 minutos en un open mic',
  c.id, 'uncommon', 4, 1, 'ES', NULL, NULL,
  'Busca open mics en tu ciudad (El Micro abierto en Madrid, El Club de la Comedia organiza algunos). Prepara 5 minutos de material y apúntate en la lista. Los open mics son gratuitos generalmente.',
  'Foto o vídeo en el escenario con el micrófono',
  FALSE, ARRAY['social', 'miedo', 'humor']
FROM categories c WHERE c.key = 'social';

INSERT INTO experiences (title, description, category_id, rarity, difficulty, cost_level, country_id, region, city, latitude, longitude, instructions, validation_tip, is_outdoor, tags)
SELECT
  'La Tomatina',
  'Participa en La Tomatina de Buñol, la batalla de tomates más famosa del mundo',
  c.id, 'uncommon', 2, 2, 'ES', 'Valencia', 'Buñol',
  39.4189, -0.7933,
  'La Tomatina es el último miércoles de agosto en Buñol (Valencia). Las entradas oficiales cuestan ~15€ y se agotan rápido. Lleva ropa vieja que puedas tirar y no lleves gafas de cristal.',
  'Foto completamente manchado de tomate en el evento',
  FALSE, ARRAY['cultura', 'festival', 'único']
FROM categories c WHERE c.key = 'culture';
