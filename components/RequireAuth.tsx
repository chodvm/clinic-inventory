'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabaseClient'

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = getSupabase()
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/login')
      else setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/login')
    })
    return () => { sub.subscription.unsubscribe() }
  }, [router])

  if (!ready) return null
  return <>{children}</>
}
