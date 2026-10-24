alter table public.buyer_demands add column max_unit_price_paise bigint check (max_unit_price_paise > 0 and max_unit_price_paise <= 1000000000);
alter table public.buyer_demands add column delivery_deadline timestamptz;
alter table public.buyer_demands add column fulfillment_terms text not null default 'PICKUP' check (length(fulfillment_terms) between 1 and 500);
alter table public.merchant_restock_requests add column needed_by timestamptz;
alter table public.buyer_demands add constraint demand_binding_terms check (max_unit_price_paise is not null and delivery_deadline is not null);
alter table public.merchant_restock_requests add constraint restock_needed_by_required check (needed_by is not null);

create table public.merchant_product_terms (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id),
  product_id uuid not null references public.products(id),
  baseline_unit_paise bigint not null check (baseline_unit_paise between 0 and 1000000000),
  consumer_unit_paise bigint not null check (consumer_unit_paise between 0 and 1000000000),
  minimum_margin_paise bigint not null check (minimum_margin_paise between 0 and 1000000000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(merchant_id,product_id)
);
create trigger touch_updated_at before update on public.merchant_product_terms for each row execute function public.touch_updated_at();
alter table public.merchant_product_terms enable row level security;
grant select,insert,update on public.merchant_product_terms to authenticated;
create policy merchant_terms_read on public.merchant_product_terms for select to authenticated using (
  exists(select 1 from public.merchants m where m.id=merchant_id and m.owner_id=(select auth.uid()))
  or exists(select 1 from public.actor_profiles a where a.user_id=(select auth.uid()) and a.role='ADMIN')
);
create policy merchant_terms_insert on public.merchant_product_terms for insert to authenticated with check (
  exists(select 1 from public.actor_profiles a where a.user_id=(select auth.uid()) and a.role='MERCHANT')
  and exists(select 1 from public.merchants m where m.id=merchant_id and m.owner_id=(select auth.uid()) and m.active)
);
create policy merchant_terms_update on public.merchant_product_terms for update to authenticated using (
  exists(select 1 from public.actor_profiles a where a.user_id=(select auth.uid()) and a.role='MERCHANT')
  and exists(select 1 from public.merchants m where m.id=merchant_id and m.owner_id=(select auth.uid()))
) with check (
  exists(select 1 from public.actor_profiles a where a.user_id=(select auth.uid()) and a.role='MERCHANT')
  and exists(select 1 from public.merchants m where m.id=merchant_id and m.owner_id=(select auth.uid()))
);

alter table public.supplier_quotes rename column unit_price_paise to quoted_unit_price_paise;
alter table public.supplier_quotes rename column quantity to max_available_quantity;
alter table public.supplier_quotes add column exact_sku_id uuid references public.products(id);
alter table public.supplier_quotes add column min_order_quantity integer not null default 1 check (min_order_quantity > 0);
alter table public.supplier_quotes add column freight_paise bigint not null default 0 check (freight_paise between 0 and 1000000000000);
alter table public.supplier_quotes add column handling_paise bigint not null default 0 check (handling_paise between 0 and 1000000000000);
alter table public.supplier_quotes add column delivery_deadline timestamptz;
alter table public.supplier_quotes add column quoted_by uuid references auth.users(id);
alter table public.supplier_quotes add column status text not null default 'SUBMITTED' check (status in ('SUBMITTED','ACCEPTED','REJECTED','EXPIRED'));
alter table public.supplier_quotes add column version integer not null default 1 check (version > 0);
alter table public.supplier_quotes add column idempotency_key text;
alter table public.supplier_quotes add constraint quote_moq_stock check (max_available_quantity >= min_order_quantity);
alter table public.supplier_quotes add constraint quote_unit_price_bound check (quoted_unit_price_paise between 0 and 1000000000);
create unique index supplier_quote_idempotency on public.supplier_quotes(supplier_id,idempotency_key) where idempotency_key is not null;

