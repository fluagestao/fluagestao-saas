// Tipos e helpers puros do módulo de vendas (sem Supabase) — site e admin.

import { formatarDataCurta, hojeISO, somarDias } from "./prazo";

export type StatusPedido = "novo" | "producao" | "pronto" | "entregue" | "cancelado";

export type ItemPedido = {
  slug?: string;
  nome: string;
  preco: number | null;
  qtd: number;
  variacao?: string;
  /** Preenchidos só em item personalizado (montado fora do catálogo). */
  custo?: number | null;
  insumos?: { nome: string; quantidade: number; custo: number }[];
};

export type Pedido = {
  id: string;
  numero: number;
  cliente_nome: string | null;
  cliente_whatsapp: string | null;
  itens: ItemPedido[];
  subtotal: number;
  taxa_entrega: number | null;
  total: number;
  tipo: string | null; // entrega | retirada
  endereco: string | null;
  bairro: string | null;
  bairro_id?: string | null;
  /** Quem recebe a entrega — normalmente não é quem comprou. */
  destinatario_nome?: string | null;
  destinatario_whatsapp?: string | null;
  /** Taxa digitada à mão, ignorando o cadastro de bairros. */
  taxa_manual?: boolean;
  data_entrega: string | null; // YYYY-MM-DD
  janela_entrega: string | null;
  forma_pagamento: string | null; // pix | cartao
  status: StatusPedido;
  observacao: string | null;
  origem: string; // site | manual
  /** Quando o dinheiro entrou. null = ainda não recebido. */
  recebido_em?: string | null;
  /** Cliente cadastrado, quando o pedido veio de um. */
  cliente_id?: string | null;
  created_at?: string;
  // Usados na mensagem de confirmação enviada ao cliente.
  cep?: string | null;
  referencia?: string | null;
  cartao_habilitado?: boolean;
  cartao_de?: string | null;
  cartao_para?: string | null;
  cartao_mensagem?: string | null;
};

export const STATUS_PEDIDO: { v: StatusPedido; label: string; cor: string }[] = [
  { v: "novo", label: "Novo", cor: "#3d5a66" },
  { v: "producao", label: "Em produção", cor: "#B8893B" },
  { v: "pronto", label: "Aguardando retirada", cor: "#7A6A5E" },
  { v: "entregue", label: "Entregue", cor: "#4A6B4A" },
  { v: "cancelado", label: "Cancelado", cor: "#B5322B" },
];

export function statusLabel(s: StatusPedido): string {
  return STATUS_PEDIDO.find((x) => x.v === s)?.label ?? s;
}
export function statusCor(s: StatusPedido): string {
  return STATUS_PEDIDO.find((x) => x.v === s)?.cor ?? "#7A6A5E";
}

/** Fluxo: Novo → Em produção → Aguardando retirada → Entregue. */
export function proximoStatus(s: StatusPedido): StatusPedido | null {
  if (s === "novo") return "producao";
  if (s === "producao") return "pronto";
  if (s === "pronto") return "entregue";
  return null;
}

export function subtotalItens(itens: ItemPedido[]): number {
  return itens.reduce((t, i) => t + (i.preco ?? 0) * i.qtd, 0);
}
export function totalPedido(itens: ItemPedido[], taxa: number | null | undefined): number {
  return subtotalItens(itens) + (taxa || 0);
}

export function formatBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Data local de Tubarão a partir de um timestamp do banco (que vem em UTC).
 * "2026-08-11T23:40:00Z" (20h40 em Tubarão) → "2026-08-11", não "2026-08-12".
 */
export function dataLocalISO(ts: string | Date): string {
  return hojeISO(new Date(ts));
}

/** Primeiro dia do mês corrente, no fuso de Tubarão. */
export function inicioDoMesISO(now = new Date()): string {
  return `${hojeISO(now).slice(0, 8)}01`;
}

/**
 * PostgREST devolve `numeric` como string em vários caminhos, e aí formatBRL
 * concatena em vez de somar. Toda leitura de pedido passa por aqui.
 */
