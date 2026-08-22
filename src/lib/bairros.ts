"use server";

import { z } from "zod";

import { requireCompany } from "@/lib/company-context.server";
import type { Bairro } from "@/lib/frete";

const bairroSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(1).max(120),
  taxa: z.number().min(0).max(10_000),
  observacao: z.string().trim().max(300).nullable().default(null),
  ordem: z.number().int().min(0).max(9999).default(0),
  ativo: z.boolean().default(true),
});

const num = (valor: unknown, padrao = 0) =>
  valor == null ? padrao : Number(valor);

export async function carregarBairros(): Promise<{
  bairros: Bairro[];
  adicional_domingo: number;
}> {
  const { supabase, companyId } = await requireCompany();

  const [bairrosRes, configRes] = await Promise.all([
    supabase
      .from("bairros")
      .select("id, nome, taxa, observacao, ordem, ativo")
      .eq("company_id", companyId)
      .order("ordem")
      .order("nome"),
    supabase
      .from("entrega_config")
      .select("adicional_domingo")
      .eq("company_id", companyId)
      .maybeSingle(),
  ]);

  if (bairrosRes.error) throw bairrosRes.error;
  if (configRes.error) throw configRes.error;

  return {
    bairros: (bairrosRes.data ?? []).map((bairro) => ({
      id: bairro.id,
      nome: bairro.nome,
      taxa: num(bairro.taxa),
      observacao: bairro.observacao,
      ordem: num(bairro.ordem),
      ativo: bairro.ativo,
    })),
    adicional_domingo: num(configRes.data?.adicional_domingo),
  };
}

export async function salvarBairro(input: { data: unknown }) {
  const data = bairroSchema.parse(input.data);
  const { supabase, companyId } = await requireCompany();

  if (data.id) {
    const { data: salvo, error } = await supabase
      .from("bairros")
      .update({
        nome: data.nome,
        taxa: data.taxa,
        observacao: data.observacao,
        ordem: data.ordem,
        ativo: data.ativo,
      })
      .eq("id", data.id)
      .eq("company_id", companyId)
      .select("id")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        throw new Error(`Já existe um bairro chamado "${data.nome}".`);
      }
      throw error;
    }
    return { id: salvo?.id ?? data.id };
  }

  const { data: salvo, error } = await supabase
    .from("bairros")
    .insert({
      company_id: companyId,
      nome: data.nome,
      taxa: data.taxa,
      observacao: data.observacao,
      ordem: data.ordem,
      ativo: data.ativo,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      throw new Error(`Já existe um bairro chamado "${data.nome}".`);
    }
    throw error;
  }

  if (!salvo) throw new Error("Não foi possível salvar o bairro.");
  return { id: salvo.id };
}

export async function removerBairro(input: { data: unknown }) {
  const { id } = z.object({ id: z.string().uuid() }).parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const { error } = await supabase
    .from("bairros")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "Esse bairro está em uso em algum pedido. Desative em vez de excluir.",
      );
    }
    throw error;
  }
  return { ok: true as const };
}

export async function salvarAdicionalDomingo(input: { data: unknown }) {
  const { valor } = z
    .object({ valor: z.number().min(0).max(1000) })
    .parse(input.data);

  const { supabase, companyId } = await requireCompany();
  const { error } = await supabase.from("entrega_config").upsert(
    {
      company_id: companyId,
      adicional_domingo: Math.max(0, valor),
    },
    { onConflict: "company_id" },
  );

  if (error) throw error;
  return { ok: true as const };
}
