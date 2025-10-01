import type { Metadata } from 'next'
import './globals.css'
import ThemeToggle from '@/components/ThemeToggle'

export const metadata: Metadata = {
  title: 'Urgent Care Inventory',
  description: 'Inventory management for urgent care clinics',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Set theme ASAP from saved preference or system setting (prevents flash) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function () {
  try {
    var t = localStorage.getItem('theme');
    if (!t) {
      t = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    document.documentElement.dataset.theme = t;
  } catch (e) {}
})();
            `.trim(),
          }}
        />
      </head>
      <body>
        {/* Global header with theme toggle (shown on every page) */}
        <header className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur">
          <div className="container py-4 flex items-center gap-4">
            <div className="text-lg font-semibold">🩺 Urgent Care Inventory</div>
            <nav className="ml-auto flex gap-3 text-sm items-center">
              <a className="btn" href="/">Inventory</a>
              <a className="btn" href="/counts">Counts</a>
              <a className="btn" href="/transactions">Transactions</a>
              <a className="btn" href="/po">POs</a>
              <a className="btn" href="/admin">Admin</a>
              {/* ✅ Single, global theme toggle lives here */}
              <ThemeToggle />
            </nav>
          </div>
        </header>

        {/* Page content */}
        <main className="container py-6">{children}</main>
      </body>
    </html>
  )
}
