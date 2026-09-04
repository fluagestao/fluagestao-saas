-- ============================================================================
-- Meta de faturamento, ao lado da meta de cestas.
--
-- POR QUE AS DUAS, E POR QUE UMA NÃO SAI DA OUTRA
--
-- Dá para calcular faturamento = cestas × ticket médio, e seria tentador
-- derivar. Não deriva de propósito: são decisões diferentes.
--
-- A meta de CESTAS mede trabalho — quantas saíram da cozinha. Ela não se
-- cumpre sozinha numa remarcação de preço.
-- A meta de FATURAMENTO mede dinheiro, e pode ser batida vendendo menos cestas
-- mais caras. Às vezes é exatamente esse o plano.
--
-- Amarrar as duas pelo ticket médio faria o sistema decidir por ela: subiu o
-- preço, a meta de cestas cairia sozinha sem ninguém ter escolhido isso. Quem
-- decide é a cesteira, e ela pode definir uma, outra, ou as duas.
--
-- O QUE MUDA
--
-- 1. `meta_faturamento` entra, anulável desde o começo.
-- 2. `meta_cestas` DEIXA de ser obrigatória. Sem isso, uma meta só de dinheiro
--    seria impossível de gravar — a coluna exigiria um número de cestas que
--    ninguém escolheu, e qualquer valor inventado ali viraria uma meta falsa
--    aparecendo no gráfico.
-- 3. Uma constraint garante que a linha tem PELO MENOS uma das duas. Linha com
--    as duas nulas não é meta nenhuma: quem desistiu apaga a linha, e é assim
--    que o app já trata o campo em branco.
--
-- O check de faixa acompanha o de cestas: mínimo acima de zero (meta zero não
-- existe) e um teto, porque o resto do sistema tem teto — sem ele um valor
-- digitado errado no celular commita e o gráfico passa a exibir bilhões.
--
-- Aditiva e reversível: só acrescenta coluna e afrouxa uma obrigatoriedade.
-- Nenhuma linha existente é alterada, e todas continuam válidas (as que há têm
-- meta_cestas preenchida, então passam na constraint nova).
-- ============================================================================

begin;

alter table public.metas_mensais
  add column if not exists meta_faturamento numeric(12, 2)
    check (meta_faturamento is null or (meta_faturamento > 0 and meta_faturamento <= 100000000));

comment on column public.metas_mensais.meta_faturamento is
  'Meta de faturamento do mes, em reais. Independente de meta_cestas: uma nao e derivada da outra. Nulo = sem meta de dinheiro neste mes.';

/* meta_cestas deixa de ser obrigatoria. A checagem de faixa continua valendo
   quando ela existe — o `check (meta_cestas between 1 and 100000)` original
   aceita nulo sozinho, porque em SQL uma comparacao com NULL da UNKNOWN e o
   check so reprova o que da FALSE. */
alter table public.metas_mensais
  alter column meta_cestas drop not null;

comment on column public.metas_mensais.meta_cestas is
  'Meta de cestas do mes, em unidades. Conta o mesmo que o cartao Cestas entregues: adicionais ficam de fora. Nulo = sem meta de unidades neste mes.';

/* Pelo menos uma das duas. Linha com as duas nulas nao e meta: e uma linha
   morta que apareceria na consulta e nao diria nada. O app apaga a linha
   quando os dois campos ficam em branco; esta constraint garante que nenhum
   outro caminho consiga criar o estado sem sentido. */
alter table public.metas_mensais
  drop constraint if exists metas_mensais_tem_alguma_meta;

alter table public.metas_mensais
  add constraint metas_mensais_tem_alguma_meta
    check (meta_cestas is not null or meta_faturamento is not null);

commit;

-- ============================================================================
-- DEPOIS DE RODAR
--
-- Me avise que rodou e eu subo o resto: o diálogo das metas ganha uma segunda
-- coluna de entrada por mês, e o cartão do Dashboard passa a mostrar as duas
-- barras de progresso — cestas e faturamento, cada uma com o seu número.
--
-- Nesta ordem, nunca ao contrário: ler uma coluna que não existe devolve 400 no
-- PostgREST e a tela estoura ao abrir.
--
-- PARA CONFERIR QUE ENTROU:
--
--   select column_name, is_nullable, data_type
--     from information_schema.columns
--    where table_schema = 'public' and table_name = 'metas_mensais'
--      and column_name in ('meta_cestas', 'meta_faturamento');
--
-- Espere ver meta_cestas com is_nullable = YES e meta_faturamento presente.
-- ============================================================================
