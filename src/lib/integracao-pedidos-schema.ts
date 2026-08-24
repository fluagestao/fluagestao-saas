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
  itens: z.array(itemPedidoIntegracaoSchema).min(1).max(40),
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
