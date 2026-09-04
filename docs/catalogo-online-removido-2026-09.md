# A loja pública foi removida — o que existia e por quê saiu

**Data:** 4 de setembro de 2026
**Decisão do Lucas.** Não é abandono da ideia: catálogo online integrado
continua sendo o que o Flua vende. Só que **vai ser construído do zero**, e
por isso o que havia precisava sair.

## Por que existia código de loja aqui

O Flua nasceu da extração de outro projeto: um **site que já tinha o admin
embutido** — a barra, o login e o sistema por trás. Quando os arquivos foram
separados, veio junto a ligação entre as duas metades. O admin ficou de um
lado, os restos da vitrine do outro, amarrados por código que ninguém escreveu
pensando neste produto.

Manter isso era pior que não ter nada: quem fosse construir a integração de
verdade encontraria peças meio-ligadas, com nomes certos e comportamento
errado, e gastaria mais tempo entendendo o herdado do que escrevendo o novo.

## O que estava morto ANTES de eu remover

Estes não eram importados por ninguém fora do próprio grupo. Uma ilha:

    ProductCard      →  ninguém
    CartDrawer       →  ninguém
    CategoryBar      →  ninguém
    CategoryTabs     →  ninguém
    PriceTag         →  só o ProductCard (órfão)
    AddToCartButton  →  só CartDrawer e ProductCard
    CartButton       →  só os três acima

Mais: **o admin nunca linkou para a loja** (nenhum "ver meu catálogo" em lugar
nenhum), e **nada no repositório chamava a API de integração**.

## O que saiu

Arquivos apagados:

- `src/app/catalogo/[slug]/page.tsx` — a vitrine. Esta renderizava de verdade;
  não usava os componentes acima, tinha markup próprio.
- `src/app/api/integracoes/pedidos/route.ts` — porta HTTP com Bearer token para
  um site externo mandar pedido. Sem site, era só uma porta a mais.
- `src/lib/integracao-pedidos-schema.ts`
- `src/lib/cart.tsx`, `src/lib/catalog.ts`
- `src/components/{ProductCard,PriceTag,CartDrawer,CartButton,AddToCartButton,CategoryBar,CategoryTabs}.tsx`

Trechos removidos:

- `PedidoCard.tsx`: o fundo azulado e o selo "site" do pedido, e o botão
  "Chamar pra concluir" (era para carrinho abandonado).
- `vendas.ts`: `mensagemRetomada`, `linkRetomada` e a cópia local de
  `primeiroNome` que só elas usavam.
- `config.ts`: `mensagemOrcamento` — o "tenho interesse" da vitrine.

## O que ficou, e não é engano

- **`catalogos` no banco = Coleções do admin.** Nome parecido, coisa diferente:
  agrupa categorias (`categorias.catalogo_id`) e é usada em Cadastros →
  Coleções, no agrupamento de Custo e preços, nos filtros do Dashboard e no
  seletor de produto do pedido.
- **`produtos.slug`.** Nasceu para fazer URL de loja; hoje é identificador
  interno — o seletor "Adicionar produto cadastrado" acha o produto por ele
  (`PedidoDialog.tsx`), e a lista de Custo e preços usa como chave.
- **`formatPreco`** virou `formatBRL` (de `vendas.ts`). Eram idênticas.
- **Pedidos com `origem = "site"` já gravados.** O dado fica; só o selo saiu.
- **Fotos do produto.** Continuam no cadastro e na lista. A razão de existir
  era a vitrine, então hoje são fotos que só a cesteira vê — decisão dela
  depois, não um defeito.
- **O site institucional**, que anuncia catálogo online como funcionalidade.
  Isso é material de venda e a decisão é do Lucas, não do código.

## Nenhuma migration

Nada de schema mudou. Colunas que deixaram de ser lidas ficam quietas no banco:
migration não tem rollback fácil, e coluna sem leitor não custa nada.
