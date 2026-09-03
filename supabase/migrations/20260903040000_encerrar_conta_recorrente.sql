-- ============================================================================
-- Encerrar uma conta mensal de verdade.
--
-- Hoje não existe caminho para parar uma recorrência. `excluirContaAPagar`
-- apaga só as parcelas com pago_em nulo; as já pagas ficam no banco com
-- recorrencia='mensal'. Na recarga seguinte, `gerarRecorrentes` (contas.ts:55)
-- pega a linha MAIS RECENTE de cada grupo como modelo — que agora é justamente
-- a parcela paga — e recria os meses à frente. As contas reaparecem na tela, e
-- vão reaparecer toda vez que ela abrir. Todo grupo mensal com ao menos uma
-- parcela paga é imortal.
--
-- A marca fica na LINHA e não numa tabela de grupos porque é assim que o resto
-- do recurso já funciona: `grupo_id` é um uuid solto nas linhas, sem entidade
-- própria. Criar a tabela agora obrigaria a migrar os grupos existentes.
--
-- Por que uma coluna e não `recorrencia = 'unica'` nas linhas pagas, que
-- dispensaria migration: aquilo faria o histórico mentir. A parcela de agosto
-- FOI de uma conta mensal, e daqui a um ano ninguém saberia por que ela mudou
-- de tipo sozinha. Com `encerrado_em` a linha continua dizendo o que foi, e
-- ganha a data em que a recorrência parou — que é informação de verdade
-- ("mudei de ponto em setembro").
--
-- Idempotente e não destrutiva: só acrescenta coluna e índice.
-- ============================================================================

begin;

-- Nulo = recorrência viva. Preenchido = o grupo foi encerrado nesta data e o
-- gerador deve ignorá-lo, mesmo que a linha continue com recorrencia='mensal'.
alter table public.contas_a_pagar
  add column if not exists encerrado_em timestamptz;

comment on column public.contas_a_pagar.encerrado_em is
  'Quando a recorrência do grupo foi encerrada. Nulo = ainda gera parcelas. A linha mantém recorrencia mensal para o histórico não mentir.';

/* O gerador varre todas as linhas mensais da empresa a cada abertura da tela e
   passa a filtrar por esta coluna. Índice parcial: só as vivas interessam, e
   ele encolhe conforme as contas vão sendo encerradas. */
create index if not exists contas_a_pagar_recorrentes_vivas_idx
  on public.contas_a_pagar (company_id, grupo_id, vencimento desc)
  where recorrencia = 'mensal' and encerrado_em is null;

commit;

-- ============================================================================
-- DEPOIS DE RODAR
--
-- Esta migration sozinha não muda comportamento nenhum: a coluna nasce nula em
-- todas as linhas, e o código ainda não a lê. O conserto só fecha quando eu
-- subir as duas mudanças em src/lib/contas.ts:
--
--   1. gerarRecorrentes passa a filtrar `.is("encerrado_em", null)`
--   2. excluirContaAPagar carimba o grupo inteiro antes de apagar as abertas
--
-- Me avise que rodou e eu subo as duas juntas. Na ordem inversa o app
-- quebraria: filtrar por uma coluna que não existe devolve 400 no PostgREST e
-- a tela de A pagar estoura ao abrir — foi o que aconteceu com o Simulador.
--
-- DIAGNÓSTICO, se quiser ver o tamanho do problema antes:
--
--   select grupo_id, descricao, count(*) as parcelas,
--          count(*) filter (where pago_em is not null) as pagas,
--          max(vencimento) as ultima
--   from public.contas_a_pagar
--   where recorrencia = 'mensal'
--   group by grupo_id, descricao
--   order by parcelas desc;
--
-- Grupo com muitas parcelas e vencimento lá na frente é um que já se
-- regenerou várias vezes.
-- ============================================================================
