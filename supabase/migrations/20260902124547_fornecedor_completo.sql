-- Cadastro de fornecedor um pouco mais completo: documento, endereco e tipo.
--
-- Tudo opcional de proposito. Cesteira cadastra fornecedor com pressa, no meio
-- da compra — campo obrigatorio aqui viraria motivo para nao cadastrar.

create table if not exists public.tipos_fornecedor (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  nome text not null check (char_length(trim(nome)) between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tipos_fornecedor_company_nome_unique
  on public.tipos_fornecedor (company_id, lower(trim(nome)));

alter table public.tipos_fornecedor enable row level security;

drop policy if exists tipos_fornecedor_select_company on public.tipos_fornecedor;
create policy tipos_fornecedor_select_company on public.tipos_fornecedor
  for select using (private.has_company_permission(company_id, 'financial', 'view'));

drop policy if exists tipos_fornecedor_insert_company on public.tipos_fornecedor;
create policy tipos_fornecedor_insert_company on public.tipos_fornecedor
  for insert with check (private.has_company_permission(company_id, 'financial', 'create'));

drop policy if exists tipos_fornecedor_update_company on public.tipos_fornecedor;
create policy tipos_fornecedor_update_company on public.tipos_fornecedor
  for update using (private.has_company_permission(company_id, 'financial', 'update'))
  with check (private.has_company_permission(company_id, 'financial', 'update'));

drop policy if exists tipos_fornecedor_delete_company on public.tipos_fornecedor;
create policy tipos_fornecedor_delete_company on public.tipos_fornecedor
  for delete using (private.has_company_permission(company_id, 'financial', 'delete'));

drop trigger if exists tipos_fornecedor_set_updated_at on public.tipos_fornecedor;
create trigger tipos_fornecedor_set_updated_at
  before update on public.tipos_fornecedor
  for each row execute function private.set_updated_at();

-- Documento guardado so com digitos: e assim que da para comparar dois
-- cadastros do mesmo CNPJ digitados com pontuacao diferente. A formatacao
-- acontece na tela.
alter table public.fornecedores
  add column if not exists documento text
    check (documento is null or documento ~ '^[0-9]{11}$' or documento ~ '^[0-9]{14}$'),
  add column if not exists endereco text check (char_length(endereco) <= 200),
  add column if not exists cidade text check (char_length(cidade) <= 80),
  add column if not exists tipo_fornecedor_id uuid
    references public.tipos_fornecedor(id) on delete set null;

create index if not exists fornecedores_tipo_idx
  on public.fornecedores (company_id, tipo_fornecedor_id);

comment on column public.fornecedores.documento is
  'CPF (11 digitos) ou CNPJ (14), sem pontuacao.';
comment on table public.tipos_fornecedor is
  'Tipos de fornecedor (supermercado, boutique, industria), por empresa.';
