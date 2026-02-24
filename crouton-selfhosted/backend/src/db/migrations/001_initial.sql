-- migrations/001_initial.sql — Full Crouton schema

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recipe categories / tags
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#f97316',
  UNIQUE(user_id, name)
);

-- Recipes
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  source_url TEXT,
  photo_path TEXT,
  prep_time_minutes INT,
  cook_time_minutes INT,
  servings INT DEFAULT 4,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  notes TEXT,
  is_favorite BOOLEAN DEFAULT false,
  unit_system TEXT DEFAULT 'metric' CHECK (unit_system IN ('metric', 'imperial')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recipe ingredients
CREATE TABLE IF NOT EXISTS ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,
  name TEXT NOT NULL,
  amount NUMERIC,
  unit TEXT,
  notes TEXT
);

-- Recipe steps
CREATE TABLE IF NOT EXISTS steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,
  instruction TEXT NOT NULL,
  timer_seconds INT
);

-- Recipe tags junction
CREATE TABLE IF NOT EXISTS recipe_tags (
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, tag_id)
);

-- Weekly meal plans
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- Meal plan entries (recipe assigned to a day + meal slot)
CREATE TABLE IF NOT EXISTS meal_plan_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Mon
  meal_slot TEXT NOT NULL CHECK (meal_slot IN ('breakfast', 'lunch', 'dinner', 'snack')),
  custom_label TEXT,
  servings_override INT,
  UNIQUE(meal_plan_id, day_of_week, meal_slot)
);

-- Shopping lists
CREATE TABLE IF NOT EXISTS shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shopping_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopping_list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC,
  unit TEXT,
  category TEXT DEFAULT 'other',
  is_checked BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0
);

-- Refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recipes_user ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_favorite ON recipes(user_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_ingredients_recipe ON ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_steps_recipe ON steps(recipe_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_user ON meal_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_entries_plan ON meal_plan_entries(meal_plan_id);
