'use client'
import { useEffect, useState } from 'react'
import SearchBar from '@/components/SearchBar'
import { getSupabase } from '@/lib/supabaseClient'
import Link from 'next/link'

type Item = {
  id: string
  item_name: string
  sku: string | null
  qty_on_hand: number
  par_level_min: number | null
  storage_location_id: string | null
}

export default function InventoryList() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)

  async function fetchItems(q?: string) {
    setLoading(true)
    let query = getSupabase().from('inventory_items').select('id,item_name,sku,qty_on_hand,par_level_min,storage_location_id').limit(100).order('item_name')
    if (q && q.trim()) {
      // Simple ilike fallback; you can replace with RPC for trigram search later
      query = query.ilike('item_name', `%${q}%`)
    }
    const { data, error } = await query
    setLoading(false)
    if (error) {
      console.error(error)
      return
    }
    setItems(data ?? [])
  }

  useEffect(() => { fetchItems() }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <SearchBar onSearch={(q) => fetchItems(q)} />
      </div>

      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading && <div>Loading…</div>}
          {!loading && items.map(it => {
            const low = typeof it.par_level_min === 'number' && it.qty_on_hand <= it.par_level_min
            return (
              <Link key={it.id} href={`/items/${it.id}`} className="block p-3 border border-white/10 rounded-xl hover:border-white/30 transition">
                <div className="font-medium">{it.item_name}</div>
                <div className="text-xs opacity-70">{it.sku ?? '—'}</div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="badge">{it.qty_on_hand} on hand</span>
                  {low && <span className="badge">Low</span>}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
