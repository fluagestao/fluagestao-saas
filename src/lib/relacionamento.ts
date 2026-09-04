"use server";

import { requireCompany } from "@/lib/company-context.server";
import { hojeISO } from "@/lib/prazo";
import type { ItemPedido } from "@/lib/vendas";

/**
 * Quem comprou e sumiu.
 *
 * O Follow-up já existe e trabalha no eixo oposto: ele olha ENTREGAS RECENTES
 * para pedir avaliação. Aqui a pergunta é o silêncio — faz quanto tempo que
 * essa cliente não aparece. São perguntas contrárias e por isso duas telas:
 * juntá-las obrigaria uma lista a responder as duas ao mesmo tempo.
 *
 * O agrupamento é por `cliente_id`, e não pelos dígitos do WhatsApp como o
 * Follow-up faz. O número quebra quando a pessoa troca de linha ou alguém
 * digita com o 9 a mais; o id não. Pedido sem cliente cadastrado fica de fora,
 * o que é correto: sem cadastro não há relacionamento para retomar.
 */

/** Teto das duas consultas. Mesmo valor que o Follow-up usa. */
const TETO = 5000;

/** Pedido em aberto: ela ainda vai receber. Não é hora de chamar de volta. */
const EM_ABERTO = new Set(["novo", "producao", "pronto"]);

export type ClienteParado = {
  id: string;
  nome: string;
  whatsapp: string | null;
  /** Dias desde a última compra concluída. */
  diasParado: number;
  ultimaCompraEm: string;
  compras: number;
  totalGasto: number;
  /** O que ela mais leva, somando quantidades. Null quando não dá para dizer. */
  produtoFrequente: string | null;
};

type PedidoLinha = {
  cliente_id: string | null;
  status: string | null;
  data_entrega: string | null;
  created_at: string | null;
  total: number | null;
  itens: ItemPedido[] | null;
};

/**
 * O dia que conta é o da ENTREGA, com a criação de reserva.
 *
 * É a mesma régua que o Dashboard usa para unidades. A alternativa — contar
 * pela criação — diria que a cliente "comprou" no dia em que encomendou, e não
 * no dia em que recebeu; para saber há quanto tempo ela não aparece, o que
 * importa é a última vez que algo chegou na mão dela.
 */
function diaDaCompra(p: PedidoLinha): string {
  return String(p.data_entrega ?? "") || String(p.created_at ?? "").slice(0, 10) || "";
}

function diasEntre(de: string, ate: string): number {
  const a = Date.UTC(+de.slice(0, 4), +de.slice(5, 7) - 1, +de.slice(8, 10));
  const b = Date.UTC(+ate.slice(0, 4), +ate.slice(5, 7) - 1, +ate.slice(8, 10));
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export async function carregarRelacionamento(): Promise<{ clientes: ClienteParado[] }> {
  const { supabase, companyId } = await requireCompany();
  const hoje = hojeISO();

  const [clientesRes, pedidosRes] = await Promise.all([
    supabase
      .from("clientes")
      .select("id, nome, whatsapp")
      .eq("company_id", companyId)
      .eq("ativo", true)
      .limit(TETO),
    supabase
      .from("pedidos")
      .select("cliente_id, status, data_entrega, created_at, total, itens")
      .eq("company_id", companyId)
      .not("cliente_id", "is", null)
      .limit(TETO),
  ]);

  if (clientesRes.error) throw clientesRes.error;
  if (pedidosRes.error) throw pedidosRes.error;

  const comAberto = new Set<string>();
  const porCliente = new Map<
    string,
    { ultima: string; compras: number; total: number; produtos: Map<string, number> }
  >();

  for (const p of (pedidosRes.data ?? []) as PedidoLinha[]) {
    const id = p.cliente_id;
    if (!id) continue;

    const status = String(p.status ?? "");
    if (EM_ABERTO.has(status)) {
      comAberto.add(id);
      continue;
    }
    /* Cancelado não conta em nada: não é compra, e deixá-lo definir a "última
       compra" faria a cliente parecer ativa por um pedido que ela desistiu. */
    if (status === "cancelado") continue;

    const dia = diaDaCompra(p);
    if (!dia || dia > hoje) continue;

    const atual = porCliente.get(id) ?? {
      ultima: dia,
      compras: 0,
      total: 0,
      produtos: new Map<string, number>(),
    };

    if (dia > atual.ultima) atual.ultima = dia;
    atual.compras += 1;
    atual.total += Number(p.total ?? 0);

    // Soma por quantidade, não por vezes que apareceu: quem leva 6 tábuas num
    // pedido leva tábua, mesmo tendo pedido uma vez só.
    for (const item of p.itens ?? []) {
      const nome = String(item?.nome ?? "").trim();
      if (!nome) continue;
      atual.produtos.set(nome, (atual.produtos.get(nome) ?? 0) + Number(item?.qtd ?? 1));
    }

    porCliente.set(id, atual);
  }

  const clientes: ClienteParado[] = [];

  for (const c of clientesRes.data ?? []) {
    const id = String(c.id);
    // Tem pedido a caminho: receber "faz tempo que você não compra" enquanto
    // espera a entrega mostra um sistema que não sabe o que está fazendo.
    if (comAberto.has(id)) continue;

    const dados = porCliente.get(id);
    if (!dados) continue;

    let produtoFrequente: string | null = null;
    let maior = 0;
    for (const [nome, qtd] of dados.produtos) {
      if (qtd > maior) {
        maior = qtd;
        produtoFrequente = nome;
      }
    }

    clientes.push({
      id,
      nome: String(c.nome ?? ""),
      whatsapp: (c.whatsapp as string | null) ?? null,
      diasParado: diasEntre(dados.ultima, hoje),
      ultimaCompraEm: dados.ultima,
      compras: dados.compras,
      totalGasto: dados.total,
      produtoFrequente,
    });
  }

  // Quem está parado há mais tempo primeiro: é quem está mais perto de sumir
  // de vez, e é a conversa mais urgente.
  clientes.sort((a, b) => b.diasParado - a.diasParado);

  return { clientes };
}
