"use server";

import { z } from "zod";

import { requireCompany } from "@/lib/company-context.server";

/**
 * Cozinha: livro de receitas autocontido.
 *
 * Não puxa do cadastro de insumos de propósito — anotar uma receita tem que ser
 * rápido, e obrigar a cadastrar cada ovo e cada xícara de farinha antes mataria
 * o uso. Os ingredientes são texto com valor digitado.
 *
 * O custo total não é guardado: é a soma das linhas, calculada na leitura. Como
 * os valores são fixos, o efeito é o mesmo de congelar — sem o risco de um
 * total guardado discordar da lista um dia.
 */

export type IngredienteReceita = {
  id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
};

export type Receita = {
  id: string;
  nome: string;
  rendimento: number;
  unidade_rendimento: string;
  modo_preparo: string | null;
  observacao: string | null;
  ativo: boolean;
  ingredientes: IngredienteReceita[];
  /** Soma dos ingredientes. */
  custo_total: number;
  /** custo_total ÷ rendimento — o número que interessa. */
  custo_por_porcao: number;
};

type ActionInput<T> = { data: T };

const receitaSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(1, "Dê um nome à receita.").max(160),
  rendimento: z.number().positive("O rendimento precisa ser maior que zero."),
  unidade_rendimento: z.string().trim().min(1).max(40).default("porção"),
  modo_preparo: z
    .string()
    .trim()
    .max(4000)
    .nullish()
    .transform((v) => (v ? v : null)),
  observacao: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((v) => (v ? v : null)),
  ingredientes: z
    .array(
      z.object({
        descricao: z.string().trim().min(1, "Todo ingrediente precisa de nome.").max(160),
        quantidade: z.number().positive(),
        valor_unitario: z.number().nonnegative(),
      }),
    )
    .max(120, "No máximo 120 ingredientes por receita."),
});

export async function carregarReceitas(): Promise<Receita[]> {
  const { supabase, companyId } = await requireCompany();

  const [receitasRes, ingredientesRes] = await Promise.all([
    supabase
      .from("receitas")
      .select("id, nome, rendimento, unidade_rendimento, modo_preparo, observacao, ativo")
      .eq("company_id", companyId)
      .order("nome"),
    supabase
      .from("receita_ingredientes")
      .select("id, receita_id, descricao, quantidade, valor_unitario, ordem")
      .eq("company_id", companyId)
      .order("ordem"),
  ]);

  if (receitasRes.error) throw receitasRes.error;
  if (ingredientesRes.error) throw ingredientesRes.error;

  const porReceita = new Map<string, IngredienteReceita[]>();
  for (const linha of ingredientesRes.data ?? []) {
    const lista = porReceita.get(linha.receita_id as string) ?? [];
    lista.push({
      id: linha.id as string,
      descricao: linha.descricao as string,
      quantidade: Number(linha.quantidade ?? 0),
      valor_unitario: Number(linha.valor_unitario ?? 0),
    });
    porReceita.set(linha.receita_id as string, lista);
  }

  return (receitasRes.data ?? []).map((r) => {
    const ingredientes = porReceita.get(r.id as string) ?? [];
    const custoTotal = ingredientes.reduce(
      (soma, i) => soma + i.quantidade * i.valor_unitario,
      0,
    );
    const rendimento = Number(r.rendimento ?? 1) || 1;
    return {
      id: r.id as string,
      nome: r.nome as string,
      rendimento,
      unidade_rendimento: (r.unidade_rendimento as string) ?? "porção",
      modo_preparo: (r.modo_preparo as string | null) ?? null,
      observacao: (r.observacao as string | null) ?? null,
      ativo: r.ativo !== false,
      ingredientes,
      custo_total: custoTotal,
      custo_por_porcao: custoTotal / rendimento,
    };
  });
}

export async function salvarReceita(input: ActionInput<unknown>) {
  const data = receitaSchema.parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const cabecalho = {
    company_id: companyId,
    nome: data.nome,
    rendimento: data.rendimento,
    unidade_rendimento: data.unidade_rendimento,
    modo_preparo: data.modo_preparo,
    observacao: data.observacao,
    updated_at: new Date().toISOString(),
  };

  let receitaId = data.id;

  if (receitaId) {
    const { error } = await supabase
      .from("receitas")
      .update(cabecalho)
      .eq("id", receitaId)
      .eq("company_id", companyId);
    if (error) throw error;
  } else {
    const { data: criada, error } = await supabase
      .from("receitas")
      .insert(cabecalho)
      .select("id")
      .single();
    if (error || !criada) throw error ?? new Error("Não consegui criar a receita.");
    receitaId = criada.id as string;
  }

  /* Troca a lista inteira em vez de casar linha a linha: ingrediente aqui não
     tem identidade própria (é texto solto), então diferenciar dá trabalho e
     não ganha nada. */
  const { error: limpaError } = await supabase
    .from("receita_ingredientes")
    .delete()
    .eq("company_id", companyId)
    .eq("receita_id", receitaId);
  if (limpaError) throw limpaError;

  if (data.ingredientes.length > 0) {
    const { error: insError } = await supabase.from("receita_ingredientes").insert(
      data.ingredientes.map((i, ordem) => ({
        company_id: companyId,
        receita_id: receitaId,
        descricao: i.descricao,
        quantidade: i.quantidade,
        valor_unitario: i.valor_unitario,
        ordem,
      })),
    );
    if (insError) throw insError;
  }

  return { id: receitaId };
}

export async function removerReceita(input: ActionInput<unknown>) {
  const { id } = z.object({ id: z.string().uuid() }).parse(input.data);
  const { supabase, companyId } = await requireCompany();

  // Os ingredientes somem por cascade.
  const { error } = await supabase
    .from("receitas")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);
  if (error) throw error;

  return { ok: true as const };
}
