import { UtensilsCrossed } from 'lucide-react'

interface TopBarProps {
  title: string
  action?: React.ReactNode
}

export function TopBar({ title, action }: TopBarProps) {
  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-border/60 bg-white/80 backdrop-blur-md md:px-6 sticky top-0 z-40">
      <div className="flex items-center gap-2 md:hidden">
        <div className="w-7 h-7 rounded-lg bg-[oklch(0.42_0.14_145)] flex items-center justify-center">
          <UtensilsCrossed className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="font-semibold text-sm">{title}</span>
      </div>
      <h1 className="hidden md:block text-xl font-bold tracking-tight">{title}</h1>
      {action && <div>{action}</div>}
    </header>
  )
}
