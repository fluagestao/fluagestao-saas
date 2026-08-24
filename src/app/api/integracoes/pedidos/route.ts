import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  pedidoIntegracaoSchema,
  resultadoIntegracaoSchema,
} from "@/lib/integracao-pedidos-schema";

const MAX_BODY_BYTES = 128 * 1024;
const TOKEN = /^[A-Za-z0-9_-]{32,128}$/;

const mensagens = {
  invalid_payload: "Pedido invalido.",
  invalid_token: "Credencial invalida.",
  rate_limited: "Muitos pedidos em pouco tempo. Tente novamente em alguns minutos.",
} as const;

function resposta(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim() ?? "";

  if (!TOKEN.test(token)) {
    return resposta({ ok: false, erro: mensagens.invalid_token }, 401);
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return resposta({ ok: false, erro: mensagens.invalid_payload }, 400);
  }

  let payload: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
      return resposta({ ok: false, erro: mensagens.invalid_payload }, 400);
    }
    payload = JSON.parse(raw);
  } catch {
    return resposta({ ok: false, erro: mensagens.invalid_payload }, 400);
  }

  const validado = pedidoIntegracaoSchema.safeParse(payload);
  if (!validado.success) {
    return resposta({ ok: false, erro: mensagens.invalid_payload }, 400);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
  const { data, error } = await supabase.rpc("integrar_pedido_site", {
    p_token: token,
    p_payload: validado.data,
  });

  if (error) {
    console.error("Falha ao integrar pedido do site", {
      code: error.code,
      message: error.message,
    });
    return resposta({ ok: false, erro: "Nao foi possivel receber o pedido." }, 500);
  }

  const resultado = resultadoIntegracaoSchema.safeParse(data);
  if (!resultado.success) {
    console.error("Resposta inesperada da integracao de pedidos");
    return resposta({ ok: false, erro: "Nao foi possivel receber o pedido." }, 500);
  }

  if (!resultado.data.ok) {
    return resposta(
      { ok: false, erro: mensagens[resultado.data.code] },
      resultado.data.status,
    );
  }

  return resposta(
    {
      ok: true,
      pedido_id: resultado.data.id,
      numero: resultado.data.numero,
      duplicado: resultado.data.duplicado,
    },
    resultado.data.duplicado ? 200 : 201,
  );
}