export function normalizarPedido(row: Record<string, unknown>): Pedido {
  const num = (v: unknown): number => (v == null ? 0 : Number(v));
  const numOuNull = (v: unknown): number | null => (v == null ? null : Number(v));
  const itens = Array.isArray(row.itens) ? (row.itens as ItemPedido[]) : [];
  return {
    ...(row as unknown as Pedido),
    itens: itens.map((i) => ({ ...i, preco: numOuNull(i.preco), qtd: num(i.qtd) })),
    subtotal: num(row.subtotal),
    taxa_entrega: numOuNull(row.taxa_entrega),
    total: num(row.total),
    numero: num(row.numero),
  };
}

export type Urgencia =
  | "atrasado"
  | "hoje"
  | "amanha"
  | "semana"
  | "depois"
  | "sem_data"
  | "concluido";

export const URGENCIA_LABEL: Record<Urgencia, string> = {
  atrasado: "Atrasados",
  hoje: "Hoje",
  amanha: "Amanhã",
  semana: "Esta semana",
  depois: "Depois",
  sem_data: "Sem data",
  concluido: "Já saíram",
};

export const ORDEM_URGENCIA: Urgencia[] = [
  "atrasado",
  "hoje",
  "amanha",
  "semana",
  "depois",
  "sem_data",
  // Histórico no fim: quem varre a lista quer o que ainda vai acontecer.
  "concluido",
];

/**
 * Em que grupo de urgência o pedido cai.
 *
 * "Atrasado" é só para pedido que ainda não saiu — depois de entregue a data
 * passada não é problema nenhum.
 */
export function urgenciaDoPedido(p: Pedido, now = new Date()): Urgencia {
  if (!p.data_entrega) return "sem_data";
  const hoje = hojeISO(now);
  const encerrado = p.status === "entregue" || p.status === "cancelado";
  // Entregue com data passada é histórico, não agenda: vai pro próprio grupo
  // em vez de se misturar com o que ainda está por vir.
  if (p.data_entrega < hoje) return encerrado ? "concluido" : "atrasado";
  if (p.data_entrega === hoje) return "hoje";
  if (p.data_entrega === somarDias(hoje, 1)) return "amanha";
  return p.data_entrega <= somarDias(hoje, 7) ? "semana" : "depois";
}

/** Pedido encerrado: entregue E pago. Não há mais o que fazer com ele. */
export function pedidoConcluido(p: Pedido): boolean {
  return p.status === "entregue" && Boolean(p.recebido_em);
}

/**
 * Some do quadro só no dia seguinte.
 *
 * No dia da entrega o pedido concluído continua na coluna "Entregue" — é bom
 * ver o que já saiu hoje. Virou o dia, ele vai para "Realizadas" e o quadro
 * fica só com o que ainda dá trabalho.
 */
export function saiuDoQuadro(p: Pedido, now = new Date()): boolean {
  if (!pedidoConcluido(p)) return false;
  if (!p.data_entrega) return true; // sem data, não dá pra segurar por um dia
  return p.data_entrega < hojeISO(now);
}

/** Pedido que ainda não foi pago (cancelado não conta). */
export function aReceber(p: Pedido): boolean {
  return !p.recebido_em && p.status !== "cancelado";
}

/** Mais urgente primeiro; sem data vai para o fim. */
export function ordenarPorEntrega(pedidos: Pedido[]): Pedido[] {
  return [...pedidos].sort((a, b) => {
    if (!a.data_entrega && !b.data_entrega) return b.numero - a.numero;
    if (!a.data_entrega) return 1;
    if (!b.data_entrega) return -1;
    return a.data_entrega.localeCompare(b.data_entrega) || b.numero - a.numero;
  });
}

/** Link de conversa com o cliente a partir do celular que ele digitou. */
export function whatsappDoCliente(numero: string | null | undefined): string | null {
  const d = (numero ?? "").replace(/\D/g, "");
  if (d.length < 10) return null;
  return `https://wa.me/${d.startsWith("55") ? d : `55${d}`}`;
}

/** Só o primeiro nome — "Oi, Maria!" soa melhor que "Oi, Maria Eduarda Souza!". */
function primeiroNome(nome: string | null | undefined): string {
  return (nome ?? "").trim().split(/\s+/)[0] ?? "";
}

