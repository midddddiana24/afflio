-- Afflio - billing foundation
-- Adds plans, subscriptions, and webhook_events for subscription-backed SaaS billing.

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  monthly_price_php numeric(10,2) not null default 0,
  yearly_price_php numeric(10,2),
  campaign_limit int not null default 0 check (campaign_limit >= 0),
  monthly_click_limit int not null default 0 check (monthly_click_limit >= 0),
  included_credits int not null default 0 check (included_credits >= 0),
  team_seat_limit int not null default 1 check (team_seat_limit >= 1),
  is_active boolean not null default true,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table plans enable row level security;

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  plan_id uuid not null references plans(id) on delete restrict,
  provider text not null check (provider in ('paymongo','xendit','stripe','manual')),
  provider_customer_id text,
  provider_subscription_id text,
  provider_price_id text,
  status text not null check (
    status in ('trialing','active','past_due','unpaid','canceled','incomplete','incomplete_expired','paused')
  ),
  billing_interval text not null default 'monthly' check (billing_interval in ('monthly','yearly','one_time')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  trial_ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table subscriptions enable row level security;

create table if not exists webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('paymongo','xendit','stripe','manual')),
  event_type text not null,
  provider_event_id text not null,
  related_user_id uuid references profiles(id) on delete set null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','processed','failed','ignored')),
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table webhook_events enable row level security;

create index if not exists plans_public_active_idx
  on plans (is_public, is_active);

create unique index if not exists subscriptions_provider_subscription_id_idx
  on subscriptions (provider, provider_subscription_id)
  where provider_subscription_id is not null;

create index if not exists subscriptions_user_status_idx
  on subscriptions (user_id, status, current_period_end desc);

create index if not exists subscriptions_plan_idx
  on subscriptions (plan_id);

create unique index if not exists webhook_events_provider_event_id_idx
  on webhook_events (provider, provider_event_id);

create index if not exists webhook_events_status_created_idx
  on webhook_events (status, created_at desc);

create index if not exists webhook_events_related_user_idx
  on webhook_events (related_user_id, created_at desc);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists plans_set_updated_at on plans;
create trigger plans_set_updated_at
  before update on plans
  for each row execute procedure set_updated_at();

drop trigger if exists subscriptions_set_updated_at on subscriptions;
create trigger subscriptions_set_updated_at
  before update on subscriptions
  for each row execute procedure set_updated_at();

create policy "plans: public read active public" on plans
  for select using (is_active = true and is_public = true);

create policy "plans: admin full access" on plans
  for all using (is_admin()) with check (is_admin());

create policy "subscriptions: owner read" on subscriptions
  for select using (auth.uid() = user_id);

create policy "subscriptions: admin full access" on subscriptions
  for all using (is_admin()) with check (is_admin());

create policy "webhook_events: admin full access" on webhook_events
  for all using (is_admin()) with check (is_admin());

insert into plans (
  code,
  name,
  description,
  monthly_price_php,
  yearly_price_php,
  campaign_limit,
  monthly_click_limit,
  included_credits,
  team_seat_limit,
  is_active,
  is_public
)
values
  (
    'free',
    'Free',
    'Starter plan for new affiliates testing the workflow.',
    0,
    0,
    5,
    500,
    0,
    1,
    true,
    true
  ),
  (
    'pro',
    'Pro',
    'Primary paid plan for active solo affiliates.',
    299,
    2990,
    100,
    25000,
    60,
    1,
    true,
    true
  ),
  (
    'agency',
    'Agency',
    'Higher-volume plan for teams managing multiple campaigns.',
    899,
    8990,
    500,
    150000,
    250,
    5,
    true,
    true
  )
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  monthly_price_php = excluded.monthly_price_php,
  yearly_price_php = excluded.yearly_price_php,
  campaign_limit = excluded.campaign_limit,
  monthly_click_limit = excluded.monthly_click_limit,
  included_credits = excluded.included_credits,
  team_seat_limit = excluded.team_seat_limit,
  is_active = excluded.is_active,
  is_public = excluded.is_public,
  updated_at = now();
