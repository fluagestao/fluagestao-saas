alter table if exists public.pedidos
  add column if not exists cartao_habilitado boolean not null default false;

update public.pedidos
set cartao_habilitado = true
where coalesce(btrim(cartao_de), '') <> ''
   or coalesce(btrim(cartao_para), '') <> ''
   or coalesce(btrim(cartao_mensagem), '') <> '';
