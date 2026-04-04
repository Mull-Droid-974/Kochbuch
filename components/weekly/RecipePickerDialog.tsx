'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Recipe } from '@/types/database'
import { RecipePhoto } from '@/components/recipe/RecipePhoto'
import { RecipeBadges } from '@/components/recipe/RecipeBadges'
import { Search } from 'lucide-react'

interface RecipePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mealType: 'lunch' | 'dinner'
  onSelect: (recipe: Recipe) => void
}

export function RecipePickerDialog({ open, onOpenChange, mealType, onSelect }: RecipePickerDialogProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch(`/api/recipes?meal_type=${mealType}&limit=30`)
      .then(r => r.json())
      .then(d => setRecipes(d.recipes ?? []))
      .finally(() => setLoading(false))
  }, [open, mealType])

  const filtered = recipes.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Rezept auswählen — {mealType === 'lunch' ? 'Mittagessen' : 'Abendessen'}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Suchen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Laden...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Keine Rezepte gefunden</p>
          ) : (
            filtered.map(recipe => (
              <button
                key={recipe.id}
                onClick={() => onSelect(recipe)}
                className="w-full flex gap-3 items-center p-2 rounded-lg hover:bg-muted transition-colors text-left"
              >
                <RecipePhoto
                  src={recipe.photo_url}
                  alt={recipe.photo_alt ?? recipe.title}
                  className="w-16 h-12 rounded flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{recipe.title}</p>
                  <RecipeBadges recipe={recipe} compact />
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
