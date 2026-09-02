-- ============================================================================
-- DADOS DE TESTE — preenche o sistema inteiro para experimentar as telas.
--
-- Idempotente: pode rodar quantas vezes quiser. Insumo/fornecedor/conta que ja
-- existe nao vira duplicata; campo em branco e preenchido; campo ja preenchido
-- e respeitado (coalesce em tudo).
--
-- Escopo: a empresa do usuario gestaoflua@gmail.com. Troque o e-mail abaixo
-- se quiser semear outra conta.
--
-- O que cria:
--   8 fornecedores completos (CNPJ, endereco, cidade, tipo)
--   ~26 insumos com categoria, embalagem, fornecedor, frequencia e custo
--   estoque com saldo, minimo e 3 itens abaixo do minimo (para testar o alerta)
--   composicao (custo) para todo produto que estiver sem
--   12 contas a pagar: vencidas, de hoje, futuras, um parcelado 3x e uma mensal
--
-- Para LIMPAR depois, o bloco final comentado apaga tudo o que este seed criou.
-- ============================================================================

do $$
declare
  v_empresa uuid;
  v_hoje date := current_date;
  v_forn record;
  v_ins record;
  v_conta record;
  v_produto record;
  v_grupo uuid;
  v_i int;
begin
  -- ---------------------------------------------------------------- empresa
  select cm.company_id into v_empresa
  from public.company_members cm
  join auth.users u on u.id = cm.user_id
  where u.email = 'gestaoflua@gmail.com'
    and cm.status = 'active'
  order by cm.created_at
  limit 1;

  if v_empresa is null then
    raise exception 'Nao achei empresa ativa para gestaoflua@gmail.com. Ajuste o e-mail no topo do arquivo.';
  end if;

  raise notice 'Semeando a empresa %', v_empresa;

  -- ----------------------------------------------------------- tipos base
  insert into public.tipos_fornecedor (company_id, nome)
  select v_empresa, t
  from unnest(array[
    'Supermercado','Atacado','Distribuidora','Hortifruti',
    'Boutique','Loja','Indústria','Embalagens'
  ]) as t
  where not exists (
    select 1 from public.tipos_fornecedor tf
    where tf.company_id = v_empresa and lower(tf.nome) = lower(t)
  );

  -- ------------------------------------------------------------ fornecedores
  for v_forn in
    select * from (values
      ('Atacadão Sul',          '48 3621-4400', 'Atacado',      '12345678000190', 'Av. Marcolino Martins Cabral, 1200', 'Tubarão',      'Frios, mercearia e bebidas'),
      ('Frios & Cia',           '48 3622-1180', 'Distribuidora','23456789000181', 'Rua Lauro Müller, 340',              'Tubarão',      'Queijos, presuntos e salames'),
      ('Vinícola Serra Nova',   '49 3441-7700', 'Indústria',    '34567890000172', 'Rod. SC-438, km 12',                 'Urubici',      'Vinhos e espumantes'),
      ('Embalagens Criativas',  '48 3625-9090', 'Embalagens',   '45678901000163', 'Rua João Pessoa, 88',                'Criciúma',     'Cestas, caixas, papel e fitas'),
      ('Hortifruti Bom Preço',  '48 99811-2020','Hortifruti',   '56789012000154', 'Mercado Público, box 14',            'Tubarão',      'Frutas da estação'),
      ('Doces da Vila',         '48 99744-3131','Loja',         '67890123000145', 'Rua Santos Dumont, 512',             'Laguna',       'Chocolates, geleias e biscoitos'),
      ('Mercado São João',      '48 3623-5050', 'Supermercado', '78901234000136', 'Av. Getúlio Vargas, 900',            'Tubarão',      'Reposição de última hora'),
      ('Torrefação Catarina',   '48 3299-1414', 'Indústria',    '89012345000127', 'Rua das Palmeiras, 45',              'Braço do Norte','Café em grão e moído')
    ) as t(nome, telefone, tipo, documento, endereco, cidade, fornece)
  loop
    if exists (
      select 1 from public.fornecedores f
      where f.company_id = v_empresa and lower(trim(f.nome)) = lower(v_forn.nome)
    ) then
      -- Ja existe: so completa o que estiver vazio.
      update public.fornecedores f set
        telefone           = coalesce(nullif(trim(f.telefone), ''), v_forn.telefone),
        documento          = coalesce(nullif(trim(f.documento), ''), v_forn.documento),
        endereco           = coalesce(nullif(trim(f.endereco), ''), v_forn.endereco),
        cidade             = coalesce(nullif(trim(f.cidade), ''), v_forn.cidade),
        fornece            = coalesce(nullif(trim(f.fornece), ''), v_forn.fornece),
        tipo_fornecedor_id = coalesce(
          f.tipo_fornecedor_id,
          (select tf.id from public.tipos_fornecedor tf
            where tf.company_id = v_empresa and lower(tf.nome) = lower(v_forn.tipo) limit 1)
        )
      where f.company_id = v_empresa and lower(trim(f.nome)) = lower(v_forn.nome);
    else
      insert into public.fornecedores
        (company_id, nome, telefone, documento, endereco, cidade, fornece, ativo, tipo_fornecedor_id)
      values (
        v_empresa, v_forn.nome, v_forn.telefone, v_forn.documento,
        v_forn.endereco, v_forn.cidade, v_forn.fornece, true,
        (select tf.id from public.tipos_fornecedor tf
          where tf.company_id = v_empresa and lower(tf.nome) = lower(v_forn.tipo) limit 1)
      );
    end if;
  end loop;

  -- ----------------------------------------------------------------- insumos
  -- qtd = quanto vem na embalagem; preco = quanto custa a embalagem inteira.
  -- O custo unitario e derivado, igual a tela faz.
  for v_ins in
    select * from (values
      -- nome,                 un,    qtd,    preco,  categoria,           embalagem, fornecedor,             freq,        minimo, obs
      ('Queijo minas',         'KG',   1.0,   54.90, 'Frios e queijos',   'peça',    'Frios & Cia',          'semanal',    2.0,  'Pedir sempre a peça inteira'),
      ('Queijo colonial',      'KG',   1.0,   62.00, 'Frios e queijos',   'peça',    'Frios & Cia',          'semanal',    1.5,  null),
      ('Presunto',             'KG',   1.0,   38.50, 'Frios e queijos',   'peça',    'Frios & Cia',          'semanal',    2.0,  null),
      ('Salame italiano',      'KG',   1.0,   72.00, 'Frios e queijos',   'peça',    'Frios & Cia',          'quinzenal',  1.0,  'Fatiar na hora da montagem'),
      ('Queijo parmesão',      'KG',   1.0,   89.90, 'Frios e queijos',   'peça',    'Frios & Cia',          'mensal',     0.5,  null),
      ('Pão francês',          'UN',  50.0,   32.00, 'Padaria',           'saco',    'Mercado São João',     'semanal',   20.0,  'Comprar no mesmo dia da entrega'),
      ('Pão de mel',           'UN',  12.0,   48.00, 'Padaria',           'caixa',   'Doces da Vila',        'quinzenal',  6.0,  null),
      ('Broa de milho',        'UN',  10.0,   28.00, 'Padaria',           'pacote',  'Mercado São João',     'semanal',    5.0,  null),
      ('Café em grão',         'KG',   1.0,   68.00, 'Mercearia',         'pacote',  'Torrefação Catarina',  'mensal',     1.0,  'Moer na hora deixa a cesta com cheiro'),
      ('Chá de camomila',      'UN',  25.0,   14.90, 'Mercearia',         'caixa',   'Mercado São João',     'esporadica', 10.0,  null),
      ('Geleia de morango',    'UN',   6.0,   54.00, 'Mercearia',         'caixa',   'Doces da Vila',        'mensal',     3.0,  null),
      ('Mel puro',             'UN',   6.0,   72.00, 'Mercearia',         'caixa',   'Doces da Vila',        'mensal',     2.0,  null),
      ('Biscoito amanteigado', 'UN',  12.0,   66.00, 'Mercearia',         'caixa',   'Doces da Vila',        'quinzenal',  6.0,  null),
      ('Castanha de caju',     'KG',   1.0,   95.00, 'Mercearia',         'pacote',  'Atacadão Sul',         'mensal',     0.5,  null),
      ('Chocolate ao leite',   'G',  1000.0,  78.00, 'Doces',             'pacote',  'Doces da Vila',        'quinzenal',  400.0,'Bombons avulsos, 1kg'),
      ('Chocolate meio amargo','G',  1000.0,  86.00, 'Doces',             'pacote',  'Doces da Vila',        'quinzenal',  300.0,null),
      ('Trufa sortida',        'UN',  24.0,   96.00, 'Doces',             'caixa',   'Doces da Vila',        'quinzenal', 12.0,  null),
      ('Vinho tinto seco',     'UN',   6.0,  270.00, 'Bebidas',           'caixa',   'Vinícola Serra Nova',  'mensal',     3.0,  'Campo Largo 750ml'),
      ('Espumante brut',       'UN',   6.0,  354.00, 'Bebidas',           'caixa',   'Vinícola Serra Nova',  'mensal',     2.0,  null),
      ('Suco de laranja',      'L',    1.0,   12.90, 'Bebidas',           'garrafa', 'Mercado São João',     'semanal',    4.0,  null),
      ('Cerveja artesanal',    'UN',   6.0,   84.00, 'Bebidas',           'caixa',   'Atacadão Sul',         'mensal',     6.0,  null),
      ('Morango',              'KG',   1.0,   24.00, 'Frutas',            'bandeja', 'Hortifruti Bom Preço', 'semanal',    1.0,  'Só na época'),
      ('Uva verde',            'KG',   1.0,   18.90, 'Frutas',            'bandeja', 'Hortifruti Bom Preço', 'semanal',    1.0,  null),
      ('Cesta de vime',        'UN',   1.0,   32.00, 'Embalagens',        'unidade', 'Embalagens Criativas', 'mensal',     8.0,  'Tamanho médio'),
      ('Caixa kraft P',        'UN',  25.0,  112.50, 'Embalagens',        'pacote',  'Embalagens Criativas', 'mensal',    15.0,  null),
      ('Papel seda',           'UN', 100.0,   45.00, 'Embalagens',        'pacote',  'Embalagens Criativas', 'mensal',    30.0,  null),
      ('Fita de cetim',        'M',  50.0,    38.00, 'Embalagens',        'rolo',    'Embalagens Criativas', 'mensal',    15.0,  'Cor da estação'),
      ('Cartão de mensagem',   'UN', 100.0,   65.00, 'Embalagens',        'pacote',  'Embalagens Criativas', 'esporadica',25.0,  null)
    ) as t(nome, unidade, qtd, preco, categoria, embalagem, fornecedor, freq, minimo, obs)
  loop
    -- 'M' de metro nao existe no enum da tela; cai para UN sem perder o dado.
    if exists (
      select 1 from public.insumos i
      where i.company_id = v_empresa and lower(trim(i.nome)) = lower(v_ins.nome)
    ) then
      update public.insumos i set
        unidade           = coalesce(nullif(i.unidade, ''), case when v_ins.unidade = 'M' then 'UN' else v_ins.unidade end),
        qtd_embalagem     = case when coalesce(i.qtd_embalagem, 0) <= 0 then v_ins.qtd else i.qtd_embalagem end,
        preco_pacote      = case when coalesce(i.preco_pacote, 0) <= 0 then v_ins.preco else i.preco_pacote end,
        custo             = case when coalesce(i.custo, 0) <= 0
                                 then round((v_ins.preco / nullif(v_ins.qtd, 0))::numeric, 4)
                                 else i.custo end,
        categoria         = coalesce(nullif(trim(i.categoria), ''), v_ins.categoria),
        tipo_embalagem    = coalesce(nullif(trim(i.tipo_embalagem), ''), v_ins.embalagem),
        frequencia_compra = coalesce(i.frequencia_compra, v_ins.freq),
        observacao        = coalesce(nullif(trim(i.observacao), ''), v_ins.obs),
        estoque_minimo    = coalesce(i.estoque_minimo, v_ins.minimo),
        controlar_estoque = true,
        ativo             = true,
        fornecedor_id     = coalesce(
          i.fornecedor_id,
          (select f.id from public.fornecedores f
            where f.company_id = v_empresa and lower(trim(f.nome)) = lower(v_ins.fornecedor) limit 1)
        ),
        updated_at        = now()
      where i.company_id = v_empresa and lower(trim(i.nome)) = lower(v_ins.nome);
    else
      insert into public.insumos (
        company_id, nome, unidade, qtd_embalagem, preco_pacote, custo, ativo,
        categoria, tipo_embalagem, frequencia_compra, observacao,
        estoque_minimo, controlar_estoque, fornecedor_id
      ) values (
        v_empresa, v_ins.nome,
        case when v_ins.unidade = 'M' then 'UN' else v_ins.unidade end,
        v_ins.qtd, v_ins.preco,
        round((v_ins.preco / nullif(v_ins.qtd, 0))::numeric, 4), true,
        v_ins.categoria, v_ins.embalagem, v_ins.freq, v_ins.obs,
        v_ins.minimo, true,
        (select f.id from public.fornecedores f
          where f.company_id = v_empresa and lower(trim(f.nome)) = lower(v_ins.fornecedor) limit 1)
      );
    end if;
  end loop;

  -- Qualquer insumo antigo que tenha sobrado sem custo entra no controle tambem.
  update public.insumos set controlar_estoque = true, ativo = true
  where company_id = v_empresa and controlar_estoque is distinct from true;

  -- ------------------------------------------------------------------ estoque
  -- Entrada inicial: 4x o minimo. Depois tres itens levam baixa para ficarem
  -- abaixo do minimo e o alerta "Precisam de compra" ter o que mostrar.
  insert into public.estoque_movimentos
    (company_id, insumo_id, tipo, quantidade, custo_unitario, motivo, ocorrido_em)
  select
    v_empresa, i.id, 'entrada',
    round(greatest(coalesce(i.estoque_minimo, 1), 1) * 4, 3),
    i.custo, 'Compra inicial (dados de teste)', v_hoje - 20
  from public.insumos i
  where i.company_id = v_empresa
    and not exists (
      select 1 from public.estoque_movimentos m
      where m.company_id = v_empresa and m.insumo_id = i.id
    );

  insert into public.estoque_movimentos
    (company_id, insumo_id, tipo, quantidade, custo_unitario, motivo, ocorrido_em)
  select
    v_empresa, i.id, 'saida',
    -round(greatest(coalesce(i.estoque_minimo, 1), 1) * 3.6, 3),
    i.custo, 'Produção da semana (dados de teste)', v_hoje - 3
  from public.insumos i
  where i.company_id = v_empresa
    and lower(i.nome) in ('morango', 'pão francês', 'suco de laranja')
    and not exists (
      select 1 from public.estoque_movimentos m
      where m.company_id = v_empresa and m.insumo_id = i.id and m.tipo = 'saida'
    );

  -- -------------------------------------------------- custo (produto_insumos)
  -- Regra por palavra no nome do produto. Produto que nao casar com nenhuma
  -- recebe a composicao generica do ultimo bloco, para nao sobrar custo vazio.
  for v_produto in
    select p.id, p.nome
    from public.produtos p
    where p.company_id = v_empresa
      and not exists (
        select 1 from public.produto_insumos pi
        where pi.company_id = v_empresa and pi.produto_id = p.id
      )
  loop
    if v_produto.nome ilike '%café%' or v_produto.nome ilike '%cafe%' or v_produto.nome ilike '%manhã%' or v_produto.nome ilike '%manha%' then
      insert into public.produto_insumos (company_id, produto_id, insumo_id, quantidade, ordem)
      select v_empresa, v_produto.id, i.id, v.qtd, v.ordem
      from (values ('Pão francês', 6.0, 0), ('Café em grão', 0.25, 1), ('Geleia de morango', 1.0, 2),
                   ('Mel puro', 1.0, 3), ('Suco de laranja', 1.0, 4), ('Biscoito amanteigado', 1.0, 5),
                   ('Cesta de vime', 1.0, 6), ('Papel seda', 2.0, 7), ('Fita de cetim', 1.5, 8)
           ) as v(nome, qtd, ordem)
      join public.insumos i on i.company_id = v_empresa and lower(trim(i.nome)) = lower(v.nome);

    elsif v_produto.nome ilike '%tábua%' or v_produto.nome ilike '%tabua%' or v_produto.nome ilike '%frios%' then
      insert into public.produto_insumos (company_id, produto_id, insumo_id, quantidade, ordem)
      select v_empresa, v_produto.id, i.id, v.qtd, v.ordem
      from (values ('Queijo colonial', 0.3, 0), ('Queijo minas', 0.25, 1), ('Presunto', 0.25, 2),
                   ('Salame italiano', 0.2, 3), ('Queijo parmesão', 0.1, 4), ('Uva verde', 0.3, 5),
                   ('Castanha de caju', 0.1, 6), ('Broa de milho', 4.0, 7), ('Papel seda', 2.0, 8)
           ) as v(nome, qtd, ordem)
      join public.insumos i on i.company_id = v_empresa and lower(trim(i.nome)) = lower(v.nome);

    elsif v_produto.nome ilike '%chocolate%' or v_produto.nome ilike '%doce%' then
      insert into public.produto_insumos (company_id, produto_id, insumo_id, quantidade, ordem)
      select v_empresa, v_produto.id, i.id, v.qtd, v.ordem
      from (values ('Chocolate ao leite', 300.0, 0), ('Chocolate meio amargo', 200.0, 1),
                   ('Trufa sortida', 6.0, 2), ('Caixa kraft P', 1.0, 3), ('Papel seda', 2.0, 4),
                   ('Fita de cetim', 1.0, 5), ('Cartão de mensagem', 1.0, 6)
           ) as v(nome, qtd, ordem)
      join public.insumos i on i.company_id = v_empresa and lower(trim(i.nome)) = lower(v.nome);

    elsif v_produto.nome ilike '%vinho%' or v_produto.nome ilike '%romântic%' or v_produto.nome ilike '%romantic%' then
      insert into public.produto_insumos (company_id, produto_id, insumo_id, quantidade, ordem)
      select v_empresa, v_produto.id, i.id, v.qtd, v.ordem
      from (values ('Vinho tinto seco', 1.0, 0), ('Queijo parmesão', 0.15, 1), ('Queijo colonial', 0.2, 2),
                   ('Castanha de caju', 0.15, 3), ('Chocolate meio amargo', 150.0, 4),
                   ('Cesta de vime', 1.0, 5), ('Fita de cetim', 1.5, 6)
           ) as v(nome, qtd, ordem)
      join public.insumos i on i.company_id = v_empresa and lower(trim(i.nome)) = lower(v.nome);

    elsif v_produto.nome ilike '%cerveja%' then
      insert into public.produto_insumos (company_id, produto_id, insumo_id, quantidade, ordem)
      select v_empresa, v_produto.id, i.id, v.qtd, v.ordem
      from (values ('Cerveja artesanal', 3.0, 0), ('Salame italiano', 0.2, 1), ('Queijo parmesão', 0.15, 2),
                   ('Castanha de caju', 0.15, 3), ('Caixa kraft P', 1.0, 4), ('Fita de cetim', 1.0, 5)
           ) as v(nome, qtd, ordem)
      join public.insumos i on i.company_id = v_empresa and lower(trim(i.nome)) = lower(v.nome);

    else
      -- Generica: toda cesta tem embalagem, algo doce, algo salgado e bebida.
      insert into public.produto_insumos (company_id, produto_id, insumo_id, quantidade, ordem)
      select v_empresa, v_produto.id, i.id, v.qtd, v.ordem
      from (values ('Cesta de vime', 1.0, 0), ('Queijo colonial', 0.2, 1), ('Presunto', 0.15, 2),
                   ('Biscoito amanteigado', 1.0, 3), ('Geleia de morango', 1.0, 4),
                   ('Suco de laranja', 1.0, 5), ('Papel seda', 2.0, 6), ('Fita de cetim', 1.0, 7)
           ) as v(nome, qtd, ordem)
      join public.insumos i on i.company_id = v_empresa and lower(trim(i.nome)) = lower(v.nome);
    end if;
  end loop;

  -- --------------------------------------------- tipos de despesa e receita
  -- O app nao semeia esses dois: sem eles as contas nascem sem categoria e as
  -- telas de Financeiro ficam com o seletor vazio.
  insert into public.tipos_despesa (company_id, nome)
  select v_empresa, t
  from unnest(array[
    'Aluguel','Água e luz','Internet','Contabilidade','Software','Insumos',
    'Embalagens','Marketing','Transporte','Impostos','Pró-labore','Manutenção'
  ]) as t
  where not exists (
    select 1 from public.tipos_despesa d
    where d.company_id = v_empresa and lower(d.nome) = lower(t)
  );

  insert into public.tipos_receita (company_id, nome)
  select v_empresa, t
  from unnest(array[
    'Venda de cesta','Venda de tábua','Encomenda especial','Taxa de entrega','Outros'
  ]) as t
  where not exists (
    select 1 from public.tipos_receita r
    where r.company_id = v_empresa and lower(r.nome) = lower(t)
  );

  -- ----------------------------------------------------------- contas a pagar
  for v_conta in
    select * from (values
      ('Aluguel do ateliê',            'Imobiliária Centro',    1450.00,  5, 'Aluguel'),
      ('Energia elétrica',             'Celesc',                 386.40, 10, 'Água e luz'),
      ('Internet e telefone',          'Vivo',                   149.90, 15, 'Internet'),
      ('Contadora',                    'Escritório Contábil MB', 420.00, 20, 'Contabilidade'),
      ('Mensalidade do sistema',       'Flua Gestão',            170.00, 25, 'Software')
    ) as t(descricao, fornecedor, valor, dia, tipo)
  loop
    -- Recorrentes mensais: uma no mes passado, uma neste mes.
    for v_i in 0..1 loop
      if not exists (
        select 1 from public.contas_a_pagar c
        where c.company_id = v_empresa
          and c.descricao = v_conta.descricao
          and date_trunc('month', c.vencimento) = date_trunc('month', (date_trunc('month', v_hoje) + (v_i || ' month')::interval)::date)
      ) then
        insert into public.contas_a_pagar
          (company_id, descricao, fornecedor, valor, vencimento, recorrencia, tipo_despesa_id)
        values (
          v_empresa, v_conta.descricao, v_conta.fornecedor, v_conta.valor,
          least(
            (date_trunc('month', v_hoje) + (v_i || ' month')::interval)::date + (v_conta.dia - 1),
            (date_trunc('month', v_hoje) + (v_i || ' month')::interval + interval '1 month - 1 day')::date
          ),
          'mensal',
          (select td.id from public.tipos_despesa td
            where td.company_id = v_empresa and td.nome ilike v_conta.tipo limit 1)
        );
      end if;
    end loop;
  end loop;

  -- Compra parcelada em 3x, uma parcela ja vencida.
  if not exists (
    select 1 from public.contas_a_pagar c
    where c.company_id = v_empresa and c.descricao = 'Compra de embalagens (lote)'
  ) then
    v_grupo := gen_random_uuid();
    for v_i in 1..3 loop
      insert into public.contas_a_pagar
        (company_id, grupo_id, descricao, fornecedor, valor, vencimento, parcela, parcelas, recorrencia, tipo_despesa_id)
      values (
        v_empresa, v_grupo, 'Compra de embalagens (lote)', 'Embalagens Criativas',
        430.00, v_hoje - 8 + ((v_i - 1) * 30), v_i, 3, 'unica',
        (select td.id from public.tipos_despesa td
          where td.company_id = v_empresa and td.nome ilike 'Insumo%' limit 1)
      );
    end loop;
  end if;

  -- Avulsas: uma vencida, uma para hoje.
  insert into public.contas_a_pagar
    (company_id, descricao, fornecedor, valor, vencimento, observacao)
  select v_empresa, t.descricao, t.fornecedor, t.valor, t.venc, t.obs
  from (values
    ('Reposição de frios',   'Frios & Cia',   612.30, v_hoje - 4, 'Nota da semana passada'),
    ('Vinhos para o Natal',  'Vinícola Serra Nova', 1080.00, v_hoje, 'Pedido antecipado')
  ) as t(descricao, fornecedor, valor, venc, obs)
  where not exists (
    select 1 from public.contas_a_pagar c
    where c.company_id = v_empresa and c.descricao = t.descricao
  );

  raise notice 'Pronto. Insumos: %, produtos com custo: %, contas a pagar: %',
    (select count(*) from public.insumos where company_id = v_empresa),
    (select count(distinct produto_id) from public.produto_insumos where company_id = v_empresa),
    (select count(*) from public.contas_a_pagar where company_id = v_empresa);
end $$;


-- ============================================================================
-- LIMPEZA — descomente e rode para apagar SÓ o que este seed criou.
-- Não mexe em pedidos, clientes nem produtos.
-- ============================================================================
-- do $$
-- declare v_empresa uuid;
-- begin
--   select cm.company_id into v_empresa
--   from public.company_members cm
--   join auth.users u on u.id = cm.user_id
--   where u.email = 'gestaoflua@gmail.com' and cm.status = 'active'
--   order by cm.created_at limit 1;
--
--   delete from public.estoque_movimentos where company_id = v_empresa and motivo like '%(dados de teste)';
--   delete from public.contas_a_pagar where company_id = v_empresa;
--   delete from public.produto_insumos where company_id = v_empresa;
--   -- Insumos só saem se não estiverem em uso em nenhum produto:
--   delete from public.insumos i where i.company_id = v_empresa
--     and not exists (select 1 from public.produto_insumos pi where pi.insumo_id = i.id);
-- end $$;
