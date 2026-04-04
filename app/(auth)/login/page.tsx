import { LoginForm } from '@/components/auth/LoginForm'
import { UtensilsCrossed } from 'lucide-react'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, oklch(0.18 0.05 145) 0%, oklch(0.28 0.08 160) 40%, oklch(0.22 0.06 55) 100%)',
        }}
      />
      {/* Subtle pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)',
        backgroundSize: '40px 40px',
      }} />
      {/* Blurred blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: 'oklch(0.55 0.16 145)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-15 blur-3xl" style={{ background: 'oklch(0.72 0.16 55)' }} />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-4 shadow-2xl">
            <UtensilsCrossed className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-white text-2xl font-bold">Kochbuch</h1>
          <p className="text-white/60 text-sm mt-1">Roman & Susanne</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl">
          <LoginForm />
        </div>
      </div>
    </main>
  )
}
