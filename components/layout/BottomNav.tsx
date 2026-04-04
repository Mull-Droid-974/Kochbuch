'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  CalendarDays,
  CalendarRange,
  BookHeart,
  ShoppingCart,
  Search,
} from 'lucide-react'

const navItems = [
  { href: '/daily', label: 'Heute', icon: CalendarDays },
  { href: '/weekly', label: 'Woche', icon: CalendarRange },
  { href: '/cookbooks', label: 'Bücher', icon: BookHeart },
  { href: '/shopping-list', label: 'Einkauf', icon: ShoppingCart },
  { href: '/search', label: 'Suche', icon: Search },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-white/90 backdrop-blur-xl">
      <div className="flex">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
                active ? 'text-[oklch(0.42_0.14_145)]' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
