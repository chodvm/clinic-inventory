'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import SearchBar from '@/components/SearchBar'
import InventoryFilters, { type Filters } from '@/components/InventoryFilters'
import { getSupabase } from '@/lib/supabaseClient'
import { REASONS, type ReasonCode } from '@/lib/reasons'

type Item = {
  id: string
  item_name: string
  sku: string | null
  qty_on_hand: number
  par_level_min: number | null
  storage_location_id: string | null
  category_id: string | null
  vendor_id: string | null
  storage_locations?: { name: string } | null
  categories?: { name: string } | null
}

const PAGE_SIZE = 30
type SortKey = 'item_name' | 'qty_on_hand' | 'par_level_min'
type SortDir = 'asc' | 'desc'

export default function InventoryList() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState<Filters>({})
  const [sortKey, setSortKey] = useState<SortKey>('item_name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  // Per-row selected reason
  const [reasonByItem, setReasonByItem] = useState<Record<string, ReasonCode | ''>>({})

  const fetchPage = useCallback(async (reset = false) => {
    const sb = getSupabase()
    setLoading(true)

    let query = sb
      .from('inventory_items')
      .select(
        'id,item_name,sku,qty_on_hand,par_level_min,storage_location_id,category_id,vendor_id,categories(name),storage_locations(name)',
        { count: 'exact' }
      )

    if (q && q.trim()) query = query.or(`item_name.ilike.%${q}%,sku.ilike.%${q}%`)
    if (filters.categoryId) query = query.eq('category_id', filters.categoryId)
    if (filters.vendorId) query = query.eq('vendor_id', filters.vendorId)
    if (filters.locationId) query = query.eq('storage_location_id', filters.locationId)

    query = query.order(sortKey, { ascending: sortDir === 'asc' })

    const from = (reset ? 0 : page * PAGE_SIZE)
    const to = from + PAGE_SIZE - 1
    if (!filters.lowStockOnly) query = query.range(from, to)

    const { data, count, error } = await query
    setLoading(false)
    if (error) { console.error(error); return }

    const newList = (reset ? (data ?? []) : [...items, ...(data ?? [])]) as Item[]
    setItems(newList)

    if (!filters.lowStockOnly) {
      setHasMore((count ?? 0) > newList.length)
      setPage(reset ? 1 : page + 1)
    } else {
      setHasMore(false)
      setPage(0)
    }
  }, [filters.categoryId, filters.vendorId, filters.locationId, filters.lowStockOnly, items, page, q, sortDir, sortKey])

  useEffect(() => { fetchPage(true) }, []) // initial
  useEffect(() => { fetchPage(true) }, [q, JSON.stringify(filters), sortKey, sortDir]) // on changes

  const visibleItems = useMemo(() => {
    if (!filters.lowStockOnly) return items
    return items.filter(it => typeof it.par_level_min === 'number' && it.qty_on_hand <= (it.par_level_min ?? 0))
  }, [items, filters.lowStockOnly])

  const lowCount = useMemo(
    () => visibleItems.filter(it => typeof it.par_level_min === 'number' && it.qty_on_hand <= (it.par_level_min ?? 0)).length,
    [visibleItems]
  )

  async function adjustItem(itemId: string, delta: number) {
    const reason = reasonByItem[itemId]
    if (!reason) { alert('Please select a reason first.'); return }
    const fn = delta > 0 ? 'add_inventory' : 'deduct_inventory'
    const { error } = await getSupabase().rpc(fn, { p_item_id: itemId, p_qty: Math.abs(delta), p_reason: reason })
    if (error) { alert(error.message); return }
    setItems(prev => prev.map(it => it.id === itemId ? { ...it, qty_on_hand: it.qty_on_hand + delta } : it))
  }

  return (
    <div className="space-y-4">
      {/* HEADER: Inventory title + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <div className="flex items-center gap-2">
          <SearchBar onSearch={setQ} />
        </div>
      </div>

      <InventoryFilters value={filters} onChange={setFilters} />

      {/* Controls row: Low-stock toggle switch + count, and Sort */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {/* Toggle switch for Low stock only */}
          <label className="flex items-center cursor-pointer select-none">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={!!filters.lowStockOnly}
                onChange={() => setFilters(f => ({ ...f, lowStockOnly: !f.lowStockOnly }))}
                aria-label="Toggle low stock only"
              />
              {/* track */}
              <div className="w-10 h-5 rounded-full bg-gray-300 dark:bg-gray-600 transition-colors" />
              {/* thumb */}
              <div
                className={`absolute -top-0.5 -left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  filters.lowStockOnly ? 'translate-x-5' : ''
                }`}
              />
            </div>
            <span className="ml-2 text-sm">Low stock only</span>
          </label>
          <span className="text-sm opacity-80">({lowCount})</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs opacity-70">Sort by</label>
          <select
            className="input"
            value={`${sortKey}:${sortDir}`}
            onChange={(e) => {
              const [k, d] = e.target.value.split(':') as [SortKey, SortDir]
              setSortKey(k); setSortDir(d)
            }}
          >
            <option value="item_name:asc">Name ↑</option>
            <option value="item_name:desc">Name ↓</option>
            <option value="qty_on_hand:asc">Qty ↑</option>
            <option value="qty_on_hand:desc">Qty ↓</option>
            <option value="par_level_min:asc">Par ↑</option>
            <option value="par_level_min:desc">Par ↓</option>
          </select>
        </div>
      </div>

      <div className="card">
        {/* ✅ Scrollable table body with sticky header inside the card */}
        <div className="relative max-h-[calc(100vh-260px)] overflow-y-auto">
          {/* Sticky Header (12-col) */}
          <div className="hidden sm:grid grid-cols-12 gap-3 px-3 py-2 text-xs uppercase tracking-wide opacity-70 sticky top-0 bg-background z-10 border-b border-white/10">
            <div className="col-span-3">Name</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-1 text-right">Qty</div>
            <div className="col-span-1 text-right">Par</div>
            <div className="col-span-2">Location</div>
            <div className="col-span-1">Reason</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/10">
            {loading && items.length === 0 && (
              <div className="px-3 py-3 opacity-80">Loading…</div>
            )}
            {!loading && visibleItems.length === 0 && (
              <div className="px-3 py-3 opacity-70">No matching items.</div>
            )}

            {visibleItems.map(it => {
              const low = typeof it.par_level_min === 'number' && it.qty_on_hand <= (it.par_level_min ?? 0)
              return (
                <div key={it.id} className="px-3 py-3 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  {/* Name (3) */}
                  <div className="sm:col-span-3 min-w-0">
                    <div className="font-medium truncate">{it.item_name}</div>
                    {low && <span className="badge mt-1 inline-block">Low</span>}
                  </div>

                  {/* Category (2) — plain text */}
                  <div className="sm:col-span-2 text-sm">
                    {it.categories?.name ?? '—'}
                  </div>

                  {/* Qty (1) — plain text */}
                  <div className="sm:col-span-1 sm:text-right text-sm">
                    {it.qty_on_hand}
                  </div>

                  {/* Par (1) — plain text */}
                  <div className="sm:col-span-1 sm:text-right text-sm">
                    {it.par_level_min ?? '—'}
                  </div>

                  {/* Location (2) — plain text */}
                  <div className="sm:col-span-2 text-sm">
                    {it.storage_locations?.name ?? '—'}
                  </div>

                  {/* Reason (1) */}
                  <div className="sm:col-span-1">
                    <select
                      className="input w-full"
                      value={reasonByItem[it.id] ?? ''}
                      onChange={(e) => setReasonByItem(prev => ({ ...prev, [it.id]: e.target.value as ReasonCode }))}
                    >
                      <option value="">Reason…</option>
                      {REASONS.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
                    </select>
                  </div>

                  {/* Actions (2) */}
                  <div className="sm:col-span-2 flex gap-2 justify-end">
                    <button className="btn text-sm" onClick={() => adjustItem(it.id, +1)}>+1</button>
                    <button className="btn text-sm" onClick={() => adjustItem(it.id, -1)}>−1</button>
                    <Link href={`/items/${it.id}`} className="btn text-sm">Details</Link>
                  </div>
                </div>
              )
            })}

            {/* Pagination inside scroll container */}
            {!filters.lowStockOnly && hasMore && (
              <div className="mt-4 flex justify-center pb-3">
                <button className="btn" disabled={loading} onClick={() => fetchPage(false)}>Load more</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
