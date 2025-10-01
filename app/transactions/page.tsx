'use client'
import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabaseClient'

export default function TransactionsPage() {
  const [rows, setRows] = useState<any[]>([])

  useEffect(() => {
    getSupabase().from('inventory_transactions')
      .select('created_at, qty_change, reason')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => setRows(data || []))
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Transactions</h1>
      <div className="card space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex justify-between text-sm border-b border-white/10 pb-1">
            <div className="opacity-80">{new Date(r.created_at).toLocaleString()}</div>
            <div>{r.qty_change >= 0 ? `+${r.qty_change}` : `${r.qty_change}`} &nbsp; / {r.reason ?? '—'}</div>
          </div>
        ))}
        {rows.length === 0 && <div className="text-sm opacity-70">No transactions found.</div>}
      </div>
    </div>
  )
}
