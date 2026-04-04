export type MealType = 'lunch' | 'dinner'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export type CookbookType = 'wunsch' | 'gekocht'
export type DailySlot = 'lunch' | 'dinner_1' | 'dinner_2'

export interface Ingredient {
  name: string
  quantity: number
  unit: string
  category: string
}

export interface RecipeStep {
  order: number
  text: string
  tip?: string | null
}

export interface ShoppingItem {
  ingredient: string
  quantity: number
  unit: string
  category: string
  checked: boolean
}

export interface Recipe {
  id: string
  title: string
  description: string | null
  meal_type: MealType
  difficulty: Difficulty
  prep_time_minutes: number
  cook_time_minutes: number
  servings_base: number
  season: Season[]
  is_gluten_free: boolean
  is_lactose_free: boolean
  is_low_carb: boolean
  is_high_protein: boolean
  ingredients: Ingredient[]
  steps: RecipeStep[]
  tags: string[]
  photo_url: string | null
  photo_alt: string | null
  source: string
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  name: string
  avatar_url: string | null
  dietary_gluten_free: boolean
  dietary_lactose_free: boolean
  created_at: string
}

export interface DailyMenu {
  id: string
  menu_date: string
  slot: DailySlot
  recipe_id: string
  generated_at: string
  recipe?: Recipe
}

export interface WeeklyPlan {
  id: string
  user_id: string
  week_start: string
  created_at: string
  entries?: WeeklyPlanEntry[]
}

export interface WeeklyPlanEntry {
  id: string
  plan_id: string
  day_of_week: number
  meal_type: MealType
  recipe_id: string | null
  servings: number
  recipe?: Recipe
}

export interface CookbookEntry {
  id: string
  user_id: string
  cookbook: CookbookType
  recipe_id: string
  notes: string | null
  rating: number | null
  cooked_at: string | null
  added_at: string
  recipe?: Recipe
}

export interface ShoppingList {
  id: string
  user_id: string
  name: string | null
  servings: number
  recipe_ids: string[]
  items: ShoppingItem[]
  created_at: string
  updated_at: string
}
