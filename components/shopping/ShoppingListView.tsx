'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ShoppingList, ShoppingItem, Recipe } from '@/types/database'
import { ShoppingCart, Copy, Check, Users, Plus, Minus } from 'lucide-react'
import { toast } from 'sonner'
import { generateShoppingList } from '@/lib/shopping-list'

export function ShoppingListView() {
  const [lists, setLists] = useState<ShoppingList[]>([])
  const [activeList, setActiveList] = useState<ShoppingList | null>(null)
  const [grouped, setGrouped] = useState<Record<string, ShoppingItem[]>>({})
  const [servings, setServings] = useState(2)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [recentRecipes, setRecentRecipes] = useState<Recipe[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    Promise.all([
      fetch('/api/shopping-list').then(r => r.json()),
      fetch('/api/recipes?limit=20').then(r => r.json()),
    ]).then(([listsData, recipesData]) => {
      setLists(listsData)
      if (listsData.length > 0) {
        loadList(listsData[0])
      }
      setRecentRecipes(recipesData.recipes ?? [])
    }).finally(() => setLoading(false))
  }, [])

  function loadList(list: ShoppingList) {
    setActiveList(list)
    const recipes = recentRecipes.filter(r => list.recipe_ids.includes(r.id))
    const g = generateShoppingList(recipes, list.servings)
    setGrouped(g)
    setServings(list.servings)
    setCheckedItems(new Set(
      list.items.filter(i => i.checked).map(i => `${i.ingredient}__${i.unit}`)
    ))
  }

  async function handleGenerate() {
    if (selectedIds.size === 0) { toast.error('Bitte mindestens ein Rezept auswählen'); return }
    setGenerating(true)
    try {
      const res = await fetch('/api/shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe_ids: [...selectedIds], servings }),
      })
      const data = await res.json()
      setLists(prev => [data, ...prev])
      setActiveList(data)
      setGrouped(data.grouped ?? {})
      setCheckedItems(new Set())
      toast.success('Einkaufsliste erstellt!')
    } catch {
      toast.error('Fehler beim Erstellen')
    } finally {
      setGenerating(false)
    }
  }

  function toggleCheck(item: ShoppingItem) {
    const key = `${item.ingredient}__${item.unit}`
    setCheckedItems(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function handleCopy() {
    const text = Object.entries(grouped)
      .map(([cat, items]) => `${cat}:\n${items.map(i => `  - ${i.ingredient}: ${i.quantity} ${i.unit}`).join('\n')}`)
      .join('\n\n')
    navigator.clipboard.writeText(text)
    toast.success('In Zwischenablage kopiert')
  }

  if (loading) return <Skeleton className="h-64" />

  return (
    <div className="space-y-6">
      {/* Recipe selector */}
      <div className="space-y-3">
        <h2 className="font-semibold">Rezepte auswählen</h2>
        <div className="flex flex-wrap gap-2">
          {recentRecipes.map(r => (
            <button
              key={r.id}
              onClick={() => setSelectedIds(prev => {
                const next = new Set(prev)
                next.has(r.id) ? next.delete(r.id) : next.add(r.id)
                return next
              })}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                selectedIds.has(r.id)
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-muted-foreground border-muted hover:border-green-400'
              }`}
            >
              {r.title}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Personen</span>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setServings(Math.max(1, servings - 1))}>
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-6 text-center font-semibold">{servings}</span>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setServings(Math.min(12, servings + 1))}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <Button size="sm" className="gap-2" onClick={handleGenerate} disabled={generating || selectedIds.size === 0}>
            <ShoppingCart className="h-4 w-4" />
            {generating ? 'Erstelle...' : 'Liste erstellen'}
          </Button>
        </div>
      </div>

      {/* Shopping list */}
      {Object.keys(grouped).length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">Einkaufsliste</h2>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
              Kopieren
            </Button>
          </div>

          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {category}
              </h3>
              <ul className="space-y-1">
                {items.map((item) => {
                  const key = `${item.ingredient}__${item.unit}`
                  const checked = checkedItems.has(key)
                  return (
                    <li
                      key={key}
                      onClick={() => toggleCheck(item)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                        checked ? 'bg-muted opacity-50' : 'bg-white hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          checked ? 'bg-green-600 border-green-600' : 'border-muted-foreground'
                        }`}>
                          {checked && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span className={`text-sm ${checked ? 'line-through' : ''}`}>{item.ingredient}</span>
                      </div>
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {item.quantity} {item.unit}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
