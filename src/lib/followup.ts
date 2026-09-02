"use server";

import { z } from "zod";

import { requireCompany } from "@/lib/company-context.server";
import {
  AJUSTES_FOLLOWUP_PADRAO,
  type AjustesFollowup,
} from "@/lib/followup-mensagens";
import type { PedidoFollowup } from "@/lib/followup-ops.server";
import { hojeISO, somarDias } from "@/lib/prazo";

/**
 * Janela do follow-up. Pedir avaliação de uma entrega de três meses atrás
 * constrange mais do que ajuda — depois de 60 dias o pedido sai da lista.
 */
const DIAS_JANELA = 60;

/** Só os dígitos: o mesmo cliente aparece como "(48) 9..." e "4899...". */
function digitos(valor: string | null | undefined): string {
  return (valor ?? "").replace(/\D/g, "");
}

/**
 * Entregas recentes com o estado do convite de avaliação.
 *
 * O histórico vem numa segunda consulta, só com o telefone, porque "2ª compra"
 * precisa contar a vida toda do cliente — não apenas o que cabe na janela.
 */
export async function carregarFollowup() {
  const { supabase, companyId } = await requireCompany();
  const desde = somarDias(hojeISO(), -DIAS_JANELA);

  const [entregasRes, historicoRes] = await Promise.all([
    supabase
      .from("pedidos")
      .select(
        "id, numero, cliente_nome, cliente_whatsapp, itens, total, data_entrega, created_at, avaliacao_pedida_em",
      )
      .eq("company_id", companyId)
      .eq("status", "entregue")
      .or(`data_entrega.gte.${desde},and(data_entrega.is.null,created_at.gte.${desde})`)
      .order("data_entrega", { ascending: false, nullsFirst: false })
      .limit(300),
    supabase
      .from("pedidos")
      .select("cliente_whatsapp")
      .eq("company_id", companyId)
      .eq("status", "entregue")
      .limit(5000),
  ]);

  if (entregasRes.error) throw entregasRes.error;
  if (historicoRes.error) throw historicoRes.error;

  const comprasPorCliente = new Map<string, number>();
  for (const linha of historicoRes.data ?? []) {
    const chave = digitos(linha.cliente_whatsapp as string | null);
    if (!chave) continue;
    comprasPorCliente.set(chave, (comprasPorCliente.get(chave) ?? 0) + 1);
  }

  const pedidos: PedidoFollowup[] = (entregasRes.data ?? []).map((linha) => {
    const row = linha as Record<string, unknown>;
    const itens = Array.isArray(row.itens)
      ? (row.itens as PedidoFollowup["itens"])
      : [];

    return {
      id: String(row.id),
      numero: Number(row.numero ?? 0),
      cliente_nome: (row.cliente_nome as string | null) ?? null,
      cliente_whatsapp: (row.cliente_whatsapp as string | null) ?? null,
      // PostgREST devolve numeric como string: sem o Number o total concatena.
      itens: itens.map((item) => ({ ...item, qtd: Number(item.qtd ?? 0) })),
      total: Number(row.total ?? 0),
      data_entrega: (row.data_entrega as string | null) ?? null,
      created_at: (row.created_at as string | null) ?? null,
      avaliacao_pedida_em: (row.avaliacao_pedida_em as string | null) ?? null,
      compras: comprasPorCliente.get(digitos(row.cliente_whatsapp as string | null)) ?? 1,
    };
  });

  return { pedidos };
}

/** Liga/desliga a marca de "já convidei essa pessoa a avaliar". */
export async function marcarAvaliacaoPedida(input: { data: unknown }) {
  const { id, pedida } = z
    .object({ id: z.string().uuid(), pedida: z.boolean() })
    .parse(input.data);

  const { supabase, companyId } = await requireCompany();

  const { error } = await supabase
    .from("pedidos")
    .update({ avaliacao_pedida_em: pedida ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) throw error;
  return { ok: true as const };
}

const ajustesSchema = z.object({
  presente: z.string().trim().min(1).max(2000),
  consumo_proprio: z.string().trim().min(1).max(2000),
  // Zero significa "no mesmo dia da entrega"; acima de 60 o pedido ja saiu da
  // janela do follow-up e o aviso nunca apareceria.
  dias_para_avaliacao: z.number().int().min(0).max(60),
});

export async function carregarAjustesFollowup(): Promise<AjustesFollowup> {
  const { supabase, companyId } = await requireCompany();
  const { data, error } = await supabase
    .from("followup_review_templates")
    .select("presente, consumo_proprio, dias_para_avaliacao")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return AJUSTES_FOLLOWUP_PADRAO;

  return ajustesSchema.parse(data);
}

export async function salvarAjustesFollowup(input: { data: unknown }) {
  const modelos = ajustesSchema.parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const { error } = await supabase
    .from("followup_review_templates")
    .upsert(
      {
        company_id: companyId,
        ...modelos,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id" },
    );

  if (error) throw error;
  return { ok: true as const };
}
