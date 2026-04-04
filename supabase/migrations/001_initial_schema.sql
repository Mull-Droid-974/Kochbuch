-- =============================================
-- Kochbuch – Initial Schema
-- =============================================

-- PROFILES: extends Supabase auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  avatar_url  TEXT,
  dietary_gluten_free   BOOLEAN DEFAULT FALSE,
  dietary_lactose_free  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RECIPES: core content unit
CREATE TABLE IF NOT EXISTS recipes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  description       TEXT,
  meal_type         TEXT NOT NULL CHECK (meal_type IN ('lunch', 'dinner')),
  difficulty        TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  prep_time_minutes INTEGER NOT NULL DEFAULT 15,
  cook_time_minutes INTEGER NOT NULL DEFAULT 20,
  servings_base     INTEGER NOT NULL DEFAULT 2,
  season            TEXT[] DEFAULT ARRAY['spring','summer','autumn','winter'],
  is_gluten_free    BOOLEAN DEFAULT FALSE,
  is_lactose_free   BOOLEAN DEFAULT FALSE,
  is_low_carb       BOOLEAN DEFAULT FALSE,
  is_high_protein   BOOLEAN DEFAULT FALSE,
  ingredients       JSONB NOT NULL DEFAULT '[]',
  steps             JSONB NOT NULL DEFAULT '[]',
  tags              TEXT[] DEFAULT '{}',
  photo_url         TEXT,
  photo_alt         TEXT,
  source            TEXT DEFAULT 'ai',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- DAILY_MENUS: 3 suggestions per day
CREATE TABLE IF NOT EXISTS daily_menus (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_date    DATE NOT NULL,
  slot         TEXT NOT NULL CHECK (slot IN ('lunch', 'dinner_1', 'dinner_2')),
  recipe_id    UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (menu_date, slot)
);

-- WEEKLY_PLANS
CREATE TABLE IF NOT EXISTS weekly_plans (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start   DATE NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, week_start)
);

-- WEEKLY_PLAN_ENTRIES
CREATE TABLE IF NOT EXISTS weekly_plan_entries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id      UUID NOT NULL REFERENCES weekly_plans(id) ON DELETE CASCADE,
  day_of_week  INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  meal_type    TEXT NOT NULL CHECK (meal_type IN ('lunch', 'dinner')),
  recipe_id    UUID REFERENCES recipes(id) ON DELETE SET NULL,
  servings     INTEGER NOT NULL DEFAULT 2,
  UNIQUE (plan_id, day_of_week, meal_type)
);

-- COOKBOOK_ENTRIES: wunsch + gekocht
CREATE TABLE IF NOT EXISTS cookbook_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cookbook    TEXT NOT NULL CHECK (cookbook IN ('wunsch', 'gekocht')),
  recipe_id   UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  notes       TEXT,
  rating      INTEGER CHECK (rating BETWEEN 1 AND 5),
  cooked_at   TIMESTAMPTZ,
  added_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, cookbook, recipe_id)
);

-- SHOPPING_LISTS
CREATE TABLE IF NOT EXISTS shopping_lists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT,
  servings    INTEGER NOT NULL DEFAULT 2,
  recipe_ids  UUID[] NOT NULL DEFAULT '{}',
  items       JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at for recipes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER shopping_lists_updated_at
  BEFORE UPDATE ON shopping_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
