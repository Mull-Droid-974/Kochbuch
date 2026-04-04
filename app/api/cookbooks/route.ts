import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const cookbook = searchParams.get('cookbook')

  let query = supabase
    .from('cookbook_entries')
    .select('*, recipe:recipes(*)')
    .order('added_at', { ascending: false })

  if (cookbook) query = query.eq('cookbook', cookbook)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { cookbook, recipe_id, notes } = await request.json()

  if (!cookbook || !recipe_id) {
    return NextResponse.json({ error: 'Missing cookbook or recipe_id' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('cookbook_entries')
    .upsert(
      { user_id: user.id, cookbook, recipe_id, notes: notes ?? null },
      { onConflict: 'user_id,cookbook,recipe_id' }
    )
    .select('*, recipe:recipes(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
