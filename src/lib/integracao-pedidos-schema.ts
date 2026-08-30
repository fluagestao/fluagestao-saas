import { z } from "zod";

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export const itemPedidoIntegracaoSchema = z.object({
  slug: z.string().trim().min(1).max(120).nullable().optional(),
  nome: z.string().trim().min(1).max(160),
  preco: z.number().finite().nonnegative().max(100_000),
  qtd: z.number().int().min(1).max(99),
  variacao: z.string().trim().max(80).nullable().optional(),
});

export const pedidoIntegracaoSchema = z.object({
  external_id: z.string().trim().min(8).max(160),
  cliente_nome: z.string().trim().min(2).max(80),
  cliente_whatsapp: z.string().trim().min(8).max(24),
  data_entrega: z.string().regex(DATA_ISO).nullable().optional(),
  prazo_opcao: z.enum(["hoje", "amanha", "data"]).nullable().optional(),
  tipo: z.enum(["entrega", "retirada"]).nullable().optional(),
  taxa_entrega: z.number().finite().min(0).max(10_000).nullable().optional(),
  endereco: z.string().max(200).nullable().optional(),
  bairro: z.string().max(80).nullable().optional(),
  cep: z.string().max(12).nullable().optional(),
  referencia: z.string().max(160).nullable().optional(),
  destinatario_nome: z.string().max(120).nullable().optional(),
  destinatario_whatsapp: z.string().max(24).nullable().optional(),
  janela_entrega: z.string().max(60).nullable().optional(),
  forma_pagamento: z.string().max(40).nullable().optional(),
  observacao: z.string().max(1000).nullable().optional(),
  cartao_de: z.string().max(120).nullable().optional(),
  cartao_para: z.string().max(120).nullable().optional(),
  cartao_mensagem: z.string().max(600).nullable().optional()
    .refine(v => !v || v.split("\n").length <= 5, "O cartão aceita até 5 linhas."),
  itens: z.array(itemPedidoIntegracaoSchema).min(1).max(40),
}).strict().refine(v => v.tipo !== "retirada" || !v.taxa_entrega, {
  message: "Retirada não pode ter taxa de entrega.", path: ["taxa_entrega"],
});

export const resultadoIntegracaoSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    id: z.string().uuid(),
    numero: z.number().int().positive(),
    duplicado: z.boolean(),
  }),
  z.object({
    ok: z.literal(false),
    status: z.union([z.literal(400), z.literal(401), z.literal(429)]),
    code: z.enum(["invalid_payload", "invalid_token", "rate_limited"]),
  }),
]);

export type PedidoIntegracaoPayload = z.infer<typeof pedidoIntegracaoSchema>;
