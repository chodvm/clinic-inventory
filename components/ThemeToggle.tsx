'use client'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light'|'dark'>('dark')

  // Initialize from saved preference or OS setting
  useEffect(() => {
    const saved = (typeof window !== 'undefined')
      ? (localStorage.getItem('theme') as 'light'|'dark'|null)
      : null

    const preferred: 'light'|'dark' =
      saved ?? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

    setTheme(preferred)
    // Your app uses data-theme on <html>, keep that behavior
    document.documentElement.dataset.theme = preferred
  }, [])

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.dataset.theme = next
    localStorage.setItem('theme', next)
  }

  return (
    <label className="flex items-center cursor-pointer select-none">
      <div className="relative">
        {/* screen-reader input */}
        <input
          type="checkbox"
          className="sr-only"
          checked={theme === 'dark'}
          onChange={toggle}
          aria-label="Toggle dark mode"
        />
        {/* track */}
        <div className="w-10 h-5 rounded-full bg-gray-300 transition-colors
                        data-[theme=dark]:bg-gray-600"
             data-theme={theme} />
        {/* thumb */}
        <div
          className={`absolute -top-0.5 -left-1 w-5 h-5 rounded-full bg-white shadow transition-transform
                      ${theme === 'dark' ? 'translate-x-5' : ''}`}
        />
      </div>
      <span className="ml-2 text-sm">{theme === 'dark' ? 'Dark' : 'Light'} mode</span>
    </label>
  )
}
