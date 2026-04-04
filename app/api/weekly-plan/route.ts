import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWeekStart, formatDate } from '@/lib/utils'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const weekStartParam = searchParams.get('week_start')
  const weekStart = weekStartParam ?? formatDate(getWeekStart())

  const { data: plan } = await supabase
    .from('weekly_plans')
    .select('*, entries:weekly_plan_entries(*, recipe:recipes(*))')
    .eq('week_start', weekStart)
    .maybeSingle()

  return NextResponse.json(plan ?? { week_start: weekStart, entries: [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { week_start, entries } = await request.json()

  // Upsert plan
  const { data: plan, error: planError } = await supabase
    .from('weekly_plans')
    .upsert({ user_id: user.id, week_start }, { onConflict: 'user_id,week_start' })
    .select()
    .single()

  if (planError) return NextResponse.json({ error: planError.message }, { status: 500 })

  // Upsert entries
  if (entries?.length) {
    const enriched = entries.map((e: { day_of_week: number; meal_type: string; recipe_id: string | null; servings?: number }) => ({
      plan_id: plan.id,
      day_of_week: e.day_of_week,
      meal_type: e.meal_type,
      recipe_id: e.recipe_id,
      servings: e.servings ?? 2,
    }))

    const { error } = await supabase
      .from('weekly_plan_entries')
      .upsert(enriched, { onConflict: 'plan_id,day_of_week,meal_type' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(plan)
}
