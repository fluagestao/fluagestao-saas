-- ============================================================================
-- Por que a aba Relacionamento está vazia?
--
-- Troque COLE_AQUI pelo id da empresa e rode. Cada bloco elimina uma hipótese.
--   select id, name from public.companies order by created_at;
-- ============================================================================

-- 1) O pedido chega ligado a um cliente?
--    A aba agrupa por cliente_id. Pedido com cliente_id nulo é ignorado —
--    é a primeira coisa a descartar.
select
  count(*)                                              as pedidos,
  count(*) filter (where cliente_id is null)            as sem_cliente_id,
  count(*) filter (where cliente_id is not null)        as com_cliente_id
from public.pedidos
where company_id = 'COLE_AQUI';


-- 2) Quantos clientes existem, e quantos o filtro de ativo derrubaria?
--    (o código agora usa `not.is.false`, que aceita nulo — este bloco só
--     confirma se havia algo a derrubar)
select
  count(*)                                   as clientes,
  count(*) filter (where ativo is true)      as ativo_true,
  count(*) filter (where ativo is null)      as ativo_nulo,
  count(*) filter (where ativo is false)     as ativo_false,
  count(*) filter (where contatado_em is not null) as ja_contatadas
from public.clientes
where company_id = 'COLE_AQUI';


-- 3) A RESPOSTA PROVÁVEL: há quantos dias cada cliente está parada?
--    Mesma régua da aba: entregue_em, senão data_entrega, senão created_at.
--    Ignora cancelado; quem tem pedido em aberto sai fora.
with concluidos as (
  select
    p.cliente_id,
    greatest(
      coalesce(p.entregue_em::date, p.data_entrega, p.created_at::date),
      '1900-01-01'::date
    ) as dia,
    p.total
  from public.pedidos p
  where p.company_id = 'COLE_AQUI'
    and p.cliente_id is not null
    and p.status not in ('novo', 'producao', 'pronto', 'cancelado')
),
em_aberto as (
  select distinct cliente_id
  from public.pedidos
  where company_id = 'COLE_AQUI'
    and status in ('novo', 'producao', 'pronto')
    and cliente_id is not null
)
select
  c.nome,
  max(x.dia)                                as ultima_compra,
  current_date - max(x.dia)                 as dias_parada,
  count(*)                                  as compras,
  sum(x.total)                              as total_gasto,
  case
    when c.id in (select cliente_id from em_aberto) then 'FORA: tem pedido em aberto'
    when current_date - max(x.dia) < 30  then 'FORA: comprou faz menos de 30 dias'
    when current_date - max(x.dia) < 60  then 'faixa 30 a 60'
    when current_date - max(x.dia) < 120 then 'faixa 60 a 120'
    else 'faixa mais de 120'
  end                                       as onde_aparece
from concluidos x
join public.clientes c on c.id = x.cliente_id
group by c.id, c.nome
order by dias_parada desc;


-- 4) Resumo de uma linha: quantas caem em cada faixa.
--    Se der tudo zero e o bloco 3 mostrar "comprou faz menos de 30 dias",
--    a tela está CERTA — sua base é nova demais para ter alguém sumido.
