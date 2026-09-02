"use server";

import { z } from "zod";

import { requireCompany } from "@/lib/company-context.server";

const etapaSchema = z.enum([
  "empresa",
  "insumos",
  "custos",
  "produto",
  "cliente",
  "pedido",
  "financeiro",
  "entregas",
  "followup",
]);

const atualizacaoSchema = z
  .object({
    habilitado: z.boolean().optional(),
    introducaoConcluida: z.boolean().optional(),
    concluidas: z.array(etapaSchema).max(9).optional(),
    puladas: z.array(etapaSchema).max(9).optional(),
  })
  .refine(
    (valor) => Object.values(valor).some((item) => item !== undefined),
    "Nenhuma alteração informada.",
  );

export async function atualizarGuiaFlua(input: { data: unknown }) {
  try {
    const data = atualizacaoSchema.parse(input.data);
    const { supabase, companyId } = await requireCompany();
    const alteracoes: Record<string, boolean | string[] | string> = {};

    if (data.habilitado !== undefined) {
      alteracoes.guide_enabled = data.habilitado;
    }
    if (data.introducaoConcluida === true) {
      alteracoes.onboarding_completed_at = new Date().toISOString();
    }
    if (data.concluidas !== undefined) {
      alteracoes.guide_completed_steps = Array.from(new Set(data.concluidas));
    }
    if (data.puladas !== undefined) {
      alteracoes.guide_skipped_steps = Array.from(new Set(data.puladas));
    }

    const { error } = await supabase
      .from("companies")
      .update(alteracoes)
      .eq("id", companyId);

    if (error) {
      console.error("[guia-flua] falha ao salvar progresso", {
        companyId,
        code: error.code,
        message: error.message,
      });
      return {
        ok: false as const,
        mensagem: "Não foi possível salvar o progresso. Tente novamente.",
      };
    }

    return { ok: true as const };
  } catch (error) {
    console.error("[guia-flua] falha inesperada", {
      message: error instanceof Error ? error.message : String(error),
    });
    return {
      ok: false as const,
      mensagem: "Não foi possível salvar o progresso. Tente novamente.",
    };
  }
}
