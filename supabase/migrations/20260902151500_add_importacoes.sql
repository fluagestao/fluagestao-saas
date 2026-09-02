-- Importacoes por planilha: um registro por lote, com os ids que ele criou.
--
-- E o que torna a importacao reversivel: "Desfazer" apaga exatamente o que o
-- lote criou (e so o que ainda nao esta em uso), nada alem. Guardar os ids num
-- array evita uma segunda tabela e nao toca em nenhuma das tabelas de cadastro.
-- A importacao so cria, nunca atualiza — por isso desfazer e um delete limpo.

create table if not exists public.importacoes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  entidade text not null
    check (entidade in ('insumos', 'fornecedores', 'clientes', 'produtos')),
  arquivo text check (arquivo is null or char_length(arquivo) <= 200),
  total_linhas integer not null default 0,
  criados integer not null default 0,
  pulados integer not null default 0,
  com_erro integer not null default 0,
  -- ids criados neste lote, na tabela indicada por `entidade`
  registros_criados uuid[] not null default '{}',
  desfeita_em timestamptz,
  -- quantos de fato foram apagados ao desfazer (os em uso ficam)
  desfeitos integer,
  criado_por uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists importacoes_company_idx
  on public.importacoes (company_id, created_at desc);

alter table public.importacoes enable row level security;

drop policy if exists importacoes_select on public.importacoes;
create policy importacoes_select on public.importacoes
  for select using (private.has_company_permission(company_id, 'financial', 'view'));

drop policy if exists importacoes_insert on public.importacoes;
create policy importacoes_insert on public.importacoes
  for insert with check (private.has_company_permission(company_id, 'financial', 'create'));

drop policy if exists importacoes_update on public.importacoes;
create policy importacoes_update on public.importacoes
  for update using (private.has_company_permission(company_id, 'financial', 'update'))
  with check (private.has_company_permission(company_id, 'financial', 'update'));

comment on table public.importacoes is
  'Lotes de importacao por planilha. registros_criados permite desfazer o lote.';
