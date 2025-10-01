'use client'
import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabaseClient'

type Option = { id: string, name: string }

export type Filters = {
  categoryId?: string
  vendorId?: string
  locationId?: string
  lowStockOnly?: boolean
}

export default function InventoryFilters({
  value,
  onChange
}: {
  value: Filters,
  onChange: (f: Filters) => void
}) {
  const [categories, setCategories] = useState<Option[]>([])
  const [vendors, setVendors] = useState<Option[]>([])
  const [locations, setLocations] = useState<Option[]>([])

  useEffect(() => {
    const sb = getSupabase()
    sb.from('categories').select('id,name').order('name')
      .then(({ data }) => setCategories((data as any) ?? []))
    sb.from('vendors').select('id,vendor_name').order('vendor_name')
      .then(({ data }) => setVendors(((data as any) ?? []).map((v:any)=>({ id: v.id, name: v.vendor_name }))))
    sb.from('storage_locations').select('id,name').order('name')
      .then(({ data }) => setLocations((data as any) ?? []))
  }, [])

  return (
    <div className="card grid grid-cols-1 md:grid-cols-5 gap-3">
      <div>
        <label className="text-xs opacity-70">Category</label>
        <select
          className="input"
          value={value.categoryId ?? ''}
          onChange={(e)=>onChange({ ...value, categoryId: e.target.value || undefined })}
        >
          <option value="">All</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs opacity-70">Vendor</label>
        <select
          className="input"
          value={value.vendorId ?? ''}
          onChange={(e)=>onChange({ ...value, vendorId: e.target.value || undefined })}
        >
          <option value="">All</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs opacity-70">Location</label>
        <select
          className="input"
          value={value.locationId ?? ''}
          onChange={(e)=>onChange({ ...value, locationId: e.target.value || undefined })}
        >
          <option value="">All</option>
          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={value.lowStockOnly ?? false}
          onChange={(e)=>onChange({ ...value, lowStockOnly: e.target.checked })}
        />
        <span className="text-sm">Low stock only</span>
      </label>
      {/* spacer for layout */}
      <div className="hidden md:block" />
    </div>
  )
}
