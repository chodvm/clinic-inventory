'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // If already logged in, go to home
  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/')
    })
  }, [router])

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const supabase = getSupabase()
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined }
      })
      if (error) throw error
      setSent(true)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to send magic link.')
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="card max-w-md w-full space-y-4">
        <h1 className="text-2xl font-semibold text-center">Log in</h1>
        <p className="text-sm opacity-80 text-center">
          Enter your work email to get a one-time login link.
        </p>

        {sent ? (
          <div className="p-3 rounded bg-white/5 border border-white/10 text-sm">
            Check your inbox for the magic link. After you click it, you’ll be signed in here.
          </div>
        ) : (
          <form onSubmit={handleSignIn} className="space-y-3">
            <input
              type="email"
              className="input w-full"
              placeholder="you@clinic.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button className="btn w-full" type="submit">Send magic link</button>
          </form>
        )}

        {error && <div className="text-sm text-red-400">{error}</div>}
      </div>
    </div>
  )
}
