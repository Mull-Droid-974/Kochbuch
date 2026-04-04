'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { WeeklyPlan, WeeklyPlanEntry, Recipe } from '@/types/database'
import { getDayName, getWeekStart, formatDate } from '@/lib/utils'
import { ChevronLeft, ChevronRight, ShoppingCart, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { RecipePickerDialog } from './RecipePickerDialog'
import Link from 'next/link'

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function WeekPlanner() {
  const [weekStart, setWeekStart] = useState(getWeekStart())
  const [plan, setPlan] = useState<WeeklyPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerTarget, setPickerTarget] = useState<{ day: number; mealType: 'lunch' | 'dinner' } | null>(null)

  async function fetchPlan() {
    setLoading(true)
    try {
      const res = await fetch(`/api/weekly-plan?week_start=${formatDate(weekStart)}`)
      const data = await res.json()
      setPlan(data)
    } finally {
      setLoading(false)
    }
  }

  async function assignRecipe(day: number, mealType: 'lunch' | 'dinner', recipe: Recipe) {
    const entry = { day_of_week: day, meal_type: mealType, recipe_id: recipe.id, servings: 2 }
    await fetch('/api/weekly-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week_start: formatDate(weekStart), entries: [entry] }),
    })
    fetchPlan()
    toast.success(`${recipe.title} hinzugefügt`)
  }

  async function removeEntry(entry: WeeklyPlanEntry) {
    await fetch(`/api/weekly-plan/entries/${entry.id}`, { method: 'DELETE' })
    fetchPlan()
  }

  function openPicker(day: number, mealType: 'lunch' | 'dinner') {
    setPickerTarget({ day, mealType })
    setPickerOpen(true)
  }

  function getEntry(day: number, mealType: 'lunch' | 'dinner'): WeeklyPlanEntry | undefined {
    return plan?.entries?.find(e => e.day_of_week === day && e.meal_type === mealType)
  }

  async function generateShoppingList() {
    const recipeIds = plan?.entries
      ?.filter(e => e.recipe_id)
      .map(e => e.recipe_id!)
      .filter(Boolean) ?? []

    if (recipeIds.length === 0) {
      toast.error('Keine Rezepte im Wochenplan')
      return
    }

    const res = await fetch('/api/shopping-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipe_ids: recipeIds, servings: 2, name: `Woche ${formatDate(weekStart)}` }),
    })
    if (res.ok) {
      toast.success('Einkaufsliste erstellt!')
      window.location.href = '/shopping-list'
    }
  }

  useEffect(() => { fetchPlan() }, [weekStart])

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {weekStart.toLocaleDateString('de-CH', { day: 'numeric', month: 'long' })} –{' '}
            {addDays(weekStart, 6).toLocaleDateString('de-CH', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={generateShoppingList}>
          <ShoppingCart className="h-4 w-4" />
          Einkaufsliste
        </Button>
      </div>

      {/* Week grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-2">
          {weekDates.map((date, i) => {
            const day = i + 1
            const lunchEntry = getEntry(day, 'lunch')
            const dinnerEntry = getEntry(day, 'dinner')

            return (
              <div key={day} className="bg-white rounded-lg border p-2 space-y-2">
                <div className="text-center">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">{getDayName(day).slice(0, 2)}</p>
                  <p className="text-sm font-medium">{date.getDate()}</p>
                </div>

                {/* Lunch slot */}
                <MealSlot
                  label="Mittag"
                  entry={lunchEntry}
                  onAdd={() => openPicker(day, 'lunch')}
                  onRemove={removeEntry}
                />

                {/* Dinner slot */}
                <MealSlot
                  label="Abend"
                  entry={dinnerEntry}
                  onAdd={() => openPicker(day, 'dinner')}
                  onRemove={removeEntry}
                />
              </div>
            )
          })}
        </div>
      )}

      <RecipePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        mealType={pickerTarget?.mealType ?? 'lunch'}
        onSelect={(recipe) => {
          if (pickerTarget) assignRecipe(pickerTarget.day, pickerTarget.mealType, recipe)
          setPickerOpen(false)
        }}
      />
    </div>
  )
}

function MealSlot({
  label,
  entry,
  onAdd,
  onRemove,
}: {
  label: string
  entry: WeeklyPlanEntry | undefined
  onAdd: () => void
  onRemove: (e: WeeklyPlanEntry) => void
}) {
  return (
    <div className="min-h-12">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {entry?.recipe ? (
        <div className="bg-green-50 rounded p-1.5 relative group">
          <Link href={`/recipes/${entry.recipe.id}`} className="text-xs font-medium text-green-800 leading-tight block pr-4 line-clamp-2 hover:underline">
            {entry.recipe.title}
          </Link>
          <button
            onClick={() => onRemove(entry)}
            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      ) : (
        <button
          onClick={onAdd}
          className="w-full h-10 border border-dashed rounded flex items-center justify-center text-muted-foreground hover:border-green-400 hover:text-green-600 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
