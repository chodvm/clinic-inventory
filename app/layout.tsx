import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Urgent Care Inventory',
  description: 'Inventory management for urgent care clinics'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-white/10">
          <div className="container py-4 flex items-center gap-4">
            <div className="text-lg font-semibold">🩺 Urgent Care Inventory</div>
            <nav className="ml-auto flex gap-3 text-sm">
              <a className="btn" href="/">Inventory</a>
              <a className="btn" href="/counts">Counts</a>
              <a className="btn" href="/transactions">Transactions</a>
              <a className="btn" href="/po">POs</a>
              <a className="btn" href="/admin">Admin</a>
            </nav>
          </div>
        </header>
        <main className="container py-6">{children}</main>
      </body>
    </html>
  )
}
