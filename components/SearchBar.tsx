'use client'
import { useState } from 'react'

export default function SearchBar({ onSearch }: { onSearch: (q: string) => void }) {
  const [q, setQ] = useState('')
  return (
    <div className="flex gap-2">
      <input
        className="input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search items by name or SKU…"
        onKeyDown={(e) => { if (e.key === 'Enter') onSearch(q) }}
      />
      <button className="btn" onClick={() => onSearch(q)}>Search</button>
    </div>
  )
}
