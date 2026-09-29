import { z } from "zod";

const texto = (max: number) => z.string().trim().max(max).nullish();
const pedidoSchema = z.object({
  external_id: z.string().trim().min(8).max(160),
  cliente_nome: z.string().trim().min(2).max(80),
  cliente_whatsapp: z.string().trim().min(8).max(24).refine(
    (value) => /^[0-9]{10,15}$/.test(value.replace(/\D/g, "")),
  ),
  data_entrega: z.iso.date().nullish(),
  prazo_opcao: z.enum(["hoje", "amanha", "data"]).nullish(),
  itens: z.array(z.object({
    slug: texto(120), nome: z.string().trim().min(1).max(160),
    preco: z.number().min(0).max(100000), qtd: z.number().int().min(1).max(99),
    variacao: texto(80),
  })).min(1).max(40),
  tipo: z.enum(["entrega", "retirada"]).nullish(),
  taxa_entrega: z.number().min(0).max(10000).nullish(),
  endereco: texto(200), bairro: texto(80), cep: texto(12), referencia: texto(160),
  destinatario_nome: texto(120), destinatario_whatsapp: texto(24),
  janela_entrega: texto(60), forma_pagamento: texto(40), observacao: texto(1000),
  cartao_de: texto(120), cartao_para: texto(120),
  cartao_mensagem: z.string().max(600).refine((v) => v.split("\n").length <= 5).nullish(),
}).refine((p) => p.tipo !== "retirada" || !p.taxa_entrega);

type Persistir = (token: string, payload: z.infer<typeof pedidoSchema>) => Promise<unknown>;
const MAX_BYTES = 64 * 1024;
const resultadoSchema = z.object({
  ok: z.boolean(), status: z.number().optional(), code: z.string().optional(),
  id: z.string().uuid().optional(), numero: z.number().optional(), duplicado: z.boolean().optional(),
});

function resposta(body: unknown, status: number) {
  return Response.json(body, { status, headers: {
    "Cache-Control": "no-store",
    ...(status === 429 ? { "Retry-After": "600" } : {}),
  } });
}

/** Token determina a empresa na RPC; cookies e company_id do remetente não são usados. */
export async function receberPedido(request: Request, persistir: Persistir): Promise<Response> {
  const token = /^Bearer ([A-Za-z0-9_-]{32,128})$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return resposta({ ok: false, code: "invalid_token" }, 401);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return resposta({ ok: false, code: "unsupported_media_type" }, 415);
  }
  if (Number(request.headers.get("content-length")) > MAX_BYTES) {
    return resposta({ ok: false, code: "payload_too_large" }, 413);
  }
  let raw: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return resposta({ ok: false, code: "invalid_payload" }, 400);
    const decoder = new TextDecoder();
    let size = 0;
    let body = "";
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > MAX_BYTES) {
          await reader.cancel();
          return resposta({ ok: false, code: "payload_too_large" }, 413);
        }
        body += decoder.decode(chunk.value, { stream: true });
      }
      body += decoder.decode();
    } finally { reader.releaseLock(); }
    raw = JSON.parse(body);
  } catch { return resposta({ ok: false, code: "invalid_payload" }, 400); }
  const payload = pedidoSchema.safeParse(raw);
  if (!payload.success) return resposta({ ok: false, code: "invalid_payload" }, 400);
  try {
    const parsed = resultadoSchema.safeParse(await persistir(token, payload.data));
    if (!parsed.success) return resposta({ ok: false, code: "integration_unavailable" }, 503);
    const result = parsed.data;
    if (!result.ok) {
      const status = result.status && [400, 401, 429].includes(result.status) ? result.status : 503;
      const code = status === 400 ? "invalid_payload" : status === 401 ? "invalid_token" : status === 429 ? "rate_limited" : "integration_unavailable";
      return resposta({ ok: false, code }, status);
    }
    if (!result.id || result.numero === undefined || result.duplicado === undefined) {
      return resposta({ ok: false, code: "integration_unavailable" }, 503);
    }
    return resposta({ ok: true, id: result.id, numero: result.numero, duplicado: result.duplicado }, result.duplicado ? 200 : 201);
  } catch { return resposta({ ok: false, code: "integration_unavailable" }, 503); }
}
