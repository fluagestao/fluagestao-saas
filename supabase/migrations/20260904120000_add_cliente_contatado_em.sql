-- ============================================================================
-- Relacionamento: marcar que a cliente já foi chamada.
--
-- A aba Relacionamento lista quem comprou e sumiu, para chamar de volta. Sem
-- esta coluna a lista é sempre a mesma: quem está parado há 80 dias continua
-- parado há 81 amanhã, então reaparece todo dia e acaba recebendo a mesma
-- mensagem várias vezes. Quem recebe "faz tempo que você não compra" três
-- semanas seguidas bloqueia o número — o recurso passa a destruir o
-- relacionamento que existia para recuperar.
--
-- Fica em `clientes` e não numa tabela de envios porque o que a tela precisa
-- saber é uma coisa só: "chamei recentemente?". Uma tabela de histórico teria
-- valor se houvesse resposta para registrar, e não há — o Flua não envia nada,
-- só abre a conversa no WhatsApp. Guardar carimbo de algo que talvez nem tenha
-- sido enviado já é o limite do que este dado pode honestamente afirmar.
--
-- É o mesmo desenho que o Follow-up já usa com `pedidos.avaliacao_pedida_em`.
--
-- Aditiva e idempotente: só acrescenta coluna e índice, não altera linha
-- existente. Nasce nula em todo mundo, que significa "nunca chamei".
-- ============================================================================

begin;

alter table public.clientes
  add column if not exists contatado_em date;

comment on column public.clientes.contatado_em is
  'Data em que a cliente foi chamada pela aba Relacionamento. Nula = nunca. Quem foi chamada nos ultimos 30 dias sai da lista.';

/* A tela filtra por empresa e por esta coluna a cada abertura. Índice parcial
   nos que JÁ foram chamados: é o conjunto pequeno, e é ele que a consulta
   precisa excluir. Quem nunca foi chamado (nulo) é a maioria e não precisa
   estar no índice. */
create index if not exists clientes_contatado_em_idx
  on public.clientes (company_id, contatado_em desc)
  where contatado_em is not null;

commit;

-- ============================================================================
-- DEPOIS DE RODAR
--
-- Esta migration sozinha não muda nada: a coluna nasce nula e o código ainda
-- não a lê. A aba Relacionamento funciona sem ela — só não sabe ainda quem já
-- foi chamado.
--
-- Me avise que rodou e eu subo as duas partes que faltam:
--   1. a consulta passa a ler `contatado_em` e a esconder quem foi chamado
--      nos ultimos 30 dias;
--   2. o botão "Chamar no WhatsApp" carimba a data ao abrir a conversa.
--
-- Nesta ordem, nunca ao contrário: ler uma coluna que não existe devolve 400
-- no PostgREST e a tela estoura ao abrir — foi exatamente o que aconteceu com
-- o Simulador.
-- ============================================================================
