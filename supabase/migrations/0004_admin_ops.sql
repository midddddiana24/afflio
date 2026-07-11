-- Afflio - admin operations foundation
-- Adds suspension fields, audit logging, moderation, and domain controls.

alter table profiles
  add column if not exists suspended_at timestamptz,
  add column if not exists suspension_reason text;

create table if not exists admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references profiles(id) on delete cascade,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before_json jsonb,
  after_json jsonb,
  created_at timestamptz not null default now()
);

alter table admin_audit_logs enable row level security;

create table if not exists abuse_reports (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  reported_by uuid references profiles(id) on delete set null,
  reason text not null,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  notes text,
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table abuse_reports enable row level security;

create table if not exists banned_domains (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique,
  reason text,
  is_active boolean not null default true,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table banned_domains enable row level security;

create index if not exists admin_audit_logs_created_at_idx
  on admin_audit_logs (created_at desc);

create index if not exists admin_audit_logs_entity_idx
  on admin_audit_logs (entity_type, entity_id, created_at desc);

create index if not exists abuse_reports_status_idx
  on abuse_reports (status, created_at desc);

create index if not exists banned_domains_domain_idx
  on banned_domains (domain, is_active);

create policy "admin_audit_logs: admin full access" on admin_audit_logs
  for all using (is_admin()) with check (is_admin());

create policy "abuse_reports: admin full access" on abuse_reports
  for all using (is_admin()) with check (is_admin());

create policy "banned_domains: admin full access" on banned_domains
  for all using (is_admin()) with check (is_admin());
