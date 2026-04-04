import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const mealType = searchParams.get('meal_type')
    const difficulty = searchParams.get('difficulty')
    const maxTime = searchParams.get('max_time')
    const glutenFree = searchParams.get('gluten_free') === 'true'
    const lactoseFree = searchParams.get('lactose_free') === 'true'
    const season = searchParams.get('season')
    const limit = parseInt(searchParams.get('limit') ?? '20')
    const offset = parseInt(searchParams.get('offset') ?? '0')

    let query = supabase.from('recipes').select('*', { count: 'exact' })

    if (mealType) query = query.eq('meal_type', mealType)
    if (difficulty) query = query.eq('difficulty', difficulty)
    if (glutenFree) query = query.eq('is_gluten_free', true)
    if (lactoseFree) query = query.eq('is_lactose_free', true)
    if (season) query = query.contains('season', [season])
    if (maxTime) {
      const max = parseInt(maxTime)
      query = query.lte('prep_time_minutes', max).lte('cook_time_minutes', max)
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ recipes: data, total: count })
  } catch (err) {
    console.error('[recipes]', err)
    return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 })
  }
}
