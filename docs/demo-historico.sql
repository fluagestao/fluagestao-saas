-- ============================================================================
-- DADOS DE DEMONSTRAÇÃO — 14 meses para trás
--
-- Companheiro do docs/demo-mes-atual.sql, e NÃO substituto dele: aquele enche o
-- mês corrente, este enche o passado. Podem ser rodados em qualquer ordem, e
-- cada um se recusa a rodar duas vezes.
--
-- POR QUE ELE EXISTE
--
-- O seed do mês corrente sozinho deixa três telas vazias, e vazias de um jeito
-- que parece defeito:
--
--   Relacionamento — as faixas são 30 a 60, 60 a 120 e mais de 120 dias.
--     Com todo mundo tendo comprado esta semana, ninguém cai em faixa nenhuma.
--   Por ocasião   — a pergunta é "quem comprou no Natal PASSADO". Sem passado,
--     não há resposta.
--   Dashboard     — a comparação com o mês anterior e o gráfico do ano ficam
--     sem série.
--
-- AS DUAS COISAS QUE ESTE ARQUIVO FAZ E O OUTRO NÃO
--
-- 1) COORTES. O que decide a faixa do Relacionamento é a ÚLTIMA compra de cada
--    cliente, não quantas ela fez. Espalhar pedidos pelo passado sem controle
--    faria todo mundo ter comprado recentemente também, e as faixas seguiriam
--    vazias. Aqui cada cliente ganha uma data em que PARA de comprar.
--
--    A coorte sai do ÚLTIMO DÍGITO DO WHATSAPP, e não de uma tabela auxiliar:
--
--      termina em 0 a 5   ativa, compra até hoje    (não aparece nas faixas)
--      termina em 6 ou 7  parou 45 dias atrás       (faixa 30 a 60)
--      termina em 8       parou 95 dias atrás       (faixa 60 a 120)
--      termina em 9       parou 210 dias atrás      (faixa mais de 120)
--
--    Ser uma regra, e não uma tabela temporária, é o que faz os dois seeds
--    conviverem. O demo-mes-atual.sql roda numa transação SEPARADA e não
--    enxergaria tabela temporária nenhuma: ele sorteava entre todos os
--    clientes e dava compra recente até às "perdidas", zerando as faixas que
--    este arquivo existe para encher. Agora ele aplica a MESMA regra sozinho,
--    lendo o mesmo dígito. Rode os dois em qualquer ordem.
--
-- 2) OCASIÃO. Datas comemorativas ganham pico de pedidos com `ocasiao`
--    preenchida. Uma parte fica com ocasiao NULA de propósito, para o botão
--    "Marcar histórico pela data de entrega" ter o que fazer na demonstração.
--
-- SOBRE AS DATAS QUE ANDAM
--
-- Dia das Mães e Dia dos Pais são o 2o domingo de maio e de agosto — calculados
-- aqui. Páscoa e Black Friday ficaram de fora: a Páscoa exige o algoritmo de
-- Computus, e reescrevê-lo em SQL criaria uma segunda implementação para
-- divergir da que já existe em src/lib/datas-comemorativas.ts. Elas continuam
-- funcionando no sistema; só não têm pico neste seed.
--
-- Clientes são FICTÍCIOS e os WhatsApp usam 4899999-00XX, que não corresponde a
-- linha real.
--
-- ANTES DE RODAR: troque COLE_AQUI pelo id da empresa, nas DUAS ocorrências.
--   select id, nome from public.companies order by created_at;
-- ============================================================================

