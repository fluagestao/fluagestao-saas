create table if not exists public.tipos_despesa (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  nome text not null check (char_length(trim(nome)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tipos_despesa_company_nome_unique
  on public.tipos_despesa (company_id, lower(trim(nome)));

alter table public.tipos_despesa enable row level security;

drop policy if exists tipos_despesa_select_company on public.tipos_despesa;
create policy tipos_despesa_select_company on public.tipos_despesa
  for select using (private.has_company_permission(company_id, 'financial', 'view'));

drop policy if exists tipos_despesa_insert_company on public.tipos_despesa;
create policy tipos_despesa_insert_company on public.tipos_despesa
  for insert with check (private.has_company_permission(company_id, 'financial', 'create'));

drop policy if exists tipos_despesa_update_company on public.tipos_despesa;
create policy tipos_despesa_update_company on public.tipos_despesa
  for update using (private.has_company_permission(company_id, 'financial', 'update'))
  with check (private.has_company_permission(company_id, 'financial', 'update'));

drop policy if exists tipos_despesa_delete_company on public.tipos_despesa;
create policy tipos_despesa_delete_company on public.tipos_despesa
  for delete using (private.has_company_permission(company_id, 'financial', 'delete'));

drop trigger if exists tipos_despesa_set_updated_at on public.tipos_despesa;
create trigger tipos_despesa_set_updated_at
  before update on public.tipos_despesa
  for each row execute function private.set_updated_at();

alter table public.movimentos
  add column if not exists tipo_despesa_id uuid references public.tipos_despesa(id) on delete set null;

create index if not exists movimentos_tipo_despesa_idx
  on public.movimentos (company_id, tipo_despesa_id);
