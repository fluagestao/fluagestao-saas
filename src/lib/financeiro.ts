"use server";

import { z } from "zod";

import { requireCompany } from "@/lib/company-context.server";
import type { Movimento } from "@/lib/caixa";

const DATA = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function carregarMovimentos(input: { data: unknown }) {
  const { de, ate } = z.object({ de: DATA, ate: DATA }).parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const [movRes, pedRes, fornRes] = await Promise.all([
    supabase
      .from("movimentos")
      .select("id, pedido_id, tipo, data, valor, descricao, fornecedor")
      .eq("company_id", companyId)
      .gte("data", de)
      .lte("data", ate)
      .order("data", { ascending: false }),
    supabase
      .from("pedidos")
      .select("id, numero")
      .eq("company_id", companyId)
      .not("recebido_em", "is", null)
      .gte("recebido_em", de)
      .lte("recebido_em", ate),
    supabase
      .from("fornecedores")
      .select("nome")
      .eq("company_id", companyId)
      .eq("ativo", true)
      .order("nome"),
  ]);

  if (movRes.error) throw movRes.error;
  if (pedRes.error) throw pedRes.error;
  if (fornRes.error) throw fornRes.error;

  const numeroPorPedido = new Map(
    (pedRes.data ?? []).map((pedido) => [
      pedido.id,
      Number(pedido.numero ?? 0),
    ]),
  );

  const movimentos: Movimento[] = (movRes.data ?? []).map((m) => ({
    // Mantém entradas de pedido protegidas da edição/exclusão manual no painel.
    id: m.pedido_id ? `pedido:${m.pedido_id}` : m.id,
    tipo: m.tipo as "entrada" | "saida",
    data: m.data,
    valor: Number(m.valor ?? 0),
    descricao: m.descricao,
    fornecedor: m.fornecedor,
    pedido_numero: m.pedido_id
      ? (numeroPorPedido.get(m.pedido_id) ?? null)
      : null,
  }));

  const fornecedores = new Set<string>();

  for (const f of fornRes.data ?? []) {
    if (f.nome?.trim()) fornecedores.add(f.nome.trim());
  }

  // Só movimentos manuais alimentam a lista de fornecedores.
  // Em entradas de pedido, "fornecedor" guarda a forma de pagamento (Pix, cartão...).
  for (const m of movRes.data ?? []) {
    if (!m.pedido_id && m.fornecedor?.trim()) {
      fornecedores.add(m.fornecedor.trim());
    }
  }

  return {
    movimentos,
    fornecedores: [...fornecedores].sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    ),
  };
}

export async function salvarMovimento(input: { data: unknown }) {
  const data = z
    .object({
      id: z.string().uuid().optional(),
      tipo: z.enum(["entrada", "saida"]),
      data: DATA,
      valor: z.number().positive().max(1_000_000),
      descricao: z.string().trim().min(1).max(200),
      fornecedor: z.string().trim().max(120).nullable().default(null),
    })
    .parse(input.data);

  const { supabase, companyId } = await requireCompany();

  const row = {
    tipo: data.tipo,
    data: data.data,
    valor: data.valor,
    descricao: data.descricao,
    fornecedor: data.fornecedor,
  };

  if (data.id) {
    const { data: salvo, error } = await supabase
      .from("movimentos")
      .update(row)
      .eq("id", data.id)
      .eq("company_id", companyId)
      .is("pedido_id", null)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    return { id: salvo?.id ?? data.id };
  }

  const { data: salvo, error } = await supabase
    .from("movimentos")
    .insert({ company_id: companyId, ...row })
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!salvo) throw new Error("Não foi possível salvar o movimento.");
  return { id: salvo.id };
}

export async function removerMovimento(input: { data: unknown }) {
  const { id } = z.object({ id: z.string().uuid() }).parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const { error } = await supabase
    .from("movimentos")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)
    .is("pedido_id", null);

  if (error) throw error;
  return { ok: true as const };
}