do $$
declare
  /* Texto, e nao uuid: `uuid := 'COLE_AQUI'` estoura na propria declaracao,
     antes de qualquer verificacao, com um erro que nao explica nada. Assim a
     mensagem abaixo consegue aparecer. */
  v_empresa    text := 'COLE_AQUI';
  v_company    uuid;

  MESES        constant int := 14;

  v_hoje       date := current_date;
  v_inicio     date := (date_trunc('month', current_date) - make_interval(months => MESES))::date;
  v_fim        date := (date_trunc('month', current_date) - interval '1 day')::date;

  v_produtos   int;
  v_dia        date;
  v_qtd_dia    int;
  v_n          int;
  v_ano        int;

  v_cli        record;
  v_itens      jsonb;
  v_subtotal   numeric(12,2);
  v_taxa       numeric(12,2);
  v_tipo       text;
  v_criado     timestamptz;
  v_entregue   timestamptz;
  v_recebido   date;
  v_ocasiao    text;
  v_confirmada boolean;
  v_dest       text;

  v_janelas    text[] := array[
    '08:00 às 10:00', '10:00 às 12:00', '12:00 às 14:00', '14:00 às 16:00',
    '16:00 às 18:00', '18:00 às 20:00', '19:00 às 21:00', '09:00 às 11:00',
    '11:00 às 13:00', '15:00 às 17:00', '17:00 às 19:00', '20:00 às 22:00'
  ];

  -- Nomes de presenteado: é o que faz a mensagem "você mandou X para Y"
  -- existir na aba Por ocasião.
  v_presenteados text[] := array[
    'dona Marlene', 'seu João', 'Tia Neusa', 'Vovó Iolanda', 'Sr. Antônio',
    'Cláudia', 'Roberto', 'Lúcia', 'a equipe do escritório', 'Dona Ivete'
  ];
begin
  if v_empresa = 'COLE_AQUI' then
    raise exception 'Troque COLE_AQUI pelo id da empresa antes de rodar. Pegue com: select id, nome from public.companies order by created_at;';
  end if;

  begin
    v_company := v_empresa::uuid;
  exception when others then
    raise exception 'O valor colado no lugar de COLE_AQUI nao e um id valido: %', v_empresa;
  end;

  select count(*) into v_produtos
  from public.produtos
  where company_id = v_company and preco is not null and preco > 0
    and coalesce(rascunho, false) = false;

  if v_produtos = 0 then
    raise exception 'Esta empresa não tem produto com preço. Cadastre ao menos um antes de semear.';
  end if;

  -- Conta só o que ESTE arquivo criou. Contando tudo, quem já tem histórico
  -- real nunca conseguiria rodar — e seria mandado para uma limpeza que
  -- apagaria justamente esse histórico.
  if (select count(*) from public.pedidos p
       where p.company_id = v_company
         and p.data_entrega between v_inicio and v_fim
         and p.cliente_id in (select id from public.clientes
                               where company_id = v_company and regexp_replace(coalesce(whatsapp, ''), '\D', '', 'g') like '48999990%')) > 60 then
    raise exception 'O passado já tem pedidos de demonstração. Rode a limpeza do fim do arquivo antes de semear de novo.';
  end if;

