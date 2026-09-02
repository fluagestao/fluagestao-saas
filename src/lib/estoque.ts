"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type TipoMovimento = "entrada" | "saida" | "ajuste";

export type SituacaoEstoque = "ok" | "baixo" | "zerado" | "sem_minimo";

export type LinhaEstoque = {
  insumo_id: string;
  nome: string;
  unidade: string;
  categoria: string | null;
  /** Soma de todos os movimentos. Pode ser negativo se a baixa passou do saldo. */
  saldo: number;
  estoque_minimo: number | null;
  /** Custo unitário de hoje — o que custaria repor. */
  custo_atual: number;
  ultimo_movimento: string | null;
  situacao: SituacaoEstoque;
};

export type MovimentoEstoque = {
  id: string;
  insumo_id: string;
  tipo: TipoMovimento;
  quantidade: number;
  custo_unitario: number | null;
  motivo: string | null;
  ocorrido_em: string;
};

export type InsumoParaControle = {
  id: string;
  nome: string;
  unidade: string;
  categoria: string | null;
  controlar_estoque: boolean;
  estoque_minimo: number | null;
};

type ActionInput<T> = { data: T };

const COLUNAS_INSUMO =
  "id, nome, unidade, categoria, custo, controlar_estoque, estoque_minimo";

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

/**
 * Situação do insumo no estoque.
 *
 * `sem_minimo` existe de propósito: sem mínimo cadastrado não dá para dizer se
 * o saldo está bom ou ruim, e chutar "ok" seria dar um sinal verde que ninguém
 * conferiu.
 */
function situacaoDe(saldo: number, minimo: number | null): SituacaoEstoque {
  if (saldo <= 0) return "zerado";
  if (minimo === null) return "sem_minimo";
  return saldo <= minimo ? "baixo" : "ok";
}

export async function carregarEstoque(): Promise<{
  linhas: LinhaEstoque[];
  /** Todos os insumos ativos, para a tela de escolher o que entra no controle. */
  insumos: InsumoParaControle[];
}> {
  const { supabase, companyId } = await contextoEmpresa();

  const [insumosRes, saldosRes] = await Promise.all([
    supabase
      .from("insumos")
      .select(COLUNAS_INSUMO)
      .eq("company_id", companyId)
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("insumo_estoque")
      .select("insumo_id, saldo, ultimo_movimento")
      .eq("company_id", companyId),
  ]);

  if (insumosRes.error) throw insumosRes.error;
  if (saldosRes.error) throw saldosRes.error;

  const porInsumo = new Map(
    (saldosRes.data ?? []).map((linha) => [
      linha.insumo_id as string,
      {
        saldo: Number(linha.saldo ?? 0),
        ultimo: (linha.ultimo_movimento as string | null) ?? null,
      },
    ]),
  );

  const insumos: InsumoParaControle[] = (insumosRes.data ?? []).map((item) => ({
    id: item.id,
    nome: item.nome,
    unidade: (item.unidade ?? "UN").toUpperCase(),
    categoria: item.categoria ?? null,
    controlar_estoque: item.controlar_estoque === true,
    estoque_minimo: item.estoque_minimo === null ? null : Number(item.estoque_minimo),
  }));

  const linhas: LinhaEstoque[] = (insumosRes.data ?? [])
    .filter((item) => item.controlar_estoque === true)
    .map((item) => {
      const saldoInfo = porInsumo.get(item.id);
      const saldo = saldoInfo?.saldo ?? 0;
      const minimo = item.estoque_minimo === null ? null : Number(item.estoque_minimo);
      return {
        insumo_id: item.id,
        nome: item.nome,
        unidade: (item.unidade ?? "UN").toUpperCase(),
        categoria: item.categoria ?? null,
        saldo,
        estoque_minimo: minimo,
        custo_atual: Number(item.custo ?? 0),
        ultimo_movimento: saldoInfo?.ultimo ?? null,
        situacao: situacaoDe(saldo, minimo),
      };
    });

  return { linhas, insumos };
}

const movimentoSchema = z.object({
  insumoId: z.string().uuid(),
  tipo: z.enum(["entrada", "saida"]),
  /** Sempre positiva na tela; o sinal quem decide é o tipo. */
  quantidade: z.number().positive("Informe uma quantidade maior que zero."),
  motivo: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((valor) => (valor ? valor : null)),
  ocorridoEm: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  pedidoId: z.string().uuid().nullish(),
});

