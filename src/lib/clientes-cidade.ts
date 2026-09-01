"use server";

import { z } from "zod";

import { requireCompany } from "@/lib/company-context.server";

const idSchema = z.object({ id: z.string().uuid() });

export async function carregarCidadeCliente(input: { data: unknown }) {
  const { id } = idSchema.parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const { data, error } = await supabase
    .from("clientes")
    .select("cidade")
    .eq("company_id", companyId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return { cidade: data?.cidade ?? null };
}

export async function salvarCidadeCliente(input: { data: unknown }) {
  const data = idSchema
    .extend({ cidade: z.string().trim().max(120).nullable() })
    .parse(input.data);

  const { supabase, companyId } = await requireCompany();
  const { error } = await supabase
    .from("clientes")
    .update({ cidade: data.cidade })
    .eq("company_id", companyId)
    .eq("id", data.id);

  if (error) throw error;
  return { ok: true as const };
}