create table public.quote_counteroffers (
  id uuid primary key default gen_random_uuid(), quote_id uuid not null references public.supplier_quotes(id),
  merchant_id uuid not null references public.merchants(id), proposed_by uuid not null references auth.users(id),
  proposed_unit_price_paise bigint not null check (proposed_unit_price_paise between 0 and 1000000000),
  proposed_freight_paise bigint not null check (proposed_freight_paise between 0 and 1000000000000),
  proposed_handling_paise bigint not null check (proposed_handling_paise between 0 and 1000000000000),
  status text not null default 'PENDING' check (status in ('PENDING','ACCEPTED','REJECTED')),
  responded_by uuid references auth.users(id), responded_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index one_pending_counteroffer_per_quote on public.quote_counteroffers(quote_id) where status='PENDING';
create trigger touch_updated_at before update on public.quote_counteroffers for each row execute function public.touch_updated_at();
alter table public.quote_counteroffers enable row level security;
grant select on public.quote_counteroffers to authenticated;

create table public.pool_evaluations (
  id uuid primary key default gen_random_uuid(), pool_id uuid not null references public.pools(id),
  pool_version integer not null, selected_quote_id uuid references public.supplier_quotes(id),
  decision public.agent_decision not null, reason_codes text[] not null,
  snapshot jsonb not null, created_by uuid not null references auth.users(id),
  idempotency_key text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on public.pool_evaluations(pool_id,created_at desc);
create unique index evaluation_idempotency on public.pool_evaluations(created_by,idempotency_key);
create trigger touch_updated_at before update on public.pool_evaluations for each row execute function public.touch_updated_at();
alter table public.pool_evaluations enable row level security;
grant select,insert on public.pool_evaluations to authenticated;

alter table public.proposals add column evaluation_id uuid references public.pool_evaluations(id);
alter table public.proposals add column snapshot jsonb;
alter table public.proposals add column terms_hash text;
alter table public.proposals add column status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED','EXPIRED'));
alter table public.proposals add column expires_at timestamptz;
create unique index one_proposal_per_evaluation on public.proposals(evaluation_id) where evaluation_id is not null;
alter table public.approvals add column actor_role public.actor_role;
alter table public.approvals add column terms_hash text;
alter table public.approvals add column authenticated_identity uuid references auth.users(id);

grant select on public.suppliers,public.supplier_quotes,public.proposals,public.approvals to authenticated;
grant insert on public.supplier_quotes,public.pool_evaluations to authenticated;
create policy supplier_own_read on public.suppliers for select to authenticated using (
  owner_id=(select auth.uid()) or exists(select 1 from public.actor_profiles a where a.user_id=(select auth.uid()) and a.role='ADMIN')
);
create policy quote_read on public.supplier_quotes for select to authenticated using (
  exists(select 1 from public.suppliers s where s.id=supplier_id and s.owner_id=(select auth.uid()))
  or exists(select 1 from public.actor_profiles a where a.user_id=(select auth.uid()) and a.role='ADMIN')
  or exists(select 1 from public.merchants m join public.pools p on p.id=pool_id where m.owner_id=(select auth.uid()) and m.zone_id=p.zone_id)
);
create policy quote_insert on public.supplier_quotes for insert to authenticated with check (
  quoted_by=(select auth.uid()) and status='SUBMITTED' and version=1
  and expires_at>now() and delivery_deadline>=now()
  and exists(select 1 from public.actor_profiles a where a.user_id=(select auth.uid()) and a.role='SUPPLIER')
  and exists(select 1 from public.suppliers s where s.id=supplier_id and s.owner_id=(select auth.uid()) and s.active)
  and exists(select 1 from public.pools p where p.id=pool_id and p.product_id=exact_sku_id and p.status='OPEN')
);
create policy counteroffer_read on public.quote_counteroffers for select to authenticated using (
  proposed_by=(select auth.uid()) or exists(select 1 from public.supplier_quotes q join public.suppliers s on s.id=q.supplier_id where q.id=quote_id and s.owner_id=(select auth.uid()))
  or exists(select 1 from public.actor_profiles a where a.user_id=(select auth.uid()) and a.role='ADMIN')
);
create policy evaluation_admin_read on public.pool_evaluations for select to authenticated using (
  exists(select 1 from public.actor_profiles a where a.user_id=(select auth.uid()) and a.role='ADMIN')
);
create policy evaluation_admin_insert on public.pool_evaluations for insert to authenticated with check (
  created_by=(select auth.uid()) and exists(select 1 from public.actor_profiles a where a.user_id=(select auth.uid()) and a.role='ADMIN')
);
create policy proposals_participant_read on public.proposals for select to authenticated using (
  exists(select 1 from public.actor_profiles a where a.user_id=(select auth.uid()) and a.role='ADMIN')
  or (snapshot->'buyerIds') ? (select auth.uid())::text
  or exists(select 1 from public.merchants m where m.owner_id=(select auth.uid()) and (snapshot->'merchantIds') ? m.id::text)
  or exists(select 1 from public.suppliers s where s.owner_id=(select auth.uid()) and (snapshot->>'supplierId')=s.id::text)
);
create policy approvals_participant_read on public.approvals for select to authenticated using (
  exists(select 1 from public.proposals p where p.id=proposal_id)
);
drop policy demands_own_read on public.buyer_demands;
create policy demands_actor_read on public.buyer_demands for select to authenticated using (
  buyer_id=(select auth.uid()) or exists(select 1 from public.actor_profiles a where a.user_id=(select auth.uid()) and a.role='ADMIN')
);
drop policy restock_own_read on public.merchant_restock_requests;
create policy restock_actor_read on public.merchant_restock_requests for select to authenticated using (
  exists(select 1 from public.merchants m where m.id=merchant_id and m.owner_id=(select auth.uid()))
  or exists(select 1 from public.actor_profiles a where a.user_id=(select auth.uid()) and a.role='ADMIN')
);
drop policy merchants_read on public.merchants;
create policy merchants_actor_read on public.merchants for select to authenticated using (
  active or owner_id=(select auth.uid()) or exists(select 1 from public.actor_profiles a where a.user_id=(select auth.uid()) and a.role='ADMIN')
);

create function public.audit_quote_change() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_events(actor_id,entity_type,entity_id,action,payload)
  values(coalesce(new.quoted_by,(select owner_id from public.suppliers where id=new.supplier_id)),'supplier_quote',new.id,
    case when tg_op='INSERT' then 'SUBMITTED' else new.status end,
    jsonb_build_object('status',new.status,'version',new.version));
  return new;
end $$;
revoke all on function public.audit_quote_change() from public,anon,authenticated;
create trigger quote_audit after insert or update on public.supplier_quotes for each row execute function public.audit_quote_change();

create function public.expire_quotes() returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if (select auth.uid()) is null then raise exception 'authentication required' using errcode='42501'; end if;
  update public.supplier_quotes set status='EXPIRED',version=version+1
  where expires_at<=now() and status in ('SUBMITTED','ACCEPTED');
  get diagnostics v_count = row_count;
  return v_count;
end $$;
revoke all on function public.expire_quotes() from public,anon;
grant execute on function public.expire_quotes() to authenticated;

create function public.decide_counteroffer(
  p_quote_id uuid, p_action text, p_counteroffer_id uuid default null,
  p_unit_price_paise bigint default null, p_freight_paise bigint default null, p_handling_paise bigint default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_role public.actor_role; v_quote public.supplier_quotes%rowtype;
        v_counter public.quote_counteroffers%rowtype; v_merchant uuid; v_id uuid;
begin
  if v_uid is null then raise exception 'authentication required' using errcode='42501'; end if;
  select role into v_role from public.actor_profiles where user_id=v_uid;
  select * into v_quote from public.supplier_quotes where id=p_quote_id for update;
  if not found then raise exception 'quote not found' using errcode='P0002'; end if;
  if v_quote.expires_at<=now() or v_quote.status in ('EXPIRED','REJECTED') then raise exception 'quote expired or closed' using errcode='22023'; end if;
  if p_action='PROPOSE' then
    if v_role<>'MERCHANT' then raise exception 'merchant role required' using errcode='42501'; end if;
    if p_unit_price_paise is null or p_unit_price_paise<0 or p_unit_price_paise>1000000000
      or p_freight_paise is null or p_freight_paise<0 or p_handling_paise is null or p_handling_paise<0 then
      raise exception 'invalid counteroffer terms' using errcode='22023';
    end if;
    select m.id into v_merchant from public.merchants m join public.pools p on p.zone_id=m.zone_id
      where p.id=v_quote.pool_id and m.owner_id=v_uid and m.active order by m.id limit 1;
    if v_merchant is null then raise exception 'merchant is not in pool zone' using errcode='42501'; end if;
    insert into public.quote_counteroffers(quote_id,merchant_id,proposed_by,proposed_unit_price_paise,proposed_freight_paise,proposed_handling_paise)
      values(p_quote_id,v_merchant,v_uid,p_unit_price_paise,p_freight_paise,p_handling_paise) returning id into v_id;
    insert into public.audit_events(actor_id,entity_type,entity_id,action,payload) values(v_uid,'quote_counteroffer',v_id,'SUBMITTED',jsonb_build_object('quoteId',p_quote_id));
    return v_id;
  elsif p_action in ('ACCEPT','REJECT') then
    if v_role<>'SUPPLIER' or not exists(select 1 from public.suppliers s where s.id=v_quote.supplier_id and s.owner_id=v_uid) then
      raise exception 'supplier ownership required' using errcode='42501';
    end if;
    select * into v_counter from public.quote_counteroffers where id=p_counteroffer_id and quote_id=p_quote_id for update;
    if not found or v_counter.status<>'PENDING' then raise exception 'counteroffer is not pending' using errcode='22023'; end if;
    update public.quote_counteroffers set status=case when p_action='ACCEPT' then 'ACCEPTED' else 'REJECTED' end,
      responded_by=v_uid,responded_at=now() where id=v_counter.id;
    if p_action='ACCEPT' then
      update public.supplier_quotes set quoted_unit_price_paise=v_counter.proposed_unit_price_paise,
        freight_paise=v_counter.proposed_freight_paise,handling_paise=v_counter.proposed_handling_paise,
        status='ACCEPTED',version=version+1 where id=p_quote_id;
    end if;
    insert into public.audit_events(actor_id,entity_type,entity_id,action,payload)
      values(v_uid,'quote_counteroffer',v_counter.id,p_action,jsonb_build_object('quoteId',p_quote_id));
    return v_counter.id;
  end if;
  raise exception 'unsupported counteroffer action' using errcode='22023';
end $$;
revoke all on function public.decide_counteroffer(uuid,text,uuid,bigint,bigint,bigint) from public,anon;
grant execute on function public.decide_counteroffer(uuid,text,uuid,bigint,bigint,bigint) to authenticated;

create function public.protect_proposal_terms() returns trigger language plpgsql set search_path = '' as $$
begin
  if (old.snapshot,old.terms_hash,old.quote_id,old.pool_id,old.pool_version,old.expires_at,old.evaluation_id)
      is distinct from
     (new.snapshot,new.terms_hash,new.quote_id,new.pool_id,new.pool_version,new.expires_at,new.evaluation_id) then
    raise exception 'proposal terms are immutable' using errcode='22023';
  end if;
  return new;
end $$;
create trigger protect_proposal_terms before update on public.proposals for each row execute function public.protect_proposal_terms();

create function public.create_proposal(p_evaluation_id uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_eval public.pool_evaluations%rowtype; v_pool public.pools%rowtype;
        v_quote public.supplier_quotes%rowtype; v_id uuid; v_hash text;
begin
  if v_uid is null or not exists(select 1 from public.actor_profiles where user_id=v_uid and role='ADMIN') then
    raise exception 'admin role required' using errcode='42501';
  end if;
  select * into v_eval from public.pool_evaluations where id=p_evaluation_id;
  if not found or v_eval.decision<>'PROPOSE' or v_eval.selected_quote_id is null then
    raise exception 'evaluation cannot become proposal' using errcode='22023';
  end if;
  perform public.refresh_pool((select zone_id from public.pools where id=v_eval.pool_id),(select product_id from public.pools where id=v_eval.pool_id));
  select * into v_pool from public.pools where id=v_eval.pool_id for update;
  select * into v_quote from public.supplier_quotes where id=v_eval.selected_quote_id for update;
  if v_pool.version<>v_eval.pool_version or v_quote.version<>(v_eval.snapshot->>'quoteVersion')::integer
    or v_quote.expires_at<=now() or v_pool.status<>'OPEN' then
    raise exception 'evaluation is stale' using errcode='22023';
  end if;
  v_hash := encode(pg_catalog.sha256(convert_to(v_eval.snapshot::text,'UTF8')),'hex');
  insert into public.proposals(pool_id,quote_id,decision,rationale,pool_version,evaluation_id,snapshot,terms_hash,expires_at)
    values(v_eval.pool_id,v_eval.selected_quote_id,'PROPOSE',array_to_string(v_eval.reason_codes,','),v_eval.pool_version,
      v_eval.id,v_eval.snapshot,v_hash,least(v_quote.expires_at,now()+interval '24 hours')) returning id into v_id;
  insert into public.audit_events(actor_id,entity_type,entity_id,action,payload)
    values(v_uid,'proposal',v_id,'CREATED',jsonb_build_object('termsHash',v_hash));
  return v_id;
end $$;
revoke all on function public.create_proposal(uuid) from public,anon;
grant execute on function public.create_proposal(uuid) to authenticated;

create function public.decide_proposal(p_proposal_id uuid,p_terms_hash text,p_action text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_role public.actor_role; v_proposal public.proposals%rowtype;
        v_pool public.pools%rowtype; v_quote public.supplier_quotes%rowtype;
        v_required_merchants integer; v_required_buyers integer; v_supplier_count integer;
        v_merchant_count integer; v_buyer_count integer;
begin
  if v_uid is null then raise exception 'authentication required' using errcode='42501'; end if;
  if p_action not in ('APPROVED','REJECTED') then raise exception 'invalid approval action' using errcode='22023'; end if;
  select role into v_role from public.actor_profiles where user_id=v_uid;
  select * into v_proposal from public.proposals where id=p_proposal_id for update;
  if not found then raise exception 'proposal not found' using errcode='P0002'; end if;
  if v_proposal.status<>'PENDING' then raise exception 'proposal is not pending' using errcode='22023'; end if;
  if v_proposal.expires_at<=now() then
    update public.proposals set status='EXPIRED' where id=p_proposal_id;
    insert into public.audit_events(actor_id,entity_type,entity_id,action,payload)
      values(v_uid,'proposal',p_proposal_id,'EXPIRED','{}'::jsonb);
    return 'EXPIRED';
  end if;
  if p_terms_hash is distinct from v_proposal.terms_hash then raise exception 'stale terms hash' using errcode='22023'; end if;
  perform public.refresh_pool((select zone_id from public.pools where id=v_proposal.pool_id),(select product_id from public.pools where id=v_proposal.pool_id));
  select * into v_pool from public.pools where id=v_proposal.pool_id for update;
  select * into v_quote from public.supplier_quotes where id=v_proposal.quote_id for update;
  if v_pool.version<>v_proposal.pool_version or v_quote.version<>(v_proposal.snapshot->>'quoteVersion')::integer or v_quote.expires_at<=now() then
    raise exception 'proposal terms are stale' using errcode='22023';
  end if;
  if not (
    (v_role='SUPPLIER' and exists(select 1 from public.suppliers s where s.id=(v_proposal.snapshot->>'supplierId')::uuid and s.owner_id=v_uid))
    or (v_role='MERCHANT' and (v_proposal.snapshot->'merchantOwnerIds') ? v_uid::text)
    or (v_role='BUYER' and (v_proposal.snapshot->'buyerIds') ? v_uid::text)
  ) then raise exception 'actor is not an approval participant' using errcode='42501'; end if;
  insert into public.approvals(proposal_id,approver_id,decision,actor_role,terms_hash,authenticated_identity)
    values(p_proposal_id,v_uid,p_action,v_role,p_terms_hash,v_uid);
  insert into public.audit_events(actor_id,entity_type,entity_id,action,payload)
    values(v_uid,'proposal',p_proposal_id,p_action,jsonb_build_object('role',v_role,'termsHash',p_terms_hash));
  if p_action='REJECTED' then
    update public.proposals set status='REJECTED' where id=p_proposal_id;
  else
    select jsonb_array_length(v_proposal.snapshot->'merchantOwnerIds'),jsonb_array_length(v_proposal.snapshot->'buyerIds')
      into v_required_merchants,v_required_buyers;
    select count(*) filter(where actor_role='SUPPLIER'),count(*) filter(where actor_role='MERCHANT'),count(*) filter(where actor_role='BUYER')
      into v_supplier_count,v_merchant_count,v_buyer_count from public.approvals where proposal_id=p_proposal_id and decision='APPROVED';
    if v_supplier_count=1 and v_merchant_count=v_required_merchants and v_buyer_count=v_required_buyers then
      update public.proposals set status='APPROVED' where id=p_proposal_id;
    end if;
  end if;
  return (select status from public.proposals where id=p_proposal_id);
end $$;
revoke all on function public.decide_proposal(uuid,text,text) from public,anon;
grant execute on function public.decide_proposal(uuid,text,text) to authenticated;

-- Participants read only the binding terms relevant to their role. Raw proposal
-- snapshots are inaccessible through the Data API.
revoke select on public.proposals,public.approvals from authenticated;
create function public.get_proposal_details(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_role public.actor_role; v_proposal public.proposals%rowtype;
        v_snapshot jsonb; v_approvals jsonb;
begin
  if v_uid is null then return null; end if;
  select role into v_role from public.actor_profiles where user_id=v_uid;
  select * into v_proposal from public.proposals where id=p_id;
  if not found then return null; end if;
  if not (
    v_role='ADMIN'
    or (v_role='SUPPLIER' and exists(select 1 from public.suppliers s where s.id=(v_proposal.snapshot->>'supplierId')::uuid and s.owner_id=v_uid))
    or (v_role='MERCHANT' and (v_proposal.snapshot->'merchantOwnerIds') ? v_uid::text)
    or (v_role='BUYER' and (v_proposal.snapshot->'buyerIds') ? v_uid::text)
  ) then return null; end if;
  v_snapshot := v_proposal.snapshot;
  if v_role<>'ADMIN' then
    v_snapshot := v_snapshot - 'buyerIds' - 'merchantOwnerIds';
    if v_role='BUYER' then
      v_snapshot := jsonb_set(v_snapshot,'{buyerTerms}',coalesce((select jsonb_agg(t) from jsonb_array_elements(v_proposal.snapshot->'buyerTerms') t where t->>'buyerId'=v_uid::text),'[]'::jsonb));
      v_snapshot := v_snapshot - 'restockTerms' - 'merchantAllocations';
    elsif v_role='MERCHANT' then
      v_snapshot := v_snapshot - 'buyerTerms';
    else
      v_snapshot := v_snapshot - 'buyerTerms' - 'restockTerms' - 'merchantAllocations';
    end if;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('actorRole',a.actor_role,'action',a.decision,'timestamp',a.created_at) order by a.created_at),'[]'::jsonb)
    into v_approvals from public.approvals a where a.proposal_id=p_id;
  return jsonb_build_object('id',v_proposal.id,'poolId',v_proposal.pool_id,'evaluationId',v_proposal.evaluation_id,
    'status',case when v_proposal.status='PENDING' and v_proposal.expires_at<=now() then 'EXPIRED' else v_proposal.status end,
    'termsHash',v_proposal.terms_hash,'expiresAt',v_proposal.expires_at,'snapshot',v_snapshot,'approvals',v_approvals);
end $$;
revoke all on function public.get_proposal_details(uuid) from public,anon;
grant execute on function public.get_proposal_details(uuid) to authenticated;