/**
 * Mensagem para retomar um pedido que o cliente montou no site mas não chegou a
 * enviar. Como o carrinho grava antes de abrir o WhatsApp, temos nome, telefone
 * e itens mesmo quando a conversa nunca começou.
 *
 * O nome da empresa é recebido do painel para não existir marca fixa no SaaS.
 */
export function mensagemRetomada(pedido: Pedido, empresaNome = "Sua empresa"): string {
  const nome = primeiroNome(pedido.cliente_nome);
  const empresa = empresaNome.trim() || "Sua empresa";
  const linhas = pedido.itens.map(
    (i) => `• ${i.qtd}x ${i.nome}${i.variacao ? ` (${i.variacao})` : ""}`,
  );

  const partes = [
    nome
      ? `Oi, ${nome}! 🤍 Aqui é da *${empresa}*.`
      : `Oi! 🤍 Aqui é da *${empresa}*.`,
    "",
    "Vi que você montou esse pedido no nosso site:",
    ...linhas,
  ];

  if (pedido.data_entrega) {
    partes.push("", `Anotei para *${formatarDataCurta(pedido.data_entrega)}*.`);
  }

  partes.push(
    "",
    "Quer que eu confirme a disponibilidade e finalize pra você? Se quiser mudar alguma coisa, a gente ajusta por aqui. 💛",
  );

  return partes.join("\n");
}

/** Link do WhatsApp já com a mensagem de retomada preenchida. */
export function linkRetomada(pedido: Pedido, empresaNome = "Sua empresa"): string | null {
  const base = whatsappDoCliente(pedido.cliente_whatsapp);
  if (!base) return null;
  return `${base}?text=${encodeURIComponent(mensagemRetomada(pedido, empresaNome))}`;
}

const DIAS_SEMANA_EXT = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

/** "2026-08-15" → "15/08 – sábado" */
function dataPorExtenso(iso: string): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const semana = DIAS_SEMANA_EXT[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()];
  return `${formatarDataCurta(iso)} – ${semana}`;
}

/**
 * Confirmação enviada ao cliente quando o pedido entra em produção: o que vem,
 * quando chega, onde e o que vai escrito no cartão.
 *
 * Cada bloco só aparece se tiver conteúdo — pedido de retirada não mostra
 * endereço, pedido sem cartão não mostra a seção do cartão.
 */
export function mensagemConfirmacao(pedido: Pedido): string {
  const partes: string[] = [];
  const nome = (pedido.cliente_nome ?? "").trim();

  partes.push(nome ? `${nome}, sua encomenda está confirmada!` : "Sua encomenda está confirmada!");

  partes.push("", "🎁 *Pedido*");
  for (const i of pedido.itens) {
    const qtd = i.qtd > 1 ? `${i.qtd}x ` : "";
    partes.push(`• ${qtd}${i.nome}${i.variacao ? ` (${i.variacao})` : ""}`);
  }

  const retirada = pedido.tipo === "retirada";
  if (pedido.data_entrega || pedido.janela_entrega) {
    partes.push("", retirada ? "🛍️ *Retirada*" : "🚚 *Entrega*");
    if (pedido.data_entrega) partes.push(`Data: ${dataPorExtenso(pedido.data_entrega)}`);
    if (pedido.janela_entrega) partes.push(`Horário: ${pedido.janela_entrega}`);
  }

  // Vai logo antes do endereço: a confirmação é reenviada ao motorista, e ele
  // precisa de quem procurar e pra quem ligar antes de saber onde é.
  if (!retirada && (pedido.destinatario_nome || pedido.destinatario_whatsapp)) {
    partes.push("", "🙋 *Quem recebe*");
    if (pedido.destinatario_nome) partes.push(pedido.destinatario_nome);
    if (pedido.destinatario_whatsapp) partes.push(pedido.destinatario_whatsapp);
  }

  if (!retirada && (pedido.cep || pedido.endereco || pedido.bairro || pedido.referencia)) {
    partes.push("", "📍 *Endereço*");
    if (pedido.cep) partes.push(`CEP ${pedido.cep}`);
    const linha = [pedido.endereco, pedido.bairro].filter(Boolean).join(", ");
    if (linha) partes.push(linha);
    if (pedido.referencia) partes.push(`(${pedido.referencia})`);
  }

  // A observação é o que foi combinado fora do padrão ("sem lactose", "entregar
  // na portaria") — é justamente o que o cliente precisa conferir.
  if (pedido.observacao?.trim()) {
    partes.push("", "📝 *Observação*", pedido.observacao.trim());
  }

  if (
    pedido.cartao_habilitado !== false &&
    (pedido.cartao_de || pedido.cartao_para || pedido.cartao_mensagem)
  ) {
    partes.push("", "💌 *Cartão*");
    if (pedido.cartao_de) partes.push(`De: ${pedido.cartao_de}`);
    if (pedido.cartao_para) partes.push(`Para: ${pedido.cartao_para}`);
    if (pedido.cartao_mensagem) partes.push("", pedido.cartao_mensagem);
  }

  return partes.join("\n");
}

