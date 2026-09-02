-- Saldo inicial e conciliacao.
--
-- Duas coisas pequenas que fazem o financeiro parar de discordar do banco:
-- de onde a conta comeca, e o que ja foi conferido contra o extrato.

-- 1) Saldo inicial: uma linha por empresa, como followup_review_templates.
create table if not exists public.financeiro_config (
  company_id uuid primary key references public.companies(id) on delete cascade,
  -- Quanto havia em caixa na data abaixo. Pode ser negativo: quem comeca no
  -- vermelho tambem precisa que a conta bata.
  saldo_inicial numeric(12, 2) not null default 0,
  saldo_inicial_em date not null default current_date,
  updated_at timestamptz not null default now()
);

alter table public.financeiro_config enable row level security;

drop policy if exists financeiro_config_select on public.financeiro_config;
create policy financeiro_config_select on public.financeiro_config
  for select using (private.has_company_permission(company_id, 'financial', 'view'));

drop policy if exists financeiro_config_insert on public.financeiro_config;
create policy financeiro_config_insert on public.financeiro_config
  for insert with check (private.has_company_permission(company_id, 'financial', 'create'));

drop policy if exists financeiro_config_update on public.financeiro_config;
create policy financeiro_config_update on public.financeiro_config
  for update using (private.has_company_permission(company_id, 'financial', 'update'))
  with check (private.has_company_permission(company_id, 'financial', 'update'));

drop trigger if exists financeiro_config_set_updated_at on public.financeiro_config;
create trigger financeiro_config_set_updated_at
  before update on public.financeiro_config
  for each row execute function private.set_updated_at();

comment on table public.financeiro_config is
  'Saldo inicial do caixa, por empresa. E dele que o saldo acumulado parte.';

-- 2) Conciliacao: data em que a linha foi conferida contra o extrato.
-- Data, e nao booleano, para depois dar para saber quando foi conferido.
alter table public.movimentos
  add column if not exists conferido_em date;

create index if not exists movimentos_conferido_idx
  on public.movimentos (company_id, conferido_em);

comment on column public.movimentos.conferido_em is
  'Quando o lancamento foi conferido contra o extrato. Nulo = ainda nao bateu.';
