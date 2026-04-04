import { SupabaseClient } from '@supabase/supabase-js'
import { searchSpoonacularRecipe } from './spoonacular'

const SLOTS = ['lunch', 'dinner_1', 'dinner_2'] as const

export async function generateDailyMenus(supabase: SupabaseClient, date: string) {
  // Get existing recipe titles to avoid repeats
  const { data: recentRecipes } = await supabase
    .from('recipes')
    .select('title')
    .order('created_at', { ascending: false })
    .limit(30)

  const mealConfigs: Array<{ mealType: 'lunch' | 'dinner'; slot: typeof SLOTS[number] }> = [
    { mealType: 'lunch', slot: 'lunch' },
    { mealType: 'dinner', slot: 'dinner_1' },
    { mealType: 'dinner', slot: 'dinner_2' },
  ]

  const savedRecipes = []
  const usedTitles = recentRecipes?.map(r => r.title) ?? []

  for (const config of mealConfigs) {
    const recipe = await searchSpoonacularRecipe(config.mealType, usedTitles)
    if (!recipe) throw new Error(`Could not fetch recipe for ${config.mealType}`)

    usedTitles.push(recipe.title)

    const { data, error } = await supabase
      .from('recipes')
      .insert(recipe)
      .select()
      .single()
    if (error) throw new Error(`Failed to save recipe: ${error.message}`)
    savedRecipes.push({ ...data, slot: config.slot })
  }

  // Create daily menu entries
  const menuEntries = savedRecipes.map((r) => ({
    menu_date: date,
    slot: r.slot,
    recipe_id: r.id,
  }))

  await supabase.from('daily_menus').upsert(menuEntries, { onConflict: 'menu_date,slot' })

  // Return with recipes joined
  const { data: menus } = await supabase
    .from('daily_menus')
    .select('*, recipe:recipes(*)')
    .eq('menu_date', date)

  return menus ?? []
}
