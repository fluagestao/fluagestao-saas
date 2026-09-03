-- ============================================================================
-- Reconciliacao: duas coisas que o codigo usa e nenhuma migration declara.
--
-- 1. simulacoes.tempo_montagem_min — simulador.ts:77 pede essa coluna no
--    select. A 20260902190000 criou simulacoes sem ela, entao o PostgREST
--    responde 400 e a tela do Simulador estoura ao abrir.
--
-- 2. public.calculo_config — a tabela inteira nunca virou arquivo; foi SQL
--    colado no editor. Falha em silencio, e nao com erro: SimuladorPanel e
--    CalculadoraPanel engolem o erro num catch vazio, a config cai no padrao
--    e o botao "Ajustes do calculo" simplesmente nao aparece.
--
-- Tudo aqui e idempotente e nao destrutivo: nenhum drop, nenhum alter de tipo,
-- nenhum not null em coluna que ja tenha dado. Se um pedaco ja existir em
-- producao (provavel no caso da calculo_config), vira no-op.
--
-- ANTES DE RODAR, veja o bloco de diagnostico no fim deste arquivo.
-- ============================================================================

begin;

-- Falha cedo e com nome, no mesmo estilo da 20260903020000: private.* vive so
-- no banco remoto, e sem essa checagem o erro sairia no meio de um create
-- policy sem dizer o que fazer.
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

-- ------------------------------------------------- 1. Tempo na simulacao
-- Minutos de montagem daquele rascunho. Anulavel de proposito: simulacao sem
-- tempo definido e o estado normal de quem esta so testando preco, e um
-- default 0 diria "monta em zero minuto", que a cascata de custo leria como
-- mao de obra gratis.
alter table public.simulacoes
  add column if not exists tempo_montagem_min integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'simulacoes_tempo_montagem_min_check'
      and conrelid = 'public.simulacoes'::regclass
  ) then
    alter table public.simulacoes
      add constraint simulacoes_tempo_montagem_min_check
      check (tempo_montagem_min is null or (tempo_montagem_min >= 0 and tempo_montagem_min <= 100000));
  end if;
end $$;

comment on column public.simulacoes.tempo_montagem_min is
  'Minutos de montagem da simulacao. Multiplica o custo por hora na cascata. Nulo = ainda nao informado.';

-- ------------------------------------------- 2. Config do calculo de custo
-- Uma linha por empresa. O que entra na conta alem dos insumos: custo por hora
-- de producao e os tres percentuais que incidem sobre o PRECO (nao sobre o
-- custo) antes de virar lucro.
create table if not exists public.calculo_config (
  id uuid primary key default gen_random_uuid(),

  -- unique, e nao so not null: calculo.ts:113 faz upsert com
  -- onConflict "company_id", e sem o indice unico o upsert nao tem alvo e
  -- estoura em runtime.
  company_id uuid not null unique references public.companies(id) on delete cascade,

  -- Reais por hora. Nao e salario: e o que o negocio precisa cobrir pelo tempo
  -- para o preco fechar.
  custo_hora numeric(12, 2) not null default 0
    check (custo_hora >= 0 and custo_hora <= 100000),

  -- Fracoes (0.13 = 13%), no mesmo formato que margem_alvo em simulacoes.
  percentual_fixo numeric(6, 4) not null default 0
    check (percentual_fixo >= 0 and percentual_fixo < 1),
  percentual_taxa numeric(6, 4) not null default 0
    check (percentual_taxa >= 0 and percentual_taxa < 1),
  percentual_perdas numeric(6, 4) not null default 0
    check (percentual_perdas >= 0 and percentual_perdas < 1),

  -- Desligado, a margem considera so os insumos — como era antes de existir
  -- esta tabela. Por isso o default e false: quem nunca configurou nada nao
  -- pode ver a margem mudar sozinha.
  incluir_no_calculo boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Somados acima de 90% nao sobra preco para a conta fechar. E o mesmo teto
  -- que AjustesCalculo.tsx impoe na tela; aqui vale tambem para quem chamar a
  -- API direto.
  constraint calculo_config_percentuais_somados
    check (percentual_fixo + percentual_taxa + percentual_perdas <= 0.9)
);

