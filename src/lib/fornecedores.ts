"use server";

import { z } from "zod";

import { requireCompany } from "@/lib/company-context.server";
import type { Fornecedor, TipoFornecedor } from "@/lib/fornecedores-ops.server";

export async function carregarFornecedores() {
  const { supabase, companyId } = await requireCompany();

  const [fornRes, movRes, tiposRes] = await Promise.all([
    supabase
      .from("fornecedores")
      .select(
        "id, nome, telefone, fornece, observacao, ativo, documento, endereco, cidade, tipo_fornecedor_id",
      )
      .eq("company_id", companyId)
      .order("nome"),
    supabase
      .from("movimentos")
      .select("fornecedor, valor")
      .eq("company_id", companyId)
      .eq("tipo", "saida"),
    supabase
      .from("tipos_fornecedor")
      .select("id, nome")
      .eq("company_id", companyId)
      .order("nome"),
  ]);

  if (fornRes.error) throw fornRes.error;
  if (movRes.error) throw movRes.error;
  if (tiposRes.error) throw tiposRes.error;

  const nomeDoTipo = new Map((tiposRes.data ?? []).map((t) => [t.id, t.nome]));

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
      tipo_fornecedor: f.tipo_fornecedor_id
        ? (nomeDoTipo.get(f.tipo_fornecedor_id) ?? null)
        : null,
      gasto: gastos.get(chave(f.nome)) ?? 0,
    }),
  );

  return { fornecedores, tipos: (tiposRes.data ?? []) as TipoFornecedor[] };
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
      // So digitos: e assim que dois cadastros do mesmo CNPJ digitados com
      // pontuacao diferente deixam de virar dois fornecedores.
      documento: z
        .string()
        .trim()
        .transform((v) => v.replace(/\D/g, ""))
        .refine((v) => v === "" || v.length === 11 || v.length === 14, {
          message: "Informe um CPF com 11 digitos ou um CNPJ com 14.",
        })
        .transform((v) => v || null)
        .nullable()
        .default(null),
      endereco: z.string().trim().max(200).nullable().default(null),
      cidade: z.string().trim().max(80).nullable().default(null),
      tipo_fornecedor_id: z.string().uuid().nullable().default(null),
    })
    .parse(input.data);

  const { supabase, companyId } = await requireCompany();

  const row = {
    nome: data.nome,
    telefone: data.telefone,
    fornece: data.fornece,
    observacao: data.observacao,
    ativo: data.ativo,
    documento: data.documento,
    endereco: data.endereco,
    cidade: data.cidade,
    tipo_fornecedor_id: data.tipo_fornecedor_id,
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

export async function criarTipoFornecedor(input: { data: unknown }) {
  const { nome } = z
    .object({ nome: z.string().trim().min(1).max(60) })
    .parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const { data, error } = await supabase
    .from("tipos_fornecedor")
    .insert({ company_id: companyId, nome })
    .select("id, nome")
    .single();

  if (error?.code === "23505") throw new Error("Este tipo já está cadastrado.");
  if (error) throw error;
  return { id: data.id, nome: data.nome };
}

export async function excluirTipoFornecedor(input: { data: unknown }) {
  const { id } = z.object({ id: z.string().uuid() }).parse(input.data);
  const { supabase, companyId } = await requireCompany();

  // Quem usava o tipo nao some: a coluna e "on delete set null", entao o
  // fornecedor fica sem tipo e continua cadastrado.
  const { error } = await supabase
    .from("tipos_fornecedor")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) throw error;
  return { ok: true as const };
}
