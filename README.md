# Urgent Care Inventory — Next.js + Supabase Starter

A minimal, production-ready starter for your custom inventory app:
- **Next.js (App Router) + TypeScript**
- **TailwindCSS**
- **Supabase (Auth/DB)** wired for client-side reads and RPC writes
- Pages for **Inventory**, **Item Detail** with quick adjustments, **Counts**, **Transactions**

> This is a thin skeleton to deploy on Vercel and connect to your existing Supabase project with the schema you provided.

---

## 1) Local Setup

```bash
pnpm install # or npm install / yarn
cp .env.example .env
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from your Supabase project
pnpm dev
```

Visit http://localhost:3000

---

## 2) Supabase Setup

Use your existing database schema (v1.1). Ensure these RPCs exist and are granted to `authenticated`:

- `add_inventory(p_item_id uuid, p_qty integer, p_reason text, p_location_id uuid, p_lot text, p_exp date)`
- `deduct_inventory(p_item_id uuid, p_qty integer, p_reason text, p_location_id uuid, p_lot text, p_exp date)`

The app calls those RPCs from the **Item Detail** and **Counts** pages.

**Auth**: This starter uses the public anon key for browser auth persistence. Enable **Email OTP/Magic Link** in Supabase Auth if you want login flows (you can add protected routes later).

---

## 3) Deploy on Vercel

1. Push this repo to GitHub.
2. In Vercel: **New Project → Import** your repo.
3. Set **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy. After deploy, open the URL and test Inventory list and Item adjustments.

---

## 4) Notes & Next Steps

- **Security**: All stock changes go through RPCs; DB RLS should enforce who can read/write.
- **Search**: Current search uses `ilike`. Upgrade later to a server function that leverages `pg_trgm` for fuzzy search.
- **POs/Admin**: Pages are stubbed; we’ll add CRUD flows next.
- **Barcode**: Add camera scanning (e.g., ZXing/Quagga) to the list and count pages as a next increment.
- **Protected Routes**: Add a simple auth gate (server-side) to limit pages to logged-in users only.
- **Styling**: Tailwind utilities are provided; feel free to brand.

---

## Troubleshooting

- If RPCs fail with permissions, verify RLS policies and that `authenticated` role has `EXECUTE` on the functions.
- If the list is empty, confirm your `inventory_items` table has data and that your anon key can `select` via RLS.
