'use client'

import { useEffect, useMemo, useState } from 'react'
import { getSupabase } from '@/lib/supabaseClient'

type Item = {
  id: string
  item_name: string
  sku: string | null
  qty_on_hand: number
  category_id: string | null
  storage_location_id: string | null
}

type Option = { id: string; name: string }

export default function CountsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [counts, setCounts] = useState<Record<string, number | ''>>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  // search + filters
  const [q, setQ] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [locationId, setLocationId] = useState<string>('')
  const [categories, setCategories] = useState<Option[]>([])
  const [locations, setLocations] = useState<Option[]>([])
  const [showEditedOnly, setShowEditedOnly] = useState(false)

  // Load filter options (category/location)
  useEffect(() => {
    const sb = getSupabase()
    sb.from('categories').select('id,name').order('name')
      .then(({ data }) => setCategories(((data as any) ?? []) as Option[]))
    sb.from('storage_locations').select('id,name').order('name')
      .then(({ data }) => setLocations(((data as any) ?? []) as Option[]))
  }, [])

  // Load items with server-side filters (like inventory page)
  useEffect(() => {
    const sb = getSupabase()
    setLoading(true)

    let query = sb
      .from('inventory_items')
      .select('id,item_name,sku,qty_on_hand,category_id,storage_location_id')
      .order('item_name', { ascending: true })

    if (categoryId) query = query.eq('category_id', categoryId)
    if (locationId) query = query.eq('storage_location_id', locationId)

    query.then(({ data, error }) => {
      setLoading(false)
      if (!error) setItems((data as Item[]) ?? [])
    })
  }, [categoryId, locationId])

  const getVariance = (id: string, systemQty: number) => {
    const v = counts[id]
    if (v === '' || v === undefined) return null
    return (v as number) - systemQty
  }

  const enteredCount = useMemo(
    () => Object.values(counts).filter(v => v !== '' && v !== undefined).length,
    [counts]
  )

  const filteredItems = useMemo(() => {
    const term = q.trim().toLowerCase()
    let list = items
    if (term) {
      list = list.filter(it => it.item_name.toLowerCase().includes(term))
    }
    if (showEditedOnly) {
      list = list.filter(it => counts[it.id] !== '' && counts[it.id] !== undefined)
    }
    return list
  }, [items, q, showEditedOnly, counts])

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
            p_reason: 'Cycle count adjustment'
          })
          if (rpcErr) throw rpcErr
        }
      }

      setCounts({})
      alert('Counts submitted.')

      // refresh list
      const { data } = await getSupabase()
        .from('inventory_items')
        .select('id,item_name,sku,qty_on_hand,category_id,storage_location_id')
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
      {/* Header: title + search + edited-only toggle + submit */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Cycle Counts</h1>
        <div className="flex items-center gap-3">
          {/* Search by name */}
          <input
            className="input w-[260px]"
            placeholder="Search by name"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          {/* Show edited only toggle */}
          <label className="flex items-center cursor-pointer select-none">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={showEditedOnly}
                onChange={() => setShowEditedOnly(v => !v)}
                aria-label="Show edited only"
              />
              {/* track */}
              <div className="w-10 h-5 rounded-full bg-gray-300 dark:bg-gray-600 transition-colors" />
              {/* thumb */}
              <div className={`absolute -top-0.5 -left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${showEditedOnly ? 'translate-x-5' : ''}`} />
            </div>
            <span className="ml-2 text-sm">Edited only</span>
          </label>

          <button className="btn" disabled={saving || enteredCount === 0} onClick={submitCounts}>
            {saving ? 'Submitting…' : 'Submit Counts'}
          </button>
        </div>
      </div>

      {/* Filters: Category & Location (like inventory page, no vendor) */}
      <div className="card grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs opacity-70">Category</label>
          <select
            className="input"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">All</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs opacity-70">Location</label>
          <select
            className="input"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
          >
            <option value="">All</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div className="hidden md:block" />
      </div>

      <div className="card">
        {/* Sticky header (page scroll) */}
        <div className="hidden sm:grid grid-cols-12 gap-3 px-3 py-2 text-xs uppercase tracking-wide opacity-70 sticky top-0 bg-background z-10 border-b border-white/10">
          <div className="col-span-6">Name</div>
          <div className="col-span-2 text-right">System</div>
          <div className="col-span-2 text-right">Counted</div>
          <div className="col-span-2 text-right">Variance</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-white/10">
          {loading && <div className="px-3 py-3 opacity-80">Loading…</div>}
          {!loading && filteredItems.length === 0 && (
            <div className="px-3 py-3 opacity-70">No items found.</div>
          )}

          {!loading && filteredItems.map(it => {
            const variance = getVariance(it.id, it.qty_on_hand)
            const varianceText =
              variance === null ? '—' :
              variance > 0 ? `+${variance}` : `${variance}`
            const varianceClass =
              variance === null ? 'opacity-60' :
              variance > 0 ? 'text-emerald-400' : (variance < 0 ? 'text-rose-400' : 'opacity-80')

            return (
              <div key={it.id} className="px-3 py-3 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                {/* Name */}
                <div className="sm:col-span-6">
                  <div className="font-medium">{it.item_name}</div>
                  <div className="text-xs opacity-70">SKU: {it.sku ?? '—'}</div>
                </div>

                {/* System qty */}
                <div className="sm:col-span-2 sm:text-right">
                  <span className="badge">{it.qty_on_hand}</span>
                </div>

                {/* Counted input (no spinners) */}
                <div className="sm:col-span-2 sm:text-right">
                  <input
                    className="input text-right no-spinner"
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
                </div>

                {/* Variance (color-coded) */}
                <div className={`sm:col-span-2 sm:text-right ${varianceClass}`}>
                  {varianceText}
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
