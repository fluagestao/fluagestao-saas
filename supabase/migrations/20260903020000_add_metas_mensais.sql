-- ============================================================================
-- Metas mensais de cestas: o que e decisao fica salvo, o resto se recalcula.
--
-- A meta e o unico numero desta feature que ninguem consegue derivar: e uma
-- escolha do dono ("quero vender 120 cestas em dezembro"). Por isso ela e a
-- unica coisa realmente guardada aqui como TOTAL.
--
-- O realizado que aparece ao lado dela no Dashboard NAO vira coluna: ele sai
-- da mesma conta que ja alimenta o cartao "Cestas vendidas", e uma copia
-- gravada erraria sozinha a cada pedido novo ou cancelado.
--
-- O Plano de Compras tambem nao guarda resultado. Necessidade de insumo,
-- custo estimado e o desconto do saldo em estoque nascem de meta x mix x
-- produto_insumos x insumos.custo x insumo_estoque — tudo isso muda a cada
-- movimento, e uma lista de compras gravada ja nasceria velha.
--
-- O mix guarda PARTICIPACAO, nao unidades. Se guardasse unidades, o mesmo
-- fato (o total do mes) estaria escrito em dois lugares — meta_cestas e a
-- soma das linhas — e os dois divergiriam no primeiro ajuste manual: o
-- Dashboard diria 120 e a lista de compras compraria para 125. Com fracao ha
-- um dono unico do total; a linha so diz que fatia leva.
--   quantidade do produto = meta_cestas * participacao / soma(participacao)
-- A normalizacao pela soma e obrigatoria na leitura: e ela que impede que um
-- mix somando 1,04 vire compra de 4% a mais sem ninguem notar.
--
-- ATENCAO ao reaplicar: `create table if not exists` olha so o NOME da tabela.
-- Se um rascunho anterior desta migration ja foi colado no editor, apague as
-- duas tabelas antes (drop table public.meta_itens, public.metas_mensais;) —
-- reexecutar nao converte o schema velho.
-- ============================================================================

begin;

-- Falha cedo e com nome. private.has_company_permission e private.set_updated_at
-- vivem so no banco remoto (nenhuma migration deste repo as cria), entao num
-- `db reset` ou numa branch nova o erro sairia como "function does not exist"
-- no meio de um create policy, sem dizer o que fazer.
do $$
begin
  if to_regprocedure('private.has_company_permission(uuid,text,text)') is null then
    raise exception
      'private.has_company_permission(uuid,text,text) nao existe neste banco: aplique a base do schema antes desta migration.';
  end if;
  if to_regprocedure('private.set_updated_at()') is null then
    raise exception
      'private.set_updated_at() nao existe neste banco: aplique a base do schema antes desta migration.';
  end if;
end $$;

-- Esta feature desconta o saldo de estoque pela view public.insumo_estoque.
-- Se ela nao estiver com security_invoker, roda com os poderes de quem a criou
-- e devolve o saldo de TODAS as empresas — e a unica barreira passa a ser o
-- .eq("company_id") que alguem pode esquecer na proxima query. Uma linha,
-- idempotente, e o mesmo alter que a 20260903000000 aplica.
alter view public.insumo_estoque set (security_invoker = true);