/* ------------------------------------------------------------------------
   COMO O SEED SABE O QUE É DELE

   `company_id = v_company` NÃO delimita "o que este arquivo criou" — delimita
   "tudo da empresa", e o dono tem clientes e pedidos DE VERDADE neste banco.
   Sem uma marca, o seed sorteava clientes reais para pôr venda falsa no nome
   deles, lançava entrada no caixa em cima de pedido real, e a limpeza do fim
   apagava histórico verdadeiro.

   A marca é o WhatsApp: os vinte clientes fictícios usam 48999990XX, e todo
   pedido criado aqui pertence a um deles. Então "o que é do seed" é uma
   consulta, não uma suposição. */

  -- ---------------------------------------------------------------- clientes
  /* `on conflict do nothing` sem alvo: a idempotência vem do índice único de
     WhatsApp por empresa, que já existe (é ele que produz a mensagem "Já existe
     um cliente com esse WhatsApp" em pedidos.ts). Se ele um dia sair, este
     insert passa a duplicar em silêncio — por isso a marca do seed é o próprio
     WhatsApp, e não a quantidade de linhas. */
  insert into public.clientes (company_id, nome, whatsapp, email, bairro, cidade, ativo)
  select v_company, c.nome, c.whatsapp, c.email, c.bairro, 'Tubarão', true
  from (values
    ('Ana Beatriz Moraes',     '48999990001', 'ana.moraes@exemplo.com',    'Centro'),
    ('Carla Menezes',          '48999990002', 'carla.menezes@exemplo.com', 'Humaitá'),
    ('Débora Vasconcelos',     '48999990003', null,                        'Oficinas'),
    ('Eduarda Prado',          '48999990004', 'eduarda@exemplo.com',       'Dehon'),
    ('Fernanda Ribeiro',       '48999990005', null,                        'São João'),
    ('Gabriela Nunes',         '48999990006', 'gabi.nunes@exemplo.com',    'Centro'),
    ('Helena Coutinho',        '48999990007', null,                        'Vila Moema'),
    ('Isabela Tavares',        '48999990008', 'isa.tavares@exemplo.com',   'Passagem'),
    ('Juliana Peixoto',        '48999990009', null,                        'Centro'),
    ('Larissa Andrade',        '48999990010', 'larissa@exemplo.com',       'Humaitá'),
    ('Marina Bittencourt',     '48999990011', null,                        'Oficinas'),
    ('Natália Furtado',        '48999990012', 'natalia.f@exemplo.com',     'Dehon'),
    ('Patrícia Lemos',         '48999990013', null,                        'Centro'),
    ('Renata Schmitt',         '48999990014', 'renata.s@exemplo.com',      'Vila Moema'),
    ('Sabrina Duarte',         '48999990015', null,                        'São João'),
    ('Construtora Meridiano',  '48999990016', 'compras@exemplo.com',       'Centro'),
    ('Clínica Vida Plena',     '48999990017', 'adm@exemplo.com',           'Dehon'),
    ('Contabilidade Horizonte','48999990018', 'financeiro@exemplo.com',    'Centro'),
    ('Escola Semear',          '48999990019', 'secretaria@exemplo.com',    'Humaitá'),
    ('Imobiliária Sul Casa',   '48999990020', 'contato@exemplo.com',       'Centro')
  ) as c(nome, whatsapp, email, bairro)
  on conflict do nothing;

  -- --------------------------------------------------- datas comemorativas
  /* Sem `drop table if exists` antes: `on commit drop` já apaga no fim do
     bloco, e um drop sem schema qualificado resolveria pelo search_path — que
     no editor do Supabase inclui public. Um nome que por acaso existisse lá
     seria apagado de verdade. */
  create temp table _demo_datas (dia date primary key, slug text) on commit drop;

  for v_ano in extract(year from v_inicio)::int .. extract(year from v_fim)::int loop
    insert into _demo_datas (dia, slug) values
      (make_date(v_ano,  1,  1), 'ano-novo'),
      (make_date(v_ano,  3,  8), 'dia-da-mulher'),
      (make_date(v_ano,  6, 12), 'dia-dos-namorados'),
      (make_date(v_ano,  9, 15), 'dia-do-cliente'),
      (make_date(v_ano, 10, 12), 'dia-das-criancas'),
      (make_date(v_ano, 10, 15), 'dia-dos-professores'),
      (make_date(v_ano, 10, 31), 'halloween'),
      (make_date(v_ano, 12, 25), 'natal'),
      /* 2o domingo: primeiro domingo do mês + 7. `(7 - dow) % 7` leva do dia 1
         ao domingo seguinte, e vale 0 quando o dia 1 já é domingo. */
      (make_date(v_ano, 5, 1)
         + ((7 - extract(dow from make_date(v_ano, 5, 1))::int) % 7) + 7, 'dia-das-maes'),
      (make_date(v_ano, 8, 1)
         + ((7 - extract(dow from make_date(v_ano, 8, 1))::int) % 7) + 7, 'dia-dos-pais')
    on conflict (dia) do nothing;
  end loop;

  -- ----------------------------------------------------------------- pedidos
  v_dia := v_inicio;
  while v_dia <= v_fim loop
    select slug into v_ocasiao from _demo_datas where dia = v_dia;

    /* Pico na data comemorativa; nos outros dias, movimento esparso. O mês
       corrente é denso porque é o que aparece no Dashboard; o passado só
       precisa de volume suficiente para as faixas e o gráfico do ano. */
    if v_ocasiao is not null then
      v_qtd_dia := 6 + floor(random() * 7)::int;      -- 6 a 12
    elsif random() < 0.35 then
      v_qtd_dia := 1 + floor(random() * 3)::int;      -- 1 a 3
    else
      v_qtd_dia := 0;
    end if;

    for v_n in 1 .. v_qtd_dia loop
      /* Só os clientes fictícios do seed, e só quem ainda estava ativa nesta
         data (ver COORTE, no topo). Sem o filtro do WhatsApp, isto sorteava
         clientes REAIS do dono e punha venda inventada no nome deles. */
      select c.id, c.nome, c.whatsapp, c.bairro into v_cli
      from public.clientes c
      where c.company_id = v_company
        and coalesce(c.ativo, true)
        and regexp_replace(coalesce(c.whatsapp, ''), '\D', '', 'g') like '48999990%' 
        and v_dia <= case right(regexp_replace(coalesce(c.whatsapp, ''), '\D', '', 'g'), 1)
                       when '6' then v_hoje - 45     -- faixa 30 a 60
                       when '7' then v_hoje - 45
                       when '8' then v_hoje - 95     -- faixa 60 a 120
                       when '9' then v_hoje - 210    -- faixa mais de 120
                       else v_hoje                   -- ativa
                     end
      order by random() limit 1;

      continue when v_cli.id is null;

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
      v_taxa := case when v_tipo = 'entrega' then 8 + floor(random() * 18)::int else 0 end;

      v_criado  := (v_dia - (1 + floor(random() * 9))::int)::timestamptz
                   + make_interval(hours => 8 + floor(random() * 11)::int,
                                   mins  => floor(random() * 60)::int);
      -- Tudo aqui está no passado: entregue, e quase tudo pago.
      v_entregue := v_dia::timestamptz + make_interval(hours => 9 + (v_n % 10));
      v_recebido := case when random() < 0.94 then v_dia end;

      /* Presenteado só quando há ocasião: é o dado que a mensagem "você mandou
         X para Y" usa, e inventá-lo num pedido sem ocasião seria ruído. */
      v_dest := case
        when v_ocasiao is not null and random() < 0.8
        then v_presenteados[1 + floor(random() * array_length(v_presenteados, 1))::int]
      end;

      /* Uma parte fica sem ocasião de propósito: é o que dá trabalho ao botão
         "Marcar histórico pela data de entrega" na demonstração. */
      v_confirmada := v_ocasiao is not null and random() < 0.7;

      insert into public.pedidos (
        company_id, cliente_id, cliente_nome, cliente_whatsapp,
        itens, subtotal, taxa_entrega, taxa_manual, total,
        tipo, bairro, endereco, destinatario_nome,
        data_entrega, janela_entrega, forma_pagamento, status,
        ocasiao, ocasiao_confirmada,
        recebido_em, entregue_em, origem, created_at
      ) values (
        v_company, v_cli.id, v_cli.nome, v_cli.whatsapp,
        v_itens, v_subtotal, nullif(v_taxa, 0), true, v_subtotal + v_taxa,
        v_tipo,
        case when v_tipo = 'entrega' then v_cli.bairro end,
        case when v_tipo = 'entrega' then 'Rua das Acácias, ' || (50 + floor(random() * 900))::int end,
        v_dest,
        v_dia,
        v_janelas[1 + ((v_n - 1) % array_length(v_janelas, 1))],
        case when random() < 0.72 then 'pix' else 'cartao' end,
        'entregue',
        case when v_confirmada then v_ocasiao end,
        v_confirmada,
        v_recebido, v_entregue, 'manual', v_criado
      );
    end loop;

    v_dia := v_dia + 1;
  end loop;

  -- ------------------------------------------------- entradas no financeiro
  -- `not exists` de propósito: se houver trigger no banco que já lança o
  -- movimento ao receber o pedido, isto não duplica.
  insert into public.movimentos (company_id, pedido_id, tipo, data, valor, descricao)
  select v_company, p.id, 'entrada', p.recebido_em, p.total,
         'Pedido #' || coalesce(p.numero::text, '—') || ' · ' || coalesce(p.cliente_nome, 'cliente')
  from public.pedidos p
  where p.company_id = v_company
    and p.recebido_em is not null
    and p.recebido_em between v_inicio and v_fim
    -- Só pedidos do seed: sem isto, entradas falsas entravam no caixa em cima
    -- de pedidos REAIS que ainda não tinham movimento lançado.
    and p.cliente_id in (select id from public.clientes
                          where company_id = v_company and regexp_replace(coalesce(whatsapp, ''), '\D', '', 'g') like '48999990%')
    and not exists (select 1 from public.movimentos m where m.pedido_id = p.id);

  raise notice 'Pronto: % pedidos no passado, % com ocasião marcada.',
    (select count(*) from public.pedidos
      where company_id = v_company and data_entrega between v_inicio and v_fim),
    (select count(*) from public.pedidos
      where company_id = v_company and data_entrega between v_inicio and v_fim
        and ocasiao is not null);
