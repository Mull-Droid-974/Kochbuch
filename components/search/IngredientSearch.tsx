'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { RecipeCard } from '@/components/recipe/RecipeCard'
import { AddToCookbookButton } from '@/components/recipe/AddToCookbookButton'
import { Badge } from '@/components/ui/badge'
import { Recipe } from '@/types/database'
import { Search, X, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

export function IngredientSearch() {
  const [input, setInput] = useState('')
  const [ingredients, setIngredients] = useState<string[]>([])
  const [results, setResults] = useState<Recipe[]>([])
  const [source, setSource] = useState<string>('')
  const [useAI, setUseAI] = useState(false)
  const [loading, setLoading] = useState(false)

  function addIngredient() {
    const trimmed = input.trim()
    if (!trimmed || ingredients.includes(trimmed)) return
    setIngredients(prev => [...prev, trimmed])
    setInput('')
  }

  function removeIngredient(ing: string) {
    setIngredients(prev => prev.filter(i => i !== ing))
  }

  async function handleSearch() {
    if (ingredients.length === 0) { toast.error('Bitte mindestens eine Zutat eingeben'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients, use_ai: useAI }),
      })
      const data = await res.json()
      setResults(data.recipes ?? [])
      setSource(data.source)
      if (data.recipes?.length === 0) toast.info('Keine Rezepte gefunden')
    } catch {
      toast.error('Suchfehler')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Was ist noch im Kühlschrank?</h2>
        <p className="text-sm text-muted-foreground">Gib Zutaten ein und finde passende Rezepte</p>
      </div>

      {/* Ingredient input */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Zutat eingeben (z.B. Tofu)"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addIngredient()}
          />
          <Button variant="outline" onClick={addIngredient} disabled={!input.trim()}>
            Hinzufügen
          </Button>
        </div>

        {ingredients.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {ingredients.map(ing => (
              <Badge key={ing} variant="secondary" className="gap-1 pr-1">
                {ing}
                <button onClick={() => removeIngredient(ing)} className="hover:text-destructive ml-0.5">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={useAI}
              onChange={e => setUseAI(e.target.checked)}
              className="rounded"
            />
            <Sparkles className="h-4 w-4 text-purple-500" />
            KI-Suche (neue Rezepte generieren)
          </label>

          <Button onClick={handleSearch} disabled={loading || ingredients.length === 0} className="gap-2">
            <Search className="h-4 w-4" />
            {loading ? 'Suche...' : 'Suchen'}
          </Button>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{results.length} Rezepte gefunden</h3>
            {source === 'mixed' && (
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                inkl. KI-Vorschläge
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {results.map(recipe => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                actions={
                  <div className="flex gap-2">
                    <AddToCookbookButton recipeId={recipe.id} cookbook="wunsch" />
                    <AddToCookbookButton recipeId={recipe.id} cookbook="gekocht" />
                  </div>
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
