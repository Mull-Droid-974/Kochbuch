-- =============================================
-- Row Level Security Policies
-- =============================================

-- PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- RECIPES: all authenticated users can read and write (shared household)
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users read recipes" ON recipes
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users write recipes" ON recipes
  FOR ALL USING (auth.role() = 'authenticated');

-- DAILY_MENUS: shared between all users
ALTER TABLE daily_menus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users access daily_menus" ON daily_menus
  FOR ALL USING (auth.role() = 'authenticated');

-- WEEKLY_PLANS: shared view (household)
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users access weekly_plans" ON weekly_plans
  FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE weekly_plan_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users access weekly_plan_entries" ON weekly_plan_entries
  FOR ALL USING (auth.role() = 'authenticated');

-- COOKBOOK_ENTRIES: shared view (household)
ALTER TABLE cookbook_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users access cookbook_entries" ON cookbook_entries
  FOR ALL USING (auth.role() = 'authenticated');

-- SHOPPING_LISTS: shared view (household)
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users access shopping_lists" ON shopping_lists
  FOR ALL USING (auth.role() = 'authenticated');
