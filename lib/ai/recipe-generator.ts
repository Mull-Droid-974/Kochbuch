import Anthropic from '@anthropic-ai/sdk'
import { buildRecipePrompt, buildIngredientSearchPrompt } from './prompts'
import { fetchFoodPhoto } from '@/lib/unsplash'
import { Season } from '@/types/database'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

interface GenerateRecipeOptions {
  mealType: 'lunch' | 'dinner'
  season: Season
  avoidTitles?: string[]
  glutenFree?: boolean
  lactoseFree?: boolean
}

export async function generateRecipe(opts: GenerateRecipeOptions) {
  const prompt = buildRecipePrompt(opts)

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  let recipe
  try {
    recipe = JSON.parse(text.trim())
  } catch {
    // Try to extract JSON from response if there's any surrounding text
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Claude returned invalid JSON')
    recipe = JSON.parse(match[0])
  }

  // Fetch photo from Unsplash
  const photo = await fetchFoodPhoto(recipe.photo_search_term || recipe.title)

  // Remove photo_search_term — not a DB column
  const { photo_search_term: _, ...recipeData } = recipe

  return {
    ...recipeData,
    meal_type: opts.mealType,
    photo_url: photo?.url ?? null,
    photo_alt: photo?.alt ?? recipe.title,
    source: 'ai',
  }
}

export async function generateRecipesFromIngredients(
  ingredients: string[],
  filters: { glutenFree?: boolean; lactoseFree?: boolean; maxTime?: number } = {}
) {
  const prompt = buildIngredientSearchPrompt(ingredients, filters)

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  let recipes
  try {
    recipes = JSON.parse(text.trim())
  } catch {
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) throw new Error('Claude returned invalid JSON array')
    recipes = JSON.parse(match[0])
  }

  // Fetch photos sequentially to avoid rate limits
  const recipesWithPhotos = []
  for (const recipe of recipes) {
    const photo = await fetchFoodPhoto(recipe.photo_search_term || recipe.title)
    const { photo_search_term: _, ...recipeData } = recipe
    recipesWithPhotos.push({
      ...recipeData,
      photo_url: photo?.url ?? null,
      photo_alt: photo?.alt ?? recipe.title,
      source: 'ai',
    })
  }

  return recipesWithPhotos
}
