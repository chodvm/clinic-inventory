'use client'
import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabaseClient'

type Item = { id: string, item_name: string, qty_on_hand: number, sku: string | null }

export default function CountsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getSupabase().from('inventory_items').select('id,item_name,sku,qty_on_hand').order('item_name').then(({ data }) => setItems(data || []))
  }, [])

  async function submitCounts() {
    setSaving(true)
    try {
      const updates = Object.entries(counts)
      for (const [id, counted] of updates) {
        // naive variance adjust via RPC relative to current qty
        const { data } = await getSupabase().from('inventory_items').select('qty_on_hand').eq('id', id).single()
        if (!data) continue
        const delta = counted - data.qty_on_hand
        if (delta !== 0) {
          const fn = delta > 0 ? 'add_inventory' : 'deduct_inventory'
          const { error } = await getSupabase().rpc(fn, { p_item_id: id, p_qty: Math.abs(delta), p_reason: 'Cycle count adjustment' })
          if (error) throw error
        }
      }
      setCounts({})
      alert('Counts submitted.')
    } catch (e: any) {
      alert(e.message || 'Error submitting counts')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Cycle Counts</h1>
      <div className="card">
        <div className="grid grid-cols-1 gap-3">
          {items.map(it => (
            <div key={it.id} className="grid md:grid-cols-4 gap-2 items-center border-b border-white/10 pb-2">
              <div className="md:col-span-2">
                <div className="font-medium">{it.item_name}</div>
                <div className="text-xs opacity-70">SKU: {it.sku ?? '—'}</div>
              </div>
              <div>System: <span className="badge">{it.qty_on_hand}</span></div>
              <div className="flex gap-2 items-center">
                <input
                  className="input"
                  type="number"
                  placeholder="Counted qty"
                  value={counts[it.id] ?? ''}
                  onChange={(e) => setCounts(prev => ({ ...prev, [it.id]: parseInt(e.target.value || '0') }))}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <button className="btn" disabled={saving} onClick={submitCounts}>Submit Counts</button>
        </div>
      </div>
    </div>
  )
}
