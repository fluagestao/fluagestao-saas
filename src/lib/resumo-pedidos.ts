import type { Pedido } from "./vendas";

const calendario = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
});

function diaLocal(data: Date): string {
  return Number.isFinite(data.getTime()) ? calendario.format(data) : "";
}

/** Indicadores comerciais de Pedidos seguem a criação, como no catálogo. */
export function resumoPedidos(pedidos: Pedido[], agora = new Date()) {
  const hoje = diaLocal(agora);
  const mes = hoje.slice(0, 7);
  const validos = pedidos.filter((p) => p.status !== "cancelado");
  const doMes = validos.filter((p) => p.created_at && diaLocal(new Date(p.created_at)).slice(0, 7) === mes);
  return {
    faturamentoMes: doMes.reduce((total, p) => total + (p.total || 0), 0),
    numMes: doMes.length,
    pendentes: validos.filter((p) => ["novo", "producao", "pronto"].includes(p.status)).length,
    entregasHoje: validos.filter((p) => p.data_entrega === hoje && p.status !== "entregue").length,
  };
}

/** Entregues pagos saem no dia seguinte à entrega; continuam no histórico. */
export function saiuDoQuadro(pedido: Pedido, agora = new Date()) {
  if (pedido.status !== "entregue" || !pedido.recebido_em) return false;
  const dia = pedido.data_entrega || (pedido.entregue_em ? diaLocal(new Date(pedido.entregue_em)) : "");
  return Boolean(dia && dia < diaLocal(agora));
}
