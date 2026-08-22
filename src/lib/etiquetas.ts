"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const etiquetaSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(1, "Nome obrigatório").max(80),
  cor: z.string().trim().nullable().optional(),
  ativo: z.boolean().default(true),
  ordem: z.number().int().nonnegative().default(0),
});

const idSchema = z.object({ id: z.string().uuid() });

type ActionInput<T> = { data: T };

async function contextoEmpresa() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    throw new Error("Sessão inválida. Entre novamente.");
  }

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

export async function listarEtiquetas() {
  const { supabase, companyId } = await contextoEmpresa();
  const { data, error } = await supabase
    .from("etiquetas")
    .select("id, nome, cor, ativo, ordem")
    .eq("company_id", companyId)
    .order("ordem")
    .order("nome");

  if (error) throw error;
  return data ?? [];
}

export async function salvarEtiqueta(input: ActionInput<unknown>) {
  const data = etiquetaSchema.parse(input.data);
  const { supabase, companyId } = await contextoEmpresa();

  const row = {
    company_id: companyId,
    nome: data.nome,
    cor: data.cor || "#B8893B",
    ativo: data.ativo,
    ordem: data.ordem,
    updated_at: new Date().toISOString(),
  };

  if (data.id) {
    const { data: anterior, error: anteriorError } = await supabase
      .from("etiquetas")
      .select("nome")
      .eq("id", data.id)
      .eq("company_id", companyId)
      .single();
    if (anteriorError) throw anteriorError;

    const { data: atualizada, error } = await supabase
      .from("etiquetas")
      .update(row)
      .eq("id", data.id)
      .eq("company_id", companyId)
      .select("id, nome, cor, ativo, ordem")
      .single();
    if (error) throw error;

    if (anterior.nome !== data.nome) {
      const { error: produtosError } = await supabase
        .from("produtos")
        .update({ badge: data.nome, badge_cor: row.cor })
        .eq("company_id", companyId)
        .eq("badge", anterior.nome);
      if (produtosError) throw produtosError;
    } else {
      const { error: corError } = await supabase
        .from("produtos")
        .update({ badge_cor: row.cor })
        .eq("company_id", companyId)
        .eq("badge", data.nome);
      if (corError) throw corError;
    }

    return atualizada;
  }

  const { data: existentes, error: ordemError } = await supabase
    .from("etiquetas")
    .select("ordem")
    .eq("company_id", companyId);
  if (ordemError) throw ordemError;

  row.ordem =
    (existentes ?? []).reduce((max, item) => Math.max(max, item.ordem ?? 0), -1) + 1;

  const { data: criada, error } = await supabase
    .from("etiquetas")
    .insert(row)
    .select("id, nome, cor, ativo, ordem")
    .single();
  if (error) throw error;
  return criada;
}

export async function removerEtiqueta(input: ActionInput<unknown>) {
  const { id } = idSchema.parse(input.data);
  const { supabase, companyId } = await contextoEmpresa();

  const { data: etiqueta, error: etiquetaError } = await supabase
    .from("etiquetas")
    .select("nome")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();
  if (etiquetaError) throw etiquetaError;

  const { error: produtosError } = await supabase
    .from("produtos")
    .update({ badge: null, badge_cor: null })
    .eq("company_id", companyId)
    .eq("badge", etiqueta.nome);
  if (produtosError) throw produtosError;

  const { error } = await supabase
    .from("etiquetas")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);
  if (error) throw error;

  return { ok: true };
}
