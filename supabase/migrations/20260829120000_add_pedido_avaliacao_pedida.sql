-- Follow-up pós-entrega: marca quando o convite de avaliação já foi enviado.
-- Sem isso a tela não sabe separar quem já foi chamado de quem ainda espera, e
-- o cliente acabaria recebendo o mesmo pedido de avaliação toda semana.
alter table public.pedidos
  add column if not exists avaliacao_pedida_em timestamptz;

create index if not exists pedidos_company_followup_idx
  on public.pedidos (company_id, status, data_entrega desc);
