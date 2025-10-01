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
  storage_locations?: { name: string } | null 
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

    let query = getSupabase().from('inventory_items')
      .select('id,item_name,sku,qty_on_hand,par_level_min,storage_location_id,category_id,vendor_id,storage_locations(name)', { count: 'exact' })

    if (q && q.trim()) {
      query = query.or(`item_name.ilike.%${q}%,sku.ilike.%${q}%`)
    }
    if (filters.categoryId) query = query.eq('category_id', filters.categoryId)
    if (filters.vendorId) query = query.eq('vendor_id', filters.vendorId)
    if (filters.locationId) query = query.eq('storage_location_id', filters.locationId)

    query = query.order(sortKey, { ascending: sortDir === 'asc' })

    const from = (reset ? 0 : page * PAGE_SIZE)
    const to = from + PAGE_SIZE - 1
    if (!filters.lowStockOnly) {
      query = query.range(from, to)
    }

    const { data, count, error } = await query
    setLoading(false)
    if (error) { console.error(error); return }

    let newList = (reset ? (data ?? []) : [...items, ...(data ?? [])]) as Item[]
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

  useEffect(() => { fetchPage(true) }, []) // initial
  useEffect(() => { fetchPage(true) }, [q, JSON.stringify(filters), sortKey, sortDir]) // re-run on changes

  const visibleItems = useMemo(() => {
    if (!filters.lowStockOnly) return items
    return items.filter(it => typeof it.par_level_min === 'number' && it.qty_on_hand <= (it.par_level_min ?? 0))
  }, [items, filters.lowStockOnly])

  const lowCount = useMemo(
    () => visibleItems.filter(it => typeof it.par_level_min === 'number' && it.qty_on_hand <= (it.par_level_min ?? 0)).length,
    [visibleItems]
  )

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
        {loading && items.length === 0 && (<div className="opacity-80">Loading…</div>)}
        {!loading && visibleItems.length === 0 && (<div className="opacity-70">No matching items.</div>)}

        <div className="grid grid-cols-1 gap-3">
          {visibleItems.map(it => {
            const low = typeof it.par_level_min === 'number' && it.qty_on_hand <= (it.par_level_min ?? 0)
            return (
              <div key={it.id} className="p-3 border border-white/10 rounded-xl hover:border-white/30 transition">
                <div className="font-medium line-clamp-1">{it.item_name}</div>
                <div className="text-xs opacity-70">SKU: {it.sku ?? '—'}</div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="badge">{it.qty_on_hand} on hand</span>
                  {low && <span className="badge">Low</span>}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button className="btn text-sm" onClick={() => adjustItem(it.id, +1)}>+1</button>
                  <button className="btn text-sm" onClick={() => adjustItem(it.id, -1)}>−1</button>
                  <Link href={`/items/${it.id}`} className="btn text-sm ml-auto">Details</Link>
                </div>
              </div>
            )
          })}
        </div>

        {!filters.lowStockOnly && hasMore && (
          <div className="mt-4 flex justify-center">
            <button className="btn" disabled={loading} onClick={() => fetchPage(false)}>Load more</button>
          </div>
        )}
      </div>
    </div>
  )
}