-- -------------------------------------------------------------- Meta do mes
create table if not exists public.metas_mensais (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,

  -- (ano, mes) e nao uma date: a serie do Dashboard e indexada por mes 1..12
  -- do ano e a tela pergunta assim. Com date, todo lugar precisaria lembrar
  -- de normalizar para o dia 1 para os dois numeros se acharem.
  ano smallint not null check (ano between 2020 and 2100),
  mes smallint not null check (mes between 1 and 12),

  -- Unidades, nao reais. Conta o mesmo que o cartao "Cestas vendidas": item
  -- de categoria adicional fica de fora. Meta zero nao existe — quem desistiu
  -- apaga a linha. O teto existe porque o resto do sistema tem teto (qtd <= 99,
  -- preco <= 100_000 em pedidos-schema.ts): sem ele, um 1200000000 digitado no
  -- celular commita e o Dashboard passa a exibir 1,2 bilhao de cestas.
  meta_cestas integer not null check (meta_cestas between 1 and 100000),

  -- Quantos meses de venda o rateio automatico olha para achar o mix. Mora na
  -- meta, e nao numa config da empresa, porque marco se planeja com os ultimos
  -- 3 meses e dezembro se planeja com dezembro do ano passado.
  meses_referencia smallint not null default 3
    check (meses_referencia between 1 and 24),

  -- Fim da janela de referencia, no MESMO grao da meta. Guardar isso como
  -- `date` repetiria o erro que (ano, mes) evita: uma tela gravaria 2025-12-01
  -- e a outra 2025-12-31, e a mesma meta produziria dois mixes diferentes
  -- conforme por qual tela passou. Nulo = os meses imediatamente anteriores.
  referencia_ano smallint check (referencia_ano is null or referencia_ano between 2020 and 2100),
  referencia_mes smallint check (referencia_mes is null or referencia_mes between 1 and 12),

  -- Quando o mix foi calculado. A tela usa para dizer "mix calculado em 01/11;
  -- o historico mudou desde entao" em vez de recalcular por cima do ajuste
  -- manual ou mostrar um mix velho fingindo estar atual.
  mix_calculado_em timestamptz,

  observacao text check (observacao is null or char_length(observacao) <= 500),

  criado_por uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Meio preenchido nao existe: ou a janela tem ano e mes, ou nao tem nenhum.
  constraint metas_mensais_referencia_completa
    check ((referencia_ano is null) = (referencia_mes is null)),

  -- Referencia e historico. Apontar para o proprio mes da meta (ou para
  -- depois dele) faria o rateio olhar meses que ainda nao aconteceram e
  -- devolver mix vazio, sem erro nenhum na tela.
  constraint metas_mensais_referencia_no_passado
    check (
      referencia_ano is null
      or (referencia_ano * 12 + referencia_mes) < (ano * 12 + mes)
    ),

  -- Alvo da FK composta do filho. Sem isso, meta_itens so consegue apontar
  -- para o id e a empresa da linha filha fica solta.
  constraint metas_mensais_id_company_unique unique (id, company_id)
);

-- Uma meta por mes: com duas, o Dashboard nao saberia qual mostrar.
create unique index if not exists metas_mensais_company_ano_mes_unique
  on public.metas_mensais (company_id, ano, mes);

-- -------------------------------------------------------------- Mix da meta
create table if not exists public.meta_itens (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  meta_id uuid not null,

  -- A identidade da linha e TEXTO, nao o produto. O historico de vendas que
  -- gera o mix mora em pedidos.itens (jsonb) e e chaveado por `slug ?? nome`
  -- (pedidos.ts:963) — item montado na hora nasce sem slug por design, e
  -- upsertProduto recalcula o slug a cada renomeacao. Se a chave fosse
  -- produto_id, toda cesta sem produto correspondente sumiria do rateio e a
  -- lista de compras deixaria de comprar esses insumos em silencio.
  origem_chave text not null
    check (char_length(trim(origem_chave)) between 1 and 160),

  -- O vinculo resolvido, quando existe: e por ele que a linha explode em
  -- insumos via produto_insumos.produto_id. Nulo = linha sem produto
  -- cadastrado (montada na hora, ou produto apagado depois) — continua
  -- visivel e re-apontavel, em vez de virar fantasma.
  produto_id uuid references public.produtos(id) on delete set null,

  -- Rotulo da linha na tela. `descricao`, e nao `nome`, como
  -- receita_ingredientes, simulacao_itens e contas_a_pagar: aqui e linha de
  -- item, nao entidade — e o mapa de rotulos de erros.ts ja traduz `descricao`.
  descricao text not null check (char_length(trim(descricao)) between 1 and 160),

  -- Fatia do mix, nao unidades. Ver o cabecalho: unidades gravadas aqui
  -- seriam um segundo total, capaz de contradizer meta_cestas. Fracionaria
  -- ate 6 casas porque 1/7 nao fecha em menos. Zero nao existe — "deste aqui
  -- eu nao vou fazer nenhuma" e a ausencia da linha, que o rateio ja sabe ler.
  participacao numeric(7, 6) not null
    check (participacao > 0 and participacao <= 1),

  -- Marca o que o usuario digitou. Sem isso o recalculo tem que escolher entre
  -- apagar o ajuste manual em silencio ou nunca mais atualizar o mix.
  ajustado_manualmente boolean not null default false,

  ordem integer not null default 0,

  created_at timestamptz not null default now(),

  -- FK composta, nao `meta_id references metas_mensais(id)`. Checagem de FK e
  -- cascade rodam com a RLS desligada: com a FK simples, um usuario da empresa
  -- A conseguiria gravar company_id = A apontando para uma meta da empresa B
  -- (a policy so olha a propria coluna), e quando B apagasse a meta o cascade
  -- apagaria dado de A. O par (meta_id, company_id) fecha isso no banco, sem
  -- depender de a server action lembrar de conferir o pai.
  constraint meta_itens_meta_fk foreign key (meta_id, company_id)
    references public.metas_mensais (id, company_id) on delete cascade
);

