import { TopBar } from '@/components/layout/TopBar'
import { DailyMenuGrid } from '@/components/daily/DailyMenuGrid'

export default function DailyPage() {
  const today = new Date().toLocaleDateString('de-CH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <>
      <TopBar title="Heute" />

      {/* Hero Banner */}
      <div className="relative overflow-hidden h-36 md:h-48 w-full">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, oklch(0.28 0.08 145) 0%, oklch(0.38 0.12 160) 40%, oklch(0.55 0.14 55) 100%)',
          }}
        />
        {/* Decorative food pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px), radial-gradient(circle at 60% 80%, white 1px, transparent 1px)',
          backgroundSize: '80px 80px, 120px 120px, 60px 60px',
        }} />
        <div className="relative z-10 h-full flex flex-col justify-end px-4 pb-5 md:px-6">
          <p className="text-green-200 text-xs font-medium uppercase tracking-widest mb-1">
            {today}
          </p>
          <h2 className="text-white text-2xl md:text-3xl font-bold">
            Was kochst du heute?
          </h2>
          <p className="text-green-100/80 text-sm mt-0.5">3 frische Rezeptvorschläge für dich</p>
        </div>
      </div>

      <main className="flex-1 p-4 md:p-6 space-y-6 -mt-2">
        <DailyMenuGrid />
      </main>
    </>
  )
}
