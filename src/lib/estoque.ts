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

/* Lancamento em LOTE. Uma compra de atacado chega com oito itens de uma vez;
   abrir o dialogo oito vezes e o tipo de atrito que faz a pessoa parar de
   registrar — e estoque que nao e registrado nao serve para nada.

   Tipo, data e motivo valem para o lote inteiro porque e assim que acontece:
   uma ida ao mercado, uma producao do dia, uma contagem de prateleira. */
const loteSchema = z
  .object({
    tipo: z.enum(["entrada", "saida", "contagem"]),
    ocorridoEm: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
    motivo: z
      .string()
      .trim()
      .max(200)
      .nullish()
      .transform((valor) => (valor ? valor : null)),
    itens: z
      .array(
        z.object({
          insumoId: z.string().uuid(),
          quantidade: z.number(),
        }),
      )
      .min(1, "Informe ao menos um insumo.")
      .max(100, "No máximo 100 insumos por vez."),
  })
  .superRefine((valor, ctx) => {
    // Contagem aceita zero (contei e nao tem nenhum); entrada e baixa, nao.
    const minimo = valor.tipo === "contagem" ? 0 : Number.MIN_VALUE;
    valor.itens.forEach((item, i) => {
      if (!Number.isFinite(item.quantidade) || item.quantidade < minimo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["itens", i, "quantidade"],
          message:
            valor.tipo === "contagem"
              ? "A contagem não pode ser negativa."
              : "Informe uma quantidade maior que zero.",
        });
      }
    });

    const vistos = new Set<string>();
    for (const item of valor.itens) {
      if (vistos.has(item.insumoId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["itens"],
          message: "O mesmo insumo aparece duas vezes no lançamento.",
        });
        return;
      }
      vistos.add(item.insumoId);
    }
  });

export type ResultadoLote = {
  /** Linhas efetivamente gravadas. */
  gravados: number;
  /** Contagens que bateram com o saldo — nada a corrigir, nada gravado. */
  semMudanca: number;
  /** Só na contagem: diferença aplicada por insumo, para o aviso na tela. */
  ajustes: { insumoId: string; diferenca: number }[];
};

export async function registrarMovimentos(
  input: ActionInput<unknown>,
): Promise<ResultadoLote> {
  const data = loteSchema.parse(input.data);
  const { supabase, companyId } = await contextoEmpresa();

  const ids = data.itens.map((i) => i.insumoId);

  const [insumosRes, saldosRes] = await Promise.all([
    supabase.from("insumos").select("id, custo").eq("company_id", companyId).in("id", ids),
    data.tipo === "contagem"
      ? supabase
          .from("insumo_estoque")
          .select("insumo_id, saldo")
          .eq("company_id", companyId)
          .in("insumo_id", ids)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (insumosRes.error) throw insumosRes.error;
  if (saldosRes.error) throw saldosRes.error;

  const custos = new Map(
    (insumosRes.data ?? []).map((i) => [i.id as string, Number(i.custo ?? 0)]),
  );
  // Um id que nao voltou nao e desta empresa: nao grava movimento fantasma.
  const faltando = ids.filter((id) => !custos.has(id));
  if (faltando.length) throw new Error("Um dos insumos não foi encontrado.");

  const saldos = new Map(
    (saldosRes.data ?? []).map((l) => [l.insumo_id as string, Number(l.saldo ?? 0)]),
  );

  const linhas: Record<string, unknown>[] = [];
  const ajustes: { insumoId: string; diferenca: number }[] = [];
  let semMudanca = 0;

  for (const item of data.itens) {
    const custo = custos.get(item.insumoId) ?? 0;

    if (data.tipo === "contagem") {
      const saldoAtual = saldos.get(item.insumoId) ?? 0;
      const diferenca = Number((item.quantidade - saldoAtual).toFixed(3));
      if (diferenca === 0) {
        semMudanca += 1;
        continue;
      }
      ajustes.push({ insumoId: item.insumoId, diferenca });
      linhas.push({
        company_id: companyId,
        insumo_id: item.insumoId,
        tipo: "ajuste",
        quantidade: diferenca,
        custo_unitario: custo,
        motivo: data.motivo ?? `Contagem: ${item.quantidade}`,
        ocorrido_em: data.ocorridoEm,
      });
      continue;
    }

    linhas.push({
      company_id: companyId,
      insumo_id: item.insumoId,
      tipo: data.tipo,
      quantidade: data.tipo === "entrada" ? item.quantidade : -item.quantidade,
      custo_unitario: custo,
      motivo: data.motivo,
      ocorrido_em: data.ocorridoEm,
    });
  }

  if (linhas.length > 0) {
    const { error } = await supabase.from("estoque_movimentos").insert(linhas);
    if (error) throw error;
  }

  return { gravados: linhas.length, semMudanca, ajustes };
}

const controleSchema = z.object({
  itens: z.array(
    z.object({
      id: z.string().uuid(),
      controlar: z.boolean(),
    }),
  ),
});

/**
 * Define quais insumos entram no controle. O mínimo NÃO passa por aqui: ele é
 * editado na linha da tabela, e deixar dois lugares gravando o mesmo campo
 * fazia o diálogo sobrescrever o que tinha acabado de ser ajustado ali.
 * A única exceção é desligar o controle, que zera o mínimo junto.
 */
export async function salvarControleEstoque(input: ActionInput<unknown>) {
  const data = controleSchema.parse(input.data);
  const { supabase, companyId } = await contextoEmpresa();

  for (const item of data.itens) {
    const { error } = await supabase
      .from("insumos")
      .update({
        controlar_estoque: item.controlar,
        ...(item.controlar ? {} : { estoque_minimo: null }),
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

/** Só o mínimo de um insumo. Editado direto na linha da tabela. */
export async function atualizarMinimo(input: ActionInput<unknown>) {
  const { insumoId, minimo } = z
    .object({
      insumoId: z.string().uuid(),
      minimo: z.number().nonnegative().max(1_000_000).nullable(),
    })
    .parse(input.data);

  const { supabase, companyId } = await contextoEmpresa();

  const { error } = await supabase
    .from("insumos")
    .update({ estoque_minimo: minimo, updated_at: new Date().toISOString() })
    .eq("id", insumoId)
    .eq("company_id", companyId);
  if (error) throw error;

  return { ok: true as const };
}
