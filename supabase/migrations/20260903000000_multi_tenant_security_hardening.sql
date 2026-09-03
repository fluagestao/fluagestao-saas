-- Flua multi-tenant security hardening (prepared only; do not apply to production
-- before review and testing in an isolated environment).
-- Rollback is documented in docs/security-rollback-2026-09-02.sql.

begin;

-- Views in exposed schemas must obey the caller's RLS context.
alter view public.insumo_estoque set (security_invoker = true);

-- These policies were created TO public. Their predicates currently deny anon
-- users, but limiting the role is explicit defense in depth.
alter policy contas_a_pagar_delete_company on public.contas_a_pagar to authenticated;
alter policy contas_a_pagar_insert_company on public.contas_a_pagar to authenticated;
alter policy contas_a_pagar_select_company on public.contas_a_pagar to authenticated;
alter policy contas_a_pagar_update_company on public.contas_a_pagar to authenticated;
alter policy estoque_movimentos_delete on public.estoque_movimentos to authenticated;
alter policy estoque_movimentos_insert on public.estoque_movimentos to authenticated;
alter policy estoque_movimentos_select on public.estoque_movimentos to authenticated;
alter policy estoque_movimentos_update on public.estoque_movimentos to authenticated;
alter policy etiquetas_delete_company on public.etiquetas to authenticated;
alter policy etiquetas_insert_company on public.etiquetas to authenticated;
alter policy etiquetas_select_company on public.etiquetas to authenticated;
alter policy etiquetas_update_company on public.etiquetas to authenticated;
alter policy financeiro_config_insert on public.financeiro_config to authenticated;
alter policy financeiro_config_select on public.financeiro_config to authenticated;
alter policy financeiro_config_update on public.financeiro_config to authenticated;
alter policy importacoes_insert on public.importacoes to authenticated;
alter policy importacoes_select on public.importacoes to authenticated;
alter policy importacoes_update on public.importacoes to authenticated;
alter policy insumo_custo_historico_insert on public.insumo_custo_historico to authenticated;
alter policy insumo_custo_historico_select on public.insumo_custo_historico to authenticated;
alter policy insumos_delete_company on public.insumos to authenticated;
alter policy insumos_insert_company on public.insumos to authenticated;
alter policy insumos_select_company on public.insumos to authenticated;
alter policy insumos_update_company on public.insumos to authenticated;
alter policy produto_insumos_delete_company on public.produto_insumos to authenticated;
alter policy produto_insumos_insert_company on public.produto_insumos to authenticated;
alter policy produto_insumos_select_company on public.produto_insumos to authenticated;
alter policy produto_insumos_update_company on public.produto_insumos to authenticated;
alter policy tipos_despesa_delete_company on public.tipos_despesa to authenticated;
alter policy tipos_despesa_insert_company on public.tipos_despesa to authenticated;
alter policy tipos_despesa_select_company on public.tipos_despesa to authenticated;
alter policy tipos_despesa_update_company on public.tipos_despesa to authenticated;
alter policy tipos_fornecedor_delete_company on public.tipos_fornecedor to authenticated;
alter policy tipos_fornecedor_insert_company on public.tipos_fornecedor to authenticated;
alter policy tipos_fornecedor_select_company on public.tipos_fornecedor to authenticated;
alter policy tipos_fornecedor_update_company on public.tipos_fornecedor to authenticated;
alter policy tipos_receita_delete_company on public.tipos_receita to authenticated;
alter policy tipos_receita_insert_company on public.tipos_receita to authenticated;
alter policy tipos_receita_select_company on public.tipos_receita to authenticated;
alter policy tipos_receita_update_company on public.tipos_receita to authenticated;

-- Trigger functions are never legitimate RPC endpoints.
revoke all on function public.assign_product_sequential_code() from public, anon, authenticated;

-- Subscription creation is performed by complete_onboarding() and later billing
-- changes must use a controlled server process/service role.
drop policy if exists subscriptions_insert_owner on public.subscriptions;
revoke insert, update, delete on public.subscriptions from anon, authenticated;

-- Enforce normalized values for future writes. Existing values are not rewritten.
create or replace function private.normalize_identity_fields()
returns trigger language plpgsql set search_path = '' as $$
begin
  if to_jsonb(new) ? 'email' then
    new.email := lower(nullif(btrim(new.email), ''));
  end if;
  if tg_table_name = 'profiles' then
    new.cpf := nullif(regexp_replace(coalesce(new.cpf, ''), '[^0-9]', '', 'g'), '');
  elsif tg_table_name = 'companies' then
    new.document := nullif(regexp_replace(coalesce(new.document, ''), '[^0-9]', '', 'g'), '');
  elsif tg_table_name in ('clientes', 'fornecedores') then
    new.documento := nullif(regexp_replace(coalesce(new.documento, ''), '[^0-9]', '', 'g'), '');
  end if;
  return new;
end $$;
revoke all on function private.normalize_identity_fields() from public, anon, authenticated;

create trigger profiles_normalize_identity before insert or update of email, cpf on public.profiles for each row execute function private.normalize_identity_fields();
create trigger companies_normalize_identity before insert or update of email, document on public.companies for each row execute function private.normalize_identity_fields();
create trigger clientes_normalize_identity before insert or update of email, documento on public.clientes for each row execute function private.normalize_identity_fields();
create trigger fornecedores_normalize_identity before insert or update of email, documento on public.fornecedores for each row execute function private.normalize_identity_fields();

-- Expression indexes protect normalized identities without rewriting historical
-- formatting. Preflight found no duplicates for these fields on 2026-09-02.
create unique index profiles_email_normalized_uidx on public.profiles (lower(btrim(email))) where nullif(btrim(email), '') is not null;
create unique index profiles_cpf_normalized_uidx on public.profiles (regexp_replace(cpf, '[^0-9]', '', 'g')) where nullif(regexp_replace(cpf, '[^0-9]', '', 'g'), '') is not null;
create unique index companies_document_normalized_uidx on public.companies (regexp_replace(document, '[^0-9]', '', 'g')) where nullif(regexp_replace(document, '[^0-9]', '', 'g'), '') is not null;
create unique index clientes_company_email_normalized_uidx on public.clientes (company_id, lower(btrim(email))) where nullif(btrim(email), '') is not null;
create unique index clientes_company_document_normalized_uidx on public.clientes (company_id, regexp_replace(documento, '[^0-9]', '', 'g')) where nullif(regexp_replace(documento, '[^0-9]', '', 'g'), '') is not null;
create unique index fornecedores_company_email_normalized_uidx on public.fornecedores (company_id, lower(btrim(email))) where nullif(btrim(email), '') is not null;
create unique index fornecedores_company_document_normalized_uidx on public.fornecedores (company_id, regexp_replace(documento, '[^0-9]', '', 'g')) where nullif(regexp_replace(documento, '[^0-9]', '', 'g'), '') is not null;

-- Public catalog images are intentionally public. Restrict upload surface.
update storage.buckets set file_size_limit = 5242880,
  allowed_mime_types = array['image/png','image/jpeg','image/webp']
where id = 'produtos';

commit;
