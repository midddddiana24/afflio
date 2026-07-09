# Afflio

Turn product photos into trackable, previewable links — for TikTok/Shopee/Lazada affiliates.

This folder is a working Next.js starting point: the landing page is fully built, the database schema is written as a migration, Supabase client helpers are in place, and the `/c/[slug]` redirect route (the actual product mechanic) has a working stub.

## What's in here

```
afflio/
├── app/
│   ├── layout.tsx           → root layout, loads fonts
│   ├── page.tsx              → the landing page (built)
│   ├── globals.css           → design tokens + component styles (Hallmark system)
│   └── c/[slug]/page.tsx     → public redirect + OG-card route — THE product
├── lib/supabase/
│   ├── client.ts              → browser Supabase client
│   └── server.ts               → server Supabase client + service-role client
├── supabase/migrations/
│   └── 0001_init.sql          → full schema: profiles, campaigns, clicks,
│                                  token_transactions, payments, RLS policies,
│                                  storage buckets
├── .env.example
├── tailwind.config.ts         → for the dashboard/admin build-out
└── package.json
```

## Setup — do this in order

### 1. Create the Supabase project
1. Go to [supabase.com](https://supabase.com) → New Project.
2. Once it's provisioned, go to **Settings → API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key (keep this one server-side only, ever)
3. Copy `.env.example` to `.env.local` and fill in those three values, plus your project ref (the part before `.supabase.co`) as `SUPABASE_PROJECT_ID`.

### 2. Run the migration
Easiest path — paste the whole contents of `supabase/migrations/0001_init.sql` into the Supabase SQL Editor (Dashboard → SQL Editor → New query) and run it.

Or, if you have the Supabase CLI installed and linked to this project:
```bash
supabase link --project-ref your-project-ref
supabase db push
```

This creates every table, the two storage buckets (`campaign-images` public, `payment-proofs` private), and all the Row Level Security policies — including an `is_admin()` helper so admin accounts can manage everything without needing the service-role key for routine work.

**To make yourself an admin:** after you sign up once through the app (so a `profiles` row exists), run this in the SQL Editor:
```sql
update profiles set role = 'admin' where id = 'your-user-uuid';
```
(Find your user UUID under Authentication → Users.)

### 3. Install and run locally
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) — you should see the landing page.

### 4. Generate TypeScript types from your schema (do this after any migration change)
```bash
npm run supabase:types
```
This writes `lib/supabase/types.ts`. Both you and Codex should import from this file rather than hand-typing row shapes — it's the single source of truth that keeps frontend and backend from drifting apart.

### 5. Deploy to Vercel
1. Push this folder to a GitHub repo.
2. Import the repo in Vercel.
3. Add the same three env vars from `.env.local` (Project → Settings → Environment Variables). Don't add `SUPABASE_SERVICE_ROLE_KEY` unless a server function actually needs it — keep the blast radius small.
4. Deploy. Vercel + Next.js App Router handles the SSR needed for `/c/[slug]`'s per-campaign Open Graph tags automatically.

## What's built vs. what's next

**Built:**
- Landing page (`app/page.tsx`) — full marketing page, mobile-responsive, matches the design system in `app/globals.css`.
- Database schema + RLS (`supabase/migrations/0001_init.sql`).
- `/c/[slug]` route stub — resolves a campaign, sets per-request OG meta tags, logs a click, redirects. This needs the campaign creation form to exist first before there's any data to resolve.

**Next (see the roadmap in your setup guide doc):**
- Auth pages (`/login`, `/signup`) — Supabase Auth UI or a custom form using `lib/supabase/client.ts`.
- `(dashboard)` route group — campaign creation form, campaign list, analytics, wallet.
- `(admin)` route group — payment verification queue, user management.
- Image upload + resize pipeline into the `campaign-images` bucket.
- PayMongo/Xendit integration to replace the manual GCash approval flow once volume justifies it.

## Notes for whoever's touching the backend (Codex)

- `lib/supabase/server.ts` exports both a normal server client (respects RLS, use for anything a logged-in user does) and `createServiceRoleClient()` (bypasses RLS — only for trusted server-side admin actions, never called from anything the client can trigger directly).
- The `clicks` insert policy is deliberately wide open (`insert with check (true)`) because anonymous visitors need to log a click with no session. Don't tighten this without also handling the case where a logged-out visitor hits `/c/[slug]`.
- `campaigns.slug` should be generated with `nanoid` (already a dependency) at creation time — 6-8 chars, check for collision before insert.
