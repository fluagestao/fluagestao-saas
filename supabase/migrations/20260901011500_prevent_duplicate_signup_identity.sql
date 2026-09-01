create or replace function public.check_signup_availability(
  p_email text,
  p_document text
)
returns table(email_exists boolean, document_exists boolean)
language sql
security definer
set search_path to ''
as $function$
  with normalized as (
    select
      lower(btrim(coalesce(p_email, ''))) as email,
      nullif(regexp_replace(coalesce(p_document, ''), '[^0-9]', '', 'g'), '') as document
  )
  select
    exists (
      select 1
      from auth.users u, normalized n
      where n.email <> ''
        and lower(coalesce(u.email, '')) = n.email
    ) or exists (
      select 1
      from public.companies c, normalized n
      where n.email <> ''
        and lower(coalesce(c.email, '')) = n.email
    ) as email_exists,
    exists (
      select 1
      from auth.users u, normalized n
      where n.document is not null
        and nullif(regexp_replace(coalesce(u.raw_user_meta_data->>'document', ''), '[^0-9]', '', 'g'), '') = n.document
    ) or exists (
      select 1
      from public.companies c, normalized n
      where n.document is not null
        and c.document = n.document
    ) as document_exists;
$function$;

revoke all on function public.check_signup_availability(text, text) from public;
grant execute on function public.check_signup_availability(text, text) to anon, authenticated;

create or replace function public.complete_onboarding(
  p_full_name text,
  p_cpf text,
  p_store_name text,
  p_document_type text,
  p_document text,
  p_email text,
  p_phone text default null,
  p_postal_code text default null,
  p_street text default null,
  p_address_number text default null,
  p_complement text default null,
  p_district text default null,
  p_city text default null,
  p_state text default null
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_cpf text := nullif(regexp_replace(coalesce(p_cpf, ''), '[^0-9]', '', 'g'), '');
  v_document text := nullif(regexp_replace(coalesce(p_document, ''), '[^0-9]', '', 'g'), '');
  v_postal_code text := nullif(regexp_replace(coalesce(p_postal_code, ''), '[^0-9]', '', 'g'), '');
  v_email text := lower(trim(coalesce(auth.jwt()->>'email', p_email)));
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if v_email is null or v_email = '' then
    raise exception 'email is required';
  end if;

  select cm.company_id into v_company_id
  from public.company_members cm
  where cm.user_id = v_user_id
    and cm.role = 'owner'
    and cm.status = 'active'
  order by cm.created_at
  limit 1;

  if v_company_id is not null then
    return v_company_id;
  end if;

  if v_document is not null and exists (
    select 1
    from public.companies c
    where c.document = v_document
  ) then
    raise exception using
      errcode = '23505',
      message = 'CPF/CNPJ já possui cadastro na Flua.';
  end if;

  insert into public.profiles (id, full_name, cpf, email, phone)
  values (
    v_user_id,
    trim(p_full_name),
    v_cpf,
    v_email,
    nullif(trim(coalesce(p_phone, '')), '')
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        cpf = coalesce(excluded.cpf, public.profiles.cpf),
        email = excluded.email,
        phone = excluded.phone;

  insert into public.companies (
    created_by, name, legal_name, document_type, document, email, phone,
    postal_code, street, address_number, complement, district, city, state
  )
  values (
    v_user_id,
    trim(p_store_name),
    trim(p_store_name),
    lower(trim(p_document_type)),
    v_document,
    v_email,
    nullif(trim(coalesce(p_phone, '')), ''),
    v_postal_code,
    nullif(trim(coalesce(p_street, '')), ''),
    nullif(trim(coalesce(p_address_number, '')), ''),
    nullif(trim(coalesce(p_complement, '')), ''),
    nullif(trim(coalesce(p_district, '')), ''),
    nullif(trim(coalesce(p_city, '')), ''),
    nullif(upper(trim(coalesce(p_state, ''))), '')
  )
  returning id into v_company_id;

  insert into public.company_members (
    company_id, user_id, display_name, email, role, status
  ) values (
    v_company_id, v_user_id, trim(p_full_name), v_email, 'owner', 'active'
  );

  insert into public.subscriptions (
    company_id, plan, status, trial_started_at, trial_ends_at
  ) values (
    v_company_id, 'trial', 'trialing', now(), now() + interval '7 days'
  );

  return v_company_id;
end;
$function$;

revoke all on function public.complete_onboarding(text,text,text,text,text,text,text,text,text,text,text,text,text,text) from public;
grant execute on function public.complete_onboarding(text,text,text,text,text,text,text,text,text,text,text,text,text,text) to authenticated;
