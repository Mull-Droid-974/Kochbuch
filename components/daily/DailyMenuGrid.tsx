'use client'

import { useState, useEffect } from 'react'
import { RecipeCard } from '@/components/recipe/RecipeCard'
import { AddToCookbookButton } from '@/components/recipe/AddToCookbookButton'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshCw, Sun, Moon } from 'lucide-react'
import { DailyMenu } from '@/types/database'
import { toast } from 'sonner'

export function DailyMenuGrid() {
  const [menus, setMenus] = useState<DailyMenu[]>([])
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)

  async function fetchMenus() {
    try {
      const res = await fetch('/api/daily-menus')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setMenus(data)
    } catch {
      toast.error('Fehler beim Laden der Menüvorschläge')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegenerate() {
    setRegenerating(true)
    try {
      const res = await fetch('/api/daily-menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error('Failed to regenerate')
      const data = await res.json()
      setMenus(data)
      toast.success('Neue Menüvorschläge generiert!')
    } catch {
      toast.error('Fehler beim Generieren neuer Menüs')
    } finally {
      setRegenerating(false)
    }
  }

  useEffect(() => { fetchMenus() }, [])

  const lunch = menus.find(m => m.slot === 'lunch')
  const dinner1 = menus.find(m => m.slot === 'dinner_1')
  const dinner2 = menus.find(m => m.slot === 'dinner_2')

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRegenerate}
          disabled={regenerating}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
          {regenerating ? 'Generiere...' : 'Neu generieren'}
        </Button>
      </div>

      {/* Mittagessen */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Sun className="h-4 w-4 text-yellow-500" />
          <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">Mittagessen</h3>
        </div>
        {lunch?.recipe ? (
          <div className="max-w-sm">
            <RecipeCard
              recipe={lunch.recipe}
              actions={
                <div className="flex gap-2">
                  <AddToCookbookButton recipeId={lunch.recipe.id} cookbook="wunsch" />
                  <AddToCookbookButton recipeId={lunch.recipe.id} cookbook="gekocht" />
                </div>
              }
            />
          </div>
        ) : (
          <Skeleton className="h-64 w-full max-w-sm rounded-xl" />
        )}
      </section>

      {/* Abendessen */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Moon className="h-4 w-4 text-blue-500" />
          <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
            Abendessen — Low-Carb & Eiweissreich
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          {[dinner1, dinner2].map((menu, i) =>
            menu?.recipe ? (
              <RecipeCard
                key={menu.id}
                recipe={menu.recipe}
                actions={
                  <div className="flex gap-2">
                    <AddToCookbookButton recipeId={menu.recipe.id} cookbook="wunsch" />
                    <AddToCookbookButton recipeId={menu.recipe.id} cookbook="gekocht" />
                  </div>
                }
              />
            ) : (
              <Skeleton key={i} className="h-64 rounded-xl" />
            )
          )}
        </div>
      </section>
    </div>
  )
}
