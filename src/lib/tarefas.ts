"use server";

import { z } from "zod";

import { requireCompany } from "@/lib/company-context.server";
import type { Tarefa } from "@/lib/tarefas-ops.server";

const tarefaSchema = z.object({
  id: z.string().uuid().optional(),
  titulo: z.string().trim().min(1).max(200),
  detalhe: z.string().max(1000).nullable(),
  prazo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  prioridade: z.enum(["baixa", "normal", "alta"]),
});

export async function carregarTarefas() {
  const { supabase, companyId, displayName, email } = await requireCompany();

  const { data, error } = await supabase
    .from("tarefas")
    .select(
      "id, titulo, detalhe, prazo, feita, feita_em, prioridade, ordem, criada_por, responsavel_user_id, created_at",
    )
    .eq("company_id", companyId)
    .order("feita", { ascending: true })
    .order("prazo", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) throw error;

  return {
    tarefas: (data ?? []) as Tarefa[],
    nome: displayName || null,
    email,
  };
}

export async function salvarTarefa(input: { data: unknown }) {
  const data = tarefaSchema.parse(input.data);
  const { supabase, companyId, userId } = await requireCompany();

  const row = {
    titulo: data.titulo,
    detalhe: data.detalhe,
    prazo: data.prazo,
    prioridade: data.prioridade,
  };

  if (data.id) {
    const { data: salvo, error } = await supabase
      .from("tarefas")
      .update(row)
      .eq("id", data.id)
      .eq("company_id", companyId)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    return { id: salvo?.id ?? data.id };
  }

  const { data: salvo, error } = await supabase
    .from("tarefas")
    .insert({
      company_id: companyId,
      ...row,
      criada_por: userId,
      responsavel_user_id: userId,
    })
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!salvo) throw new Error("Não foi possível salvar a tarefa.");
  return { id: salvo.id };
}

export async function marcarTarefa(input: { data: unknown }) {
  const data = z
    .object({ id: z.string().uuid(), feita: z.boolean() })
    .parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const { error } = await supabase
    .from("tarefas")
    .update({
      feita: data.feita,
      feita_em: data.feita ? new Date().toISOString() : null,
    })
    .eq("id", data.id)
    .eq("company_id", companyId);

  if (error) throw error;
  return { ok: true as const };
}

export async function removerTarefa(input: { data: unknown }) {
  const { id } = z.object({ id: z.string().uuid() }).parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const { error } = await supabase
    .from("tarefas")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) throw error;
  return { ok: true as const };
}

export async function salvarMeuNome(input: { data: unknown }) {
  const { nome } = z
    .object({ nome: z.string().trim().min(1).max(80) })
    .parse(input.data);
  const { supabase, companyId, memberId, userId } = await requireCompany();

  const { error: membroError } = await supabase
    .from("company_members")
    .update({ display_name: nome })
    .eq("id", memberId)
    .eq("company_id", companyId);

  if (membroError) {
    const { error: perfilError } = await supabase
      .from("profiles")
      .update({ full_name: nome })
      .eq("id", userId);
    if (perfilError) throw membroError;
  }

  return { ok: true as const };
}
