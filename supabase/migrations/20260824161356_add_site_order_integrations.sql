create table if not exists private.site_integrations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 2 and 80),
  token_hash bytea not null unique,
  token_hint text not null check (char_length(token_hint) between 4 and 12),
  ativo boolean not null default true,
  window_started_at timestamptz not null default now(),
  window_request_count integer not null default 0 check (window_request_count >= 0),
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, nome)
);

alter table private.site_integrations enable row level security;
revoke all on table private.site_integrations from public, anon, authenticated;

create index if not exists site_integrations_company_idx
  on private.site_integrations (company_id)
  where ativo;

create or replace function public.integrar_pedido_site(
  p_token text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_integracao private.site_integrations%rowtype;
  v_agora timestamptz := clock_timestamp();
  v_external_id text;
  v_nome text;
  v_whatsapp text;
  v_whatsapp_digitos text;
  v_data_entrega date;
  v_prazo_opcao text;
  v_item jsonb;
  v_itens jsonb := '[]'::jsonb;
  v_qtd integer;
  v_qtd_numeric numeric;
  v_preco numeric(12,2);
  v_subtotal numeric(12,2) := 0;
  v_cliente_id uuid;
  v_chave_idem text;
  v_pedido_id uuid;
  v_numero bigint;
begin
  if p_token is null
     or char_length(p_token) < 32
     or char_length(p_token) > 128
     or p_token !~ '^[A-Za-z0-9_-]+$' then
    return jsonb_build_object(
      'ok', false,
      'status', 401,
      'code', 'invalid_token'
    );
  end if;

  select *
    into v_integracao
    from private.site_integrations
   where token_hash = extensions.digest(p_token, 'sha256')
     and ativo
   for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'status', 401,
      'code', 'invalid_token'
    );
  end if;

  if v_integracao.window_started_at <= v_agora - interval '10 minutes' then
    update private.site_integrations
       set window_started_at = v_agora,
           window_request_count = 1,
           last_used_at = v_agora,
           updated_at = v_agora
     where id = v_integracao.id;
  elsif v_integracao.window_request_count >= 120 then
    return jsonb_build_object(
      'ok', false,
      'status', 429,
      'code', 'rate_limited'
    );
  else
    update private.site_integrations
       set window_request_count = window_request_count + 1,
           last_used_at = v_agora,
           updated_at = v_agora
     where id = v_integracao.id;
  end if;

  if p_payload is null
     or jsonb_typeof(p_payload) <> 'object'
     or jsonb_typeof(p_payload -> 'itens') <> 'array'
     or jsonb_array_length(p_payload -> 'itens') not between 1 and 40 then
    return jsonb_build_object(
      'ok', false,
      'status', 400,
      'code', 'invalid_payload'
    );
  end if;

  v_external_id := btrim(p_payload ->> 'external_id');
  v_nome := btrim(p_payload ->> 'cliente_nome');
  v_whatsapp := btrim(p_payload ->> 'cliente_whatsapp');
  v_whatsapp_digitos := regexp_replace(coalesce(v_whatsapp, ''), '\D', '', 'g');
  v_prazo_opcao := nullif(btrim(p_payload ->> 'prazo_opcao'), '');

  if char_length(coalesce(v_external_id, '')) not between 8 and 160
     or char_length(coalesce(v_nome, '')) not between 2 and 80
     or char_length(coalesce(v_whatsapp, '')) not between 8 and 24
     or char_length(v_whatsapp_digitos) not between 10 and 15
     or (v_prazo_opcao is not null and v_prazo_opcao not in ('hoje', 'amanha', 'data')) then
    return jsonb_build_object(
      'ok', false,
      'status', 400,
      'code', 'invalid_payload'
    );
  end if;

  if nullif(p_payload ->> 'data_entrega', '') is not null then
    begin
      if (p_payload ->> 'data_entrega') !~ '^\d{4}-\d{2}-\d{2}$' then
        raise invalid_datetime_format;
      end if;
      v_data_entrega := (p_payload ->> 'data_entrega')::date;
    exception when others then
      return jsonb_build_object(
        'ok', false,
        'status', 400,
        'code', 'invalid_payload'
      );
    end;
  end if;

  for v_item in select value from jsonb_array_elements(p_payload -> 'itens')
  loop
    if jsonb_typeof(v_item) <> 'object'
       or jsonb_typeof(v_item -> 'preco') <> 'number'
       or jsonb_typeof(v_item -> 'qtd') <> 'number'
       or coalesce(char_length(btrim(v_item ->> 'nome')), 0) not between 1 and 160
       or char_length(coalesce(v_item ->> 'slug', '')) > 120
       or char_length(coalesce(v_item ->> 'variacao', '')) > 80 then
      return jsonb_build_object(
        'ok', false,
        'status', 400,
        'code', 'invalid_payload'
      );
    end if;

    begin
      v_qtd_numeric := (v_item ->> 'qtd')::numeric;
      v_preco := round((v_item ->> 'preco')::numeric, 2);
    exception when others then
      return jsonb_build_object(
        'ok', false,
        'status', 400,
        'code', 'invalid_payload'
      );
    end;

    if v_qtd_numeric <> trunc(v_qtd_numeric)
       or v_qtd_numeric not between 1 and 99
       or v_preco < 0
       or v_preco > 100000 then
      return jsonb_build_object(
        'ok', false,
        'status', 400,
        'code', 'invalid_payload'
      );
    end if;

    v_qtd := v_qtd_numeric::integer;

    v_itens := v_itens || jsonb_build_array(
      jsonb_strip_nulls(
        jsonb_build_object(
          'slug', nullif(btrim(v_item ->> 'slug'), ''),
          'nome', btrim(v_item ->> 'nome'),
          'preco', v_preco,
          'qtd', v_qtd,
          'variacao', nullif(btrim(v_item ->> 'variacao'), '')
        )
      )
    );
    v_subtotal := v_subtotal + round(v_preco * v_qtd, 2);
  end loop;

  v_chave_idem := 'site-integration:' || v_integracao.id::text || ':' ||
    encode(extensions.digest(v_external_id, 'sha256'), 'hex');

  select id, numero
    into v_pedido_id, v_numero
    from public.pedidos
   where company_id = v_integracao.company_id
     and chave_idem = v_chave_idem;

  if found then
    return jsonb_build_object(
      'ok', true,
      'id', v_pedido_id,
      'numero', v_numero,
      'duplicado', true
    );
  end if;

  select id
    into v_cliente_id
    from public.clientes
   where company_id = v_integracao.company_id
     and regexp_replace(coalesce(whatsapp, ''), '\D', '', 'g') = v_whatsapp_digitos
   limit 1;

  if v_cliente_id is null then
    begin
      insert into public.clientes (company_id, nome, whatsapp)
      values (v_integracao.company_id, v_nome, v_whatsapp)
      returning id into v_cliente_id;
    exception when unique_violation then
      select id
        into v_cliente_id
        from public.clientes
       where company_id = v_integracao.company_id
         and regexp_replace(coalesce(whatsapp, ''), '\D', '', 'g') = v_whatsapp_digitos
       limit 1;
    end;
  end if;

  begin
    insert into public.pedidos (
      company_id,
      cliente_id,
      cliente_nome,
      cliente_whatsapp,
      itens,
      subtotal,
      total,
      data_entrega,
      prazo_opcao,
      status,
      origem,
      observacao,
      chave_idem
    ) values (
      v_integracao.company_id,
      v_cliente_id,
      v_nome,
      v_whatsapp,
      v_itens,
      v_subtotal,
      v_subtotal,
      v_data_entrega,
      v_prazo_opcao,
      'novo',
      'site',
      'Pedido recebido pela integracao ' || v_integracao.nome,
      v_chave_idem
    )
    returning id, numero into v_pedido_id, v_numero;
  exception when unique_violation then
    select id, numero
      into v_pedido_id, v_numero
      from public.pedidos
     where company_id = v_integracao.company_id
       and chave_idem = v_chave_idem;
  end;

  if v_pedido_id is null or v_numero is null then
    raise exception 'Falha ao persistir pedido integrado';
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', v_pedido_id,
    'numero', v_numero,
    'duplicado', false
  );
end;
$$;

revoke all on function public.integrar_pedido_site(text, jsonb) from public;
grant execute on function public.integrar_pedido_site(text, jsonb) to anon, authenticated;

comment on function public.integrar_pedido_site(text, jsonb) is
  'Recebe pedidos de sites externos autenticados por token; valida, deduplica e vincula a empresa correta.';
