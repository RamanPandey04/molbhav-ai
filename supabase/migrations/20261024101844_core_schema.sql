create extension if not exists pgcrypto;

create type public.actor_role as enum ('BUYER','MERCHANT','SUPPLIER','ADMIN');
create type public.payment_mode as enum ('UAT','LIVE');
create type public.payment_status as enum ('CREATED','PENDING','VERIFIED_PAID','FAILED','EXPIRED');
create type public.agent_decision as enum ('PROPOSE','NO_DEAL','BLOCKED');

create table public.zones (id uuid primary key default gen_random_uuid(), name text not null unique, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.products (id uuid primary key default gen_random_uuid(), name text not null, unit text not null, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.merchants (id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id), zone_id uuid not null references public.zones(id), name text not null, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.suppliers (id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id), name text not null, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.pools (id uuid primary key default gen_random_uuid(), zone_id uuid not null references public.zones(id), product_id uuid not null references public.products(id), quantity integer not null default 0 check (quantity >= 0), version integer not null default 0, status text not null default 'OPEN' check (status in ('OPEN','CLOSED')), expires_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(zone_id,product_id));
create table public.buyer_demands (id uuid primary key default gen_random_uuid(), buyer_id uuid not null references auth.users(id), merchant_id uuid not null references public.merchants(id), product_id uuid not null references public.products(id), quantity integer not null check (quantity > 0), allocated_existing_stock integer not null default 0 check (allocated_existing_stock >= 0 and allocated_existing_stock <= quantity), status text not null default 'ACTIVE' check (status in ('ACTIVE','CANCELLED','EXPIRED')), expires_at timestamptz not null, idempotency_key text not null check (length(idempotency_key) between 8 and 128), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(buyer_id,idempotency_key));
create table public.merchant_restock_requests (id uuid primary key default gen_random_uuid(), merchant_id uuid not null references public.merchants(id), product_id uuid not null references public.products(id), quantity integer not null check (quantity > 0), status text not null default 'ACTIVE' check (status in ('ACTIVE','CANCELLED','EXPIRED')), expires_at timestamptz not null, idempotency_key text not null check (length(idempotency_key) between 8 and 128), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(merchant_id,idempotency_key));
create table public.supplier_quotes (id uuid primary key default gen_random_uuid(), supplier_id uuid not null references public.suppliers(id), pool_id uuid not null references public.pools(id), unit_price_paise bigint not null check (unit_price_paise >= 0), quantity integer not null check (quantity > 0), expires_at timestamptz not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.proposals (id uuid primary key default gen_random_uuid(), pool_id uuid not null references public.pools(id), quote_id uuid references public.supplier_quotes(id), decision public.agent_decision not null, rationale text not null, pool_version integer not null check (pool_version >= 0), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.approvals (id uuid primary key default gen_random_uuid(), proposal_id uuid not null references public.proposals(id), approver_id uuid not null references auth.users(id), decision text not null check (decision in ('APPROVED','REJECTED')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(proposal_id,approver_id));
create table public.orders (id uuid primary key default gen_random_uuid(), proposal_id uuid not null unique references public.proposals(id), merchant_id uuid not null references public.merchants(id), quantity integer not null check (quantity > 0), total_paise bigint not null check (total_paise >= 0), status text not null default 'CREATED' check (status in ('CREATED','CONFIRMED','CANCELLED')), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.payments (id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id), mode public.payment_mode not null, status public.payment_status not null default 'CREATED', amount_paise bigint not null check (amount_paise >= 0), provider_reference text unique, idempotency_key text not null unique, verified_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check (status <> 'VERIFIED_PAID' or verified_at is not null));
create table public.agent_runs (id uuid primary key default gen_random_uuid(), pool_id uuid references public.pools(id), actor_id uuid references auth.users(id), status text not null check (status in ('STARTED','SUCCEEDED','FAILED')), input jsonb not null default '{}'::jsonb, output jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.audit_events (id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id), entity_type text not null, entity_id uuid not null, action text not null, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create index on public.merchants(owner_id);
create index on public.merchants(zone_id);
create index on public.buyer_demands(merchant_id,product_id,status,expires_at);
create index on public.buyer_demands(buyer_id,created_at desc);
create index on public.merchant_restock_requests(merchant_id,product_id,status,expires_at);
create index on public.supplier_quotes(pool_id,expires_at);
create index on public.orders(merchant_id);
create index on public.payments(order_id);

create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end $$;
do $$ declare t text; begin foreach t in array array['zones','products','merchants','suppliers','pools','buyer_demands','merchant_restock_requests','supplier_quotes','proposals','approvals','orders','payments','agent_runs','audit_events'] loop execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()',t); end loop; end $$;

-- Compute each merchant's consumer shortfall once, then add independent restock.
create function public.refresh_pool(p_zone uuid, p_product uuid) returns void language plpgsql security definer set search_path = '' as $$
declare v_pool uuid; v_quantity integer;
begin
  insert into public.pools(zone_id,product_id) values(p_zone,p_product) on conflict(zone_id,product_id) do nothing;
  select id into v_pool from public.pools where zone_id=p_zone and product_id=p_product for update;
  select coalesce(sum(greatest(0,coalesce(d.demand,0)-coalesce(d.stock,0))+coalesce(r.restock,0)),0)::integer into v_quantity
  from public.merchants m
  left join lateral (select sum(quantity)::integer demand, sum(allocated_existing_stock)::integer stock from public.buyer_demands where merchant_id=m.id and product_id=p_product and status='ACTIVE' and expires_at>now()) d on true
  left join lateral (select sum(quantity)::integer restock from public.merchant_restock_requests where merchant_id=m.id and product_id=p_product and status='ACTIVE' and expires_at>now()) r on true
  where m.zone_id=p_zone and m.active;
  update public.pools set quantity=v_quantity, version=version+1 where id=v_pool and quantity is distinct from v_quantity;
end $$;
revoke all on function public.refresh_pool(uuid,uuid) from public,anon,authenticated;

create function public.refresh_pool_for_request() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_zone uuid;
begin
  select zone_id into v_zone from public.merchants where id=coalesce(new.merchant_id,old.merchant_id);
  perform public.refresh_pool(v_zone,coalesce(new.product_id,old.product_id));
  if tg_op='UPDATE' and (old.merchant_id,old.product_id) is distinct from (new.merchant_id,new.product_id) then
    select zone_id into v_zone from public.merchants where id=old.merchant_id;
    perform public.refresh_pool(v_zone,old.product_id);
  end if;
  return null;
end $$;
revoke all on function public.refresh_pool_for_request() from public,anon,authenticated;
create trigger demand_pool_refresh after insert or update or delete on public.buyer_demands for each row execute function public.refresh_pool_for_request();
create trigger restock_pool_refresh after insert or update or delete on public.merchant_restock_requests for each row execute function public.refresh_pool_for_request();

do $$ declare t text; begin foreach t in array array['zones','products','merchants','suppliers','pools','buyer_demands','merchant_restock_requests','supplier_quotes','proposals','approvals','orders','payments','agent_runs','audit_events'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;
grant select on public.zones,public.products,public.pools to anon,authenticated;
grant select on public.merchants,public.buyer_demands,public.merchant_restock_requests to authenticated;
grant insert on public.buyer_demands,public.merchant_restock_requests to authenticated;
create policy zones_read on public.zones for select to anon,authenticated using (true);
create policy products_read on public.products for select to anon,authenticated using (active);
create policy pools_read on public.pools for select to anon,authenticated using (true);
create policy merchants_read on public.merchants for select to authenticated using (active or owner_id=(select auth.uid()));
create policy demands_own_read on public.buyer_demands for select to authenticated using (buyer_id=(select auth.uid()));
create policy demands_own_insert on public.buyer_demands for insert to authenticated with check (buyer_id=(select auth.uid()) and allocated_existing_stock=0 and expires_at>now() and expires_at<=now()+interval '30 days' and exists (select 1 from public.merchants m where m.id=merchant_id and m.active) and exists (select 1 from public.products p where p.id=product_id and p.active));
create policy restock_own_read on public.merchant_restock_requests for select to authenticated using (exists (select 1 from public.merchants m where m.id=merchant_id and m.owner_id=(select auth.uid())));
create policy restock_own_insert on public.merchant_restock_requests for insert to authenticated with check (expires_at>now() and expires_at<=now()+interval '30 days' and exists (select 1 from public.merchants m where m.id=merchant_id and m.owner_id=(select auth.uid()) and m.active) and exists (select 1 from public.products p where p.id=product_id and p.active));

-- Public read refreshes the stored total under a row lock so expiry is reflected
-- without depending on a background scheduler. Only aggregate fields are returned.
create function public.get_live_pool(p_id uuid)
returns table(id uuid, zone_id uuid, product_id uuid, quantity integer, version integer, status text, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare v_zone uuid; v_product uuid;
begin
  select p.zone_id,p.product_id into v_zone,v_product from public.pools p where p.id=p_id;
  if not found then return; end if;
  perform public.refresh_pool(v_zone,v_product);
  return query select p.id,p.zone_id,p.product_id,p.quantity,p.version,p.status,p.expires_at from public.pools p where p.id=p_id;
end $$;
revoke all on function public.get_live_pool(uuid) from public;
grant execute on function public.get_live_pool(uuid) to anon,authenticated;
