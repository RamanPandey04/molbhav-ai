begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at)
values ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','buyer-test@example.invalid','x',now(),now()),
       ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','merchant-test@example.invalid','x',now(),now());
insert into public.zones(id,name) values('00000000-0000-0000-0000-000000000010','Test zone');
insert into public.products(id,name,unit) values('00000000-0000-0000-0000-000000000020','Test rice','kg');
insert into public.merchants(id,owner_id,zone_id,name) values('00000000-0000-0000-0000-000000000030','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000010','Test merchant');
insert into public.buyer_demands(buyer_id,merchant_id,product_id,quantity,allocated_existing_stock,expires_at,idempotency_key)
values ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000030','00000000-0000-0000-0000-000000000020',10,3,now()+interval '1 day','test-demand-one');
insert into public.merchant_restock_requests(merchant_id,product_id,quantity,expires_at,idempotency_key)
values ('00000000-0000-0000-0000-000000000030','00000000-0000-0000-0000-000000000020',4,now()+interval '1 day','test-restock-one');
do $$ begin
  if (select quantity from public.pools where zone_id='00000000-0000-0000-0000-000000000010' and product_id='00000000-0000-0000-0000-000000000020') <> 11 then
    raise exception 'expected pool quantity 11';
  end if;
end $$;
update public.buyer_demands set expires_at=now()-interval '1 second' where idempotency_key='test-demand-one';
do $$ begin
  if (select quantity from public.pools where zone_id='00000000-0000-0000-0000-000000000010' and product_id='00000000-0000-0000-0000-000000000020') <> 4 then
    raise exception 'expected expired demand excluded';
  end if;
end $$;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at)
values ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','other-buyer-test@example.invalid','x',now(),now());
insert into public.buyer_demands(buyer_id,merchant_id,product_id,quantity,expires_at,idempotency_key)
values ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000030','00000000-0000-0000-0000-000000000020',2,now()+interval '1 day','test-demand-two');
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
do $$ begin
  if (select count(*) from public.buyer_demands) <> 1 then
    raise exception 'buyer RLS did not isolate own demand';
  end if;
  if (select count(*) from public.merchant_restock_requests) <> 0 then
    raise exception 'merchant restock leaked to buyer';
  end if;
end $$;
reset role;
rollback;
