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

  useEffect(() => {
    const sb = getSupabase()
    sb
      .from('inventory_items')
      .select('id,item_name,sku,qty_on_hand')
      .order('item_name', { ascending: true })
      .then(({ data }) => setItems((data as Item[]) ?? []))
  }, [])

  const enteredCount = useMemo(
    () => Object.values(counts).filter(v => v !== '' && v !== undefined).length,
    [counts]
  )

  async function submitCounts() {
    if (enteredCount === 0) return
    setSaving(true)
    try {
      const sb = getSupabase()
      const updates = Object.entries(counts).filter(([, v]) => v !== '' && v !== undefined)

      for (const [id, counted] of updates) {
        // re-read system qty to avoid using stale numbers
        const { data: row } = await sb
          .from('inventory_items')
          .select('qty_on_hand')
          .eq('id', id)
          .single()

        const systemQty = row?.qty_on_hand ?? 0
        const delta = (counted as number) - systemQty
        if (delta !== 0) {
          const fn = delta > 0 ? 'add_inventory' : 'deduct_inventory'
          const { error } = await sb.rpc(fn, {
            p_item_id: id,
            p_qty: Math.abs(delta),
            p_reason: 'Cycle count adjustment',
          })
          if (error) throw error
        }
      }

      setCounts({})
      alert('Counts submitted.')

      // refresh items
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Cycle Counts</h1>
        <div className="flex items-center gap-2">
          <button className="btn" disabled={saving || enteredCount === 0} onClick={submitCounts}>
            {saving ? 'Submitting…' : 'Submit Counts'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="hidden sm:grid grid-cols-12 gap-3 px-3 py-2 text-xs uppercase tracking-wide opacity-70 sticky top-0 bg-background z-10 border-b border-white/10">
          <div className="col-span-6">Name</div>
          <div className="col-span-3">SKU</div>
          <div className="col-span-3 text-right">Counted</div>
        </div>

        <div className="divide-y divide-white/10">
          {items.length === 0 && (
            <div className="px-3 py-3 opacity-70">No items.</div>
          )}

          {items.map((it) => (
            <div key={it.id} className="px-3 py-3 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              {/* Name (6) */}
              <div className="sm:col-span-6 min-w-0">
                <div className="font-medium truncate">{it.item_name}</div>
                <div className="text-xs opacity-70">On hand: {it.qty_on_hand}</div>
              </div>

              {/* SKU (3) */}
              <div className="sm:col-span-3 text-sm opacity-80">{it.sku ?? '—'}</div>

              {/* Counted (3) */}
              <div className="sm:col-span-3 sm:text-right">
                <div className="flex sm:justify-end gap-2">
                  <input
                    className="input text-right w-[140px]"
                    inputMode="numeric"
                    type="number"
                    min="0"
                    placeholder="Counted"
                    value={counts[it.id] ?? ''}
                    onChange={(e) => {
                      const val = e.target.value
                      const next = val === '' ? '' : Math.max(0, parseInt(val, 10) || 0)
                      setCounts(prev => ({ ...prev, [it.id]: next }))
                    }}
                  />
                  <button
                    className="btn text-xs px-2"
                    onClick={() => setCounts(prev => ({ ...prev, [it.id]: it.qty_on_hand }))}
                  >
                    Set = on hand
                  </button>
                </div>
              </div>
            </div>
          ))}
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
