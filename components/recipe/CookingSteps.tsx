import { RecipeStep } from '@/types/database'
import { cn } from '@/lib/utils'

interface CookingStepsProps {
  steps: RecipeStep[]
}

export function CookingSteps({ steps }: CookingStepsProps) {
  const sorted = [...steps].sort((a, b) => a.order - b.order)

  return (
    <ol className="space-y-4">
      {sorted.map((step) => (
        <li key={step.order} className="flex gap-4">
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-green-600 text-white text-sm font-semibold flex items-center justify-center mt-0.5">
            {step.order}
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm leading-relaxed">{step.text}</p>
            {step.tip && (
              <p className={cn('text-xs text-amber-700 bg-amber-50 rounded px-2 py-1')}>
                Tipp: {step.tip}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
