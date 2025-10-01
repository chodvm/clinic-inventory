'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabaseClient'
import { REASONS, type ReasonCode } from '@/lib/reasons'

type Item = {
  id: string
  item_name: string
  sku: string | null
  qty_on_hand: number
  notes: string | null
  is_controlled: boolean | null
  par_level_min: number | null
  categories?: { name: string } | null
  storage_locations?: { name: string } | null
}

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [item, setItem] = useState<Item | null>(null)
  const [delta, setDelta] = useState<number>(1)
  const [reasonCode, setReasonCode] = useState<ReasonCode | ''>('') // standardized reason
  const [loading, setLoading] = useState(false)

  async function load() {
    const { data, error } = await getSupabase()
      .from('inventory_items')
      .select('*, categories(name), storage_locations(name)')
      .eq('id', id)
      .single()
    if (!error) setItem(data as unknown as Item)
  }

  useEffect(() => { load() }, [id])

  async function callRPC(fn: 'add_inventory'|'deduct_inventory') {
    if (!item) return
    if (!reasonCode) { alert('Please select a reason.'); return }
    if (!delta || delta <= 0) { alert('Enter a quantity greater than zero.'); return }
    setLoading(true)
    const { error } = await getSupabase().rpc(fn, {
      p_item_id: item.id,
      p_qty: Math.abs(delta),
      p_reason: reasonCode
    })
    setLoading(false)
    if (error) {
      alert(error.message)
    } else {
      await load()
      // keep selected reason for speed; to clear, uncomment:
      // setReasonCode('')
    }
  }

  if (!item) return <div>Loading…</div>

  const low = typeof item.par_level_min === 'number' && item.qty_on_hand <= (item.par_level_min ?? 0)

  return (
    <div className="space-y-4">
      <button className="btn" onClick={() => router.back()}>&larr; Back</button>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left: details */}
        <div className="lg:col-span-2 card space-y-2">
          <h1 className="text-2xl font-semibold">{item.item_name}</h1>
          <div className="text-sm opacity-75">SKU: {item.sku ?? '—'}</div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="badge">{item.qty_on_hand} on hand</span>
            {low && <span className="badge">Low</span>}
            {item.is_controlled ? <span className="badge">Controlled</span> : null}
            {item.categories?.name && <span className="badge">{item.categories.name}</span>}
            {item.storage_locations?.name && <span className="badge">{item.storage_locations.name}</span>}
          </div>
          {item.notes && <p className="text-sm mt-3 opacity-80">{item.notes}</p>}
        </div>

        {/* Right: quick adjust with standardized reason */}
        <div className="card space-y-3">
          <div className="font-medium">Quick adjust</div>

          <div className="grid grid-cols-2 gap-2">
            <input
              className="input"
              type="number"
              min={1}
              value={delta}
              onChange={(e)=>setDelta(parseInt(e.target.value || '1'))}
              placeholder="Qty"
            />
            <select
              className="input"
              value={reasonCode}
              onChange={(e)=>setReasonCode(e.target.value as ReasonCode)}
            >
              <option value="">Reason…</option>
              {REASONS.map(r => (
                <option key={r.code} value={r.code}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button disabled={loading} className="btn" onClick={()=>callRPC('add_inventory')}>+ Add</button>
            <button disabled={loading} className="btn" onClick={()=>callRPC('deduct_inventory')}>− Deduct</button>
          </div>

          <p className="text-xs opacity-70">All adjustments are recorded in the audit log with your selected reason.</p>
        </div>
      </div>

      <ItemHistory itemId={item.id} />
    </div>
  )
}

function ItemHistory({ itemId }: { itemId: string }) {
  const [rows, setRows] = useState<any[]>([])
  useEffect(() => {
    getSupabase().from('inventory_transactions')
      .select('created_at, qty_change, reason')
      .eq('item_id', itemId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setRows(data || []))
  }, [itemId])

  return (
    <div className="card mt-4">
      <div className="font-medium mb-2">History</div>
      <div className="space-y-2">
        {rows.map((r, idx) => (
          <div key={idx} className="flex justify-between text-sm border-b border-white/10 pb-1">
            <div className="opacity-80">{new Date(r.created_at).toLocaleString()}</div>
            <div>
              {r.qty_change >= 0 ? `+${r.qty_change}` : `${r.qty_change}`} &nbsp; / {r.reason ?? '—'}
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="text-sm opacity-70">No transactions yet.</div>}
      </div>
    </div>
  )
}
