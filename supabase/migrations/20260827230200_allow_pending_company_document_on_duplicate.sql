alter table public.companies alter column document drop not null;

alter table public.companies drop constraint if exists companies_document_format;
alter table public.companies add constraint companies_document_format check (
  document is null or
  ((document_type = 'cpf' and document ~ '^[0-9]{11}$') or
   (document_type = 'cnpj' and document ~ '^[0-9]{14}$'))
);

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
  v_document_to_store text;
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

  v_document_to_store := v_document;
  if v_document is not null and exists (
    select 1 from public.companies c where c.document = v_document
  ) then
    v_document_to_store := null;
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
    v_document_to_store,
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
