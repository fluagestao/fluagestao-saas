"use server";

import { z } from "zod";

import { CONFIG_VAZIA, type CalculoConfig } from "@/lib/calculo-tipos";
import { requireCompany } from "@/lib/company-context.server";
import { intervaloMes } from "@/lib/prazo";
import { dataLocalISO } from "@/lib/vendas";

/** Percentual de custo fixo medido, em vez de chutado. */
export type SugestaoFixo = {
  /** Soma das contas mensais que venceram no mês passado. */
  fixos: number;
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

  const [configRes, contasRes, pedidosRes] = await Promise.all([
    supabase
      .from("calculo_config")
      .select("custo_hora, percentual_fixo, percentual_taxa, percentual_perdas, incluir_no_calculo")
      .eq("company_id", companyId)
      .maybeSingle(),
    supabase
      .from("contas_a_pagar")
      .select("valor, vencimento, recorrencia")
      .eq("company_id", companyId)
      .eq("recorrencia", "mensal")
      .gte("vencimento", mesPassado.de)
      .lte("vencimento", mesPassado.ate),
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
  if (contasRes.error) throw contasRes.error;
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

  /* Só as contas com recorrência mensal contam como fixo. Compra de insumo é
     variável e já está no custo do produto — somar aqui seria contar duas
     vezes o mesmo dinheiro. */
  const fixos = (contasRes.data ?? []).reduce((soma, c) => soma + Number(c.valor ?? 0), 0);

  const faturamento = (pedidosRes.data ?? []).reduce((soma, p) => {
    const dia = p.created_at ? dataLocalISO(p.created_at as string) : null;
    if (!dia || dia < mesPassado.de || dia > mesPassado.ate) return soma;
    return soma + Number(p.total ?? 0);
  }, 0);

  return {
    config,
    sugestao: {
      fixos,
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
