"use server";

import { z } from "zod";

import { requireCompany } from "@/lib/company-context.server";
import type { Movimento } from "@/lib/caixa";

const DATA = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function carregarMovimentos(input: { data: unknown }) {
  const { de, ate } = z.object({ de: DATA, ate: DATA }).parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const [movRes, pedRes, aReceberRes, fornRes, tiposRes, receitasRes] = await Promise.all([
    supabase
      .from("movimentos")
      .select(
        "id, pedido_id, tipo, data, valor, descricao, fornecedor, tipo_despesa_id, tipo_receita_id",
      )
      .eq("company_id", companyId)
      .gte("data", de)
      .lte("data", ate)
      .order("data", { ascending: false }),
    supabase
      .from("pedidos")
      .select("id, numero, forma_pagamento, cliente_nome")
      .eq("company_id", companyId)
      .not("recebido_em", "is", null)
      .gte("recebido_em", de)
      .lte("recebido_em", ate),
    // Fora do periodo de proposito: "a receber" e o que esta em aberto hoje,
    // nao o que ficou em aberto naquele mes.
    supabase
      .from("pedidos")
      .select("total")
      .eq("company_id", companyId)
      .is("recebido_em", null)
      .neq("status", "cancelado")
      .limit(3000),
    supabase
      .from("fornecedores")
      .select("nome")
      .eq("company_id", companyId)
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("tipos_despesa")
      .select("id, nome")
      .eq("company_id", companyId)
      .order("nome"),
    supabase
      .from("tipos_receita")
      .select("id, nome")
      .eq("company_id", companyId)
      .order("nome"),
  ]);

  if (movRes.error) throw movRes.error;
  if (pedRes.error) throw pedRes.error;
  if (aReceberRes.error) throw aReceberRes.error;
  if (fornRes.error) throw fornRes.error;
  if (tiposRes.error) throw tiposRes.error;
  if (receitasRes.error) throw receitasRes.error;

  const numeroPorPedido = new Map(
    (pedRes.data ?? []).map((pedido) => [
      pedido.id,
      Number(pedido.numero ?? 0),
    ]),
  );
  const formaPorPedido = new Map(
    (pedRes.data ?? []).map((pedido) => [
      pedido.id,
      (pedido.forma_pagamento as string | null) ?? null,
    ]),
  );
  // O nome sai do pedido, e nao da descricao do movimento: o que a RPC gravou
  // ali varia, e sem o nome a linha do caixa nao diz de quem e o dinheiro.
  const clientePorPedido = new Map(
    (pedRes.data ?? []).map((pedido) => [
      pedido.id,
      (pedido.cliente_nome as string | null) ?? null,
    ]),
  );
  const nomeTipoPorId = new Map(
    (tiposRes.data ?? []).map((tipo) => [tipo.id, tipo.nome]),
  );
  const nomeReceitaPorId = new Map(
    (receitasRes.data ?? []).map((tipo) => [tipo.id, tipo.nome]),
  );

  const movimentos: Movimento[] = (movRes.data ?? []).map((m) => ({
    id: m.pedido_id ? `pedido:${m.pedido_id}` : m.id,
    tipo: m.tipo as "entrada" | "saida",
    data: m.data,
    valor: Number(m.valor ?? 0),
    descricao: m.descricao,
    fornecedor: m.fornecedor,
    tipo_despesa: m.tipo_despesa_id
      ? (nomeTipoPorId.get(m.tipo_despesa_id) ?? null)
      : null,
    tipo_receita: m.tipo_receita_id
      ? (nomeReceitaPorId.get(m.tipo_receita_id) ?? null)
      : null,
    pedido_numero: m.pedido_id
      ? (numeroPorPedido.get(m.pedido_id) ?? null)
      : null,
    forma_pagamento: m.pedido_id
      ? (formaPorPedido.get(m.pedido_id) ?? null)
      : null,
    cliente_nome: m.pedido_id
      ? (clientePorPedido.get(m.pedido_id) ?? null)
      : null,
  }));

  const aReceber = (aReceberRes.data ?? []).reduce(
    (total, pedido) => total + Number(pedido.total ?? 0),
    0,
  );

  const fornecedores = new Set<string>();

  for (const f of fornRes.data ?? []) {
    if (f.nome?.trim()) fornecedores.add(f.nome.trim());
  }

  for (const m of movRes.data ?? []) {
    if (!m.pedido_id && m.fornecedor?.trim()) {
      fornecedores.add(m.fornecedor.trim());
    }
  }

  return {
    movimentos,
    aReceber,
    fornecedores: [...fornecedores].sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    ),
    tiposDespesa: (tiposRes.data ?? []).map((tipo) => ({
      id: tipo.id,
      nome: tipo.nome,
    })),
    tiposReceita: (receitasRes.data ?? []).map((tipo) => ({
      id: tipo.id,
      nome: tipo.nome,
    })),
  };
}