drop trigger if exists calculo_config_set_updated_at on public.calculo_config;
create trigger calculo_config_set_updated_at
  before update on public.calculo_config
  for each row execute function private.set_updated_at();

-- ------------------------------------------------------------------- RLS
-- Modulo 'financial', o mesmo das outras 35 policies do repo. Nasce ja
-- endurecida: nao depende das duas migrations de hardening pendentes.
alter table public.calculo_config enable row level security;

revoke all on table public.calculo_config from public, anon, authenticated;
grant select, insert, update, delete on table public.calculo_config to authenticated;

drop policy if exists calculo_config_select on public.calculo_config;
create policy calculo_config_select on public.calculo_config
  for select to authenticated
  using (private.has_company_permission(company_id, 'financial', 'view'));

drop policy if exists calculo_config_insert on public.calculo_config;
create policy calculo_config_insert on public.calculo_config
  for insert to authenticated
  with check (private.has_company_permission(company_id, 'financial', 'create'));

-- O upsert de calculo.ts:113 cai no UPDATE quando a linha ja existe, entao as
-- duas policies precisam existir para "Salvar ajustes" funcionar nas duas vezes.
drop policy if exists calculo_config_update on public.calculo_config;
create policy calculo_config_update on public.calculo_config
  for update to authenticated
  using (private.has_company_permission(company_id, 'financial', 'update'))
  with check (private.has_company_permission(company_id, 'financial', 'update'));

drop policy if exists calculo_config_delete on public.calculo_config;
create policy calculo_config_delete on public.calculo_config
  for delete to authenticated
  using (private.has_company_permission(company_id, 'financial', 'delete'));

comment on table public.calculo_config is
  'Uma linha por empresa: o que entra no calculo de custo alem dos insumos. Vale para Calculadora, Simulador e Margem.';
comment on column public.calculo_config.incluir_no_calculo is
  'false = a margem considera so os insumos. Padrao false para nao mudar numero de quem nunca configurou.';

commit;

-- ============================================================================
-- DIAGNOSTICO — rode ANTES, em outra aba, e leia o resultado.
--
-- 1) A coluna do simulador ja existe?
--
--    select column_name from information_schema.columns
--    where table_schema = 'public' and table_name = 'simulacoes';
--
--    Sem tempo_montagem_min na lista: e a causa da tela quebrada, esta
--    migration resolve. Com ela na lista: o "add column if not exists" e
--    no-op e o Simulador quebra por outro motivo — me avise.
--
-- 2) A calculo_config ja existe, e com quais colunas?
--
--    select column_name, data_type, is_nullable, column_default
--    from information_schema.columns
--    where table_schema = 'public' and table_name = 'calculo_config';
--
--    Vazio: a tabela nasce aqui. Com colunas: confira se batem com as cinco
--    que calculo.ts:44 le. Se alguma faltar, o "create table if not exists"
--    NAO adiciona — me mostre o resultado que eu escrevo os alter certos.
--
-- 3) O upsert tem alvo? (sem indice unico em company_id ele estoura)
--
--    select indexname, indexdef from pg_indexes
--    where schemaname = 'public' and tablename = 'calculo_config';
--
--    Se a tabela ja existia sem unique em company_id, rode:
--    create unique index if not exists calculo_config_company_id_key
--      on public.calculo_config (company_id);
--
-- 4) Teste de mesa que separa as duas tabelas com tempo_montagem_min:
--    abra Custo > Calculadora e Custo > Margem. Se as duas abrirem normal,
--    produtos.tempo_montagem_min EXISTE em producao (custo.ts:69 leria e
--    mostraria banner de erro). Se so o Simulador quebra, o buraco e
--    exclusivamente em simulacoes — que e o que esta migration fecha.
-- ============================================================================
