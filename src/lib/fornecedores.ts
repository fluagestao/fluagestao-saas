"use server";

import { z } from "zod";

import { requireCompany } from "@/lib/company-context.server";
import type { Fornecedor } from "@/lib/fornecedores-ops.server";

export async function carregarFornecedores() {
  const { supabase, companyId } = await requireCompany();

  const [fornRes, movRes] = await Promise.all([
    supabase
      .from("fornecedores")
      .select("id, nome, telefone, fornece, observacao, ativo")
      .eq("company_id", companyId)
      .order("nome"),
    supabase
      .from("movimentos")
      .select("fornecedor, valor")
      .eq("company_id", companyId)
      .eq("tipo", "saida"),
  ]);

  if (fornRes.error) throw fornRes.error;
  if (movRes.error) throw movRes.error;

  const chave = (texto: string) => texto.trim().toLowerCase();
  const gastos = new Map<string, number>();

  for (const mov of movRes.data ?? []) {
    if (!mov.fornecedor) continue;
    const key = chave(mov.fornecedor);
    gastos.set(key, (gastos.get(key) ?? 0) + Number(mov.valor ?? 0));
  }

  const fornecedores: (Fornecedor & { gasto: number })[] = (fornRes.data ?? []).map(
    (f) => ({
      ...f,
      gasto: gastos.get(chave(f.nome)) ?? 0,
    }),
  );

  return { fornecedores };
}

export async function salvarFornecedor(input: { data: unknown }) {
  const data = z
    .object({
      id: z.string().uuid().optional(),
      nome: z.string().trim().min(1).max(120),
      telefone: z.string().trim().max(24).nullable().default(null),
      fornece: z.string().trim().max(120).nullable().default(null),
      observacao: z.string().trim().max(500).nullable().default(null),
      ativo: z.boolean().default(true),
    })
    .parse(input.data);

  const { supabase, companyId } = await requireCompany();

  const row = {
    nome: data.nome,
    telefone: data.telefone,
    fornece: data.fornece,
    observacao: data.observacao,
    ativo: data.ativo,
  };

  if (data.id) {
    const { data: salvo, error } = await supabase
      .from("fornecedores")
      .update(row)
      .eq("id", data.id)
      .eq("company_id", companyId)
      .select("id")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        throw new Error(`Já existe um fornecedor chamado "${data.nome}".`);
      }
      throw error;
    }
    return { id: salvo?.id ?? data.id };
  }

  const { data: salvo, error } = await supabase
    .from("fornecedores")
    .insert({ company_id: companyId, ...row })
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      throw new Error(`Já existe um fornecedor chamado "${data.nome}".`);
    }
    throw error;
  }
  if (!salvo) throw new Error("Não foi possível salvar o fornecedor.");
  return { id: salvo.id };
}

export async function removerFornecedor(input: { data: unknown }) {
  const { id } = z.object({ id: z.string().uuid() }).parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const { error } = await supabase
    .from("fornecedores")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) throw error;
  return { ok: true as const };
}
