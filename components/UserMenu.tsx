'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabaseClient'

export default function UserMenu() {
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getSupabase()
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null)
    })
    return () => { sub.subscription.unsubscribe() }
  }, [])

  async function signOut() {
    await getSupabase().auth.signOut()
    // Hard redirect so any client state is cleared
    window.location.href = '/login'
  }

  if (!email) {
    return <Link className="btn" href="/login">Log in</Link>
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs opacity-80 hidden sm:inline">Signed in as {email}</span>
      <button className="btn" onClick={signOut}>Sign out</button>
    </div>
  )
}
