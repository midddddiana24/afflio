-- Afflio - prevent active campaigns from leaking into other client dashboards.
-- Public campaign pages resolve by slug on the trusted server service role.

drop policy if exists "campaigns: public read active" on campaigns;
drop policy if exists "campaign_hotspots: public read active" on campaign_hotspots;

-- Make owner semantics explicit for each operation. The original all-policy
-- remains valid; these statements are defensive documentation for new setups.
create index if not exists campaigns_user_created_at_idx
  on campaigns (user_id, created_at desc);
