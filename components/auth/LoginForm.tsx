'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Mode = 'login' | 'reset'

export function LoginForm() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    const supabase = createClient()

    if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
      })
      setLoading(false)
      if (error) {
        setError('Fehler beim Senden der E-Mail. Bitte versuche es erneut.')
      } else {
        setSuccess('E-Mail gesendet! Prüfe deinen Posteingang.')
      }
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('E-Mail oder Passwort falsch.')
      setLoading(false)
      return
    }

    router.push('/daily')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-white/80 text-sm">E-Mail</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@beispiel.ch"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:bg-white/15"
        />
      </div>

      {mode === 'login' && (
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-white/80 text-sm">Passwort</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:bg-white/15"
          />
        </div>
      )}

      {error && <p className="text-sm text-red-300">{error}</p>}
      {success && <p className="text-sm text-green-300">{success}</p>}

      <Button
        type="submit"
        className="w-full bg-[oklch(0.42_0.14_145)] hover:bg-[oklch(0.38_0.14_145)] text-white border-0 mt-2"
        disabled={loading}
      >
        {loading
          ? mode === 'reset' ? 'Sende E-Mail...' : 'Anmelden...'
          : mode === 'reset' ? 'Reset-Link senden' : 'Anmelden'}
      </Button>

      <button
        type="button"
        onClick={() => { setMode(mode === 'login' ? 'reset' : 'login'); setError(null); setSuccess(null) }}
        className="w-full text-center text-xs text-white/40 hover:text-white/70 transition-colors pt-1"
      >
        {mode === 'login' ? 'Passwort vergessen?' : '← Zurück zum Login'}
      </button>
    </form>
  )
}
