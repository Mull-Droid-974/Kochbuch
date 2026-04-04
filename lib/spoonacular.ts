import Anthropic from '@anthropic-ai/sdk'
import { Ingredient, RecipeStep, Season } from '@/types/database'

const BASE_URL = 'https://api.spoonacular.com'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

async function translateRecipeToGerman(recipe: ReturnType<typeof mapToRecipe>): Promise<ReturnType<typeof mapToRecipe>> {
  try {
    const payload = {
      title: recipe.title,
      description: recipe.description,
      ingredients: recipe.ingredients.map(i => i.name),
      steps: recipe.steps.map(s => s.text),
    }

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `Translate the following recipe data to German. Return ONLY valid JSON with the same structure, no markdown, no explanation.

Input:
${JSON.stringify(payload)}

Return JSON: { "title": "...", "description": "...", "ingredients": ["..."], "steps": ["..."] }`,
      }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const translated = JSON.parse(text.match(/\{[\s\S]*\}/)![0])

    return {
      ...recipe,
      title: translated.title ?? recipe.title,
      description: translated.description ?? recipe.description,
      photo_alt: translated.title ?? recipe.title,
      ingredients: recipe.ingredients.map((ing, i) => ({
        ...ing,
        name: translated.ingredients[i] ?? ing.name,
      })),
      steps: recipe.steps.map((step, i) => ({
        ...step,
        text: translated.steps[i] ?? step.text,
      })),
    }
  } catch (err) {
    console.error('[translate]', err)
    return recipe
  }
}

interface SpoonacularIngredient {
  name: string
  amount: number
  unit: string
  aisle: string
}

interface SpoonacularStep {
  number: number
  step: string
}

interface SpoonacularRecipe {
  id: number
  title: string
  image: string
  readyInMinutes: number
  preparationMinutes?: number
  cookingMinutes?: number
  servings: number
  summary: string
  glutenFree: boolean
  dairyFree: boolean
  vegetarian: boolean
  vegan: boolean
  cheap: boolean
  diets: string[]
  dishTypes: string[]
  extendedIngredients: SpoonacularIngredient[]
  analyzedInstructions: Array<{ steps: SpoonacularStep[] }>
}

function estimateDifficulty(minutes: number): 'easy' | 'medium' | 'hard' {
  if (minutes <= 30) return 'easy'
  if (minutes <= 60) return 'medium'
  return 'hard'
}

function mapAisleToCategory(aisle: string): string {
  const map: Record<string, string> = {
    'Produce': 'Gemüse',
    'Dairy': 'Milchprodukte',
    'Cheese': 'Milchprodukte',
    'Eggs': 'Eier',
    'Meat': 'Sonstiges',
    'Seafood': 'Sonstiges',
    'Canned': 'Sonstiges',
    'Pasta and Rice': 'Getreide & Körner',
    'Bread': 'Getreide & Körner',
    'Cereal': 'Getreide & Körner',
    'Baking': 'Sonstiges',
    'Spices and Seasonings': 'Gewürze',
    'Condiments': 'Gewürze',
    'Oil, Vinegar, Salad Dressing': 'Öle & Essig',
    'Nuts': 'Nüsse & Samen',
    'Dried Fruits': 'Nüsse & Samen',
    'Ethnic Foods': 'Sonstiges',
    'Frozen': 'Sonstiges',
    'Beverages': 'Sonstiges',
  }
  for (const [key, value] of Object.entries(map)) {
    if (aisle?.includes(key)) return value
  }
  return 'Sonstiges'
}

function getCurrentSeasonForSpoonacular(): string {
  const month = new Date().getMonth() + 1
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

function mapToRecipe(data: SpoonacularRecipe, mealType: 'lunch' | 'dinner') {
  const totalTime = data.readyInMinutes || 30
  const prepTime = data.preparationMinutes || Math.round(totalTime * 0.4)
  const cookTime = data.cookingMinutes || Math.round(totalTime * 0.6)
  const season = getCurrentSeasonForSpoonacular() as Season

  const ingredients: Ingredient[] = (data.extendedIngredients || []).map(ing => ({
    name: ing.name,
    quantity: ing.amount,
    unit: ing.unit || 'Stück',
    category: mapAisleToCategory(ing.aisle),
  }))

  const steps: RecipeStep[] = (data.analyzedInstructions?.[0]?.steps || []).map(s => ({
    order: s.number,
    text: s.step,
    tip: null,
  }))

  const isLowCarb = mealType === 'dinner' ||
    data.diets?.some(d => d.toLowerCase().includes('low carb') || d.toLowerCase().includes('ketogenic'))

  // Clean HTML tags from summary for description
  const description = data.summary
    ? data.summary.replace(/<[^>]*>/g, '').slice(0, 200) + '...'
    : ''

  return {
    title: data.title,
    description,
    meal_type: mealType,
    difficulty: estimateDifficulty(totalTime),
    prep_time_minutes: prepTime || 15,
    cook_time_minutes: cookTime || 20,
    servings_base: data.servings || 2,
    season: [season] as Season[],
    is_gluten_free: data.glutenFree || false,
    is_lactose_free: data.dairyFree || false,
    is_low_carb: isLowCarb,
    is_high_protein: mealType === 'dinner',
    ingredients: ingredients.length > 0 ? ingredients : [{ name: 'Siehe Originalrezept', quantity: 1, unit: '', category: 'Sonstiges' }],
    steps: steps.length > 0 ? steps : [{ order: 1, text: 'Alle Zutaten vorbereiten und nach Rezept zubereiten.', tip: null }],
    tags: data.diets || [],
    photo_url: data.image || null,
    photo_alt: data.title,
    source: 'spoonacular',
  }
}

export async function searchSpoonacularRecipe(
  mealType: 'lunch' | 'dinner',
  avoidTitles: string[] = []
): Promise<ReturnType<typeof mapToRecipe> | null> {
  const apiKey = process.env.SPOONACULAR_API_KEY
  if (!apiKey) return null

  const params = new URLSearchParams({
    apiKey,
    diet: 'vegetarian',
    number: '5',
    addRecipeInformation: 'true',
    fillIngredients: 'true',
    instructionsRequired: 'true',
    sort: 'random',
  })

  if (mealType === 'dinner') {
    params.set('maxCarbs', '25')
    params.set('minProtein', '15')
  }

  try {
    const res = await fetch(`${BASE_URL}/recipes/complexSearch?${params}`)
    if (!res.ok) throw new Error(`Spoonacular error: ${res.status}`)

    const data = await res.json()
    const results: SpoonacularRecipe[] = data.results || []

    // Pick first result that's not in avoidTitles
    const recipe = results.find(r => !avoidTitles.includes(r.title)) || results[0]
    if (!recipe) return null

    const mapped = mapToRecipe(recipe, mealType)
    return translateRecipeToGerman(mapped)
  } catch (err) {
    console.error('[spoonacular]', err)
    return null
  }
}
