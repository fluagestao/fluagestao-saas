-- Tipos de receita: a mesma ideia de tipos_despesa, do outro lado do caixa.
--
-- Tabela propria em vez de uma coluna "natureza" em tipos_despesa: as duas
-- listas sao de dominios diferentes (venda de cesta, taxa de entrega, aluguel
-- de tabua contra insumo, embalagem, combustivel) e nunca se misturam numa
-- mesma tela. Reaproveitar a tabela deixaria movimentos.tipo_despesa_id
-- guardando receita, e nome de coluna que mente e o comeco de toda confusao.

create table if not exists public.tipos_receita (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  nome text not null check (char_length(trim(nome)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tipos_receita_company_nome_unique
  on public.tipos_receita (company_id, lower(trim(nome)));

alter table public.tipos_receita enable row level security;

drop policy if exists tipos_receita_select_company on public.tipos_receita;
create policy tipos_receita_select_company on public.tipos_receita
  for select using (private.has_company_permission(company_id, 'financial', 'view'));

drop policy if exists tipos_receita_insert_company on public.tipos_receita;
create policy tipos_receita_insert_company on public.tipos_receita
  for insert with check (private.has_company_permission(company_id, 'financial', 'create'));

drop policy if exists tipos_receita_update_company on public.tipos_receita;
create policy tipos_receita_update_company on public.tipos_receita
  for update using (private.has_company_permission(company_id, 'financial', 'update'))
  with check (private.has_company_permission(company_id, 'financial', 'update'));

drop policy if exists tipos_receita_delete_company on public.tipos_receita;
create policy tipos_receita_delete_company on public.tipos_receita
  for delete using (private.has_company_permission(company_id, 'financial', 'delete'));

drop trigger if exists tipos_receita_set_updated_at on public.tipos_receita;
create trigger tipos_receita_set_updated_at
  before update on public.tipos_receita
  for each row execute function private.set_updated_at();

alter table public.movimentos
  add column if not exists tipo_receita_id uuid references public.tipos_receita(id) on delete set null;

create index if not exists movimentos_tipo_receita_idx
  on public.movimentos (company_id, tipo_receita_id);

comment on table public.tipos_receita is
  'Categorias de recebimento (venda, taxa de entrega, outros), por empresa.';
