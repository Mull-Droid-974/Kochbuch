import Image from 'next/image'
import { cn } from '@/lib/utils'

interface RecipePhotoProps {
  src: string | null
  alt: string
  className?: string
  priority?: boolean
}

export function RecipePhoto({ src, alt, className, priority = false }: RecipePhotoProps) {
  if (!src) {
    return (
      <div className={cn('bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center', className)}>
        <span className="text-4xl">🥗</span>
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority={priority}
      />
    </div>
  )
}
