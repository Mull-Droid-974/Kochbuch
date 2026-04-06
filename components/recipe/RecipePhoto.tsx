'use client'

import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface RecipePhotoProps {
  src: string | null
  alt: string
  className?: string
  priority?: boolean
}

function Placeholder({ className }: { className?: string }) {
  return (
    <div className={cn('bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center', className)}>
      <span className="text-4xl">🥗</span>
    </div>
  )
}

export function RecipePhoto({ src, alt, className, priority = false }: RecipePhotoProps) {
  const [error, setError] = useState(false)

  if (!src || error) {
    return <Placeholder className={className} />
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
        onError={() => setError(true)}
      />
    </div>
  )
}
