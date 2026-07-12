-- Afflio - production plan entitlements and efficient usage checks

alter table plans
  add column if not exists hotspot_limit int not null default 1 check (hotspot_limit >= 0),
  add column if not exists qr_enabled boolean not null default false,
  add column if not exists analytics_export_enabled boolean not null default false,
  add column if not exists custom_branding_enabled boolean not null default false;

update plans set
  hotspot_limit = case code when 'free' then 1 when 'pro' then 10 when 'agency' then 20 else hotspot_limit end,
  qr_enabled = code in ('pro', 'agency'),
  analytics_export_enabled = code in ('pro', 'agency'),
  custom_branding_enabled = code = 'agency'
where code in ('free', 'pro', 'agency');

create or replace function user_monthly_click_count(target_user_id uuid)
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select count(*)
  from clicks
  join campaigns on campaigns.id = clicks.campaign_id
  where campaigns.user_id = target_user_id
    and clicks.clicked_at >= date_trunc('month', now());
$$;

revoke all on function user_monthly_click_count(uuid) from public;
grant execute on function user_monthly_click_count(uuid) to service_role;
