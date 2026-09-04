-- ============================================================================
-- Teste gratuito: 7 dias viram 30.
--
-- POR QUE PRECISA DE MIGRATION
--
-- O prazo não está no código: quem cria a assinatura é a função
-- public.complete_onboarding, no Postgres, com `now() + interval '7 days'`.
-- Mudar no app não teria efeito nenhum — a linha nasce no banco.
--
-- COMO ESTE ARQUIVO FOI FEITO
--
-- A função inteira foi EXTRAÍDA de
-- supabase/migrations/20260901011500_prevent_duplicate_signup_identity.sql
-- por script, e o único caractere alterado foi o prazo. Copiar 113 linhas de
-- PL/pgSQL à mão é onde se troca um parâmetro sem perceber, e o erro só
-- apareceria no cadastro de uma cliente de verdade.
--
-- Confira você mesmo, antes de rodar:
--
--   diff <(sed -n '/^create or replace function public.complete_onboarding(/,$p' \
--            supabase/migrations/20260901011500_prevent_duplicate_signup_identity.sql) \
--        <(sed -n '/^create or replace function public.complete_onboarding(/,$p' \
--            supabase/migrations/20260904160000_trial_de_30_dias.sql)
--
-- A única diferença deve ser a linha do interval.
--
-- O QUE ELA NÃO FAZ
--
-- `create or replace` só muda quem nascer daqui para frente. Quem já está em
-- teste continua com os 7 dias que recebeu — inclusive a sua empresa. O UPDATE
-- que estende os testes em curso está DEPOIS do commit, separado de propósito:
-- é dado, não schema, e você decide se quer.
-- ============================================================================

begin;

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
    v_company_id, 'trial', 'trialing', now(), now() + interval '30 days'
  );

  return v_company_id;
end;
$function$;

revoke all on function public.complete_onboarding(text,text,text,text,text,text,text,text,text,text,text,text,text,text) from public;
grant execute on function public.complete_onboarding(text,text,text,text,text,text,text,text,text,text,text,text,text,text) to authenticated;

commit;

-- ============================================================================
-- ESTENDER QUEM JÁ ESTÁ EM TESTE
--
-- Separado do bloco acima porque é outra coisa: o de cima muda a regra para os
-- próximos, este mexe em linha que já existe.
--
-- Ele só EMPURRA a data — nunca encurta. Um teste que já teria 30 dias fica
-- como está, e ninguém perde prazo por rodar isto duas vezes.
--
-- Rode as duas linhas juntas para ver o que mudou:
-- ============================================================================

-- update public.subscriptions
--    set trial_ends_at = trial_started_at + interval '30 days'
--  where status = 'trialing'
--    and trial_started_at is not null
--    and trial_ends_at < trial_started_at + interval '30 days'
--  returning company_id, trial_started_at::date, trial_ends_at::date;
