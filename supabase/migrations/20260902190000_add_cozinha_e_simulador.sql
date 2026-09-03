-- ============================================================================
-- Cozinha (receitas) e Simulador (rascunhos de cesta).
--
-- Duas telas de caderno: voce anota rapido, com item digitado solto, sem
-- passar pelo cadastro de insumos. A diferenca esta na saida.
--
--   Cozinha   -> so consulta. A receita mostra o custo por porcao e para ali.
--                Se quiser usar numa cesta, o insumo e cadastrado a mao em
--                Insumos. Por isso NAO existe coluna ligando receita a insumo.
--
--   Simulador -> vira produto por decisao explicita, e so quando TODO item ja
--                for insumo cadastrado. Composicao pela metade nao parece
--                errada: o custo sai baixo, a margem sai alta, e isso vai
--                direto para o relatorio sem nada indicando que falta.
-- ============================================================================

-- ------------------------------------------------------------------ Cozinha
create table if not exists public.receitas (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,

  nome text not null check (char_length(trim(nome)) between 1 and 160),
  -- Quanto a receita rende. E o divisor do custo por porcao.
  rendimento numeric(12, 3) not null default 1 check (rendimento > 0),
  unidade_rendimento text not null default 'porção'
    check (char_length(unidade_rendimento) between 1 and 40),

  modo_preparo text check (modo_preparo is null or char_length(modo_preparo) <= 4000),
  observacao text check (observacao is null or char_length(observacao) <= 500),

  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists receitas_company_idx on public.receitas (company_id, nome);

create table if not exists public.receita_ingredientes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  receita_id uuid not null references public.receitas(id) on delete cascade,

  -- Sempre digitado: a Cozinha nao puxa do cadastro de insumos de proposito,
  -- para anotar uma receita ser rapido.
  descricao text not null check (char_length(trim(descricao)) between 1 and 160),
  quantidade numeric(12, 3) not null default 1 check (quantidade > 0),
  valor_unitario numeric(12, 4) not null check (valor_unitario >= 0),
  ordem integer not null default 0,

  created_at timestamptz not null default now()
);

create index if not exists receita_ingredientes_idx
  on public.receita_ingredientes (company_id, receita_id, ordem);

-- ---------------------------------------------------------------- Simulador
create table if not exists public.simulacoes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,

  nome text not null check (char_length(trim(nome)) between 1 and 160),
  -- Texto livre ("Dia das Mães"): agrupa rascunhos sem depender do cadastro de
  -- colecoes, que talvez nem exista ainda quando voce esta simulando.
  colecao text check (colecao is null or char_length(colecao) <= 80),

  -- A conta vai nos dois sentidos. Preencher um lado calcula o outro; guardar
  -- os dois deixa a tela reabrir do jeito que voce deixou.
  preco numeric(12, 2) check (preco is null or preco >= 0),
  margem_alvo numeric(6, 4) check (margem_alvo is null or (margem_alvo >= 0 and margem_alvo < 1)),

  observacao text check (observacao is null or char_length(observacao) <= 500),

  -- Produto que esta simulacao virou. Guardado para nao promover duas vezes e
  -- para a tela saber dizer "isto ja virou produto".
  produto_id uuid references public.produtos(id) on delete set null,
  virou_produto_em timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists simulacoes_company_idx
  on public.simulacoes (company_id, created_at desc);

create table if not exists public.simulacao_itens (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  simulacao_id uuid not null references public.simulacoes(id) on delete cascade,

  -- Preenchido = insumo cadastrado, e o custo vem de la, sempre atual.
  -- Vazio = item avulso, digitado, com o valor congelado abaixo. E a lista de
  -- vazios que trava o "Virar produto" ate serem cadastrados.
  insumo_id uuid references public.insumos(id) on delete set null,

  -- Sempre preenchida, mesmo no insumo cadastrado: e o rotulo da linha, e o
  -- que sobra se o insumo for apagado depois. Sem isso o rascunho viraria uma
  -- linha em branco por causa de uma exclusao em outra tela.
  descricao text not null check (char_length(trim(descricao)) between 1 and 160),
  quantidade numeric(12, 3) not null default 1 check (quantidade > 0),
  -- Avulso: o valor que voce digitou. Cadastrado: o custo no momento em que
  -- entrou, usado so como reserva caso o insumo suma.
  valor_unitario numeric(12, 4) not null check (valor_unitario >= 0),
  ordem integer not null default 0,

  created_at timestamptz not null default now()
);

create index if not exists simulacao_itens_idx
  on public.simulacao_itens (company_id, simulacao_id, ordem);

-- --------------------------------------------------------------------- RLS
alter table public.receitas enable row level security;
alter table public.receita_ingredientes enable row level security;
alter table public.simulacoes enable row level security;
alter table public.simulacao_itens enable row level security;

do $$
declare t text;
begin
  foreach t in array array['receitas','receita_ingredientes','simulacoes','simulacao_itens']
  loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format(
      'create policy %I_select on public.%I for select using (private.has_company_permission(company_id, ''financial'', ''view''))', t, t);

    execute format('drop policy if exists %I_insert on public.%I', t, t);
    execute format(
      'create policy %I_insert on public.%I for insert with check (private.has_company_permission(company_id, ''financial'', ''create''))', t, t);

    execute format('drop policy if exists %I_update on public.%I', t, t);
    execute format(
      'create policy %I_update on public.%I for update using (private.has_company_permission(company_id, ''financial'', ''update'')) with check (private.has_company_permission(company_id, ''financial'', ''update''))', t, t);

    execute format('drop policy if exists %I_delete on public.%I', t, t);
    execute format(
      'create policy %I_delete on public.%I for delete using (private.has_company_permission(company_id, ''financial'', ''delete''))', t, t);
  end loop;
end $$;

drop trigger if exists receitas_set_updated_at on public.receitas;
create trigger receitas_set_updated_at
  before update on public.receitas
  for each row execute function private.set_updated_at();

drop trigger if exists simulacoes_set_updated_at on public.simulacoes;
create trigger simulacoes_set_updated_at
  before update on public.simulacoes
  for each row execute function private.set_updated_at();

comment on table public.receitas is
  'Livro de receitas, autocontido. Ingredientes digitados soltos; custo por porcao = soma / rendimento.';
comment on table public.simulacoes is
  'Rascunho de cesta. Nao afeta nada ate virar produto, e so vira quando todo item ja for insumo.';
