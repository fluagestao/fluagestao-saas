-- Estoque de insumos: razao de movimentos, nao um campo de saldo.
--
-- Um campo "quantidade_em_estoque" no insumo seria um numero que erra sozinho
-- e nunca explica por que errou. Aqui cada entrada, baixa e contagem vira uma
-- linha, e o saldo e a soma delas — sempre auditavel ate a origem.
--
-- A quantidade e SEMPRE com sinal: entrada positiva, saida negativa, ajuste
-- para qualquer lado. Saldo = sum(quantidade), sem CASE e sem risco de trocar
-- o sinal em algum lugar do codigo.

alter table public.insumos
  -- Sem esta chave, todo insumo apareceria com "0 em estoque" — zero falso e
  -- pior que informacao nenhuma. So entra no controle o que for marcado.
  add column if not exists controlar_estoque boolean not null default false,
  add column if not exists estoque_minimo numeric(14, 3)
    check (estoque_minimo is null or estoque_minimo >= 0);

create table if not exists public.estoque_movimentos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  insumo_id uuid not null references public.insumos(id) on delete cascade,
  tipo text not null check (tipo in ('entrada', 'saida', 'ajuste')),
  quantidade numeric(14, 3) not null,
  -- Custo do insumo no dia do movimento. Congelado aqui porque o preco muda:
  -- sem isso, o valor do estoque de marco seria recalculado com o preco de hoje.
  custo_unitario numeric(12, 4),
  motivo text check (motivo is null or char_length(motivo) <= 200),
  -- Baixa que saiu de um pedido. on delete set null: apagar o pedido nao
  -- desfaz a saida, porque a mercadoria saiu de verdade.
  pedido_id uuid references public.pedidos(id) on delete set null,
  ocorrido_em date not null default current_date,
  criado_por uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint estoque_movimentos_sinal check (
    (tipo = 'entrada' and quantidade > 0)
    or (tipo = 'saida' and quantidade < 0)
    or (tipo = 'ajuste' and quantidade <> 0)
  )
);

create index if not exists estoque_movimentos_insumo_idx
  on public.estoque_movimentos (company_id, insumo_id, ocorrido_em desc);
create index if not exists estoque_movimentos_pedido_idx
  on public.estoque_movimentos (company_id, pedido_id)
  where pedido_id is not null;

alter table public.estoque_movimentos enable row level security;

drop policy if exists estoque_movimentos_select on public.estoque_movimentos;
create policy estoque_movimentos_select on public.estoque_movimentos
  for select using (private.has_company_permission(company_id, 'financial', 'view'));

drop policy if exists estoque_movimentos_insert on public.estoque_movimentos;
create policy estoque_movimentos_insert on public.estoque_movimentos
  for insert with check (private.has_company_permission(company_id, 'financial', 'create'));

drop policy if exists estoque_movimentos_update on public.estoque_movimentos;
create policy estoque_movimentos_update on public.estoque_movimentos
  for update using (private.has_company_permission(company_id, 'financial', 'update'))
  with check (private.has_company_permission(company_id, 'financial', 'update'));

drop policy if exists estoque_movimentos_delete on public.estoque_movimentos;
create policy estoque_movimentos_delete on public.estoque_movimentos
  for delete using (private.has_company_permission(company_id, 'financial', 'delete'));

drop trigger if exists estoque_movimentos_set_updated_at on public.estoque_movimentos;
create trigger estoque_movimentos_set_updated_at
  before update on public.estoque_movimentos
  for each row execute function private.set_updated_at();

-- Saldo por insumo. security_invoker: a view respeita a RLS de quem consulta,
-- em vez de rodar com os poderes de quem a criou.
create or replace view public.insumo_estoque
with (security_invoker = on) as
select
  m.company_id,
  m.insumo_id,
  sum(m.quantidade)                                          as saldo,
  max(m.ocorrido_em)                                         as ultimo_movimento,
  sum(m.quantidade) filter (where m.tipo = 'entrada')        as total_entradas,
  -abs(coalesce(sum(m.quantidade) filter (where m.tipo = 'saida'), 0)) as total_saidas
from public.estoque_movimentos m
group by m.company_id, m.insumo_id;

comment on table public.estoque_movimentos is
  'Razao do estoque de insumos. Quantidade com sinal: entrada +, saida -, ajuste qualquer. Saldo = soma.';
