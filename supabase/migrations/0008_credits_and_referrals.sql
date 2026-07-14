-- Afflio - secure campaign credits and friend referrals

alter table profiles
  add column if not exists referral_code text,
  add column if not exists referred_by uuid references profiles(id) on delete set null;

update profiles
set referral_code = lower(substr(encode(gen_random_bytes(8), 'hex'), 1, 10))
where referral_code is null;

alter table profiles
  alter column referral_code set default lower(substr(encode(gen_random_bytes(8), 'hex'), 1, 10)),
  alter column referral_code set not null;

create unique index if not exists profiles_referral_code_key on profiles (referral_code);

alter table token_transactions drop constraint if exists token_transactions_type_check;
alter table token_transactions add constraint token_transactions_type_check
  check (type in ('purchase', 'campaign_spend', 'admin_adjustment', 'refund', 'starter_bonus', 'referral_bonus'));

create unique index if not exists token_transactions_campaign_spend_key
  on token_transactions (user_id, reference_id)
  where type = 'campaign_spend' and reference_id is not null;

create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references profiles(id) on delete cascade,
  referred_user_id uuid not null unique references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'rewarded', 'rejected')),
  referrer_reward int not null default 5 check (referrer_reward >= 0),
  friend_reward int not null default 5 check (friend_reward >= 0),
  rewarded_at timestamptz,
  created_at timestamptz not null default now(),
  check (referrer_id <> referred_user_id)
);

alter table referrals enable row level security;
create policy "referrals: participants read" on referrals
  for select using (auth.uid() = referrer_id or auth.uid() = referred_user_id);
create policy "referrals: admin read" on referrals
  for select using (is_admin());
create index if not exists referrals_referrer_created_idx on referrals (referrer_id, created_at desc);

with eligible as (
  select p.id from profiles p
  where p.token_balance = 0
    and not exists (select 1 from token_transactions t where t.user_id = p.id)
)
update profiles p set token_balance = 5 from eligible e where p.id = e.id;

insert into token_transactions (user_id, amount, type)
select p.id, 5, 'starter_bonus' from profiles p
where p.token_balance = 5
  and not exists (select 1 from token_transactions t where t.user_id = p.id);

create or replace function reward_verified_referral(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare referral_row referrals%rowtype;
begin
  select * into referral_row from referrals
  where referred_user_id = p_user_id and status = 'pending' for update;
  if not found then return; end if;

  update profiles set token_balance = token_balance + referral_row.referrer_reward
  where id = referral_row.referrer_id;
  update profiles set token_balance = token_balance + referral_row.friend_reward
  where id = referral_row.referred_user_id;

  insert into token_transactions (user_id, amount, type, reference_id) values
    (referral_row.referrer_id, referral_row.referrer_reward, 'referral_bonus', referral_row.id),
    (referral_row.referred_user_id, referral_row.friend_reward, 'referral_bonus', referral_row.id);
  update referrals set status = 'rewarded', rewarded_at = now() where id = referral_row.id;
end;
$$;

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare inviter_id uuid;
begin
  insert into profiles (id, display_name, token_balance)
  values (new.id, new.raw_user_meta_data->>'full_name', 5);
  insert into token_transactions (user_id, amount, type)
  values (new.id, 5, 'starter_bonus');

  select id into inviter_id from profiles
  where referral_code = lower(trim(coalesce(new.raw_user_meta_data->>'referral_code', '')))
    and id <> new.id;
  if inviter_id is not null then
    update profiles set referred_by = inviter_id where id = new.id;
    insert into referrals (referrer_id, referred_user_id) values (inviter_id, new.id)
    on conflict (referred_user_id) do nothing;
  end if;
  if new.email_confirmed_at is not null then perform reward_verified_referral(new.id); end if;
  return new;
end;
$$;

create or replace function handle_user_email_verified()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    perform reward_verified_referral(new.id);
  end if;
  return new;
end;
$$;

revoke all on function reward_verified_referral(uuid) from public, anon, authenticated;
revoke all on function handle_new_user() from public, anon, authenticated;
revoke all on function handle_user_email_verified() from public, anon, authenticated;

drop trigger if exists on_auth_user_email_verified on auth.users;
create trigger on_auth_user_email_verified after update of email_confirmed_at on auth.users
  for each row execute procedure handle_user_email_verified();

create or replace function consume_campaign_credit(p_user_id uuid, p_campaign_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare remaining int;
begin
  if exists (select 1 from token_transactions where user_id = p_user_id and reference_id = p_campaign_id and type = 'campaign_spend') then
    select token_balance into remaining from profiles where id = p_user_id;
    return remaining;
  end if;
  update profiles set token_balance = token_balance - 1
  where id = p_user_id and token_balance >= 1 returning token_balance into remaining;
  if remaining is null then raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0001'; end if;
  insert into token_transactions (user_id, amount, type, reference_id)
  values (p_user_id, -1, 'campaign_spend', p_campaign_id);
  return remaining;
end;
$$;

revoke all on function consume_campaign_credit(uuid, uuid) from public, anon, authenticated;
grant execute on function consume_campaign_credit(uuid, uuid) to service_role;

create or replace function adjust_user_credits(p_user_id uuid, p_amount int)
returns int language plpgsql security definer set search_path = public as $$
declare remaining int;
begin
  if p_amount = 0 or abs(p_amount) > 10000 then
    raise exception 'INVALID_CREDIT_ADJUSTMENT' using errcode = 'P0001';
  end if;
  update profiles set token_balance = token_balance + p_amount
  where id = p_user_id and token_balance + p_amount >= 0
  returning token_balance into remaining;
  if remaining is null then raise exception 'INVALID_CREDIT_BALANCE' using errcode = 'P0001'; end if;
  insert into token_transactions (user_id, amount, type)
  values (p_user_id, p_amount, 'admin_adjustment');
  return remaining;
end;
$$;

revoke all on function adjust_user_credits(uuid, int) from public, anon, authenticated;
grant execute on function adjust_user_credits(uuid, int) to service_role;

drop policy if exists "campaigns: owner full access" on campaigns;
drop policy if exists "campaigns: owner read" on campaigns;
drop policy if exists "campaigns: owner update" on campaigns;
drop policy if exists "campaigns: owner delete" on campaigns;
create policy "campaigns: owner read" on campaigns for select using (auth.uid() = user_id);
create policy "campaigns: owner update" on campaigns for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "campaigns: owner delete" on campaigns for delete using (auth.uid() = user_id);

drop policy if exists "profiles: update own" on profiles;
