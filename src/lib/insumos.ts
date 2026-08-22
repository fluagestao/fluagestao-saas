"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type UnidadeInsumo = "UN" | "KG" | "G" | "L" | "ML" | "CX" | "PCT";

export type InsumoRow = {
  id: string;
  nome: string;
  unidade: UnidadeInsumo;
  quantidade_referencia: number;
  custo_referencia: number;
  ativo: boolean;
};

export type ProdutoInsumoInput = {
  insumoId: string;
  quantidade: number;
};

const unidadeSchema = z.enum(["UN", "KG", "G", "L", "ML", "CX", "PCT"]);

const insumoSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(1, "Nome obrigatório").max(160),
  unidade: unidadeSchema,
  quantidade_referencia: z.number().positive(),
  custo_referencia: z.number().nonnegative(),
  ativo: z.boolean().default(true),
});

const idSchema = z.object({ id: z.string().uuid() });
const composicaoSchema = z.object({
  produtoId: z.string().uuid(),
  itens: z.array(
    z.object({
      insumoId: z.string().uuid(),
      quantidade: z.number().positive(),
    }),
  ),
});

type ActionInput<T> = { data: T };

async function contextoEmpresa() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) throw new Error("Sessão inválida. Entre novamente.");

  const { data: membro, error: membroError } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membroError) throw membroError;
  if (!membro) throw new Error("Seu usuário não está vinculado a uma empresa ativa.");

  return { supabase, companyId: membro.company_id };
}

function normalizarUnidade(unidade: string | null | undefined): UnidadeInsumo {
  const valor = (unidade ?? "UN").toUpperCase();
  return unidadeSchema.safeParse(valor).success ? (valor as UnidadeInsumo) : "UN";
}

export async function listarInsumos(): Promise<InsumoRow[]> {
  const { supabase, companyId } = await contextoEmpresa();
  const { data, error } = await supabase
    .from("insumos")
    .select("id, nome, unidade, qtd_embalagem, preco_pacote, custo, ativo")
    .eq("company_id", companyId)
    .order("nome");

  if (error) throw error;
  return (data ?? []).map((item) => ({
    id: item.id,
    nome: item.nome,
    unidade: normalizarUnidade(item.unidade),
    quantidade_referencia: Number(item.qtd_embalagem ?? 1) || 1,
    custo_referencia: Number(item.custo ?? 0),
    ativo: item.ativo !== false,
  }));
}

export async function salvarInsumo(input: ActionInput<unknown>) {
  const data = insumoSchema.parse(input.data);
  const { supabase, companyId } = await contextoEmpresa();

  // Na tela, custo_referencia representa sempre o valor UNITÁRIO do insumo.
  // A tabela existente mantém também preco_pacote, que fica apenas como valor
  // de referência calculado pela quantidade-base x custo unitário.
  const custoUnitario = data.custo_referencia;
  const precoReferencia = data.quantidade_referencia * custoUnitario;

  const row = {
    company_id: companyId,
    nome: data.nome,
    unidade: data.unidade,
    qtd_embalagem: data.quantidade_referencia,
    preco_pacote: precoReferencia,
    custo: custoUnitario,
    ativo: data.ativo,
    updated_at: new Date().toISOString(),
  };

  if (data.id) {
    const { data: atualizado, error } = await supabase
      .from("insumos")
      .update(row)
      .eq("id", data.id)
      .eq("company_id", companyId)
      .select("id, nome, unidade, qtd_embalagem, preco_pacote, custo, ativo")
      .single();
    if (error) throw error;
    return atualizado;
  }

  const { data: criado, error } = await supabase
    .from("insumos")
    .insert(row)
    .select("id, nome, unidade, qtd_embalagem, preco_pacote, custo, ativo")
    .single();
  if (error) throw error;
  return criado;
}

export async function removerInsumo(input: ActionInput<unknown>) {
  const { id } = idSchema.parse(input.data);
  const { supabase, companyId } = await contextoEmpresa();

  const { count, error: usoError } = await supabase
    .from("produto_insumos")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("insumo_id", id);
  if (usoError) throw usoError;
  if ((count ?? 0) > 0) {
    throw new Error("Este insumo está sendo usado em um ou mais produtos. Remova-o da composição antes de excluir.");
  }

  const { error } = await supabase
    .from("insumos")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);
  if (error) throw error;

  return { ok: true };
}

export async function salvarComposicaoProduto(input: ActionInput<unknown>) {
  const data = composicaoSchema.parse(input.data);
  const { supabase, companyId } = await contextoEmpresa();

  const { data: produto, error: produtoError } = await supabase
    .from("produtos")
    .select("id")
    .eq("id", data.produtoId)
    .eq("company_id", companyId)
    .single();
  if (produtoError || !produto) throw produtoError ?? new Error("Produto não encontrado.");

  const selecionados = data.itens.map((item) => item.insumoId);

  if (data.itens.length > 0) {
    const { error: upsertError } = await supabase
      .from("produto_insumos")
      .upsert(
        data.itens.map((item, index) => ({
          company_id: companyId,
          produto_id: data.produtoId,
          insumo_id: item.insumoId,
          quantidade: item.quantidade,
          ordem: index,
        })),
        { onConflict: "company_id,produto_id,insumo_id" },
      );
    if (upsertError) throw upsertError;
  }

  let removerQuery = supabase
    .from("produto_insumos")
    .delete()
    .eq("company_id", companyId)
    .eq("produto_id", data.produtoId);

  if (selecionados.length > 0) {
    removerQuery = removerQuery.not("insumo_id", "in", `(${selecionados.join(",")})`);
  }

  const { error: removerError } = await removerQuery;
  if (removerError) throw removerError;

  return { ok: true };
}

export async function listarComposicaoProduto(input: ActionInput<unknown>) {
  const { id: produtoId } = idSchema.parse(input.data);
  const { supabase, companyId } = await contextoEmpresa();

  const { data, error } = await supabase
    .from("produto_insumos")
    .select("id, insumo_id, quantidade, ordem, insumos!inner(id, nome, unidade, qtd_embalagem, preco_pacote, custo, ativo)")
    .eq("company_id", companyId)
    .eq("produto_id", produtoId)
    .order("ordem");

  if (error) throw error;
  return data ?? [];
}
