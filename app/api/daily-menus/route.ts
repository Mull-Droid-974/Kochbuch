import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateDailyMenus } from '@/lib/daily-menus'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

    // Check if menus exist for today
    const { data: existing } = await supabase
      .from('daily_menus')
      .select('*, recipe:recipes(*)')
      .eq('menu_date', date)

    if (existing && existing.length === 3) {
      return NextResponse.json(existing)
    }

    // Generate new menus
    const menus = await generateDailyMenus(supabase, date)
    return NextResponse.json(menus)
  } catch (err) {
    console.error('[daily-menus]', err)
    return NextResponse.json({ error: 'Failed to fetch daily menus' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { date } = await request.json()
    const targetDate = date ?? new Date().toISOString().split('T')[0]

    // Delete existing menus for this date
    await supabase.from('daily_menus').delete().eq('menu_date', targetDate)

    const menus = await generateDailyMenus(supabase, targetDate)
    return NextResponse.json(menus)
  } catch (err) {
    console.error('[daily-menus regenerate]', err)
    return NextResponse.json({ error: 'Failed to regenerate menus' }, { status: 500 })
  }
}
