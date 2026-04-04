import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateRecipesFromIngredients } from '@/lib/ai/recipe-generator'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ingredients, use_ai = false, gluten_free = false, lactose_free = false, max_time } = await request.json()

  if (!ingredients?.length) {
    return NextResponse.json({ error: 'No ingredients provided' }, { status: 400 })
  }

  // Always search local DB first
  let query = supabase.from('recipes').select('*')

  // Search in JSONB ingredients array for each ingredient
  // Uses PostgreSQL jsonb_path_exists for each ingredient name
  for (const ingredient of ingredients as string[]) {
    query = query.ilike('ingredients::text', `%${ingredient}%`)
  }

  if (gluten_free) query = query.eq('is_gluten_free', true)
  if (lactose_free) query = query.eq('is_lactose_free', true)
  if (max_time) query = query.lte('prep_time_minutes', max_time).lte('cook_time_minutes', max_time)

  const { data: localResults } = await query.limit(12)

  if (!use_ai) {
    return NextResponse.json({ recipes: localResults ?? [], source: 'local' })
  }

  // Generate new recipes via Claude
  const aiRecipes = await generateRecipesFromIngredients(ingredients, {
    glutenFree: gluten_free,
    lactoseFree: lactose_free,
    maxTime: max_time,
  })

  // Save AI-generated recipes to DB
  const savedAiRecipes = await Promise.all(
    aiRecipes.map(async (recipe: Record<string, unknown>) => {
      const { data } = await supabase.from('recipes').insert(recipe).select().single()
      return data
    })
  )

  return NextResponse.json({
    recipes: [...(localResults ?? []), ...(savedAiRecipes.filter(Boolean))],
    source: 'mixed',
  })
}
