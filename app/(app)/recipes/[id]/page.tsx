'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Recipe } from '@/types/database'
import { RecipePhoto } from '@/components/recipe/RecipePhoto'
import { RecipeBadges } from '@/components/recipe/RecipeBadges'
import { PortionScaler } from '@/components/recipe/PortionScaler'
import { IngredientList } from '@/components/recipe/IngredientList'
import { CookingSteps } from '@/components/recipe/CookingSteps'
import { AddToCookbookButton } from '@/components/recipe/AddToCookbookButton'
import { TopBar } from '@/components/layout/TopBar'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [servings, setServings] = useState(2)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/recipes/${id}`)
        if (!res.ok) throw new Error('Not found')
        const data = await res.json()
        setRecipe(data)
        setServings(data.servings_base)
      } finally {
        setLoading(false)
      }
    }
    if (id) load()
  }, [id])

  if (loading) {
    return (
      <>
        <TopBar title="Rezept" />
        <main className="flex-1 p-4 md:p-6 max-w-2xl mx-auto w-full space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </main>
      </>
    )
  }

  if (!recipe) {
    return (
      <>
        <TopBar title="Rezept" />
        <main className="flex-1 p-4 flex items-center justify-center">
          <p className="text-muted-foreground">Rezept nicht gefunden.</p>
        </main>
      </>
    )
  }

  return (
    <>
      <TopBar title={recipe.title} />
      <main className="flex-1 max-w-2xl mx-auto w-full">
        <RecipePhoto
          src={recipe.photo_url}
          alt={recipe.photo_alt ?? recipe.title}
          className="h-56 w-full md:h-72"
          priority
        />

        <div className="p-4 md:p-6 space-y-5">
          <div>
            <h1 className="text-2xl font-bold">{recipe.title}</h1>
            {recipe.description && (
              <p className="text-muted-foreground mt-1">{recipe.description}</p>
            )}
          </div>

          <RecipeBadges recipe={recipe} />

          <div className="flex gap-2 flex-wrap">
            <AddToCookbookButton recipeId={recipe.id} cookbook="wunsch" />
            <AddToCookbookButton recipeId={recipe.id} cookbook="gekocht" />
          </div>

          <Separator />

          {/* Ingredients */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Zutaten</h2>
              <PortionScaler servings={servings} onChange={setServings} />
            </div>
            <IngredientList
              ingredients={recipe.ingredients}
              baseServings={recipe.servings_base}
              currentServings={servings}
            />
          </section>

          <Separator />

          {/* Steps */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Zubereitung</h2>
            <CookingSteps steps={recipe.steps} />
          </section>

          {recipe.tags.length > 0 && (
            <>
              <Separator />
              <div className="flex flex-wrap gap-2">
                {recipe.tags.map(tag => (
                  <span key={tag} className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                    #{tag}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </>
  )
}
