-- Additive release evidence only. Existing procurement/payment records remain intact.
alter table public.actor_profiles add column data_class text not null default 'UNVERIFIED'
  check (data_class in ('TEST','UNVERIFIED','REAL'));
update public.actor_profiles a set data_class='TEST' from auth.users u
where a.user_id=u.id and u.raw_user_meta_data->>'test_fixture'='true';
alter table public.buyer_demands add column consent_confirmed_at timestamptz;

create table public.onboarding_leads (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  buyer_id uuid unique references auth.users(id),
  onboarding_status text not null default 'PENDING_ONBOARDING',
  payment_claim_status text not null default 'TEAM_REPORTED_UNVERIFIED'
    check(payment_claim_status='TEAM_REPORTED_UNVERIFIED'),
  claimed_amount_paise integer not null default 100 check(claimed_amount_paise=100),
  missing_fields jsonb not null default '["consented email or phone","confirmed identity","product","quantity","maximum price","fulfillment location and terms","deadline","demand consent","transaction reference","claimed payment timestamp","recipient receipt evidence"]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index onboarding_name_unique on public.onboarding_leads(lower(display_name));
insert into public.onboarding_leads(display_name) values
('Gautam Kumar'),('Sudhanshu Sekher'),('Ankur Singh'),('Kishan Singh'),('Vikash Dugar')
on conflict do nothing;

create table public.user_evidence (
  user_id uuid primary key references auth.users(id),
  external_user boolean not null check(external_user),
  consent_confirmed boolean not null check(consent_confirmed),
  identity_evidence text not null check(length(identity_evidence) between 10 and 2000),
  verified_by uuid not null references auth.users(id),
  verified_at timestamptz not null default now()
);

create table public.manual_payments (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id),
  demand_id uuid references public.buyer_demands(id),
  order_id uuid references public.orders(id),
  amount_paise integer not null default 100 check(amount_paise=100),
  method text not null default 'MANUAL_PHONEPE' check(method='MANUAL_PHONEPE'),
  recipient_name text not null default 'Juhi Dugar' check(recipient_name='Juhi Dugar'),
  transaction_reference text,
  claimed_paid_at timestamptz,
  status text not null default 'REPORTED'
    check(status in ('REPORTED','PENDING_VERIFICATION','MANUALLY_CONFIRMED','REJECTED')),
  data_class text not null check(data_class in ('TEST','UNVERIFIED','REAL')),
  idempotency_key text not null check(length(idempotency_key) between 8 and 128),
  evidence_notes text,
  evidence_reference text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  verified_by uuid references auth.users(id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(demand_id is not null or order_id is not null),
  check(transaction_reference is null or length(transaction_reference) between 4 and 100),
  check(status<>'MANUALLY_CONFIRMED' or (
    transaction_reference is not null and claimed_paid_at is not null and
    evidence_reference is not null and evidence_notes is not null and
    verified_by is not null and verified_at is not null
  )),
  unique(buyer_id,idempotency_key)
);
create unique index manual_payment_reference_unique
  on public.manual_payments(lower(transaction_reference)) where transaction_reference is not null;
create unique index manual_demand_report_unique on public.manual_payments(buyer_id,demand_id)
  where demand_id is not null and status<>'REJECTED';
create unique index manual_order_report_unique on public.manual_payments(buyer_id,order_id)
  where order_id is not null and status<>'REJECTED';
create index manual_payments_buyer_created on public.manual_payments(buyer_id,created_at desc);

alter table public.agent_runs add column evaluation_id uuid references public.pool_evaluations(id);
alter table public.agent_runs add column provider_run_id text;
alter table public.agent_runs add column provider_status text;
alter table public.agent_runs add column completed_at timestamptz;
alter table public.agent_runs add column error_code text;
alter table public.agent_runs add column provider_events jsonb not null default '[]'::jsonb;
alter table public.agent_runs add column backend_events jsonb not null default '[]'::jsonb;
alter table public.agent_runs add column data_class text not null default 'UNVERIFIED';
alter table public.agent_runs add column idempotency_key text;
create unique index agent_run_idempotency_unique on public.agent_runs(actor_id,idempotency_key)
 where idempotency_key is not null;

do $$ declare t text; begin
  foreach t in array array['onboarding_leads','user_evidence','manual_payments'] loop
    execute format('alter table public.%I enable row level security',t);
    if t<>'user_evidence' then
      execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()',t);
    end if;
  end loop;
end $$;
grant select on public.onboarding_leads,public.user_evidence,public.manual_payments,public.agent_runs to authenticated;
create policy leads_admin_read on public.onboarding_leads for select to authenticated
  using(exists(select 1 from public.actor_profiles where user_id=(select auth.uid()) and role='ADMIN'));
create policy identity_admin_read on public.user_evidence for select to authenticated
  using(exists(select 1 from public.actor_profiles where user_id=(select auth.uid()) and role='ADMIN'));
create policy manual_payment_read on public.manual_payments for select to authenticated
  using(buyer_id=(select auth.uid()) or exists(select 1 from public.actor_profiles where user_id=(select auth.uid()) and role='ADMIN'));
create policy agent_run_admin_read on public.agent_runs for select to authenticated
  using(exists(select 1 from public.actor_profiles where user_id=(select auth.uid()) and role='ADMIN'));

create function public.report_manual_payment(
 p_demand_id uuid,p_order_id uuid,p_reference text,p_claimed_paid_at timestamptz,p_key text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_class text; v_ref text:=nullif(trim(p_reference),''); v_row public.manual_payments%rowtype;
begin
 select data_class into v_class from public.actor_profiles where user_id=v_uid and role='BUYER';
 if not found then raise exception 'buyer role required' using errcode='42501'; end if;
 if length(p_key) not between 8 and 128 or p_key is null then raise exception 'invalid idempotency key' using errcode='22023'; end if;
 if p_demand_id is null and p_order_id is null then raise exception 'demand or order required' using errcode='22023'; end if;
 if p_demand_id is not null and not exists(select 1 from public.buyer_demands where id=p_demand_id and buyer_id=v_uid) then
  raise exception 'demand access denied' using errcode='42501';
 end if;
 if p_order_id is not null and not exists(
  select 1 from public.orders o join public.proposals p on p.id=o.proposal_id
  where o.id=p_order_id and (p.snapshot->'buyerIds') ? v_uid::text
 ) then raise exception 'order access denied' using errcode='42501'; end if;
 if v_ref is not null and (length(v_ref) not between 4 and 100 or v_ref !~ '^[A-Za-z0-9][A-Za-z0-9 /_-]*$') then
  raise exception 'invalid transaction reference' using errcode='22023';
 end if;
 if p_claimed_paid_at>now()+interval '5 minutes' then raise exception 'payment timestamp is in the future' using errcode='22023'; end if;
 select * into v_row from public.manual_payments where buyer_id=v_uid and idempotency_key=p_key;
 if found then
  if v_row.demand_id is distinct from p_demand_id or v_row.order_id is distinct from p_order_id or
     v_row.transaction_reference is distinct from v_ref or v_row.claimed_paid_at is distinct from p_claimed_paid_at then
   raise exception 'idempotency key has different terms' using errcode='22023';
  end if;
  return to_jsonb(v_row);
 end if;
 insert into public.manual_payments(buyer_id,demand_id,order_id,transaction_reference,claimed_paid_at,status,data_class,idempotency_key)
 values(v_uid,p_demand_id,p_order_id,v_ref,p_claimed_paid_at,
   case when v_ref is null then 'REPORTED' else 'PENDING_VERIFICATION' end,v_class,p_key) returning * into v_row;
 insert into public.audit_events(actor_id,entity_type,entity_id,action,payload)
 values(v_uid,'manual_payment',v_row.id,'REPORTED',jsonb_build_object('method','MANUAL_PHONEPE','amountPaise',100,'status',v_row.status,'dataClass',v_class));
 return to_jsonb(v_row);
end $$;
revoke all on function public.report_manual_payment(uuid,uuid,text,timestamptz,text) from public,anon;
grant execute on function public.report_manual_payment(uuid,uuid,text,timestamptz,text) to authenticated;

create function public.amend_manual_payment(p_id uuid,p_reference text,p_paid_at timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_row public.manual_payments%rowtype; v_ref text:=trim(p_reference);
begin
 if not exists(select 1 from public.actor_profiles where user_id=v_uid and role='BUYER') then
  raise exception 'buyer role required' using errcode='42501'; end if;
 select * into v_row from public.manual_payments where id=p_id and buyer_id=v_uid for update;
 if not found then raise exception 'report not found' using errcode='P0002'; end if;
 if v_row.status not in ('REPORTED','PENDING_VERIFICATION') then raise exception 'report is final' using errcode='22023'; end if;
 if v_ref is null or length(v_ref) not between 4 and 100 or v_ref !~ '^[A-Za-z0-9][A-Za-z0-9 /_-]*$'
 or p_paid_at is null or p_paid_at>now()+interval '5 minutes' then
  raise exception 'actual reference and claimed timestamp required' using errcode='22023'; end if;
 update public.manual_payments set transaction_reference=v_ref,claimed_paid_at=p_paid_at,status='PENDING_VERIFICATION',
 evidence_notes=null,evidence_reference=null,reviewed_by=null,reviewed_at=null
 where id=p_id returning * into v_row;
 insert into public.audit_events(actor_id,entity_type,entity_id,action,payload)
 values(v_uid,'manual_payment',p_id,'REPORT_AMENDED',jsonb_build_object('status','PENDING_VERIFICATION'));
 return to_jsonb(v_row);
end $$;
revoke all on function public.amend_manual_payment(uuid,text,timestamptz) from public,anon;
grant execute on function public.amend_manual_payment(uuid,text,timestamptz) to authenticated;

create function public.review_manual_payment(
 p_id uuid,p_decision text,p_notes text,p_evidence text,p_matched_amount integer,p_matched_recipient text,p_matched_reference text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_row public.manual_payments%rowtype;
begin
 if not exists(select 1 from public.actor_profiles where user_id=v_uid and role='ADMIN') then
  raise exception 'admin role required' using errcode='42501';
 end if;
 if p_decision not in ('PENDING_VERIFICATION','MANUALLY_CONFIRMED','REJECTED') or p_decision is null or
   coalesce(length(trim(p_notes)),0)<10 or coalesce(length(trim(p_evidence)),0)<5 then
  raise exception 'decision and actual verification evidence required' using errcode='22023';
 end if;
 select * into v_row from public.manual_payments where id=p_id for update;
 if not found then raise exception 'payment report not found' using errcode='P0002'; end if;
 if v_row.status in ('MANUALLY_CONFIRMED','REJECTED') then raise exception 'payment review already final' using errcode='22023'; end if;
 if v_row.buyer_id=v_uid then raise exception 'cannot verify own payment' using errcode='42501'; end if;
 if p_decision='MANUALLY_CONFIRMED' and (
  v_row.transaction_reference is null or v_row.claimed_paid_at is null or
  p_matched_amount is distinct from 100 or p_matched_recipient is distinct from 'Juhi Dugar' or
  lower(trim(p_matched_reference)) is distinct from lower(v_row.transaction_reference)
 ) then raise exception 'recipient receipt must match reference, amount and recipient' using errcode='22023'; end if;
 update public.manual_payments set status=p_decision,evidence_notes=trim(p_notes),evidence_reference=trim(p_evidence),
 reviewed_by=v_uid,reviewed_at=now(),verified_by=case when p_decision='MANUALLY_CONFIRMED' then v_uid else null end,
 verified_at=case when p_decision='MANUALLY_CONFIRMED' then now() else null end where id=p_id returning * into v_row;
 insert into public.audit_events(actor_id,entity_type,entity_id,action,payload)
 values(v_uid,'manual_payment',p_id,p_decision,jsonb_build_object('method','MANUAL_PHONEPE','amountPaise',100,'dataClass',v_row.data_class));
 return to_jsonb(v_row);
end $$;
revoke all on function public.review_manual_payment(uuid,text,text,text,integer,text,text) from public,anon;
grant execute on function public.review_manual_payment(uuid,text,text,text,integer,text,text) to authenticated;

create function public.link_onboarding_buyer(p_lead uuid,p_buyer uuid,p_evidence text,p_consent boolean,p_external boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_lead public.onboarding_leads%rowtype;
begin
 if not exists(select 1 from public.actor_profiles where user_id=v_uid and role='ADMIN') then
  raise exception 'admin role required' using errcode='42501'; end if;
 if p_consent is distinct from true or p_external is distinct from true or coalesce(length(trim(p_evidence)),0)<10 then
  raise exception 'actual identity evidence and consent required' using errcode='22023'; end if;
 if not exists(select 1 from public.actor_profiles a join auth.users u on u.id=a.user_id
  where a.user_id=p_buyer and a.role='BUYER' and a.data_class<>'TEST'
  and (u.email_confirmed_at is not null or u.phone_confirmed_at is not null)) then
  raise exception 'confirmed non-test buyer identity required' using errcode='22023'; end if;
 select * into v_lead from public.onboarding_leads where id=p_lead for update;
 if not found then raise exception 'onboarding lead not found' using errcode='P0002'; end if;
 if v_lead.buyer_id is not null then raise exception 'lead already linked' using errcode='22023'; end if;
 insert into public.user_evidence(user_id,external_user,consent_confirmed,identity_evidence,verified_by)
 values(p_buyer,true,true,trim(p_evidence),v_uid);
 update public.actor_profiles set data_class='REAL' where user_id=p_buyer;
 update public.onboarding_leads set buyer_id=p_buyer,onboarding_status='PENDING_CORE_ACTION',
 missing_fields='["buyer must submit own exact SKU, quantity, price, fulfillment location, deadline and consent","actual transaction reference and claimed timestamp","recipient receipt evidence"]'::jsonb
 where id=p_lead returning * into v_lead;
 insert into public.audit_events(actor_id,entity_type,entity_id,action,payload)
 values(v_uid,'onboarding',p_lead,'IDENTITY_LINKED',jsonb_build_object('buyerId',p_buyer,'externalUser',true,'consentConfirmed',true));
 return to_jsonb(v_lead);
end $$;
revoke all on function public.link_onboarding_buyer(uuid,uuid,text,boolean,boolean) from public,anon;
grant execute on function public.link_onboarding_buyer(uuid,uuid,text,boolean,boolean) to authenticated;

create function public.release_evidence_metrics() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.actor_profiles where user_id=auth.uid() and role='ADMIN') then
  raise exception 'admin role required' using errcode='42501'; end if;
 return jsonb_build_object(
  'activatedExternalUsers',(select count(*) from public.user_evidence e join public.actor_profiles a on a.user_id=e.user_id
    where a.role='BUYER' and a.data_class='REAL' and e.external_user and e.consent_confirmed
    and exists(select 1 from public.buyer_demands d where d.buyer_id=e.user_id and d.consent_confirmed_at is not null)),
  'realBuyerDemands',(select count(*) from public.buyer_demands d join public.actor_profiles a on a.user_id=d.buyer_id
    join public.user_evidence e on e.user_id=d.buyer_id where a.data_class='REAL' and e.external_user
    and e.consent_confirmed and d.consent_confirmed_at is not null),
  'activeKiranas',(select count(*) from public.merchants m join public.actor_profiles a on a.user_id=m.owner_id where m.active and a.data_class='REAL'),
  'attributableSupplierQuotes',(select count(*) from public.supplier_quotes q join public.suppliers s on s.id=q.supplier_id
    join public.actor_profiles a on a.user_id=s.owner_id where a.data_class='REAL' and q.quoted_by=s.owner_id),
  'agenticOrgRuns',(select count(*) from public.agent_runs where provider_run_id is not null),
  'humanApprovals',(select count(*) from public.approvals p join public.actor_profiles a on a.user_id=p.authenticated_identity
    join public.user_evidence e on e.user_id=a.user_id where a.data_class='REAL' and e.consent_confirmed),
  'manualPaymentReports',(select count(*) from public.manual_payments where data_class<>'TEST'),
  'manuallyConfirmedPhonePe',(select count(*) from public.manual_payments where data_class<>'TEST' and status='MANUALLY_CONFIRMED'),
  'pineLabsUatVerified',0,
  'pineLabsLiveVerified',0,
  'testActors',(select count(*) from public.actor_profiles where data_class='TEST'),
  'testDemands',(select count(*) from public.buyer_demands d join public.actor_profiles a on a.user_id=d.buyer_id where a.data_class='TEST'),
  'testManualPaymentReports',(select count(*) from public.manual_payments where data_class='TEST'),
  'teamReportedBuyerClaims',(select count(*) from public.onboarding_leads),
  'pineLabsCompliance','UNSATISFIED'
 );
end $$;
revoke all on function public.release_evidence_metrics() from public,anon;
grant execute on function public.release_evidence_metrics() to authenticated;
