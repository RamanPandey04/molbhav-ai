-- A receipt formatted with spaces or different casing must not count twice.
create unique index manual_payment_reference_canonical_unique on public.manual_payments
 (lower(regexp_replace(transaction_reference,'[[:space:]]','','g')))
 where transaction_reference is not null;

-- An order in a shared pool is not owned by every buyer in that pool.
create function public.guard_manual_payment_links()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_snapshot jsonb; v_merchant uuid;
begin
 if new.order_id is not null then
  select p.snapshot,o.merchant_id into v_snapshot,v_merchant from public.orders o
    join public.proposals p on p.id=o.proposal_id where o.id=new.order_id;
  if not found or not exists(select 1 from jsonb_array_elements(coalesce(v_snapshot->'buyerTerms','[]'::jsonb)) t
    where t->>'buyerId'=new.buyer_id::text and t->>'merchantId'=v_merchant::text
      and (new.demand_id is null or t->>'demandId'=new.demand_id::text)) then
   raise exception 'order does not belong to this buyer and demand' using errcode='42501';
  end if;
 end if;
 return new;
end $$;
create trigger manual_payment_links before insert or update of buyer_id,demand_id,order_id
 on public.manual_payments for each row execute function public.guard_manual_payment_links();