-- Chave de identidade da linha. origem_chave e NOT NULL de proposito: um
-- unique index sobre coluna anulavel nao serve de alvo de upsert (NULL nunca
-- conflita com NULL) e a limpeza `not in (...)` nunca apaga a linha nula —
-- as duas coisas juntas fazem nascer uma linha fantasma a cada gravacao.
create unique index if not exists meta_itens_company_meta_chave_unique
  on public.meta_itens (company_id, meta_id, origem_chave);

create index if not exists meta_itens_idx
  on public.meta_itens (company_id, meta_id, ordem);

-- Apagar um produto dispara o `set null` desta FK; sem indice, cada exclusao
-- em Cadastros varre meta_itens inteira.
create index if not exists meta_itens_produto_idx
  on public.meta_itens (produto_id)
  where produto_id is not null;

-- ------------------------------------------------- Produto e da mesma empresa
-- produtos.id de qualquer empresa e publico (fetchProdutos em catalog.ts le o
-- catalogo sem filtro de empresa), entao apontar para o produto de outra e
-- trivial. A linha passaria na RLS, apareceria no mix com a fatia cheia e
-- contribuiria com ZERO insumos, porque produto_insumos filtra por empresa.
-- Trigger em vez de FK composta para nao ter que alterar `produtos`, que este
-- repo nao versiona.
create or replace function private.meta_itens_valida_produto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.produto_id is not null
     and not exists (
       select 1
       from public.produtos p
       where p.id = new.produto_id
         and p.company_id = new.company_id
     )
  then
    -- Sem errcode proprio de proposito: 23503 viraria "está sendo usado em
    -- outro lugar" no mensagemDeErro (erros.ts). Como P0001 a frase abaixo
    -- chega inteira na tela.
    raise exception
      'Este produto não pertence à sua empresa. Atualize a tela e escolha de novo.';
  end if;
  return new;
end;
$$;

revoke all on function private.meta_itens_valida_produto() from public, anon, authenticated;

drop trigger if exists meta_itens_valida_produto on public.meta_itens;
create trigger meta_itens_valida_produto
  before insert or update of produto_id, company_id on public.meta_itens
  for each row execute function private.meta_itens_valida_produto();

-- ---------------------------------------------------------------------- RLS
-- Modulo 'financial', o mesmo de Estoque, Insumos e Cozinha: a meta cruza com
-- custo de insumo e termina virando lista de compras.
--
-- As policies ja nascem `to authenticated`. As duas migrations mais recentes
-- do repo existem so para consertar policies que nasceram TO public; comecar
-- certo aqui e nao virar a proxima tabela esquecida.
alter table public.metas_mensais enable row level security;
alter table public.meta_itens enable row level security;

-- Privilegio de tabela alem da RLS. O default do Supabase concede ALL para
-- anon em toda tabela nova do schema public, e a RLS passa a ser a unica
-- barreira; aqui anon nao tem nem o privilegio para chegar na policy. Mesmo
-- padrao de followup_review_templates (20260901023552).
revoke all on table public.metas_mensais from public, anon, authenticated;
revoke all on table public.meta_itens from public, anon, authenticated;
grant select, insert, update, delete on table public.metas_mensais to authenticated;
grant select, insert, update, delete on table public.meta_itens to authenticated;

drop policy if exists metas_mensais_select on public.metas_mensais;
create policy metas_mensais_select on public.metas_mensais
  for select to authenticated
  using (private.has_company_permission(company_id, 'financial', 'view'));

