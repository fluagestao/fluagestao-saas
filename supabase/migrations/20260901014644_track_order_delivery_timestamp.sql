alter table public.pedidos
  add column if not exists entregue_em timestamptz;

update public.pedidos
set entregue_em = coalesce(updated_at, created_at, now())
where status = 'entregue'
  and entregue_em is null;

create or replace function public.set_pedido_entregue_em()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'entregue' and new.entregue_em is null then
      new.entregue_em := now();
    end if;
    return new;
  end if;

  if new.status = 'entregue' then
    if old.status is distinct from 'entregue' then
      new.entregue_em := now();
    elsif new.entregue_em is null then
      new.entregue_em := coalesce(old.entregue_em, now());
    end if;
  elsif old.status = 'entregue' then
    new.entregue_em := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_pedidos_entregue_em on public.pedidos;
create trigger trg_pedidos_entregue_em
before insert or update of status on public.pedidos
for each row
execute function public.set_pedido_entregue_em();

comment on column public.pedidos.entregue_em is 'Momento em que o pedido entrou no status entregue; usado para manter o card por 24 horas no quadro.';
