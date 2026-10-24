-- Roles are assigned by trusted server administration, never by the browser.
create table public.actor_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.actor_role not null default 'BUYER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger touch_updated_at before update on public.actor_profiles for each row execute function public.touch_updated_at();
alter table public.actor_profiles enable row level security;
grant select on public.actor_profiles to authenticated;
create policy actor_profile_own_read on public.actor_profiles for select to authenticated using (user_id=(select auth.uid()));

create function public.create_buyer_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.actor_profiles(user_id,role) values(new.id,'BUYER');
  return new;
end $$;
revoke all on function public.create_buyer_profile() from public,anon,authenticated;
create trigger create_buyer_profile after insert on auth.users for each row execute function public.create_buyer_profile();

drop policy demands_own_insert on public.buyer_demands;
create policy demands_own_insert on public.buyer_demands for insert to authenticated with check (
  buyer_id=(select auth.uid()) and allocated_existing_stock=0
  and expires_at>now() and expires_at<=now()+interval '30 days'
  and exists (select 1 from public.actor_profiles a where a.user_id=(select auth.uid()) and a.role='BUYER')
  and exists (select 1 from public.merchants m where m.id=merchant_id and m.active)
  and exists (select 1 from public.products p where p.id=product_id and p.active)
);
drop policy restock_own_insert on public.merchant_restock_requests;
create policy restock_own_insert on public.merchant_restock_requests for insert to authenticated with check (
  expires_at>now() and expires_at<=now()+interval '30 days'
  and exists (select 1 from public.actor_profiles a where a.user_id=(select auth.uid()) and a.role='MERCHANT')
  and exists (select 1 from public.merchants m where m.id=merchant_id and m.owner_id=(select auth.uid()) and m.active)
  and exists (select 1 from public.products p where p.id=product_id and p.active)
);
