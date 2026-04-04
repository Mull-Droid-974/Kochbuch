import { Ingredient, Recipe, ShoppingItem } from '@/types/database'
import { scaleQuantity } from './utils'

const CATEGORY_ORDER = [
  'Gemüse',
  'Obst',
  'Hülsenfrüchte',
  'Milchprodukte',
  'Eier',
  'Tofu & Tempeh',
  'Nüsse & Samen',
  'Getreide & Körner',
  'Gewürze',
  'Öle & Essig',
  'Sonstiges',
]

function normalizeIngredientName(name: string): string {
  return name.toLowerCase().trim()
}

function categorizeIngredient(category: string): string {
  // Map common categories to our standard categories
  const categoryMap: Record<string, string> = {
    'gemüse': 'Gemüse',
    'vegetables': 'Gemüse',
    'obst': 'Obst',
    'fruit': 'Obst',
    'hülsenfrüchte': 'Hülsenfrüchte',
    'legumes': 'Hülsenfrüchte',
    'milchprodukte': 'Milchprodukte',
    'dairy': 'Milchprodukte',
    'käse': 'Milchprodukte',
    'eier': 'Eier',
    'eggs': 'Eier',
    'tofu': 'Tofu & Tempeh',
    'tempeh': 'Tofu & Tempeh',
    'nüsse': 'Nüsse & Samen',
    'nuts': 'Nüsse & Samen',
    'samen': 'Nüsse & Samen',
    'seeds': 'Nüsse & Samen',
    'getreide': 'Getreide & Körner',
    'grains': 'Getreide & Körner',
    'gewürze': 'Gewürze',
    'spices': 'Gewürze',
    'herbs': 'Gewürze',
    'kräuter': 'Gewürze',
    'öle': 'Öle & Essig',
    'oil': 'Öle & Essig',
    'essig': 'Öle & Essig',
  }

  const lower = category.toLowerCase()
  return categoryMap[lower] ?? category ?? 'Sonstiges'
}

export function generateShoppingList(
  recipes: Recipe[],
  servings: number
): Record<string, ShoppingItem[]> {
  const aggregated = new Map<string, ShoppingItem>()

  for (const recipe of recipes) {
    for (const ingredient of recipe.ingredients) {
      const scaled = scaleQuantity(ingredient.quantity, recipe.servings_base, servings)
      const key = `${normalizeIngredientName(ingredient.name)}__${ingredient.unit}`

      if (aggregated.has(key)) {
        const existing = aggregated.get(key)!
        aggregated.set(key, {
          ...existing,
          quantity: Math.round((existing.quantity + scaled) * 100) / 100,
        })
      } else {
        aggregated.set(key, {
          ingredient: ingredient.name,
          quantity: Math.round(scaled * 100) / 100,
          unit: ingredient.unit,
          category: categorizeIngredient(ingredient.category),
          checked: false,
        })
      }
    }
  }

  // Group by category
  const grouped: Record<string, ShoppingItem[]> = {}
  for (const item of aggregated.values()) {
    const cat = item.category
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(item)
  }

  // Sort items within each category
  for (const cat of Object.keys(grouped)) {
    grouped[cat].sort((a, b) => a.ingredient.localeCompare(b.ingredient, 'de'))
  }

  // Return in standard category order
  const ordered: Record<string, ShoppingItem[]> = {}
  for (const cat of CATEGORY_ORDER) {
    if (grouped[cat]) ordered[cat] = grouped[cat]
  }
  // Add any remaining categories
  for (const [cat, items] of Object.entries(grouped)) {
    if (!ordered[cat]) ordered[cat] = items
  }

  return ordered
}

export function flattenShoppingList(grouped: Record<string, ShoppingItem[]>): ShoppingItem[] {
  return Object.values(grouped).flat()
}
