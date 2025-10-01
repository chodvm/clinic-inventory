'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import SearchBar from '@/components/SearchBar'
import InventoryFilters, { type Filters } from '@/components/InventoryFilters'
import { getSupabase } from '@/lib/supabaseClient'

type Item = {
  id: string
  item_name: string
  sku: string | null
  qty_on_hand: number
  par_level_min: number | null
  storage_location_id: string | null
  category_id: string | null
  vendor_id: string | null
  storage_locations?: { name: string } | null   // Location column
  categories?: { name: string } | null         // Category next to name
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
  const [totalLoaded, setTotalLoaded] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const fetchPage = useCallback(async (reset = false) => {
    const sb = getSupabase()
    setLoading(true)

    let query = sb
      .from('inventory_items')
      .select(
        // include related names for category + location
        'id,item_name,sku,qty_on_hand,par_level_min,storage_location_id,category_id,vendor_id,categories(name),storage_locations(name)',
        { count: 'exact' }
      )

    // Search (name or SKU)
    if (q && q.trim()) {
      query = query.or(`item_name.ilike.%${q}%,sku.ilike.%${q}%`)
    }

    // Filters
    if (filters.categoryId) query = query.eq('category_id', filters.categoryId)
    if (filters.vendorId) query = query.eq('vendor_id', filters.vendorId)
    if (filters.locationId) query = query.eq('storage_location_id', filters.locationId)

    // Sort
    query = query.order(sortKey, { ascending: sortDir === 'asc' })

    // Pagination (disabled in low-stock-only view for correctness)
    const from = (reset ? 0 : page * PAGE_SIZE)
    const to = from + PAGE_SIZE - 1
    if (!filters.lowStockOnly) {
      query = query.range(from, to)
    }

    const { data, count, error } = await query
    setLoading(false)
    if (error) {
      console.error(error)
      return
    }
    const newList = (reset ? (data ?? []) : [...items, ...(data ?? [])]) as Item[]
    setItems(newList)
    setTotalLoaded(newList.length)

    if (!filters.lowStockOnly) {
      setHasMore((count ?? 0) > newList.length)
      setPage(reset ? 1 : page + 1)
    } else {
      setHasMore(false)
      setPage(0)
    }
  }, [filters.categoryId, filters.vendorId, filters.locationId, filters.lowStockOnly, items, page, q, sortDir, sortKey])

  // Initial load
  useEffect(() => { fetchPage(true) }, []) // eslint-disable-line

  // Re-fetch when search/filters/sort change
  useEffect(() => { fetchPage(true) }, [q, JSON.stringify(filters), sortKey, sortDir]) // eslint-disable-line

  // Client-side low stock view (qty_on_hand <= par_level_min)
  const visibleItems = useMemo(() => {
    if (!filters.lowStockOnly) return items
    return items.filter(it => typeof it.par_level_min === 'number' && it.qty_on_hand <= (it.par_level_min ?? 0))
  }, [items, filters.lowStockOnly])

  const lowCount = useMemo(
    () => visibleItems.filter(it => typeof it.par_level_min === 'number' && it.qty_on_hand <= (it.par_level_min ?? 0)).length,
    [visibleItems]
  )

  // Inline quick adjust (same row)
  async function adjustItem(itemId: string, delta: number) {
    const reason = window.prompt(`Reason for ${delta > 0 ? 'adding' : 'deducting'} ${Math.abs(delta)}?`)
    if (!reason || !reason.trim()) return
    const fn = delta > 0 ? 'add_inventory' : 'deduct_inventory'
    const { error } = await getSupabase().rpc(fn, { p_item_id: itemId, p_qty: Math.abs(delta), p_reason: reason })
    if (error) { alert(error.message); return }
    setItems(prev => prev.map(it => it.id === itemId ? { ...it, qty_on_hand: it.qty_on_hand + delta } : it))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <SearchBar onSearch={setQ} />
      </div>

      <InventoryFilters value={filters} onChange={setFilters} />

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="text-sm opacity-80">
          {loading ? 'Loading…' : `${visibleItems.length} item${visibleItems.length === 1 ? '' : 's'}${hasMore ? '…' : ''}`}
          {filters.lowStockOnly ? ' (low-stock view)' : ''}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm">Low stock in view:</div>
          <span className="badge">{lowCount}</span>
          <div className="ml-4">
            <label className="text-xs opacity-70 block">Sort by</label>
            <div className="flex gap-2">
              <select
                className="input"
                value={`${sortKey}:${sortDir}`}
                onChange={(e) => {
                  const [k, d] = e.target.value.split(':') as [SortKey, SortDir]
                  setSortKey(k)
                  setSortDir(d)
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
        </div>
      </div>

      <div className="card">
        {/* Header (12-column grid): Name(4) | Category(2) | Qty(1) | Par(1) | Location(2) | Actions(2) */}
        <div className="hidden sm:grid grid-cols-12 gap-3 px-3 py-2 text-xs uppercase tracking-wide opacity-70">
          <div className="col-span-4">Name</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-1 text-right">Qty</div>
          <div className="col-span-1 text-right">Par</div>
          <div className="col-span-2">Location</div>
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
                {/* Name (col 4) */}
                <div className="sm:col-span-4 min-w-0">
                  <div className="font-medium truncate">{it.item_name}</div>
                  {low && <span className="badge mt-1 inline-block">Low</span>}
                </div>

                {/* Category (col 2) */}
                <div className="sm:col-span-2">
                  <span className="badge">{it.categories?.name ?? '—'}</span>
                </div>

                {/* Qty (col 1) */}
                <div className="sm:col-span-1 sm:text-right">
                  <span className="badge">{it.qty_on_hand}</span>
                </div>

                {/* Par (col 1) */}
                <div className="sm:col-span-1 sm:text-right">
                  <span className="badge">{it.par_level_min ?? '—'}</span>
                </div>

                {/* Location (col 2) */}
                <div className="sm:col-span-2">
                  <span className="badge">{it.storage_locations?.name ?? '—'}</span>
                </div>

                {/* Actions (col 2) — now in the same row */}
                <div className="sm:col-span-2 flex gap-2 justify-end">
                  <button className="btn text-sm" onClick={() => adjustItem(it.id, +1)}>+1</button>
                  <button className="btn text-sm" onClick={() => adjustItem(it.id, -1)}>−1</button>
                  <Link href={`/items/${it.id}`} className="btn text-sm">Details</Link>
                </div>
              </div>
            )
          })}
        </div>

        {/* Pagination */}
        {!filters.lowStockOnly && hasMore && (
          <div className="mt-4 flex justify-center">
            <button className="btn" disabled={loading} onClick={() => fetchPage(false)}>Load more</button>
          </div>
        )}
      </div>
    </div>
  )
}