export async function registrarMovimento(input: ActionInput<unknown>) {
  const data = movimentoSchema.parse(input.data);
  const { supabase, companyId } = await contextoEmpresa();

  // O custo do dia fica gravado na linha: sem isso, o valor do estoque de
  // março seria recalculado com o preço de hoje.
  const { data: insumo, error: insumoError } = await supabase
    .from("insumos")
    .select("id, custo")
    .eq("id", data.insumoId)
    .eq("company_id", companyId)
    .single();
  if (insumoError || !insumo) throw insumoError ?? new Error("Insumo não encontrado.");

  const { error } = await supabase.from("estoque_movimentos").insert({
    company_id: companyId,
    insumo_id: data.insumoId,
    tipo: data.tipo,
    quantidade: data.tipo === "entrada" ? data.quantidade : -data.quantidade,
    custo_unitario: Number(insumo.custo ?? 0),
    motivo: data.motivo,
    pedido_id: data.pedidoId ?? null,
    ocorrido_em: data.ocorridoEm,
  });
  if (error) throw error;

  return { ok: true as const };
}

const contagemSchema = z.object({
  insumoId: z.string().uuid(),
  contado: z.number().nonnegative("A contagem não pode ser negativa."),
  ocorridoEm: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
});

/**
 * Contagem física: grava a DIFERENÇA como ajuste, não o número contado.
 *
 * Sobrescrever o saldo apagaria a pergunta que interessa — sumiram 3 potes,
 * quando? Como diferença, a falta vira um evento datado no histórico.
 */
export async function registrarContagem(input: ActionInput<unknown>) {
  const data = contagemSchema.parse(input.data);
  const { supabase, companyId } = await contextoEmpresa();

  const [saldoRes, insumoRes] = await Promise.all([
    supabase
      .from("insumo_estoque")
      .select("saldo")
      .eq("company_id", companyId)
      .eq("insumo_id", data.insumoId)
      .maybeSingle(),
    supabase
      .from("insumos")
      .select("id, custo")
      .eq("id", data.insumoId)
      .eq("company_id", companyId)
      .single(),
  ]);

  if (saldoRes.error) throw saldoRes.error;
  if (insumoRes.error || !insumoRes.data) {
    throw insumoRes.error ?? new Error("Insumo não encontrado.");
  }

  const saldoAtual = Number(saldoRes.data?.saldo ?? 0);
  const diferenca = Number((data.contado - saldoAtual).toFixed(3));

  if (diferenca === 0) {
    return { ok: true as const, diferenca: 0, semMudanca: true as const };
  }

  const { error } = await supabase.from("estoque_movimentos").insert({
    company_id: companyId,
    insumo_id: data.insumoId,
    tipo: "ajuste",
    quantidade: diferenca,
    custo_unitario: Number(insumoRes.data.custo ?? 0),
    motivo: `Contagem: ${data.contado}`,
    ocorrido_em: data.ocorridoEm,
  });
  if (error) throw error;

  return { ok: true as const, diferenca, semMudanca: false as const };
}

const controleSchema = z.object({
  itens: z.array(
    z.object({
      id: z.string().uuid(),
      controlar: z.boolean(),
      minimo: z.number().nonnegative().nullish(),
    }),
  ),
});

/** Define quais insumos entram no controle e o mínimo de cada um. */
export async function salvarControleEstoque(input: ActionInput<unknown>) {
  const data = controleSchema.parse(input.data);
  const { supabase, companyId } = await contextoEmpresa();

  for (const item of data.itens) {
    const { error } = await supabase
      .from("insumos")
      .update({
        controlar_estoque: item.controlar,
        estoque_minimo: item.controlar ? (item.minimo ?? null) : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .eq("company_id", companyId);
    if (error) throw error;
  }

  return { ok: true as const };
}

export async function historicoEstoque(
  input: ActionInput<unknown>,
): Promise<MovimentoEstoque[]> {
  const { id } = z.object({ id: z.string().uuid() }).parse(input.data);
  const { supabase, companyId } = await contextoEmpresa();

  const { data, error } = await supabase
    .from("estoque_movimentos")
    .select("id, insumo_id, tipo, quantidade, custo_unitario, motivo, ocorrido_em")
    .eq("company_id", companyId)
    .eq("insumo_id", id)
    .order("ocorrido_em", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []).map((linha) => ({
    id: linha.id,
    insumo_id: linha.insumo_id,
    tipo: linha.tipo as TipoMovimento,
    quantidade: Number(linha.quantidade ?? 0),
    custo_unitario: linha.custo_unitario === null ? null : Number(linha.custo_unitario),
    motivo: linha.motivo ?? null,
    ocorrido_em: linha.ocorrido_em,
  }));
}

export async function excluirMovimento(input: ActionInput<unknown>) {
  const { id } = z.object({ id: z.string().uuid() }).parse(input.data);
  const { supabase, companyId } = await contextoEmpresa();

  const { error } = await supabase
    .from("estoque_movimentos")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);
  if (error) throw error;

  return { ok: true as const };
}
