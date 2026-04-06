'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UtensilsCrossed } from 'lucide-react'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Die Passwörter stimmen nicht überein.')
      return
    }
    if (password.length < 8) {
      setError('Das Passwort muss mindestens 8 Zeichen lang sein.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('Fehler beim Speichern des Passworts. Bitte erneut versuchen.')
      setLoading(false)
      return
    }

    router.push('/daily')
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, oklch(0.18 0.05 145) 0%, oklch(0.28 0.08 160) 40%, oklch(0.22 0.06 55) 100%)',
        }}
      />
      <div className="relative z-10 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-4 shadow-2xl">
            <UtensilsCrossed className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-white text-2xl font-bold">Neues Passwort</h1>
          <p className="text-white/60 text-sm mt-1">Wähle ein neues Passwort</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-white/80 text-sm">Neues Passwort</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:bg-white/15"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm" className="text-white/80 text-sm">Passwort bestätigen</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                minLength={8}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:bg-white/15"
              />
            </div>
            {error && <p className="text-sm text-red-300">{error}</p>}
            <Button
              type="submit"
              className="w-full bg-[oklch(0.42_0.14_145)] hover:bg-[oklch(0.38_0.14_145)] text-white border-0 mt-2"
              disabled={loading}
            >
              {loading ? 'Speichern...' : 'Passwort speichern'}
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}
