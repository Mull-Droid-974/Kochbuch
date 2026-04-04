'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface RatingStarsProps {
  entryId: string
  rating: number | null
  onUpdate: (rating: number) => void
}

export function RatingStars({ entryId, rating, onUpdate }: RatingStarsProps) {
  const [hover, setHover] = useState(0)
  const [saving, setSaving] = useState(false)

  async function handleRate(value: number) {
    setSaving(true)
    try {
      await fetch(`/api/cookbooks/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: value }),
      })
      onUpdate(value)
    } catch {
      toast.error('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          onClick={() => handleRate(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          disabled={saving}
          className="p-0.5"
        >
          <Star
            className={cn(
              'h-4 w-4 transition-colors',
              (hover || (rating ?? 0)) >= i
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground'
            )}
          />
        </button>
      ))}
    </div>
  )
}
