-- Insumo como cadastro: categoria, fornecedor, embalagem e historico de custo.
--
-- O ponto central e a inversao da conta. A tela pedia o custo unitario e
-- derivava o preco da embalagem; agora pede o preco da embalagem, que e o
-- numero que esta na nota, e deriva o unitario.
--
-- Categoria e tipo de embalagem sao texto com sugestoes, nao tabelas de tipos:
-- sao rotulos que ninguem filtra em relatorio.

alter table public.insumos
  add column if not exists fornecedor_id uuid
    references public.fornecedores(id) on delete set null,
  add column if not exists categoria text
    check (categoria is null or char_length(categoria) <= 60),
  add column if not exists tipo_embalagem text
    check (tipo_embalagem is null or char_length(tipo_embalagem) <= 40),
  add column if not exists frequencia_compra text
    check (frequencia_compra is null or frequencia_compra in
      ('semanal', 'quinzenal', 'mensal', 'esporadica')),
  add column if not exists observacao text
    check (observacao is null or char_length(observacao) <= 500);

create index if not exists insumos_fornecedor_idx
  on public.insumos (company_id, fornecedor_id);
create index if not exists insumos_categoria_idx
  on public.insumos (company_id, categoria);

-- Historico de custo: uma linha por mudanca de preco.
create table if not exists public.insumo_custo_historico (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  insumo_id uuid not null references public.insumos(id) on delete cascade,
  custo numeric(12, 4) not null,
  qtd_embalagem numeric(12, 3),
  preco_pacote numeric(12, 2),
  registrado_em date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists insumo_custo_historico_idx
  on public.insumo_custo_historico (company_id, insumo_id, registrado_em desc);

alter table public.insumo_custo_historico enable row level security;

drop policy if exists insumo_custo_historico_select on public.insumo_custo_historico;
create policy insumo_custo_historico_select on public.insumo_custo_historico
  for select using (private.has_company_permission(company_id, 'financial', 'view'));

drop policy if exists insumo_custo_historico_insert on public.insumo_custo_historico;
create policy insumo_custo_historico_insert on public.insumo_custo_historico
  for insert with check (private.has_company_permission(company_id, 'financial', 'create'));

-- Trigger, e nao codigo de aplicacao: assim nenhuma mudanca de custo escapa,
-- venha da tela, de um script ou de um import futuro.
create or replace function public.registrar_custo_insumo()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.custo is distinct from old.custo then
    insert into public.insumo_custo_historico
      (company_id, insumo_id, custo, qtd_embalagem, preco_pacote)
    values (new.company_id, new.id, new.custo, new.qtd_embalagem, new.preco_pacote);
  end if;
  return new;
end;
$$;

drop trigger if exists insumos_registrar_custo on public.insumos;
create trigger insumos_registrar_custo
  after insert or update of custo on public.insumos
  for each row execute function public.registrar_custo_insumo();
