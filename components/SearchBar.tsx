'use client'
import { useEffect, useRef, useState } from 'react'

export default function SearchBar({
  onSearch,
  autoFocus = true
}: {
  onSearch: (q: string) => void
  autoFocus?: boolean
}) {
  const [q, setQ] = useState('')
  const timer = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (autoFocus && inputRef.current) inputRef.current.focus()
  }, [autoFocus])

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => onSearch(q), 250)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [q, onSearch])

  return (
    <div className="flex gap-2 w-full max-w-lg">
      <input
        ref={inputRef}
        className="input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search items by name or SKU… (type to search)"
        onKeyDown={(e) => { if (e.key === 'Enter') onSearch(q) }}
      />
      <button className="btn" onClick={() => onSearch(q)}>Search</button>
    </div>
  )
}
