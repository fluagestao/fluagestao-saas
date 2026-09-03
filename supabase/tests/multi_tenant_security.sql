-- Run ONLY on a disposable Supabase branch/staging database.
-- Required psql variables: user_a, user_b, company_a, company_b, order_b,
-- common_a, owner_a. Every mutating assertion must be enclosed in this rollback.
begin;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

-- User A cannot read B.
select set_config('request.jwt.claim.sub', :'user_a', true);
do $$ begin
  if exists(select 1 from public.pedidos where company_id = :'company_b'::uuid) then
    raise exception 'FAIL: A read B';
  end if;
end $$;

-- Manipulated writes must affect zero rows / be rejected by RLS.
update public.pedidos set observacao = 'security-test' where id = :'order_b'::uuid;
do $$ begin if found then raise exception 'FAIL: A updated B'; end if; end $$;
delete from public.pedidos where id = :'order_b'::uuid;
do $$ begin if found then raise exception 'FAIL: A deleted B'; end if; end $$;

do $$ begin
  begin
    insert into public.clientes(company_id,nome) values (:'company_b'::uuid,'security-test');
    raise exception 'FAIL: A inserted into B';
  exception when insufficient_privilege then null; end;
end $$;

-- Common member cannot change administrative data.
select set_config('request.jwt.claim.sub', :'common_a', true);
do $$ begin
  begin
    update public.company_members set role='owner' where user_id=:'common_a'::uuid and company_id=:'company_a'::uuid;
    if found then raise exception 'FAIL: common changed role'; end if;
  exception when insufficient_privilege then null; end;
end $$;
do $$ begin
  begin
    insert into public.subscriptions(company_id,plan,status) values(:'company_a'::uuid,'premium','active');
    raise exception 'FAIL: common inserted subscription';
  exception when insufficient_privilege then null; end;
end $$;

-- Anonymous access to private business rows must return none.
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  if exists(select 1 from public.pedidos) then raise exception 'FAIL: anon read orders'; end if;
end $$;

rollback;

-- Storage and signed-URL expiry tests are HTTP tests and must be executed by the
-- integration runner: A/B cross-path GET/PUT/DELETE, unauthenticated access to a
-- private fixture bucket, and GET after signed URL expiry.
