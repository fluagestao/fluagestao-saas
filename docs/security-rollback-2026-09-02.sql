begin;
alter view public.insumo_estoque reset (security_invoker);
drop trigger if exists profiles_normalize_identity on public.profiles;
drop trigger if exists companies_normalize_identity on public.companies;
drop trigger if exists clientes_normalize_identity on public.clientes;
drop trigger if exists fornecedores_normalize_identity on public.fornecedores;
drop function if exists private.normalize_identity_fields();
drop index if exists public.profiles_email_normalized_uidx;
drop index if exists public.profiles_cpf_normalized_uidx;
drop index if exists public.companies_document_normalized_uidx;
drop index if exists public.clientes_company_email_normalized_uidx;
drop index if exists public.clientes_company_document_normalized_uidx;
drop index if exists public.fornecedores_company_email_normalized_uidx;
drop index if exists public.fornecedores_company_document_normalized_uidx;
-- Restore the subscription INSERT policy only if the application is rolled back.
create policy subscriptions_insert_owner on public.subscriptions for insert to authenticated with check (private.is_company_owner(company_id));
grant insert on public.subscriptions to authenticated;
-- Bucket limits and policy role targets must be restored from the pre-deploy
-- schema snapshot because their prior values are environment configuration.
commit;
