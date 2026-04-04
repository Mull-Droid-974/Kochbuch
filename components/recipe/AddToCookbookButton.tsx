'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { BookHeart, BookOpen, Check } from 'lucide-react'
import { toast } from 'sonner'
import { CookbookType } from '@/types/database'

interface AddToCookbookButtonProps {
  recipeId: string
  cookbook: CookbookType
  isInCookbook?: boolean
  entryId?: string
  onToggle?: (added: boolean) => void
  size?: 'sm' | 'default'
}

export function AddToCookbookButton({
  recipeId,
  cookbook,
  isInCookbook = false,
  entryId,
  onToggle,
  size = 'sm',
}: AddToCookbookButtonProps) {
  const [inCookbook, setInCookbook] = useState(isInCookbook)
  const [loading, setLoading] = useState(false)

  const label = cookbook === 'wunsch' ? 'Wunschliste' : 'Gekocht'
  const icon = cookbook === 'wunsch' ? BookHeart : BookOpen

  async function handleToggle() {
    setLoading(true)
    try {
      if (inCookbook && entryId) {
        await fetch(`/api/cookbooks/${entryId}`, { method: 'DELETE' })
        setInCookbook(false)
        onToggle?.(false)
        toast.success(`Aus ${label} entfernt`)
      } else {
        await fetch('/api/cookbooks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cookbook, recipe_id: recipeId }),
        })
        setInCookbook(true)
        onToggle?.(true)
        toast.success(`In ${label} gespeichert`)
      }
    } catch {
      toast.error('Fehler beim Speichern')
    } finally {
      setLoading(false)
    }
  }

  const Icon = inCookbook ? Check : icon

  return (
    <Button
      variant={inCookbook ? 'default' : 'outline'}
      size={size}
      onClick={handleToggle}
      disabled={loading}
      className="gap-1.5"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Button>
  )
}
