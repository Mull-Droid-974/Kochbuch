import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateShoppingList, flattenShoppingList } from '@/lib/shopping-list'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('shopping_lists')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { recipe_ids, servings = 2, name } = await request.json()

  if (!recipe_ids?.length) {
    return NextResponse.json({ error: 'No recipe_ids provided' }, { status: 400 })
  }

  const { data: recipes, error: recipesError } = await supabase
    .from('recipes')
    .select('*')
    .in('id', recipe_ids)

  if (recipesError || !recipes) {
    return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 })
  }

  const grouped = generateShoppingList(recipes, servings)
  const items = flattenShoppingList(grouped)

  const { data, error } = await supabase
    .from('shopping_lists')
    .insert({ user_id: user.id, name, servings, recipe_ids, items })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ...data, grouped })
}
