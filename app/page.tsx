'use client'

import { useEffect, useMemo, useState } from 'react'
import { getSupabase } from '@/lib/supabaseClient'

type Item = {
  id: string
  item_name: string
  sku: string | null
  qty_on_hand: number
}

export default function CountsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [counts, setCounts] = useState<Record<string, number | ''>>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const sb = getSupabase()
    setLoading(true)
    sb.from('inventory_items')
      .select('id,item_name,sku,qty_on_hand')
      .order('item_name', { ascending: true })
      .then(({ data, error }) => {
        setLoading(false)
        if (!error) setItems((data as Item[]) ?? [])
      })
  }, [])

  // Helper to get variance quickly
  const getVariance = (id: string, systemQty: number) => {
    const v = counts[id]
    if (v === '' || v === undefined) return null
    return (v as number) - systemQty
  }

  // Optional: precompute how many have entries
  const enteredCount = useMemo(
    () => Object.values(counts).filter(v => v !== '' && v !== undefined).length,
    [counts]
  )

  async function submitCounts() {
    setSaving(true)
    try {
      const sb = getSupabase()
      const updates = Object.entries(counts).filter(([, v]) => v !== '' && v !== undefined)
      for (const [id, counted] of updates) {
        // Re-read current qty for concurrency safety
        const { data: row, error: readErr } = await sb
          .from('inventory_items')
          .select('qty_on_hand')
          .eq('id', id)
          .single()
        if (readErr || !row) continue

        const delta = (counted as number) - row.qty_on_hand
        if (delta !== 0) {
          const fn = delta > 0 ? 'add_inventory' : 'deduct_inventory'
          const { error: rpcErr } = await sb.rpc(fn, {
            p_item_id: id,
            p_qty: Math.abs(delta),
            p_reason: 'Cycle count adjustment'
          })
          if (rpcErr) throw rpcErr
        }
      }
      setCounts({})
      alert('Counts submitted.')
      // reload list to reflect new system quantities
      const { data } = await getSupabase()
        .from('inventory_items')
        .select('id,item_name,sku,qty_on_hand')
        .order('item_name', { ascending: true })
      setItems((data as Item[]) ?? [])
    } catch (e: any) {
      alert(e?.message ?? 'Error submitting counts')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Cycle Counts</h1>

      <div className="card">
        {/* Header */}
        <div className="hidden sm:grid grid-cols-12 gap-3 px-3 py-2 text-xs uppercase tracking-wide opacity-70">
          <div className="col-span-6">Name</div>
          <div className="col-span-2 text-right">System</div>
          <div className="col-span-2 text-right">Counted</div>
          <div className="col-span-2 text-right">Variance</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-white/10">
          {loading && (
            <div className="px-3 py-3 opacity-80">Loading…</div>
          )}

          {!loading && items.length === 0 && (
            <div className="px-3 py-3 opacity-70">No items found.</div>
          )}

          {!loading && items.map(it => {
            const variance = getVariance(it.id, it.qty_on_hand)
            const varianceText =
              variance === null ? '—' :
              variance > 0 ? `+${variance}` :
              `${variance}`

            return (
              <div key={it.id} className="px-3 py-3 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                {/* Name (with SKU as small secondary line) */}
                <div className="sm:col-span-6">
                  <div className="font-medium">{it.item_name}</div>
                  <div className="text-xs opacity-70">SKU: {it.sku ?? '—'}</div>
                </div>

                {/* System qty */}
                <div className="sm:col-span-2 sm:text-right">
                  <span className="badge">{it.qty_on_hand}</span>
                </div>

                {/* Counted input */}
                <div className="sm:col-span-2 sm:text-right">
                  <input
                    className="input text-right"
                    inputMode="numeric"
                    type="number"
                    min="0"
                    placeholder="Counted"
                    value={counts[it.id] ?? ''}
                    onChange={(e) => {
                      const val = e.target.value
                      // Allow blank (''), otherwise coerce to number >= 0
                      const next = val === '' ? '' : Math.max(0, parseInt(val, 10) || 0)
                      setCounts(prev => ({ ...prev, [it.id]: next }))
                    }}
                  />
                </div>

                {/* Variance */}
                <div className="sm:col-span-2 sm:text-right">
                  <span className="badge">{varianceText}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex items-center justify-between text-sm opacity-80 px-1">
          <div>{enteredCount} item(s) with counts entered</div>
          <button className="btn" disabled={saving || enteredCount === 0} onClick={submitCounts}>
            {saving ? 'Submitting…' : 'Submit Counts'}
          </button>
        </div>
      </div>
    </div>
  )
}
