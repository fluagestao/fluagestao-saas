-- Contas a pagar: o que ainda vai sair do caixa.
--
-- Tabela separada de movimentos de proposito. O resumoDoCaixa soma todo
-- movimento sem filtro de status, e o mesmo resumo alimenta o topo de
-- Recebimentos e de Pagamentos. Um boleto de outubro guardado ali entraria em
-- SAIU hoje e o SOBROU passaria a mentir — e a consulta que eu esquecesse de
-- filtrar erraria em silencio, que e o pior erro possivel em dinheiro.
--
-- Uma conta so vira caixa quando e paga: nesse momento nasce o movimento e o
-- movimento_id abaixo guarda o elo.

create table if not exists public.contas_a_pagar (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,

  -- Amarra as parcelas de uma mesma compra e as repeticoes de uma recorrencia.
  grupo_id uuid not null default gen_random_uuid(),

  descricao text not null check (char_length(trim(descricao)) between 1 and 200),
  fornecedor text check (char_length(fornecedor) <= 120),
  tipo_despesa_id uuid references public.tipos_despesa(id) on delete set null,

  valor numeric(12, 2) not null check (valor > 0),
  vencimento date not null,

  parcela smallint not null default 1 check (parcela >= 1),
  parcelas smallint not null default 1 check (parcelas >= 1),

  -- 'mensal' se regenera sozinha; 'unica' acaba quando a ultima parcela sai.
  recorrencia text not null default 'unica'
    check (recorrencia in ('unica', 'mensal')),

  -- Preenchidos ao pagar. O valor pago pode divergir do previsto (juros,
  -- desconto), e por isso ele mora no movimento, nao aqui.
  movimento_id uuid references public.movimentos(id) on delete set null,
  pago_em date,

  observacao text check (char_length(observacao) <= 500),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contas_a_pagar_vencimento_idx
  on public.contas_a_pagar (company_id, vencimento);

create index if not exists contas_a_pagar_grupo_idx
  on public.contas_a_pagar (company_id, grupo_id);

-- Usado pela geracao preguicosa: acha a ultima parcela de cada recorrencia.
create index if not exists contas_a_pagar_recorrencia_idx
  on public.contas_a_pagar (company_id, recorrencia, vencimento);

alter table public.contas_a_pagar enable row level security;

drop policy if exists contas_a_pagar_select_company on public.contas_a_pagar;
create policy contas_a_pagar_select_company on public.contas_a_pagar
  for select using (private.has_company_permission(company_id, 'financial', 'view'));

drop policy if exists contas_a_pagar_insert_company on public.contas_a_pagar;
create policy contas_a_pagar_insert_company on public.contas_a_pagar
  for insert with check (private.has_company_permission(company_id, 'financial', 'create'));

drop policy if exists contas_a_pagar_update_company on public.contas_a_pagar;
create policy contas_a_pagar_update_company on public.contas_a_pagar
  for update using (private.has_company_permission(company_id, 'financial', 'update'))
  with check (private.has_company_permission(company_id, 'financial', 'update'));

drop policy if exists contas_a_pagar_delete_company on public.contas_a_pagar;
create policy contas_a_pagar_delete_company on public.contas_a_pagar
  for delete using (private.has_company_permission(company_id, 'financial', 'delete'));

drop trigger if exists contas_a_pagar_set_updated_at on public.contas_a_pagar;
create trigger contas_a_pagar_set_updated_at
  before update on public.contas_a_pagar
  for each row execute function private.set_updated_at();

comment on table public.contas_a_pagar is
  'Compromissos de pagamento: boletos, parcelas e contas mensais. Vira movimento quando pago.';
