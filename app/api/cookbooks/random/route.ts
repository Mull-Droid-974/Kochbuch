import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const cookbook = searchParams.get('cookbook') ?? 'wunsch'

  const { data: entries } = await supabase
    .from('cookbook_entries')
    .select('recipe_id')
    .eq('cookbook', cookbook)

  if (!entries || entries.length === 0) {
    return NextResponse.json({ error: 'No entries in cookbook' }, { status: 404 })
  }

  const random = entries[Math.floor(Math.random() * entries.length)]

  const { data: recipe } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', random.recipe_id)
    .single()

  return NextResponse.json(recipe)
}
