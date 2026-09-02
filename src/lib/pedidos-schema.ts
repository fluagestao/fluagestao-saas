// Validação dos pedidos, compartilhada entre a rota pública do site e as
// serverFns do admin — uma definição só, sem risco das duas divergirem.
import { z } from "zod";

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** O cartão é impresso num cartão físico — mais que isso não cabe. */
export const MAX_LINHAS_CARTAO = 5;

/** Item já resolvido (com nome e preço). Usado no lançamento manual do admin. */
export const itemPedidoSchema = z.object({
  slug: z.string().max(120).nullable().optional(),
  nome: z.string().min(1).max(160),
  preco: z.number().nonnegative().max(100_000).nullable(),
  qtd: z.number().int().min(1).max(99),
  variacao: z.string().max(80).nullable().optional(),
  /**
   * Item montado na hora (fora do catálogo): guarda a composição e o custo do
   * momento. Sem isso o pedido personalizado entraria sem custo, e a margem
   * dele ficaria invisível para sempre — os insumos mudam de preço.
   */
  custo: z.number().nonnegative().max(100_000).nullable().optional(),
  insumos: z
    .array(
      z.object({
        nome: z.string().min(1).max(160),
        quantidade: z.number().positive().max(10_000),
        custo: z.number().nonnegative().max(100_000),
      }),
    )
    .max(60)
    .optional(),
});

/**
 * Pedido vindo do site. O cliente manda apenas slug/variação/quantidade — nome
 * e preço são resolvidos no servidor a partir do catálogo, porque o carrinho
 * mora no localStorage e é editável por quem quiser.
 *
 * Os tetos (40 itens, qtd ≤ 99) são a primeira barreira de abuso, antes de
 * qualquer ida ao banco.
 */
export const pedidoSiteSchema = z.object({
  nome: z.string().trim().min(2).max(80),
  celular: z.string().trim().min(8).max(24),
  prazo_opcao: z.enum(["hoje", "amanha", "data"]),
  prazo_data: z.string().regex(DATA_ISO).nullable().optional(),
  itens: z
    .array(
      z.object({
        slug: z.string().min(1).max(120),
        variacao: z.string().max(80).nullable().optional(),
        qtd: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(40),
});
export type PedidoSitePayload = z.infer<typeof pedidoSiteSchema>;

/** Pedido lançado/editado à mão no admin. Aqui os preços são confiáveis. */
export const pedidoManualSchema = z.object({
  id: z.string().uuid().optional(),
  cliente_nome: z.string().trim().max(80).nullable(),
  cliente_whatsapp: z.string().trim().max(24).nullable(),
  cliente_id: z.string().uuid().nullable().default(null),
  itens: z.array(itemPedidoSchema).max(60),
  taxa_entrega: z.number().nonnegative().max(10_000).nullable(),
  /** Bairro do cadastro; quando presente, é ele que define a taxa no servidor. */
  bairro_id: z.string().uuid().nullable().default(null),
  /** Ligado só quando a pessoa assume a taxa à mão, ignorando o cadastro. */
  taxa_manual: z.boolean().default(false),
  tipo: z.enum(["entrega", "retirada"]).nullable(),
  endereco: z.string().max(200).nullable(),
  bairro: z.string().max(80).nullable(),
  destinatario_nome: z.string().max(120).nullable().default(null),
  destinatario_whatsapp: z.string().max(24).nullable().default(null),
  data_entrega: z.string().regex(DATA_ISO).nullable(),
  janela_entrega: z.string().max(60).nullable(),
  forma_pagamento: z.string().max(40).nullable(),
  status: z.enum(["novo", "producao", "pronto", "entregue", "cancelado"]),
  observacao: z.string().max(1000).nullable(),
  cep: z.string().max(12).nullable(),
  referencia: z.string().max(160).nullable(),
  recebido_em: z.string().regex(DATA_ISO).nullable().default(null),
  cartao_habilitado: z.boolean().default(false),
  cartao_de: z.string().max(120).nullable(),
  cartao_para: z.string().max(120).nullable(),
  // O cartão é impresso e vai dentro da caixa: cabem 5 linhas.
  cartao_mensagem: z
    .string()
    .max(600)
    .nullable()
    .refine((v) => !v || v.split("\n").length <= MAX_LINHAS_CARTAO, {
      message: `A mensagem do cartão cabe em até ${MAX_LINHAS_CARTAO} linhas.`,
    }),
});
export type PedidoManualInput = z.infer<typeof pedidoManualSchema>;

export const filtroPedidosSchema = z.object({
  /* "nao_entregue" agrupa novo + producao + pronto: e a fila de trabalho do
     dia, o filtro que a tela de Pedidos abre por padrao. Precisa existir AQUI
     tambem — a tela manda esse valor para o servidor, e um enum que nao o
     conhece derruba o carregamento inteiro. */
  status: z
    .enum(["todos", "nao_entregue", "novo", "producao", "pronto", "entregue", "cancelado"])
    .default("todos"),
  busca: z.string().max(80).optional(),
  limite: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).default(0),
});
export type FiltroPedidos = z.infer<typeof filtroPedidosSchema>;
