"use client";

import { useEffect, useState } from "react";

import type { ComposicoesDaFicha, EmpresaFichaPedido } from "@/lib/ficha-pedido";
import { listarComposicoesPorSlug } from "@/lib/insumos";
import { createClient } from "@/lib/supabase/client";

export type DadosDaFicha = {
  empresa: EmpresaFichaPedido | null;
  composicoes: ComposicoesDaFicha;
};

const VAZIO: DadosDaFicha = { empresa: null, composicoes: {} };

/* Uma busca por aba, não uma por card.
   A lista de pedidos monta dezenas de PedidoCard, e cada um pode imprimir uma
   ficha. Sem esta promessa guardada no módulo, cada card dispararia a sua
   própria consulta ao montar. Como todos precisam exatamente do mesmo dado —
   a empresa e a composição dos produtos —, a primeira chamada busca e as
   outras esperam a mesma resposta. */
let cache: Promise<DadosDaFicha> | null = null;

async function buscar(): Promise<DadosDaFicha> {
  const supabase = createClient();

  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return VAZIO;

  const { data: membro } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membro?.company_id) return VAZIO;

  const [empresaRes, composicoes] = await Promise.all([
    supabase
      .from("companies")
      .select("name, logo_url, street, address_number, district, city, state")
      .eq("id", membro.company_id)
      .maybeSingle(),
    /* Falha aqui devolve {} pela própria ação: ficha sem lista de montagem
       ainda é uma ficha útil, e é melhor imprimir sem ela do que não imprimir. */
    listarComposicoesPorSlug().catch(() => ({}) as ComposicoesDaFicha),
  ]);

  const e = empresaRes.data;
  if (!e) return { empresa: null, composicoes };

  const rua = [e.street, e.address_number].filter(Boolean).join(", ");
  const cidade = [e.city, e.state].filter(Boolean).join("/");

  return {
    empresa: {
      nome: String(e.name ?? "").trim() || "Sua empresa",
      logoUrl: (e.logo_url as string | null) ?? null,
      endereco: [rua, e.district].filter(Boolean).join(" — ") || null,
      cidadeUf: cidade || null,
    },
    composicoes,
  };
}

/**
 * Empresa e composições prontas para a ficha.
 *
 * Carrega ANTES do clique de propósito: a ficha é escrita dentro do gesto da
 * pessoa, sem poder esperar consulta. Enquanto não chega, a impressão continua
 * funcionando com o que já existe — só sai sem a logo e sem a montagem.
 */
export function useDadosDaFicha(): DadosDaFicha {
  const [dados, setDados] = useState<DadosDaFicha>(VAZIO);

  useEffect(() => {
    let vivo = true;
    cache ??= buscar().catch(() => {
      // Não guarda a falha: a próxima montagem tenta de novo.
      cache = null;
      return VAZIO;
    });
    cache.then((d) => {
      if (vivo) setDados(d);
    });
    return () => {
      vivo = false;
    };
  }, []);

  return dados;
}