end $$;


-- ============================================================================
-- CONFERIR O QUE SAIU
--
-- 1) As faixas do Relacionamento têm gente? (troque COLE_AQUI)
--
--   with ultima as (
--     select cliente_id, max(coalesce(entregue_em::date, data_entrega)) as dia
--       from public.pedidos
--      where company_id = 'COLE_AQUI' and cliente_id is not null
--        and status not in ('novo','producao','pronto','cancelado')
--      group by cliente_id
--   )
--   select case
--            when current_date - dia < 30  then 'menos de 30 (fora das faixas)'
--            when current_date - dia < 60  then '30 a 60'
--            when current_date - dia < 120 then '60 a 120'
--            else 'mais de 120'
--          end as faixa,
--          count(*)
--     from ultima group by 1 order by 1;
--
-- 2) A aba Por ocasião tem o quê?
--
--   select ocasiao, extract(year from data_entrega)::int as ano, count(*)
--     from public.pedidos
--    where company_id = 'COLE_AQUI' and ocasiao is not null
--    group by 1, 2 order by 2 desc, 3 desc;
--
-- ============================================================================
-- LIMPEZA — apaga SÓ o que este arquivo criou.
--
-- O recorte é pelos clientes fictícios (WhatsApp 48999990XX), e não por data:
-- apagar "tudo antes do mês corrente" levaria junto as vendas REAIS antigas do
-- dono, sem volta. Troque COLE_AQUI nas quatro linhas.
-- ============================================================================
-- begin;
--   with demo as (
--     select id from public.clientes
--      where company_id = 'COLE_AQUI'
--        and regexp_replace(coalesce(whatsapp, ''), '\D', '', 'g') like '48999990%'
--   )
--   delete from public.movimentos
--    where company_id = 'COLE_AQUI'
--      and pedido_id in (select id from public.pedidos
--                         where company_id = 'COLE_AQUI'
--                           and cliente_id in (select id from demo));
--
--   delete from public.pedidos
--    where company_id = 'COLE_AQUI'
--      and cliente_id in (
--        select id from public.clientes
--         where company_id = 'COLE_AQUI'
--           and regexp_replace(coalesce(whatsapp, ''), '\D', '', 'g') like '48999990%');
--
--   -- Os clientes fictícios em si, se quiser limpar de vez:
--   -- delete from public.clientes
--   --  where company_id = 'COLE_AQUI'
--   --    and regexp_replace(coalesce(whatsapp, ''), '\D', '', 'g') like '48999990%';
-- commit;
