"use server";

import { z } from "zod";

import { requireCompany } from "@/lib/company-context.server";
import { proximaDataComemorativa } from "@/lib/datas-comemorativas";
import { DIAS_PARA_AVALIACAO_PADRAO, estadoFollowup } from "@/lib/followup-mensagens";
import { hojeISO, somarDias } from "@/lib/prazo";
import {
  DIAS_DATA_ESPECIAL,
  DIAS_PARA_COBRAR,
  type Aviso,
  type TipoAviso,
} from "@/lib/notificacoes-tipos";

export async function carregarConfigNotificacoes(): Promise<TipoAviso[]> {
  const { supabase, companyId } = await requireCompany();
  const { data, error } = await supabase
    .from("notificacoes_config")
    .select("desligados")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) throw error;
  return ((data?.desligados as string[] | null) ?? []) as TipoAviso[];
}

export async function salvarConfigNotificacoes(input: { data: unknown }) {
  const { desligados } = z
    .object({ desligados: z.array(z.string().max(40)).max(50) })
    .parse(input.data);

  const { supabase, companyId } = await requireCompany();
  const { error } = await supabase
    .from("notificacoes_config")
    .upsert({ company_id: companyId, desligados }, { onConflict: "company_id" });

  if (error) throw error;
  return { ok: true as const };
}

/**
 * Os avisos do sino, derivados na hora.
 *
 * Nada disso e gravado: o aviso do boleto some no instante em que ele e pago,
 * porque a consulta deixa de encontra-lo. Notificacao gravada precisaria de
 * alguem para apaga-la, e e assim que aviso velho fica na tela.
 */