export async function criarTipoDespesa(input: { data: unknown }) {
  const { nome } = z
    .object({ nome: z.string().trim().min(1).max(80) })
    .parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const { data, error } = await supabase
    .from("tipos_despesa")
    .insert({ company_id: companyId, nome })
    .select("id, nome")
    .single();

  if (error?.code === "23505") {
    throw new Error("Este tipo de despesa já está cadastrado.");
  }
  if (error) throw error;

  return { id: data.id, nome: data.nome };
}

export async function criarTipoReceita(input: { data: unknown }) {
  const { nome } = z
    .object({ nome: z.string().trim().min(1).max(80) })
    .parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const { data, error } = await supabase
    .from("tipos_receita")
    .insert({ company_id: companyId, nome })
    .select("id, nome")
    .single();

  if (error?.code === "23505") {
    throw new Error("Este tipo de receita já está cadastrado.");
  }
  if (error) throw error;

  return { id: data.id, nome: data.nome };
}

/** As duas listas de categoria, para a tela de cadastro. */
export async function carregarCategoriasFinanceiras() {
  const { supabase, companyId } = await requireCompany();

  const [despesasRes, receitasRes] = await Promise.all([
    supabase
      .from("tipos_despesa")
      .select("id, nome")
      .eq("company_id", companyId)
      .order("nome"),
    supabase
      .from("tipos_receita")
      .select("id, nome")
      .eq("company_id", companyId)
      .order("nome"),
  ]);

  if (despesasRes.error) throw despesasRes.error;
  if (receitasRes.error) throw receitasRes.error;

  return {
    despesas: despesasRes.data ?? [],
    receitas: receitasRes.data ?? [],
  };
}

const categoriaSchema = z.object({
  id: z.string().uuid(),
  nome: z.string().trim().min(1).max(80),
  lado: z.enum(["despesa", "receita"]),
});

/** O lado decide a tabela: as duas tem a mesma forma e o mesmo indice unico. */
function tabelaDoLado(lado: "despesa" | "receita") {
  return lado === "receita" ? "tipos_receita" : "tipos_despesa";
}

export async function renomearCategoriaFinanceira(input: { data: unknown }) {
  const { id, nome, lado } = categoriaSchema.parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const { error } = await supabase
    .from(tabelaDoLado(lado))
    .update({ nome })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error?.code === "23505") {
    throw new Error("Já existe uma categoria com esse nome.");
  }
  if (error) throw error;
  return { ok: true as const };
}

export async function excluirCategoriaFinanceira(input: { data: unknown }) {
  const { id, lado } = categoriaSchema.omit({ nome: true }).parse(input.data);
  const { supabase, companyId } = await requireCompany();

  // Os lancamentos que usavam a categoria nao somem: a coluna em movimentos e
  // "on delete set null", entao eles ficam sem categoria e continuam no caixa.
  const { error } = await supabase
    .from(tabelaDoLado(lado))
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) throw error;
  return { ok: true as const };
}

/** Quantos lancamentos usam cada categoria. A tela avisa antes de excluir. */
export async function contarUsoCategorias() {
  const { supabase, companyId } = await requireCompany();

  const { data, error } = await supabase
    .from("movimentos")
    .select("tipo_despesa_id, tipo_receita_id")
    .eq("company_id", companyId)
    .limit(5000);

  if (error) throw error;

  const uso: Record<string, number> = {};
  for (const linha of data ?? []) {
    for (const id of [linha.tipo_despesa_id, linha.tipo_receita_id]) {
      if (id) uso[id as string] = (uso[id as string] ?? 0) + 1;
    }
  }
  return uso;
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
      tipo_despesa_id: z.string().uuid().nullable().default(null),
      tipo_receita_id: z.string().uuid().nullable().default(null),
    })
    .parse(input.data);

  const { supabase, companyId } = await requireCompany();

  const row = {
    tipo: data.tipo,
    data: data.data,
    valor: data.valor,
    descricao: data.descricao,
    fornecedor: data.fornecedor,
    // Cada lado guarda a sua categoria e zera a do outro: trocar o tipo do
    // lancamento nao pode deixar uma categoria orfa apontando para o lado errado.
    tipo_despesa_id: data.tipo === "saida" ? data.tipo_despesa_id : null,
    tipo_receita_id: data.tipo === "entrada" ? data.tipo_receita_id : null,
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
