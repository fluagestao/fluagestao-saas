"use server";

import { z } from "zod";

import { requireCompany } from "@/lib/company-context.server";
import { hojeISO, somarDias } from "@/lib/prazo";

const DATA = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export type DiaPrevisto = {
  data: string;
  entradas: number;
  saidas: number;
  saldo: number;
  itens: { descricao: string; valor: number; tipo: "entrada" | "saida" }[];
};

/**
 * Previsão de caixa: parte do saldo de hoje e projeta dia a dia.
 *
 * Junta o que já é fato (saldo acumulado) com os dois compromissos que o
 * sistema já conhece: pedidos entregues e não pagos, e contas a pagar em
 * aberto. Nenhum dado novo — o que faltava era alguém somar os três.
 *
 * Pedido atrasado entra em "hoje", não na data em que deveria ter sido pago:
 * dinheiro que já era para ter entrado é decisão de agora, não do passado.
 */
export async function carregarPrevisao(input: { data: unknown }) {
  const { dias } = z
    .object({ dias: z.number().int().min(7).max(180).default(60) })
    .parse(input.data);

  const { supabase, companyId } = await requireCompany();
  const hoje = hojeISO();
  const limite = somarDias(hoje, dias);

  const [configRes, movRes, aReceberRes, aPagarRes] = await Promise.all([
    supabase
      .from("financeiro_config")
      .select("saldo_inicial, saldo_inicial_em")
      .eq("company_id", companyId)
      .maybeSingle(),
    supabase
      .from("movimentos")
      .select("tipo, valor, data")
      .eq("company_id", companyId)
      .lte("data", hoje)
      .limit(20000),
    supabase
      .from("pedidos")
      .select("numero, cliente_nome, total, data_entrega")
      .eq("company_id", companyId)
      .is("recebido_em", null)
      .neq("status", "cancelado")
      .limit(3000),
    supabase
      .from("contas_a_pagar")
      .select("descricao, valor, vencimento")
      .eq("company_id", companyId)
      .is("pago_em", null)
      .lte("vencimento", limite)
      .limit(3000),
  ]);

  if (movRes.error) throw movRes.error;
  if (aReceberRes.error) throw aReceberRes.error;
  if (aPagarRes.error) throw aPagarRes.error;

  const inicial = Number(configRes.data?.saldo_inicial ?? 0);
  const desde = (configRes.data?.saldo_inicial_em as string | null) ?? null;

  let saldoHoje = inicial;
  for (const m of movRes.data ?? []) {
    if (desde && (m.data as string) < desde) continue;
    saldoHoje += m.tipo === "entrada" ? Number(m.valor ?? 0) : -Number(m.valor ?? 0);
  }

  const porDia = new Map<string, DiaPrevisto>();
  const garantir = (data: string) => {
    const atual = porDia.get(data) ?? {
      data,
      entradas: 0,
      saidas: 0,
      saldo: 0,
      itens: [] as DiaPrevisto["itens"],
    };
    porDia.set(data, atual);
    return atual;
  };

  for (const pedido of aReceberRes.data ?? []) {
    const prevista = (pedido.data_entrega as string | null) ?? hoje;
    const data = prevista < hoje ? hoje : prevista;
    if (data > limite) continue;
    const dia = garantir(data);
    const valor = Number(pedido.total ?? 0);
    dia.entradas += valor;
    dia.itens.push({
      descricao: `#${pedido.numero} ${pedido.cliente_nome ?? "Cliente"}`,
      valor,
      tipo: "entrada",
    });
  }

  for (const conta of aPagarRes.data ?? []) {
    const vencimento = conta.vencimento as string;
    const data = vencimento < hoje ? hoje : vencimento;
    const dia = garantir(data);
    const valor = Number(conta.valor ?? 0);
    dia.saidas += valor;
    dia.itens.push({ descricao: conta.descricao as string, valor, tipo: "saida" });
  }

  const ordenados = [...porDia.values()].sort((a, b) => a.data.localeCompare(b.data));

  let corrente = saldoHoje;
  let menor: { data: string; valor: number } | null = null;

  for (const dia of ordenados) {
    corrente += dia.entradas - dia.saidas;
    dia.saldo = corrente;
    dia.itens.sort((a, b) => b.valor - a.valor);
    if (!menor || corrente < menor.valor) menor = { data: dia.data, valor: corrente };
  }

  return {
    saldoHoje,
    dias: ordenados,
    totalAReceber: ordenados.reduce((t, d) => t + d.entradas, 0),
    totalAPagar: ordenados.reduce((t, d) => t + d.saidas, 0),
    saldoFinal: corrente,
    // O pior momento do periodo. E ele que responde "vou ter dinheiro dia 15?".
    menorSaldo: menor,
  };
}
