-- Afflio — initial schema
-- Run via: supabase db push  (or paste into the Supabase SQL editor)

create extension if not exists "pgcrypto";

-- ============================================================
-- profiles (extends auth.users)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'client' check (role in ('client', 'admin')),
  token_balance int not null default 0,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "profiles: read own" on profiles
  for select using (auth.uid() = id);

create policy "profiles: update own" on profiles
  for update using (auth.uid() = id);

-- ============================================================
-- campaigns (the clickable card)
-- ============================================================
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  slug text unique not null,
  image_path text not null,
  destination_url text not null,
  title text,
  caption text,
  platform_source text,
  status text not null default 'active' check (status in ('active','paused','archived')),
  created_at timestamptz default now()
);

alter table campaigns enable row level security;

create policy "campaigns: owner full access" on campaigns
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Public read is required so the /c/[slug] redirect route (using the
-- anon key) can resolve a card without the visitor being logged in.
create policy "campaigns: public read active" on campaigns
  for select using (status = 'active');

-- ============================================================
-- clicks (analytics)
-- ============================================================
create table clicks (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  clicked_at timestamptz default now(),
  referrer text,
  user_agent text,
  country text,
  device_type text
);

alter table clicks enable row level security;

-- Anonymous visitors need to be able to insert a click row when they land
-- on /c/[slug]. This is intentionally narrow (insert-only, no select).
create policy "clicks: public insert" on clicks
  for insert with check (true);

create policy "clicks: owner read" on clicks
  for select using (
    exists (
      select 1 from campaigns
      where campaigns.id = clicks.campaign_id
      and campaigns.user_id = auth.uid()
    )
  );

-- ============================================================
-- token_transactions (audit trail)
-- ============================================================
create table token_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  amount int not null,
  type text not null check (type in ('purchase','campaign_spend','admin_adjustment','refund')),
  reference_id uuid,
  created_at timestamptz default now()
);

alter table token_transactions enable row level security;

create policy "token_transactions: owner read" on token_transactions
  for select using (auth.uid() = user_id);

-- ============================================================
-- payments (GCash manual verification flow)
-- ============================================================
create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  amount_php numeric not null,
  tokens_requested int not null,
  gcash_reference_number text,
  proof_image_path text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

alter table payments enable row level security;

create policy "payments: owner insert + read" on payments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Admin override policies
-- Admins are identified by profiles.role = 'admin'. These policies let an
-- admin account read/update everything without needing the service-role key
-- for routine dashboard work (approving payments, adjusting balances).
-- ============================================================

create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

create policy "profiles: admin full access" on profiles
  for all using (is_admin());

create policy "campaigns: admin full access" on campaigns
  for all using (is_admin());

create policy "clicks: admin read" on clicks
  for select using (is_admin());

create policy "payments: admin full access" on payments
  for all using (is_admin());

create policy "token_transactions: admin full access" on token_transactions
  for all using (is_admin());

-- ============================================================
-- Auto-create a profile row when a new auth user signs up
-- ============================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- Storage buckets
-- ============================================================
insert into storage.buckets (id, name, public)
values ('campaign-images', 'campaign-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

create policy "campaign-images: public read"
on storage.objects for select
using (bucket_id = 'campaign-images');

create policy "campaign-images: owner upload"
on storage.objects for insert
with check (bucket_id = 'campaign-images' and auth.uid() = owner);

create policy "payment-proofs: owner upload + read"
on storage.objects for all
using (bucket_id = 'payment-proofs' and auth.uid() = owner)
with check (bucket_id = 'payment-proofs' and auth.uid() = owner);
