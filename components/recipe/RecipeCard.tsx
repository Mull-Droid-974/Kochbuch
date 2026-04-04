import Link from 'next/link'
import { RecipePhoto } from './RecipePhoto'
import { RecipeBadges } from './RecipeBadges'
import { Recipe } from '@/types/database'
import { cn } from '@/lib/utils'

interface RecipeCardProps {
  recipe: Recipe
  actions?: React.ReactNode
  className?: string
  compact?: boolean
}

export function RecipeCard({ recipe, actions, className, compact = false }: RecipeCardProps) {
  return (
    <div className={cn('group overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-xl transition-all duration-300 border border-border/50', className)}>
      {/* Photo with gradient overlay */}
      <Link href={`/recipes/${recipe.id}`} className="block relative">
        <RecipePhoto
          src={recipe.photo_url}
          alt={recipe.photo_alt ?? recipe.title}
          className={compact ? 'h-36 w-full' : 'h-48 w-full'}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className={cn(
            'font-bold text-white leading-tight drop-shadow-sm group-hover:text-green-200 transition-colors',
            compact ? 'text-sm' : 'text-base'
          )}>
            {recipe.title}
          </h3>
        </div>
      </Link>

      {/* Content */}
      <div className="p-3 space-y-2">
        {!compact && recipe.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {recipe.description}
          </p>
        )}
        <RecipeBadges recipe={recipe} compact />
        {actions && <div className="pt-1">{actions}</div>}
      </div>
    </div>
  )
}
