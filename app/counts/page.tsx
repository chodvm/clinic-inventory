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
  const [q, setQ] = useState('')
  const [showEditedOnly, setShowEditedOnly] = useState(false)

  // load items
  useEffect(() => {
    const sb = getSupabase()
    sb
      .from('inventory_items')
      .select('id,item_name,sku,qty_on_hand')
      .order('item_name', { ascending: true })
      .then(({ data, error }) => {
        if (!error) setItems((data as Item[]) ?? [])
      })
  }, [])

  // derived: how many rows edited
  const enteredCount = useMemo(
    () => Object.values(counts).filter(v => v !== '' && v !== undefined).length,
    [counts]
  )

  // filter items by search
  const filteredItems = useMemo(() => {
    const term = q.trim().toLowerCase()
    let list = items
    if (term) {
      list = list.filter(
        it =>
          it.item_name.toLowerCase().includes(term) ||
          (it.sku?.toLowerCase().includes(term) ?? false)
      )
    }
    if (showEditedOnly) {
      list = list.filter(it => counts[it.id] !== '' && counts[it.id] !== undefined)
    }
    return list
  }, [items, q, showEditedOnly, counts])

  const getVariance = (id: string, systemQty: number) => {
    const v = counts[id]
    if (v === '' || v === undefined) return null
    return (v as number) - systemQty
  }

  // quick actions
  const setToOnHand = (it: Item) => {
    setCounts(prev => ({ ...prev, [it.id]: Math.max(0, it.qty_on_hand) }))
  }
  const inc = (it: Item) => {
    const curr = counts[it.id]
    const next = (curr === '' || curr === undefined) ? (it.qty_on_hand + 1) : (curr as number) + 1
    setCounts(prev => ({ ...prev, [it.id]: next }))
  }
  const dec = (it: Item) => {
    const curr = counts[it.id]
    const base = (curr === '' || curr === undefined) ? (it.qty_on_hand - 1) : (curr as number) - 1
    setCounts(prev => ({ ...prev, [it.id]: Math.max(0, base) }))
  }
  const clearOne = (it: Item) => {
    setCounts(prev => {
      const copy = { ...prev }
      copy[it.id] = ''
      return copy
    })
  }

  async function submitCounts() {
    if (enteredCount === 0) return
    setSaving(true)
    try {
      const sb = getSupabase()
      const updates = Object.entries(counts).filter(([, v]) => v !== '' && v !== undefined)

      for (const [id, counted] of updates) {
        // re-read system qty for safety
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
            // Keeping your current free-text reason by design
            p_reason: 'Cycle count adjustment',
          })
          if (rpcErr) throw rpcErr
        }
      }

      setCounts({})
      alert('Counts submitted.')

      // refresh list
      const { data } = await getSupabase()
        .from('inventory_items')
        .select('id,item_name,sku,qty_on_hand')
        .order('item_name', { ascending: true })
      setItems((data as Item[]) ?? [])
    } catch (e: any) {
      alert(e?.message ?? 'Failed to submit counts')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Cycle Counts</h1>
        <div className="flex items-center gap-2">
          {/* Search */}
          <input
            className="input w-[260px]"
            placeholder="Search by name or SKU"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {/* Show edited only */}
          <label className="flex items-center cursor-pointer select-none">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={showEditedOnly}
                onChange={() => setShowEditedOnly(v => !v)}
                aria-label="Show edited only"
              />
              <div className="w-10 h-5 rounded-full bg-gray-300 dark:bg-gray-600 transition-colors" />
              <div className={`absolute -top-0.5 -left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${showEditedOnly ? 'translate-x-5' : ''}`} />
            </div>
            <span className="ml-2 text-sm">Edited only</span>
          </label>
        </div>
      </div>

      <div className="card">
        {/* Sticky header (page scroll) */}
        <div className="hidden sm:grid grid-cols-12 gap-3 px-3 py-2 text-xs uppercase tracking-wide opacity-70 sticky top-0 bg-background z-10 border-b border-white/10">
          <div className="col-span-4">Name</div>
          <div className="col-span-2">SKU</div>
          <div className="col-span-2 text-right">On hand</div>
          <div className="col-span-2 text-right">Counted</div>
          <div className="col-span-2 text-right">Δ</div>
        </div>

        <div className="divide-y divide-white/10">
          {filteredItems.length === 0 && (
            <div className="px-3 py-3 opacity-70">No items.</div>
          )}

          {filteredItems.map((it) => {
            const variance = getVariance(it.id, it.qty_on_hand)
            const varianceClass =
              variance == null
                ? 'opacity-50'
                : variance === 0
                ? 'opacity-70'
                : variance > 0
                ? 'text-emerald-400'
                : 'text-rose-400'

            return (
              <div key={it.id} className="px-3 py-3 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                {/* Name (4) */}
                <div className="sm:col-span-4 min-w-0">
                  <div className="font-medium truncate">{it.item_name}</div>
                </div>

                {/* SKU (2) */}
                <div className="sm:col-span-2 text-sm opacity-80">{it.sku ?? '—'}</div>

                {/* On hand (2) */}
                <div className="sm:col-span-2 sm:text-right text-sm">{it.qty_on_hand}</div>

                {/* Counted (2) */}
                <div className="sm:col-span-2 sm:text-right">
                  <div className="flex sm:justify-end gap-2">
                    <input
                      className="input text-right w-[110px]"
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
                    {/* Quick actions */}
                    <div className="flex items-center gap-1">
                      <button className="btn text-xs px-2" onClick={() => dec(it)}>−1</button>
                      <button className="btn text-xs px-2" onClick={() => inc(it)}>+1</button>
                      <button className="btn text-xs px-2" onClick={() => setToOnHand(it)}>=</button>
                      <button className="btn text-xs px-2" onClick={() => clearOne(it)}>Clear</button>
                    </div>
                  </div>
                </div>

                {/* Variance Δ (2) */}
                <div className={`sm:col-span-2 sm:text-right text-sm ${varianceClass}`}>
                  {variance == null ? '—' : variance > 0 ? `+${variance}` : `${variance}`}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer actions */}
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
