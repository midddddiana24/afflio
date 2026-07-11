-- Afflio - complete clickable campaign workflow

alter table campaigns drop constraint if exists campaigns_status_check;
alter table campaigns
  add constraint campaigns_status_check
  check (status in ('draft', 'active', 'paused', 'archived'));

create table if not exists campaign_hotspots (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  destination_url text not null,
  platform_source text,
  x_percent numeric(6,3) not null check (x_percent between 0 and 100),
  y_percent numeric(6,3) not null check (y_percent between 0 and 100),
  width_percent numeric(6,3) not null default 16 check (width_percent between 3 and 100),
  height_percent numeric(6,3) not null default 12 check (height_percent between 3 and 100),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table campaign_hotspots enable row level security;

create policy "campaign_hotspots: owner full access" on campaign_hotspots
  for all using (
    exists (select 1 from campaigns where campaigns.id = campaign_hotspots.campaign_id and campaigns.user_id = auth.uid())
  ) with check (
    exists (select 1 from campaigns where campaigns.id = campaign_hotspots.campaign_id and campaigns.user_id = auth.uid())
  );

create policy "campaign_hotspots: public read active" on campaign_hotspots
  for select using (
    exists (select 1 from campaigns where campaigns.id = campaign_hotspots.campaign_id and campaigns.status = 'active')
  );

create policy "campaign_hotspots: admin full access" on campaign_hotspots
  for all using (is_admin()) with check (is_admin());

alter table clicks
  add column if not exists hotspot_id uuid references campaign_hotspots(id) on delete set null,
  add column if not exists event_type text not null default 'click' check (event_type in ('view', 'click'));

create table if not exists conversion_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  hotspot_id uuid references campaign_hotspots(id) on delete set null,
  event_name text not null check (char_length(event_name) between 1 and 64),
  external_id text,
  value numeric(12,2),
  currency text check (currency is null or char_length(currency) = 3),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

alter table conversion_events enable row level security;

create policy "conversion_events: owner read" on conversion_events
  for select using (
    exists (select 1 from campaigns where campaigns.id = conversion_events.campaign_id and campaigns.user_id = auth.uid())
  );

create policy "conversion_events: admin read" on conversion_events
  for select using (is_admin());

create index if not exists campaign_hotspots_campaign_sort_idx
  on campaign_hotspots (campaign_id, sort_order);
create index if not exists clicks_hotspot_clicked_at_idx
  on clicks (hotspot_id, clicked_at desc);
create index if not exists conversion_events_campaign_occurred_idx
  on conversion_events (campaign_id, occurred_at desc);
