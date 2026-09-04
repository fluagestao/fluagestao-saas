-- ============================================================================
-- DADOS DE DEMONSTRAÇÃO — mês corrente
--
-- Enche o mês inteiro para uma chamada de vídeo: pedidos com horário, entradas
-- no financeiro, contas a pagar (pagas, vencendo e atrasadas) e recorrências
-- vivas em três meses.
--
-- NÃO é migration. Não crie isto em supabase/migrations/ — é dado, não schema.
--
-- Clientes são FICTÍCIOS e os WhatsApp usam o padrão 4899999-00XX, que não
-- corresponde a linha real. Nenhum dado de cliente de verdade entra aqui.
--
-- ANTES DE RODAR: troque COLE_AQUI pelo id da sua empresa de teste.
--   select id, nome from public.companies order by created_at;
--
-- Ele se recusa a rodar duas vezes no mesmo mês. A limpeza está no fim.
-- ============================================================================

do $$
declare
  v_company     uuid := 'COLE_AQUI';

  v_hoje        date := current_date;
  v_inicio      date := date_trunc('month', current_date)::date;
  v_fim         date := (date_trunc('month', current_date) + interval '1 month' - interval '1 day')::date;
  v_mes_ant     date := (date_trunc('month', current_date) - interval '1 month')::date;
  v_mes_prox    date := (date_trunc('month', current_date) + interval '1 month')::date;

  v_produtos    int;
  v_clientes    int;

  v_dia         date;
  v_qtd_dia     int;
  v_n           int;

  v_cli         record;
  v_bairro      record;
  v_itens       jsonb;
  v_subtotal    numeric(12,2);
  v_taxa        numeric(12,2);
  v_tipo        text;
  v_status      text;
  v_criado      timestamptz;
  v_recebido    date;
  v_entregue    timestamptz;
  v_janela      text;
  v_forma       text;

  -- Sete janelas: o pedido n do dia cai na janela n, então a agenda do dia
  -- aparece ordenada e sem dois pedidos disputando o mesmo horário.
  v_janelas     text[] := array[
    '08:00 às 10:00', '10:00 às 12:00', '12:00 às 14:00', '14:00 às 16:00',
    '16:00 às 18:00', '18:00 às 20:00', '19:00 às 21:00'
  ];

  v_grupo       uuid;
  v_venc        date;
  v_mov         uuid;
  v_tipo_desp   uuid;
  v_conta       record;

  v_recorrentes text[][] := array[
    ['Aluguel do ateliê',        '1200.00', '5',  'Imobiliária Centro'],
    ['Energia elétrica',         '287.40',  '10', 'Celesc'],
    ['Internet e telefone',      '129.90',  '15', 'Vivo'],
    ['Contador',                 '320.00',  '20', 'Escritório Nova Conta'],
    ['Assinatura do Flua',       '97.00',   '8',  'Flua Gestão']
  ];

  v_avulsas     text[][] := array[
    ['Compra de cestas de vime',      '840.00',  '4',  'Vime & Cia'],
    ['Embalagens e celofane',         '312.50',  '6',  'Embala Sul'],
    ['Fitas e laços',                 '148.00',  '9',  'Armarinho Dona Rosa'],
    ['Chocolates e bombons',          '1260.00', '11', 'Distribuidora Doce Vida'],
    ['Cafés e chás especiais',        '590.00',  '13', 'Torrefação Serra'],
    ['Queijos e frios',               '1480.00', '16', 'Laticínios Bom Gosto'],
    ['Combustível das entregas',      '420.00',  '18', 'Posto Ipiranga'],
    ['Impulsionamento no Instagram',  '250.00',  '21', 'Meta'],
    ['Etiquetas e cartões impressos', '196.00',  '24', 'Gráfica Rápida'],
    ['Manutenção da geladeira',       '380.00',  '26', 'Refrigeração Tubarão']
  ];
