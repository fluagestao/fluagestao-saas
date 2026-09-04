"use server";

import { z } from "zod";

import { CONFIG_VAZIA, type CalculoConfig } from "@/lib/calculo-tipos";
import { requireCompany } from "@/lib/company-context.server";
import { intervaloMes } from "@/lib/prazo";
import { dataLocalISO } from "@/lib/vendas";

/** Percentual de custo fixo medido, em vez de chutado. */
export type SugestaoFixo = {
  /** Soma das saídas do mês passado nos tipos marcados como custo fixo. */
  fixos: number;
  /** Nomes dos tipos de despesa marcados. Vazio = ninguém marcou ainda. */
  tipos: string[];
  /** Faturamento do mesmo mês. */
  faturamento: number;
  /** fixos ÷ faturamento, como fração. null quando falta dado. */
  percentual: number | null;
  mes: string;
};

type ActionInput<T> = { data: T };

const configSchema = z.object({
  custo_hora: z.number().nonnegative().max(100_000),
  percentual_fixo: z.number().min(0).max(0.9),
  percentual_taxa: z.number().min(0).max(0.9),
  percentual_perdas: z.number().min(0).max(0.9),
  incluir_no_calculo: z.boolean(),
});

export async function carregarCalculoConfig(): Promise<{
  config: CalculoConfig;
  sugestao: SugestaoFixo;
}> {
  const { supabase, companyId } = await requireCompany();

  // Mês passado fechado: o mês corrente ainda não tem todas as contas nem todo
  // o faturamento, e daria um percentual inflado.
  const mesPassado = intervaloMes(undefined, -1);

  const [configRes, tiposRes, saidasRes, pedidosRes] = await Promise.all([
    supabase
      .from("calculo_config")
      .select("custo_hora, percentual_fixo, percentual_taxa, percentual_perdas, incluir_no_calculo")
      .eq("company_id", companyId)
      .maybeSingle(),
    /* QUEM decide o que é custo fixo é a cesteira, marcando o TIPO.
       Antes a regra era "conta com recorrência mensal", e ela errava dos dois
       lados: compra mensal de insumo entrava — o mesmo dinheiro que já está no
       custo do produto, contado duas vezes — e aluguel pago uma vez por ano
       ficava de fora. Recorrência é como a conta se repete, não o que ela é. */
    supabase
      .from("tipos_despesa")
      .select("id, nome")
      .eq("company_id", companyId)
      .eq("conta_como_fixo", true),
    /* movimentos, não contas_a_pagar: pagar uma conta CRIA um movimento com o
       mesmo tipo_despesa_id, então movimentos já tem tudo — conta paga e
       despesa lançada direto, sem passar por conta. Lendo contas_a_pagar, toda
       despesa paga na hora ficava fora da conta do custo fixo. */
    supabase
      .from("movimentos")
      .select("valor, tipo_despesa_id")
      .eq("company_id", companyId)
      .eq("tipo", "saida")
      .gte("data", mesPassado.de)
      .lte("data", mesPassado.ate)
      .limit(5000),
    supabase
      .from("pedidos")
      .select("total, created_at")
      .eq("company_id", companyId)
      .neq("status", "cancelado")
      .gte("created_at", `${mesPassado.de}T00:00:00-03:00`)
      .lte("created_at", `${mesPassado.ate}T23:59:59-03:00`)
      .limit(5000),
  ]);

  if (configRes.error) throw configRes.error;
  if (tiposRes.error) throw tiposRes.error;
  if (saidasRes.error) throw saidasRes.error;
  if (pedidosRes.error) throw pedidosRes.error;

  const config: CalculoConfig = configRes.data
    ? {
        custo_hora: Number(configRes.data.custo_hora ?? 0),
        percentual_fixo: Number(configRes.data.percentual_fixo ?? 0),
        percentual_taxa: Number(configRes.data.percentual_taxa ?? 0),
        percentual_perdas: Number(configRes.data.percentual_perdas ?? 0),
        incluir_no_calculo: configRes.data.incluir_no_calculo === true,
      }
    : CONFIG_VAZIA;

  const marcados = new Set((tiposRes.data ?? []).map((tipo) => tipo.id as string));
  const tipos = (tiposRes.data ?? []).map((tipo) => String(tipo.nome ?? "")).filter(Boolean);

  /* Só o que a cesteira marcou. Sem regra de reserva de propósito: se ela
     desmarcou tudo, a resposta honesta é zero com um aviso, não um número
     antigo que ela não escolheu e não sabe de onde veio. */
  const fixos = (saidasRes.data ?? []).reduce((soma, m) => {
    const tipo = (m as { tipo_despesa_id?: string | null }).tipo_despesa_id;
    return tipo && marcados.has(tipo) ? soma + Number(m.valor ?? 0) : soma;
  }, 0);

  const faturamento = (pedidosRes.data ?? []).reduce((soma, p) => {
    const dia = p.created_at ? dataLocalISO(p.created_at as string) : null;
    if (!dia || dia < mesPassado.de || dia > mesPassado.ate) return soma;
    return soma + Number(p.total ?? 0);
  }, 0);

  return {
    config,
    sugestao: {
      fixos,
      tipos,
      faturamento,
      // Sem faturamento não há percentual: dividir por zero daria "infinito por
      // cento", que é pior do que não sugerir nada.
      percentual: faturamento > 0 && fixos > 0 ? Math.min(fixos / faturamento, 0.9) : null,
      mes: mesPassado.de.slice(0, 7),
    },
  };
}