export async function carregarNotificacoes() {
  const { supabase, companyId } = await requireCompany();
  const hoje = hojeISO();
  const limiteCobranca = somarDias(hoje, -DIAS_PARA_COBRAR);

  const [configRes, pedidosRes, contasRes, tarefasRes, saldoRes, templateRes] =
    await Promise.all([
      supabase
        .from("notificacoes_config")
        .select("desligados")
        .eq("company_id", companyId)
        .maybeSingle(),
      supabase
        .from("pedidos")
        .select("status, origem, data_entrega, entregue_em, recebido_em, total")
        .eq("company_id", companyId)
        .neq("status", "cancelado")
        .limit(5000),
      supabase
        .from("contas_a_pagar")
        .select("valor, vencimento")
        .eq("company_id", companyId)
        .is("pago_em", null)
        .limit(3000),
      supabase
        .from("tarefas")
        .select("prazo")
        .eq("company_id", companyId)
        .eq("feita", false)
        .not("prazo", "is", null)
        .limit(1000),
      supabase
        .from("financeiro_config")
        .select("saldo_inicial, saldo_inicial_em")
        .eq("company_id", companyId)
        .maybeSingle(),
      supabase
        .from("followup_review_templates")
        .select("dias_para_avaliacao")
        .eq("company_id", companyId)
        .maybeSingle(),
    ]);

  if (pedidosRes.error) throw pedidosRes.error;

  const desligados = new Set(((configRes.data?.desligados as string[] | null) ?? []) as TipoAviso[]);
  const pedidos = pedidosRes.data ?? [];
  const contas = contasRes.data ?? [];

  const avisos: Aviso[] = [];
  const juntar = (a: Aviso) => {
    if (a.quantidade > 0 && !desligados.has(a.tipo)) avisos.push(a);
  };

  // ---------- operação ----------
  const pendentes = pedidos.filter((p) => p.status !== "entregue");

  const entregasHoje = pendentes.filter((p) => p.data_entrega === hoje).length;
  juntar({
    tipo: "entregas_hoje",
    familia: "operacao",
    titulo: `${entregasHoje} entrega(s) para hoje`,
    detalhe: "Precisam sair hoje.",
    quantidade: entregasHoje,
    urgente: false,
    destino: "/tarefas",
  });

  const atrasadas = pendentes.filter(
    (p) => p.data_entrega && (p.data_entrega as string) < hoje,
  ).length;
  juntar({
    tipo: "entrega_atrasada",
    familia: "operacao",
    titulo: `${atrasadas} entrega(s) atrasada(s)`,
    detalhe: "A data passou e o pedido não saiu.",
    quantidade: atrasadas,
    urgente: true,
    destino: "/vendas/pedidos",
  });

  const doSite = pedidos.filter((p) => p.origem === "site" && p.status === "novo").length;
  juntar({
    tipo: "pedido_site",
    familia: "operacao",
    titulo: `${doSite} pedido(s) do site esperando`,
    detalhe: "Chegaram sozinhos e ainda não foram confirmados.",
    quantidade: doSite,
    urgente: false,
    destino: "/vendas/pedidos",
  });

  // ---------- dinheiro ----------
  const vencendo = contas.filter((c) => (c.vencimento as string) <= hoje);
  const totalVencendo = vencendo.reduce((t, c) => t + Number(c.valor ?? 0), 0);
  juntar({
    tipo: "boleto",
    familia: "dinheiro",
    titulo: `${vencendo.length} conta(s) vencendo`,
    detalhe: `R$ ${totalVencendo.toFixed(2).replace(".", ",")} a pagar hoje ou em atraso.`,
    quantidade: vencendo.length,
    urgente: true,
    destino: "/financeiro/a-pagar",
  });

  const aCobrar = pedidos.filter(
    (p) =>
      p.status === "entregue" &&
      !p.recebido_em &&
      p.entregue_em &&
      (p.entregue_em as string).slice(0, 10) <= limiteCobranca,
  );
  juntar({
    tipo: "cobranca",
    familia: "dinheiro",
    titulo: `${aCobrar.length} entrega(s) sem pagamento`,
    detalhe: `Entregues há mais de ${DIAS_PARA_COBRAR} dias e ainda não pagas.`,
    quantidade: aCobrar.length,
    urgente: true,
    destino: "/vendas/a-receber",
  });

  // Projeção rápida: o saldo de hoje aguenta o que vence antes do que entra?
  let saldo = Number(saldoRes.data?.saldo_inicial ?? 0);
  const desdeSaldo = (saldoRes.data?.saldo_inicial_em as string | null) ?? null;
  const { data: movs } = await supabase
    .from("movimentos")
    .select("tipo, valor, data")
    .eq("company_id", companyId)
    .lte("data", hoje)
    .limit(20000);
  for (const m of movs ?? []) {
    if (desdeSaldo && (m.data as string) < desdeSaldo) continue;
    saldo += m.tipo === "entrada" ? Number(m.valor ?? 0) : -Number(m.valor ?? 0);
  }

  const aReceberTotal = pedidos
    .filter((p) => p.status !== "cancelado" && !p.recebido_em)
    .reduce((t, p) => t + Number(p.total ?? 0), 0);
  const aPagarTotal = contas.reduce((t, c) => t + Number(c.valor ?? 0), 0);
  const projetado = saldo + aReceberTotal - aPagarTotal;

  juntar({
    tipo: "caixa_negativo",
    familia: "dinheiro",
    titulo: "O caixa fecha no vermelho",
    detalhe: `Somando o que entra e o que sai, sobra R$ ${projetado.toFixed(2).replace(".", ",")}.`,
    quantidade: projetado < 0 ? 1 : 0,
    urgente: true,
    destino: "/financeiro/previsao",
  });

  // ---------- relacionamento ----------
  const prazoFollowup = Number(
    templateRes.data?.dias_para_avaliacao ?? DIAS_PARA_AVALIACAO_PADRAO,
  );
  const followup = pedidos.filter((p) => {
    if (p.status !== "entregue" || p.recebido_em === undefined) return false;
    if (!p.entregue_em) return false;
    const entrega = (p.entregue_em as string).slice(0, 10);
    const [a1, m1, d1] = hoje.split("-").map(Number);
    const [a2, m2, d2] = entrega.split("-").map(Number);
    const dias = Math.round(
      (Date.UTC(a1, m1 - 1, d1) - Date.UTC(a2, m2 - 1, d2)) / 86_400_000,
    );
    return estadoFollowup(dias, prazoFollowup) !== "no_prazo";
  }).length;

  juntar({
    tipo: "followup",
    familia: "relacionamento",
    titulo: `${followup} cliente(s) para chamar`,
    detalhe: "No dia de pedir avaliação, ou em atraso.",
    quantidade: followup,
    urgente: false,
    destino: "/followup",
  });

  const proxima = proximaDataComemorativa();
  juntar({
    tipo: "data_especial",
    familia: "relacionamento",
    titulo: proxima.nome,
    detalhe:
      proxima.diasRestantes === 0
        ? "É hoje."
        : `Em ${proxima.diasRestantes} dia(s). ${proxima.mensagem}`,
    quantidade: proxima.diasRestantes <= DIAS_DATA_ESPECIAL ? 1 : 0,
    urgente: false,
    destino: "/tarefas",
  });

  // ---------- tarefas ----------
  const tarefas = (tarefasRes.data ?? []).filter(
    (t) => (t.prazo as string) <= hoje,
  ).length;
  juntar({
    tipo: "tarefa_prazo",
    familia: "tarefas",
    titulo: `${tarefas} tarefa(s) no prazo`,
    detalhe: "Vencem hoje ou já venceram.",
    quantidade: tarefas,
    urgente: false,
    destino: "/tarefas",
  });

  return {
    avisos,
    // O numero do sino conta avisos, nao itens: "3 entregas" e um aviso so.
    total: avisos.length,
    urgentes: avisos.filter((a) => a.urgente).length,
  };
}
