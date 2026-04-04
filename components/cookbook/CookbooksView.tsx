'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { RecipeCard } from '@/components/recipe/RecipeCard'
import { Skeleton } from '@/components/ui/skeleton'
import { CookbookEntry } from '@/types/database'
import { Shuffle, BookHeart, BookOpen, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { CookingNotesDialog } from './CookingNotesDialog'
import { RatingStars } from './RatingStars'

export function CookbooksView() {
  const [wunsch, setWunsch] = useState<CookbookEntry[]>([])
  const [gekocht, setGekocht] = useState<CookbookEntry[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchEntries() {
    try {
      const [w, g] = await Promise.all([
        fetch('/api/cookbooks?cookbook=wunsch').then(r => r.json()),
        fetch('/api/cookbooks?cookbook=gekocht').then(r => r.json()),
      ])
      setWunsch(w)
      setGekocht(g)
    } catch {
      toast.error('Fehler beim Laden')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(entry: CookbookEntry) {
    try {
      await fetch(`/api/cookbooks/${entry.id}`, { method: 'DELETE' })
      if (entry.cookbook === 'wunsch') {
        setWunsch(prev => prev.filter(e => e.id !== entry.id))
      } else {
        setGekocht(prev => prev.filter(e => e.id !== entry.id))
      }
      toast.success('Entfernt')
    } catch {
      toast.error('Fehler beim Entfernen')
    }
  }

  async function handleRandom(cookbook: 'wunsch' | 'gekocht') {
    const res = await fetch(`/api/cookbooks/random?cookbook=${cookbook}`)
    if (!res.ok) { toast.error('Kochbuch ist leer'); return }
    const recipe = await res.json()
    window.location.href = `/recipes/${recipe.id}`
  }

  useEffect(() => { fetchEntries() }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-56 rounded-xl" />)}
      </div>
    )
  }

  function CookbookGrid({ entries, cookbook }: { entries: CookbookEntry[]; cookbook: 'wunsch' | 'gekocht' }) {
    if (entries.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p>Noch keine Einträge.</p>
          <p className="text-sm mt-1">Füge Rezepte von den Tagesvorschlägen oder der Suche hinzu.</p>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {entries.map(entry => (
          entry.recipe && (
            <div key={entry.id} className="relative group">
              <RecipeCard
                recipe={entry.recipe}
                actions={
                  <div className="space-y-2">
                    {cookbook === 'gekocht' && (
                      <RatingStars
                        entryId={entry.id}
                        rating={entry.rating}
                        onUpdate={(rating) => {
                          setGekocht(prev => prev.map(e => e.id === entry.id ? { ...e, rating } : e))
                        }}
                      />
                    )}
                    <div className="flex gap-1">
                      <CookingNotesDialog entry={entry} onSave={(notes) => {
                        if (cookbook === 'wunsch') {
                          setWunsch(prev => prev.map(e => e.id === entry.id ? { ...e, notes } : e))
                        } else {
                          setGekocht(prev => prev.map(e => e.id === entry.id ? { ...e, notes } : e))
                        }
                      }} />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(entry)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                }
              />
            </div>
          )
        ))}
      </div>
    )
  }

  return (
    <Tabs defaultValue="wunsch">
      <div className="flex items-center justify-between mb-4">
        <TabsList>
          <TabsTrigger value="wunsch" className="gap-2">
            <BookHeart className="h-4 w-4" />
            Wunschliste ({wunsch.length})
          </TabsTrigger>
          <TabsTrigger value="gekocht" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Gekocht ({gekocht.length})
          </TabsTrigger>
        </TabsList>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => handleRandom('wunsch')}>
            <Shuffle className="h-4 w-4" />
            Zufall
          </Button>
        </div>
      </div>

      <TabsContent value="wunsch">
        <CookbookGrid entries={wunsch} cookbook="wunsch" />
      </TabsContent>
      <TabsContent value="gekocht">
        <CookbookGrid entries={gekocht} cookbook="gekocht" />
      </TabsContent>
    </Tabs>
  )
}
