import { Ingredient } from '@/types/database'
import { formatFraction, scaleQuantity } from '@/lib/utils'

interface IngredientListProps {
  ingredients: Ingredient[]
  baseServings: number
  currentServings: number
}

export function IngredientList({ ingredients, baseServings, currentServings }: IngredientListProps) {
  // Group by category
  const grouped: Record<string, Ingredient[]> = {}
  for (const ing of ingredients) {
    const cat = ing.category || 'Sonstiges'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(ing)
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            {category}
          </h4>
          <ul className="space-y-1.5">
            {items.map((ing, i) => {
              const scaled = scaleQuantity(ing.quantity, baseServings, currentServings)
              const displayQty = formatFraction(scaled)

              return (
                <li key={i} className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-foreground">{ing.name}</span>
                  <span className="text-muted-foreground whitespace-nowrap tabular-nums">
                    {displayQty} {ing.unit}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
