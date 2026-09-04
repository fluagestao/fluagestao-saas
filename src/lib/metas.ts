"use server";

import { z } from "zod";

import { requireCompany } from "@/lib/company-context.server";

/**
 * Meta mensal, em unidades.
 *
 * Conta a MESMA coisa que o cartão "Cestas entregues": item de categoria
 * adicional fica de fora. Meta em reais seria mais fácil de escrever e pior de
 * usar — o faturamento sobe com o preço, então a meta em dinheiro se cumpre
 * sozinha numa remarcação, sem uma cesta a mais ter saído da cozinha.
 *
 * O grão é (ano, mês), não uma data: é assim que a série do Dashboard é
 * indexada e é assim que a tela pergunta. Com `date`, todo lugar precisaria
 * lembrar de normalizar para o dia 1 para os dois números se acharem.
 */

export type Meta = {
  ano: number;
  mes: number;
  /* As duas sao independentes e as duas podem ser nulas separadamente. Cestas
     mede trabalho, faturamento mede dinheiro — derivar uma da outra pelo
     ticket medio faria o sistema decidir por ela: subiu o preco, a meta de
     cestas cairia sozinha sem ninguem ter escolhido. */
  metaCestas: number | null;
  metaFaturamento: number | null;
  observacao: string | null;
};

const alvoSchema = z.object({
  ano: z.number().int().min(2020).max(2100),
  mes: z.number().int().min(1).max(12),
});

/** Todas as metas de um ano. A tela precisa das doze para desenhar a série. */
export async function carregarMetasDoAno(input: { data: unknown }): Promise<{ metas: Meta[] }> {
  const { ano } = z.object({ ano: z.number().int().min(2020).max(2100) }).parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const { data, error } = await supabase
    .from("metas_mensais")
    .select("ano, mes, meta_cestas, meta_faturamento, observacao")
    .eq("company_id", companyId)
    .eq("ano", ano)
    .order("mes", { ascending: true });

  if (error) throw error;

  return {
    metas: (data ?? []).map((m) => ({
      ano: Number(m.ano),
      mes: Number(m.mes),
      metaCestas: m.meta_cestas == null ? null : Number(m.meta_cestas),
      metaFaturamento: m.meta_faturamento == null ? null : Number(m.meta_faturamento),
      observacao: (m.observacao as string | null) ?? null,
    })),
  };
}

/**
 * Grava ou atualiza a meta de um mês.
 *
 * `upsert` no índice (company_id, ano, mes): definir a meta de novembro duas
 * vezes é corrigir a mesma linha, não criar duas.
 *
 * RETORNA o erro em vez de lançar: em produção o React descarta a mensagem de
 * um Error vindo de arquivo "use server", e "meta entre 1 e 100000" é
 * exatamente o tipo de aviso que a pessoa precisa ler.
 */
export async function salvarMeta(input: { data: unknown }) {
  const dados = z
    .object({
      ano: z.number().int().min(2020).max(2100),
      mes: z.number().int().min(1).max(12),
      metaCestas: z.number().int(),
      observacao: z.string().trim().max(500).nullable().default(null),
    })
    .parse(input.data);

  if (dados.metaCestas < 1 || dados.metaCestas > 100000) {
    return {
      ok: false as const,
      erro: "A meta precisa ser um número de cestas entre 1 e 100.000.",
    };
  }

  const { supabase, companyId } = await requireCompany();

  const { error } = await supabase.from("metas_mensais").upsert(
    {
      company_id: companyId,
      ano: dados.ano,
      mes: dados.mes,
      meta_cestas: dados.metaCestas,
      observacao: dados.observacao,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id,ano,mes" },
  );

  if (error) return { ok: false as const, erro: error.message };
  return { ok: true as const, erro: null };
}

/** Apaga a meta do mês. Quem desistiu apaga a linha; meta zero não existe. */
export async function removerMeta(input: { data: unknown }) {
  const { ano, mes } = alvoSchema.parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const { error } = await supabase
    .from("metas_mensais")
    .delete()
    .eq("company_id", companyId)
    .eq("ano", ano)
    .eq("mes", mes);

  if (error) return { ok: false as const, erro: error.message };
  return { ok: true as const, erro: null };
}

/**
 * Grava o ano inteiro de uma vez.
 *
 * A tela planeja os doze meses juntos — é olhando a sazonalidade que se decide
 * o número de cada mês, e salvar um a um faria a pessoa fechar e reabrir o
 * diálogo doze vezes. Mês deixado em branco significa "sem meta", e por isso
 * apaga a linha em vez de gravar zero: `meta_cestas` tem check de mínimo 1, e
 * meta zero não é uma meta.
 */
export async function salvarMetasDoAno(input: { data: unknown }) {
  const { ano, metas } = z
    .object({
      ano: z.number().int().min(2020).max(2100),
      metas: z
        .array(
          z.object({
            mes: z.number().int().min(1).max(12),
            metaCestas: z.number().int().nullable(),
            metaFaturamento: z.number().nullable(),
          }),
        )
        .max(12),
    })
    .parse(input.data);

  const cestasFora = metas.find(
    (m) => m.metaCestas != null && (m.metaCestas < 1 || m.metaCestas > 100000),
  );
  if (cestasFora) {
    return {
      ok: false as const,
      erro: `A meta de cestas precisa ficar entre 1 e 100.000. Confira o mês ${cestasFora.mes}.`,
    };
  }

  const dinheiroFora = metas.find(
    (m) => m.metaFaturamento != null && (m.metaFaturamento <= 0 || m.metaFaturamento > 100000000),
  );
  if (dinheiroFora) {
    return {
      ok: false as const,
      erro: `A meta de faturamento precisa ser maior que zero. Confira o mês ${dinheiroFora.mes}.`,
    };
  }

  const { supabase, companyId } = await requireCompany();

  /* "Tem meta" agora e ter QUALQUER uma das duas. Mes com os dois campos em
     branco apaga a linha: a constraint do banco exige pelo menos uma, e linha
     sem meta nenhuma nao e meta — e uma linha morta na consulta. */
  const comMeta = metas.filter((m) => m.metaCestas != null || m.metaFaturamento != null);
  const semMeta = metas
    .filter((m) => m.metaCestas == null && m.metaFaturamento == null)
    .map((m) => m.mes);

  if (comMeta.length) {
    const { error } = await supabase.from("metas_mensais").upsert(
      comMeta.map((m) => ({
        company_id: companyId,
        ano,
        mes: m.mes,
        meta_cestas: m.metaCestas,
        meta_faturamento: m.metaFaturamento,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "company_id,ano,mes" },
    );
    if (error) return { ok: false as const, erro: error.message };
  }

  if (semMeta.length) {
    const { error } = await supabase
      .from("metas_mensais")
      .delete()
      .eq("company_id", companyId)
      .eq("ano", ano)
      .in("mes", semMeta);
    if (error) return { ok: false as const, erro: error.message };
  }

  return { ok: true as const, erro: null };
}
