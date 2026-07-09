-- Afflio - click analytics hardening
-- Adds unique-click and bot-score support for richer reporting and abuse detection.

alter table clicks
  add column if not exists ip_hash text,
  add column if not exists bot_score int not null default 0 check (bot_score >= 0 and bot_score <= 100),
  add column if not exists is_unique boolean not null default true;

create index if not exists clicks_campaign_clicked_at_idx
  on clicks (campaign_id, clicked_at desc);

create index if not exists clicks_campaign_ip_hash_clicked_at_idx
  on clicks (campaign_id, ip_hash, clicked_at desc);

create index if not exists clicks_campaign_is_unique_clicked_at_idx
  on clicks (campaign_id, is_unique, clicked_at desc);