/* Erro ESPERADO volta no retorno, nao lancado.

   Em producao o React descarta a mensagem de um Error lancado dentro de
   arquivo "use server" e manda so um digest: a frase sobre os 90% morria no
   servidor e a tela mostrava "Minified React error #441", sem dizer qual
   numero revisar. Falha do banco continua sendo lancada — para essa o texto
   generico serve e nao ha o que a pessoa faca com ela.

   Mesmo remedio ja aplicado em salvarCliente (pedidos.ts) e em usuarios.ts. */
export async function salvarCalculoConfig(input: ActionInput<unknown>) {
  const data = configSchema.parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const soma = data.percentual_fixo + data.percentual_taxa + data.percentual_perdas;
  if (soma > 0.9) {
    return {
      ok: false as const,
      erro: "Os percentuais somados passam de 90% do preço. Reveja os valores.",
    };
  }

  const { error } = await supabase
    .from("calculo_config")
    .upsert(
      { company_id: companyId, ...data, updated_at: new Date().toISOString() },
      { onConflict: "company_id" },
    );
  if (error) throw error;

  return { ok: true as const, erro: null };
}

/** Minutos de montagem do produto. Separado por ser um campo só. */
export async function atualizarTempoMontagem(input: ActionInput<unknown>) {
  const parsed = z
    .object({
      id: z.string().uuid(),
      minutos: z.number().int().min(0).max(6000).nullable(),
    })
    .safeParse(input.data);

  /* Tempo fora da faixa e erro ESPERADO — a tela deixa digitar qualquer numero
     e quem preenche pode corrigir. Lancado pelo .parse(), a queixa do zod virava
     digest em producao e a pessoa so via "nao consegui salvar o produto", sem
     saber que o problema era o campo de minutos. Id invalido nao entra nessa
     conta: ele vem do proprio sistema, entao e bug e continua sendo lancado. */
  if (!parsed.success) {
    const doTempo = parsed.error.issues.some((i) => i.path[0] === "minutos");
    if (!doTempo) throw parsed.error;
    return {
      ok: false as const,
      erro: "Informe o tempo de montagem em minutos inteiros, de 0 a 6000 (100 horas).",
    };
  }
  const { id, minutos } = parsed.data;

  const { supabase, companyId } = await requireCompany();

  const { error } = await supabase
    .from("produtos")
    .update({ tempo_montagem_min: minutos })
    .eq("id", id)
    .eq("company_id", companyId);
  if (error) throw error;

  return { ok: true as const, erro: null };
}