/** Link do WhatsApp com a confirmação preenchida. */
export function linkConfirmacao(pedido: Pedido): string | null {
  const base = whatsappDoCliente(pedido.cliente_whatsapp);
  if (!base) return null;
  return `${base}?text=${encodeURIComponent(mensagemConfirmacao(pedido))}`;
}

/** Resumo de vendas calculado a partir da lista de pedidos (client-side). */
export function resumoVendas(pedidos: Pedido[], now = new Date()) {
  const desdeMes = inicioDoMesISO(now);
  const validos = pedidos.filter((p) => p.status !== "cancelado");
  // Comparação lexicográfica de YYYY-MM-DD é equivalente à cronológica.
  const doMes = validos.filter((p) => p.created_at && dataLocalISO(p.created_at) >= desdeMes);
  const faturamentoMes = doMes.reduce((t, p) => t + (p.total || 0), 0);
  const numMes = doMes.length;
  const ticketMedio = numMes ? faturamentoMes / numMes : 0;
  const pendentes = validos.filter(
    (p) => p.status === "novo" || p.status === "producao" || p.status === "pronto",
  ).length;

  const hoje = hojeISO(now);
  const entregasHoje = validos.filter(
    (p) => p.data_entrega === hoje && p.status !== "entregue",
  ).length;

  // Mais vendidos (mês) por quantidade
  const contagem = new Map<string, { nome: string; qtd: number }>();
  for (const p of doMes) {
    for (const i of p.itens || []) {
      const chave = i.slug || i.nome;
      const atual = contagem.get(chave) ?? { nome: i.nome, qtd: 0 };
      atual.qtd += i.qtd;
      contagem.set(chave, atual);
    }
  }
  const maisVendidos = [...contagem.values()].sort((a, b) => b.qtd - a.qtd).slice(0, 5);

  // Por forma de pagamento (mês)
  const porPagamento = new Map<string, number>();
  for (const p of doMes) {
    const k = p.forma_pagamento || "a combinar";
    porPagamento.set(k, (porPagamento.get(k) ?? 0) + (p.total || 0));
  }

  return {
    faturamentoMes,
    numMes,
    ticketMedio,
    pendentes,
    entregasHoje,
    maisVendidos,
    porPagamento: [...porPagamento.entries()].map(([forma, total]) => ({ forma, total })),
  };
}

/**
 * Abre a conversa com a mensagem já escrita, sempre pelo wa.me.
 *
 * Ressalva conhecida: o aplicativo do WhatsApp para computador lê o texto do
 * link como latin-1, então lá o emoji vira "?" e as quebras de linha somem.
 * No celular chega perfeito. Já tentamos o web.whatsapp.com, que resolveria,
 * mas a casa prefere o app — por isso existe o botão de copiar ao lado.
 */
export function abrirWhatsappCom(numero: string | null | undefined, mensagem: string): boolean {
  const base = whatsappDoCliente(numero);
  if (!base) return false;
  window.open(`${base}?text=${encodeURIComponent(mensagem)}`, "_blank");
  return true;
}
