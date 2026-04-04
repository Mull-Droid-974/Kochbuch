import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateRecipe } from '@/lib/ai/recipe-generator'
import { getCurrentSeason } from '@/lib/utils'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { meal_type, avoid_titles = [], gluten_free = false, lactose_free = false } = body

    if (!meal_type || !['lunch', 'dinner'].includes(meal_type)) {
      return NextResponse.json({ error: 'Invalid meal_type' }, { status: 400 })
    }

    const recipe = await generateRecipe({
      mealType: meal_type,
      season: getCurrentSeason(),
      avoidTitles: avoid_titles,
      glutenFree: gluten_free,
      lactoseFree: lactose_free,
    })

    const { data, error } = await supabase
      .from('recipes')
      .insert(recipe)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data)
  } catch (err) {
    console.error('[generate recipe]', err)
    return NextResponse.json({ error: 'Failed to generate recipe' }, { status: 500 })
  }
}
