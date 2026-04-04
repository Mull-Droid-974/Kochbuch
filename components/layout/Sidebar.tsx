'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  CalendarDays,
  CalendarRange,
  BookHeart,
  ShoppingCart,
  Search,
  LogOut,
  UtensilsCrossed,
} from 'lucide-react'

const navItems = [
  { href: '/daily', label: 'Heute', icon: CalendarDays },
  { href: '/weekly', label: 'Wochenplan', icon: CalendarRange },
  { href: '/cookbooks', label: 'Kochbücher', icon: BookHeart },
  { href: '/shopping-list', label: 'Einkaufsliste', icon: ShoppingCart },
  { href: '/search', label: 'Suche', icon: Search },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen px-3 py-6 gap-1 bg-[oklch(0.14_0.025_255)]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-[oklch(0.42_0.14_145)] flex items-center justify-center shadow-lg">
          <UtensilsCrossed className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-white text-base leading-tight">Kochbuch</p>
          <p className="text-xs text-[oklch(0.55_0.06_145)]">Roman & Susanne</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-[oklch(0.42_0.14_145)] text-white shadow-sm'
                  : 'text-[oklch(0.58_0.03_255)] hover:bg-[oklch(0.21_0.03_255)] hover:text-white'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-[oklch(0.45_0.03_255)] hover:bg-[oklch(0.21_0.03_255)] hover:text-white w-full text-left"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        Abmelden
      </button>
    </aside>
  )
}
