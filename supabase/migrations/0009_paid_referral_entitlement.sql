-- Afflio - make friend referrals a paid-plan entitlement

create or replace function has_paid_referral_access(p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from subscriptions s
    join plans p on p.id = s.plan_id
    where s.user_id = p_user_id
      and s.status in ('active', 'trialing')
      and p.code <> 'free'
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;

revoke all on function has_paid_referral_access(uuid) from public, anon, authenticated;

-- Referrals that were created by Free accounts before this entitlement existed
-- must not issue rewards later.
update referrals
set status = 'rejected'
where status = 'pending'
  and not has_paid_referral_access(referrer_id);

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inviter_id uuid;
begin
  insert into profiles (id, display_name, token_balance)
  values (new.id, new.raw_user_meta_data->>'full_name', 5);

  insert into token_transactions (user_id, amount, type)
  values (new.id, 5, 'starter_bonus');

  select p.id into inviter_id
  from profiles p
  where p.referral_code = lower(trim(coalesce(new.raw_user_meta_data->>'referral_code', '')))
    and p.id <> new.id
    and has_paid_referral_access(p.id);

  if inviter_id is not null then
    update profiles set referred_by = inviter_id where id = new.id;
    insert into referrals (referrer_id, referred_user_id)
    values (inviter_id, new.id)
    on conflict (referred_user_id) do nothing;
  end if;

  if new.email_confirmed_at is not null then
    perform reward_verified_referral(new.id);
  end if;

  return new;
end;
$$;

revoke all on function handle_new_user() from public, anon, authenticated;
