'use client'

import { Button } from '@/components/ui/button'
import { Users, Minus, Plus } from 'lucide-react'

interface PortionScalerProps {
  servings: number
  onChange: (servings: number) => void
  min?: number
  max?: number
}

export function PortionScaler({ servings, onChange, min = 1, max = 12 }: PortionScalerProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>Personen</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onChange(Math.max(min, servings - 1))}
          disabled={servings <= min}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-8 text-center font-semibold text-lg">{servings}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onChange(Math.min(max, servings + 1))}
          disabled={servings >= max}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