-- criado_por vira imposicao, nao sugestao: `default auth.uid()` sozinho e um
-- valor que o cliente pode sobrescrever com qualquer uuid, e ai a unica pista
-- de autoria de um numero que vira compra deixa de valer como auditoria.
drop policy if exists metas_mensais_insert on public.metas_mensais;
create policy metas_mensais_insert on public.metas_mensais
  for insert to authenticated
  with check (
    private.has_company_permission(company_id, 'financial', 'create')
    and criado_por = (select auth.uid())
  );

drop policy if exists metas_mensais_update on public.metas_mensais;
create policy metas_mensais_update on public.metas_mensais
  for update to authenticated
  using (private.has_company_permission(company_id, 'financial', 'update'))
  with check (private.has_company_permission(company_id, 'financial', 'update'));

drop policy if exists metas_mensais_delete on public.metas_mensais;
create policy metas_mensais_delete on public.metas_mensais
  for delete to authenticated
  using (private.has_company_permission(company_id, 'financial', 'delete'));

drop policy if exists meta_itens_select on public.meta_itens;
create policy meta_itens_select on public.meta_itens
  for select to authenticated
  using (private.has_company_permission(company_id, 'financial', 'view'));

drop policy if exists meta_itens_insert on public.meta_itens;
create policy meta_itens_insert on public.meta_itens
  for insert to authenticated
  with check (private.has_company_permission(company_id, 'financial', 'create'));

drop policy if exists meta_itens_update on public.meta_itens;
create policy meta_itens_update on public.meta_itens
  for update to authenticated
  using (private.has_company_permission(company_id, 'financial', 'update'))
  with check (private.has_company_permission(company_id, 'financial', 'update'));

drop policy if exists meta_itens_delete on public.meta_itens;
create policy meta_itens_delete on public.meta_itens
  for delete to authenticated
  using (private.has_company_permission(company_id, 'financial', 'delete'));

-- meta_itens nao tem updated_at: o mix e reescrito inteiro a cada gravacao
-- (delete por meta_id + insert), como receita_ingredientes e simulacao_itens.
drop trigger if exists metas_mensais_set_updated_at on public.metas_mensais;
create trigger metas_mensais_set_updated_at
  before update on public.metas_mensais
  for each row execute function private.set_updated_at();

comment on table public.metas_mensais is
  'Meta de cestas do mes, em unidades. Realizado, mix e plano de compras sao derivados na hora.';
comment on column public.metas_mensais.meta_cestas is
  'Unidades de itens principais, mesma conta do cartao Cestas vendidas (adicional fora). E o unico total gravado desta feature.';
comment on column public.metas_mensais.meses_referencia is
  'Quantos meses de venda o rateio do mix olha para tras a partir da referencia.';
comment on column public.metas_mensais.referencia_ano is
  'Ano do ultimo mes da janela de referencia. Nulo (com referencia_mes nulo) = os N meses imediatamente anteriores a meta.';
comment on column public.metas_mensais.referencia_mes is
  'Mes 1..12 do ultimo mes da janela de referencia. Anda sempre junto com referencia_ano.';
comment on column public.metas_mensais.mix_calculado_em is
  'Quando o mix salvo foi calculado. Serve para a tela avisar que o historico mudou desde entao.';

comment on table public.meta_itens is
  'Mix da meta: que fatia cada produto leva. E o que explode em insumos no Plano de Compras.';
comment on column public.meta_itens.origem_chave is
  'Identidade da linha, igual a chave do ranking de vendas (slug do produto ou, na falta dele, o nome). Sobrevive a renomear e a apagar produto.';
comment on column public.meta_itens.produto_id is
  'Vinculo resolvido com o cadastro, quando existe. Nulo = item sem produto (montado na hora ou apagado depois); a linha continua no mix pela origem_chave.';
comment on column public.meta_itens.participacao is
  'Fatia do mix (0 a 1), nao unidades. Unidades = meta_cestas * participacao / soma(participacao) da meta — normalize sempre pela soma.';
comment on column public.meta_itens.ajustado_manualmente is
  'true = o usuario digitou esta fatia. O recalculo preserva as marcadas e redistribui o resto.';

commit;
