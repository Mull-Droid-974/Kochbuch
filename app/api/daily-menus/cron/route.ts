import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateDailyMenus } from '@/lib/daily-menus'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = await createServiceClient()
    const today = new Date().toISOString().split('T')[0]

    // Delete old menus for today if any (regenerate fresh)
    await supabase.from('daily_menus').delete().eq('menu_date', today)

    const menus = await generateDailyMenus(supabase, today)
    return NextResponse.json({ success: true, count: menus.length, date: today })
  } catch (err) {
    console.error('[cron daily-menus]', err)
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}
