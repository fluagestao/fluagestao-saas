-- ============================================================================
-- Ocasião do pedido: por que a pessoa está comprando.
--
-- Hoje dá para saber QUEM comprou, PARA QUEM (destinatario_nome, cartao_para) e
-- O QUÊ (itens). Falta o porquê — e é ele que permite a pergunta que vende:
-- "ano passado você mandou uma tábua pro seu pai no Dia dos Pais; quer repetir?"
--
-- POR QUE UMA COLUNA E NÃO INFERIR PELA DATA
--
-- Filtrar por "quem comprou na mesma janela do ano passado" parece resolver e
-- erra de três jeitos:
--   1. As datas andam. Dia das Mães é o 2o domingo de maio (11/05 em 2025,
--      10/05 em 2026) e a Páscoa varre um mês inteiro. Janela fixa desalinha.
--   2. A janela mistura intenções: quem comprou aniversário em 08/05 entra na
--      lista de Dia das Mães; quem se antecipou em 25/04 fica de fora.
--   3. Quem sabe a intenção é a cesteira, no momento da venda, conversando com
--      a cliente. Gravar isso é verdade; deduzir da data é estatística.
--
-- O QUE VAI GRAVADO: UM SLUG, NÃO O NOME NA TELA
--
-- `ocasiao` guarda uma chave estável em minúsculas com hífen — "dia-das-maes",
-- "natal", "aniversario". O nome exibido sai de src/lib/datas-comemorativas.ts.
-- Se amanhã o rótulo mudar de "Dia do Irmão" para "Dia dos Irmãos", os pedidos
-- antigos continuam casando; se guardássemos o texto da tela, um ajuste de
-- redação partiria o histórico ao meio, calado.
--
-- Sem check constraint com a lista de propósito: o vocabulário vive no
-- TypeScript, que já se atualiza sozinho a cada ano. Repetir a lista aqui
-- criaria duas fontes de verdade, e a do banco seria a que ninguém lembraria
-- de atualizar.
--
-- POR QUE DUAS COLUNAS
--
-- `ocasiao_confirmada` separa o que uma pessoa viu do que o sistema chutou:
--   ocasiao nula            -> ninguém disse nada
--   ocasiao + false         -> preenchido pelo preenchimento retroativo, a
--                              partir da proximidade com uma data comemorativa;
--                              NINGUÉM olhou
--   ocasiao + true          -> apareceu na tela e a pessoa deixou ficar ou
--                              escolheu
--
-- Sem essa distinção o palpite vira verdade no dia seguinte, e a lista de "quem
-- comprou no Natal passado" passa a conter gente que comprou em dezembro por
-- outro motivo — sem nenhum jeito de saber quais.
--
-- O PREENCHIMENTO RETROATIVO NÃO ESTÁ AQUI, DE PROPÓSITO
--
-- Ele depende do cálculo de Páscoa e de "2o domingo de maio", que já existe em
-- datas-comemorativas.ts. Reescrever isso em PL/pgSQL criaria uma segunda
-- implementação para divergir da primeira. Fica como ação no app, opcional e
-- revisável, gravando ocasiao_confirmada = false.
--
-- Aditiva e idempotente: só acrescenta colunas e índice. Nenhuma linha
-- existente é alterada; todas nascem com ocasiao nula, que significa
-- "ninguém disse".
-- ============================================================================

begin;

alter table public.pedidos
  add column if not exists ocasiao text
    check (
      ocasiao is null
      or (
        ocasiao ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
        and char_length(ocasiao) between 2 and 40
      )
    );

alter table public.pedidos
  add column if not exists ocasiao_confirmada boolean not null default false;

comment on column public.pedidos.ocasiao is
  'Por que a pessoa comprou, como slug estavel (dia-das-maes, natal, aniversario). Nulo = ninguem disse. O rotulo exibido vem de src/lib/datas-comemorativas.ts.';

comment on column public.pedidos.ocasiao_confirmada is
  'False = palpite do preenchimento retroativo, ninguem olhou. True = apareceu na tela e a pessoa deixou ficar ou escolheu.';

/* A consulta da aba "Por ocasião" é: desta empresa, com esta ocasião, no ano
   tal. Índice parcial porque só as linhas COM ocasião interessam — e no começo
   elas são a minoria, então o índice nasce pequeno e cresce com o uso. */
create index if not exists pedidos_ocasiao_idx
  on public.pedidos (company_id, ocasiao, data_entrega desc)
  where ocasiao is not null;

commit;

-- ============================================================================
-- DEPOIS DE RODAR
--
-- Esta migration sozinha não muda nada na tela: as colunas nascem nulas/false e
-- nenhum código as lê ainda. Me avise que rodou e eu subo, em ordem:
--
--   1. os chips de ocasião no PedidoDialog, com sugestão automática pela data
--      de entrega (entrega em 10/05 já vem com "Dia das Mães" marcado) —
--      opcional e de um toque, porque campo obrigatório ali é atrito na hora em
--      que ela está no telefone com a cliente;
--   2. a aba "Por ocasião" no Relacionamento: escolhe a ocasião, escolhe o ano,
--      vê quem comprou, chama;
--   3. o preenchimento retroativo, como botão que mostra o que vai marcar antes
--      de gravar.
--
-- Nessa ordem, nunca ao contrário: ler coluna que não existe devolve 400 no
-- PostgREST e a tela estoura ao abrir — foi o que aconteceu com o Simulador.
--
-- PARA CONFERIR QUE ENTROU:
--
--   select column_name, data_type, column_default
--     from information_schema.columns
--    where table_schema = 'public' and table_name = 'pedidos'
--      and column_name in ('ocasiao', 'ocasiao_confirmada');
--
-- DIAGNÓSTICO — quanto histórico o preenchimento retroativo teria para marcar:
--
--   select to_char(data_entrega, 'MM') as mes, count(*) as entregas
--     from public.pedidos
--    where company_id = 'COLE_AQUI' and data_entrega is not null
--    group by 1 order by 1;
--
-- Meses com pico perto de maio, agosto e dezembro são exatamente os que o
-- palpite vai conseguir marcar com alguma confiança.
-- ============================================================================
