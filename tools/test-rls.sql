-- ───────────────────────────────────────────────────────────────
-- Sitehouse — per-user isolation proof
--
-- Run against the project (Supabase SQL editor, or psql). It seeds two
-- orders, queries them AS each user through RLS, attempts three real
-- attacks, and rolls everything back. Nothing persists.
--
-- Replace the two uuids with real auth.users ids before running:
--   select id, email from public.profiles order by created_at;
--
-- Every row must read PASS. A FAIL means one account can reach
-- another's data — treat it as a stop-the-line bug.
-- ───────────────────────────────────────────────────────────────
\set A '00000000-0000-0000-0000-00000000000a'
\set B '00000000-0000-0000-0000-00000000000b'

begin;

insert into public.orders (user_id, tier, status, one_time_cents, deposit_cents)
values (:'A','full','draft',80000,20000),
       (:'B','custom','draft',50000,12500);

create temp table result(seq serial, check_name text, outcome text);
grant all on table result to authenticated, anon;
grant usage, select on all sequences in schema pg_temp to authenticated, anon;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'A', 'role','authenticated')::text, true);

insert into result(check_name,outcome)
select 'A sees only its own order',
       case when count(*)=1 and bool_and(user_id=:'A') then 'PASS'
            else 'FAIL got '||count(*) end from public.orders;

insert into result(check_name,outcome)
select 'A cannot read B''s order (IDOR)',
       case when count(*)=0 then 'PASS' else 'FAIL leaked' end
from public.orders where user_id=:'B';

insert into result(check_name,outcome)
select 'A sees only its own profile',
       case when count(*)=1 then 'PASS' else 'FAIL got '||count(*) end from public.profiles;

-- attack 1: privilege escalation
update public.profiles set role='staff' where id=:'A';
insert into result(check_name,outcome)
select 'A cannot self-promote to staff',
       case when (select p.role from public.profiles p where p.id=:'A')='customer'
            then 'PASS' else 'FAIL escalated' end;

-- attack 2: tamper with another account's order.
-- Verified after reset role, because as A the row is invisible and the
-- check would read NULL and look like a failure.
update public.orders set one_time_cents=1 where user_id=:'B';

set local role anon;
select set_config('request.jwt.claims','',true);

insert into result(check_name,outcome)
select 'anonymous sees no orders',
       case when count(*)=0 then 'PASS' else 'FAIL leaked '||count(*) end from public.orders;
insert into result(check_name,outcome)
select 'anonymous sees no profiles',
       case when count(*)=0 then 'PASS' else 'FAIL leaked '||count(*) end from public.profiles;
insert into result(check_name,outcome)
select 'anonymous sees no invoices',
       case when count(*)=0 then 'PASS' else 'FAIL leaked '||count(*) end from public.invoices;

reset role;

insert into result(check_name,outcome)
select 'B''s order untouched by A',
       case when one_time_cents=50000 then 'PASS' else 'FAIL now '||one_time_cents end
from public.orders where user_id=:'B';

select check_name, outcome from result order by seq;

rollback;

-- attack 3, run on its own because a rejected insert aborts the
-- transaction above. Expected: "new row violates row-level security
-- policy" — a customer may compose an order, never declare it paid.
--
--   begin;
--   set local role authenticated;
--   select set_config('request.jwt.claims',
--     json_build_object('sub','<A>','role','authenticated')::text, true);
--   insert into public.orders (user_id,tier,status,one_time_cents)
--   values ('<A>','full','paid',99);   -- must ERROR
--   rollback;