begin
  if v_company = 'COLE_AQUI'::uuid then
    raise exception 'Troque COLE_AQUI pelo id da empresa antes de rodar.';
  end if;

  -- Guardas: sem produtos os pedidos sairiam vazios, e semear duas vezes
  -- dobraria o faturamento do mês sem aviso nenhum.
  select count(*) into v_produtos
  from public.produtos
  where company_id = v_company and preco is not null and preco > 0
    and coalesce(rascunho, false) = false;

  if v_produtos = 0 then
    raise exception 'Esta empresa não tem produto com preço. Cadastre ao menos um antes de semear.';
  end if;

  if (select count(*) from public.pedidos
      where company_id = v_company and data_entrega between v_inicio and v_fim) > 40 then
    raise exception 'Este mês já tem pedidos demais. Rode a limpeza do fim do arquivo antes de semear de novo.';
  end if;

  -- ---------------------------------------------------------------- clientes
  insert into public.clientes (company_id, nome, whatsapp, email, bairro, cidade, ativo)
  select v_company, c.nome, c.whatsapp, c.email, c.bairro, 'Tubarão', true
  from (values
    ('Ana Beatriz Moraes',    '48999990001', 'ana.moraes@exemplo.com',    'Centro'),
    ('Carla Menezes',         '48999990002', 'carla.menezes@exemplo.com', 'Humaitá'),
    ('Débora Vasconcelos',    '48999990003', null,                        'Oficinas'),
    ('Eduarda Prado',         '48999990004', 'eduarda@exemplo.com',       'Dehon'),
    ('Fernanda Ribeiro',      '48999990005', null,                        'São João'),
    ('Gabriela Nunes',        '48999990006', 'gabi.nunes@exemplo.com',    'Centro'),
    ('Helena Coutinho',       '48999990007', null,                        'Vila Moema'),
    ('Isabela Tavares',       '48999990008', 'isa.tavares@exemplo.com',   'Passagem'),
    ('Juliana Peixoto',       '48999990009', null,                        'Centro'),
    ('Larissa Andrade',       '48999990010', 'larissa@exemplo.com',       'Humaitá'),
    ('Marina Bittencourt',    '48999990011', null,                        'Oficinas'),
    ('Natália Furtado',       '48999990012', 'natalia.f@exemplo.com',     'Dehon'),
    ('Patrícia Lemos',        '48999990013', null,                        'Centro'),
    ('Renata Schmitt',        '48999990014', 'renata.s@exemplo.com',      'Vila Moema'),
    ('Sabrina Duarte',        '48999990015', null,                        'São João'),
    ('Construtora Meridiano', '48999990016', 'compras@exemplo.com',       'Centro'),
    ('Clínica Vida Plena',    '48999990017', 'adm@exemplo.com',           'Dehon'),
    ('Contabilidade Horizonte','48999990018','financeiro@exemplo.com',    'Centro'),
    ('Escola Semear',         '48999990019', 'secretaria@exemplo.com',    'Humaitá'),
    ('Imobiliária Sul Casa',  '48999990020', 'contato@exemplo.com',       'Centro')
  ) as c(nome, whatsapp, email, bairro)
  on conflict do nothing;

  select count(*) into v_clientes from public.clientes where company_id = v_company;
  if v_clientes = 0 then
    raise exception 'Nenhum cliente disponível para os pedidos.';
  end if;

  -- ----------------------------------------------------------------- pedidos
  v_dia := v_inicio;
  while v_dia <= v_fim loop
    v_qtd_dia := 3 + floor(random() * 5)::int;   -- 3 a 7

    for v_n in 1 .. v_qtd_dia loop
      select id, nome, whatsapp, bairro into v_cli
      from public.clientes
      where company_id = v_company
        and coalesce(ativo, true)
        -- Coorte: quem "sumiu" nao compra no mes corrente. Mesma regra do
        -- docs/demo-historico.sql — se mudar la, mude aqui.
        and right(regexp_replace(coalesce(whatsapp, ''), '\D', '', 'g'), 1)
              not in ('6', '7', '8', '9')
      order by random() limit 1;

      -- Itens saem dos produtos REAIS da empresa: assim o slug bate, a margem
      -- calcula certo e a tela de Custo não mostra "Montado na hora".
      with escolhidos as (
        select slug, nome, preco, (1 + floor(random() * 2))::int as qtd
        from public.produtos
        where company_id = v_company and preco is not null and preco > 0
          and coalesce(rascunho, false) = false
        order by random()
        limit 1 + floor(random() * 3)::int
      )
      select jsonb_agg(jsonb_build_object('slug', slug, 'nome', nome, 'preco', preco, 'qtd', qtd)),
             coalesce(sum(preco * qtd), 0)
      into v_itens, v_subtotal
      from escolhidos;

      continue when v_itens is null;

      v_tipo := case when random() < 0.8 then 'entrega' else 'retirada' end;

      v_bairro := null;
      v_taxa := 0;
      if v_tipo = 'entrega' then
        select id, nome, taxa into v_bairro
        from public.bairros
        where company_id = v_company and coalesce(ativo, true)
        order by random() limit 1;
        v_taxa := coalesce(v_bairro.taxa, 10.00);
      end if;

      v_janela := v_janelas[least(v_n, array_length(v_janelas, 1))];
      v_forma  := case when random() < 0.72 then 'pix' else 'cartao' end;

      -- O pedido é sempre criado no passado. Datar a criação no futuro para
      -- casar com a entrega deixaria "criado em 22/09" numa tela de dia 03.
      v_criado := (least(v_dia, v_hoje) - (floor(random() * 9))::int)::timestamptz
                  + make_interval(hours => 8 + floor(random() * 11)::int,
                                  mins  => floor(random() * 60)::int);
      if v_criado::date < v_mes_ant then
        v_criado := (v_inicio)::timestamptz + make_interval(hours => 9);
      end if;

      v_recebido := null;
      v_entregue := null;

      if v_dia < v_hoje then
        v_status := 'entregue';
        v_entregue := v_dia::timestamptz + make_interval(hours => 9 + v_n);
        -- 15% entregue e ainda não pago: é o que povoa "A receber" em atraso.
        if random() < 0.85 then
          v_recebido := v_dia;
        end if;
      elsif v_dia = v_hoje then
        v_status := (array['producao', 'pronto', 'entregue'])[1 + floor(random() * 3)::int];
        if v_status = 'entregue' then
          v_entregue := v_dia::timestamptz + make_interval(hours => 9 + v_n);
        end if;
        if random() < 0.5 then
          v_recebido := v_dia;
        end if;
      else
        v_status := case when random() < 0.7 then 'novo' else 'producao' end;
        -- Sinal pago na hora do pedido: entra no caixa antes da entrega.
        if random() < 0.35 then
          v_recebido := v_criado::date;
        end if;
      end if;

      insert into public.pedidos (
        company_id, cliente_id, cliente_nome, cliente_whatsapp,
        itens, subtotal, taxa_entrega, taxa_manual, total,
        tipo, bairro, bairro_id, endereco,
        data_entrega, janela_entrega, forma_pagamento, status,
        recebido_em, entregue_em, origem, created_at, observacao
      ) values (
        v_company, v_cli.id, v_cli.nome, v_cli.whatsapp,
        v_itens, v_subtotal, nullif(v_taxa, 0), false, v_subtotal + v_taxa,
        v_tipo,
        case when v_tipo = 'entrega' then coalesce(v_bairro.nome, v_cli.bairro) end,
        case when v_tipo = 'entrega' then v_bairro.id end,
        case when v_tipo = 'entrega' then 'Rua das Acácias, ' || (50 + floor(random() * 900))::int end,
        v_dia, v_janela, v_forma, v_status,
        v_recebido, v_entregue, 'manual', v_criado, null
      );
    end loop;

    v_dia := v_dia + 1;
  end loop;

  -- ------------------------------------------------- entradas no financeiro
  -- `not exists` de propósito: se existir trigger no banco que já lança o
  -- movimento ao receber o pedido, isto não duplica nada.
  insert into public.movimentos (company_id, pedido_id, tipo, data, valor, descricao)
  select v_company, p.id, 'entrada', p.recebido_em, p.total,
         'Pedido #' || coalesce(p.numero::text, '—') || ' · ' || coalesce(p.cliente_nome, 'cliente')
  from public.pedidos p
  where p.company_id = v_company
    and p.recebido_em is not null
    and p.recebido_em between v_inicio and v_fim
    and not exists (select 1 from public.movimentos m where m.pedido_id = p.id);

  -- ----------------------------------------------------- tipos de despesa
  insert into public.tipos_despesa (company_id, nome)
  select v_company, n
  from unnest(array['Insumos', 'Embalagens', 'Ocupação', 'Serviços', 'Marketing', 'Logística']) n
  on conflict do nothing;

  -- ------------------------------------------------------- contas a pagar
  -- Recorrentes em três meses: o passado pago, o atual no meio do caminho, o
  -- próximo em aberto. É o que mostra a recorrência viva na tela.
  for v_n in 1 .. array_length(v_recorrentes, 1) loop
    v_grupo := gen_random_uuid();

    select id into v_tipo_desp
    from public.tipos_despesa
    where company_id = v_company
      and nome = case
            when v_recorrentes[v_n][1] like 'Aluguel%' then 'Ocupação'
            when v_recorrentes[v_n][1] like 'Energia%' then 'Ocupação'
            when v_recorrentes[v_n][1] like 'Internet%' then 'Serviços'
            else 'Serviços' end
    limit 1;

    foreach v_venc in array array[
      v_mes_ant  + (v_recorrentes[v_n][3]::int - 1),
      v_inicio   + (v_recorrentes[v_n][3]::int - 1),
      v_mes_prox + (v_recorrentes[v_n][3]::int - 1)
    ] loop
      insert into public.contas_a_pagar
        (company_id, grupo_id, descricao, fornecedor, tipo_despesa_id, valor, vencimento, recorrencia, pago_em)
      values
        (v_company, v_grupo, v_recorrentes[v_n][1], v_recorrentes[v_n][4], v_tipo_desp,
         v_recorrentes[v_n][2]::numeric, v_venc, 'mensal',
         case when v_venc <= v_hoje then v_venc end);
    end loop;
  end loop;

  -- Avulsas do mês: algumas pagas, uma parte vencendo à frente e duas
  -- deliberadamente atrasadas, para a tela ter o que destacar em vermelho.
  for v_n in 1 .. array_length(v_avulsas, 1) loop
    v_venc := v_inicio + (v_avulsas[v_n][3]::int - 1);

    select id into v_tipo_desp
    from public.tipos_despesa
    where company_id = v_company
      and nome = case
            when v_n <= 6 then 'Insumos'
            when v_n = 7 then 'Logística'
            when v_n = 8 then 'Marketing'
            else 'Serviços' end
    limit 1;

    insert into public.contas_a_pagar
      (company_id, grupo_id, descricao, fornecedor, tipo_despesa_id, valor, vencimento, recorrencia, pago_em)
    values
      (v_company, gen_random_uuid(), v_avulsas[v_n][1], v_avulsas[v_n][4], v_tipo_desp,
       v_avulsas[v_n][2]::numeric, v_venc, 'unica',
       case when v_venc <= v_hoje and v_n % 4 <> 0 then v_venc end);
  end loop;

  -- ------------------------------------- saídas no caixa para o que foi pago
  -- Espelha o que pagarContaAPagar faz: cria o movimento e amarra na conta.
  for v_conta in
    select id, descricao, fornecedor, tipo_despesa_id, valor, pago_em
    from public.contas_a_pagar
    where company_id = v_company and pago_em is not null and movimento_id is null
  loop
    insert into public.movimentos
      (company_id, tipo, data, valor, descricao, fornecedor, tipo_despesa_id)
    values
      (v_company, 'saida', v_conta.pago_em, v_conta.valor, v_conta.descricao,
       v_conta.fornecedor, v_conta.tipo_despesa_id)
    returning id into v_mov;

    update public.contas_a_pagar set movimento_id = v_mov where id = v_conta.id;
  end loop;

  raise notice 'Pronto: % pedidos, % contas a pagar.',
    (select count(*) from public.pedidos where company_id = v_company and data_entrega between v_inicio and v_fim),
    (select count(*) from public.contas_a_pagar where company_id = v_company);
end $$;


-- ============================================================================
-- LIMPEZA — apaga só o que este arquivo criou. Rode antes de semear de novo.
-- Troque COLE_AQUI nas quatro linhas.
-- ============================================================================
-- begin;
--   delete from public.movimentos
--    where company_id = 'COLE_AQUI'
--      and pedido_id in (select id from public.pedidos
--                         where company_id = 'COLE_AQUI'
--                           and data_entrega >= date_trunc('month', current_date)::date);
--
--   delete from public.movimentos
--    where company_id = 'COLE_AQUI'
--      and id in (select movimento_id from public.contas_a_pagar
--                  where company_id = 'COLE_AQUI' and movimento_id is not null);
--
--   delete from public.contas_a_pagar where company_id = 'COLE_AQUI';
--
--   delete from public.pedidos
--    where company_id = 'COLE_AQUI'
--      and data_entrega >= date_trunc('month', current_date)::date;
-- commit;
