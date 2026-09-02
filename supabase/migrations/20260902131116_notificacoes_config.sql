-- Preferencia de quais avisos aparecem no sino.
--
-- Nao existe tabela de notificacoes de proposito: todo aviso e derivado de dado
-- que ja existe (boleto vencendo, pedido sem pagar, entrega atrasada). Gravar
-- notificacao exigiria gerar, marcar como lida e expirar — e o aviso do boleto
-- continuaria na tela depois de voce pagar, porque ninguem mandou apagar.
-- Derivando na hora, o aviso some sozinho quando o motivo some.
--
-- Guarda so o que esta DESLIGADO: tipo novo nasce ligado e nao precisa de
-- migration para aparecer.

create table if not exists public.notificacoes_config (
  company_id uuid primary key references public.companies(id) on delete cascade,
  desligados text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.notificacoes_config enable row level security;

-- Checagem de membro ativo, e nao de permissao de modulo: preferencia de aviso
-- nao pertence ao financeiro nem a nenhum outro modulo.
drop policy if exists notificacoes_config_select on public.notificacoes_config;
create policy notificacoes_config_select on public.notificacoes_config
  for select to authenticated
  using (
    exists (
      select 1 from public.company_members m
      where m.company_id = notificacoes_config.company_id
        and m.user_id = (select auth.uid())
        and m.status = 'active'
    )
  );

drop policy if exists notificacoes_config_insert on public.notificacoes_config;
create policy notificacoes_config_insert on public.notificacoes_config
  for insert to authenticated
  with check (
    exists (
      select 1 from public.company_members m
      where m.company_id = notificacoes_config.company_id
        and m.user_id = (select auth.uid())
        and m.status = 'active'
    )
  );

drop policy if exists notificacoes_config_update on public.notificacoes_config;
create policy notificacoes_config_update on public.notificacoes_config
  for update to authenticated
  using (
    exists (
      select 1 from public.company_members m
      where m.company_id = notificacoes_config.company_id
        and m.user_id = (select auth.uid())
        and m.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.company_members m
      where m.company_id = notificacoes_config.company_id
        and m.user_id = (select auth.uid())
        and m.status = 'active'
    )
  );

drop trigger if exists notificacoes_config_set_updated_at on public.notificacoes_config;
create trigger notificacoes_config_set_updated_at
  before update on public.notificacoes_config
  for each row execute function private.set_updated_at();

comment on table public.notificacoes_config is
  'Tipos de aviso desligados no sino, por empresa. Vazio = todos ligados.';
