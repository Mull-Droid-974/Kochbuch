import { Badge } from '@/components/ui/badge'
import { Clock, ChefHat, Leaf } from 'lucide-react'
import { Recipe } from '@/types/database'
import { formatTime, difficultyLabel, seasonLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'

const difficultyColors = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
}

interface RecipeBadgesProps {
  recipe: Recipe
  compact?: boolean
}

export function RecipeBadges({ recipe, compact = false }: RecipeBadgesProps) {
  const totalTime = recipe.prep_time_minutes + recipe.cook_time_minutes

  return (
    <div className={cn('flex flex-wrap gap-1.5', compact ? 'text-xs' : 'text-sm')}>
      <Badge variant="secondary" className="gap-1">
        <Clock className="h-3 w-3" />
        {formatTime(totalTime)}
      </Badge>

      <Badge
        variant="secondary"
        className={cn('gap-1', difficultyColors[recipe.difficulty])}
      >
        <ChefHat className="h-3 w-3" />
        {difficultyLabel(recipe.difficulty)}
      </Badge>

      {recipe.is_low_carb && (
        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
          Low-Carb
        </Badge>
      )}

      {recipe.is_high_protein && (
        <Badge variant="secondary" className="bg-purple-100 text-purple-700">
          Eiweissreich
        </Badge>
      )}

      {recipe.is_gluten_free && (
        <Badge variant="secondary" className="bg-orange-100 text-orange-700">
          Glutenfrei
        </Badge>
      )}

      {recipe.is_lactose_free && (
        <Badge variant="secondary" className="bg-pink-100 text-pink-700">
          Laktosefrei
        </Badge>
      )}

      {!compact && recipe.season.length < 4 && (
        <Badge variant="secondary" className="gap-1">
          <Leaf className="h-3 w-3" />
          {recipe.season.map(s => seasonLabel(s)).join(', ')}
        </Badge>
      )}
    </div>
  )
}
