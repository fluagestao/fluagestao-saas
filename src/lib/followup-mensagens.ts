import type { PedidoFollowup } from "@/lib/followup-ops.server";

export type TipoMensagemAvaliacao = "presente" | "consumo_proprio";

export type ModelosAvaliacao = Record<TipoMensagemAvaliacao, string>;

/** Ajustes do follow-up: as duas mensagens e o prazo, por empresa. */
export type AjustesFollowup = ModelosAvaliacao & { dias_para_avaliacao: number };

export const DIAS_PARA_AVALIACAO_PADRAO = 3;

/** No prazo, vence hoje, ou passou. Decide a cor do card e a conta do sino. */
export type EstadoFollowup = "no_prazo" | "hoje" | "atrasado";

export function estadoFollowup(
  diasDesdeEntrega: number | null,
  prazo: number,
): EstadoFollowup {
  if (diasDesdeEntrega == null) return "no_prazo";
  if (diasDesdeEntrega > prazo) return "atrasado";
  if (diasDesdeEntrega >= prazo) return "hoje";
  return "no_prazo";
}

export const MODELOS_AVALIACAO_PADRAO: ModelosAvaliacao = {
  presente: [
    "Oi, {{nome}}! 🤍 Aqui é da *{{empresa}}*.",
    "",
    "Queríamos saber: quem recebeu {{produto}} gostou do presente e da surpresa? 🎁",
    "",
    "Se puder contar pra gente como foi, vamos adorar saber. Sua avaliação também ajuda muito quem ainda não conhece o nosso trabalho. 💛",
    "",
    "E se alguma coisa não saiu como esperado, pode me contar por aqui que a gente resolve.",
  ].join("\n"),
  consumo_proprio: [
    "Oi, {{nome}}! 🤍 Aqui é da *{{empresa}}*.",
    "",
    "Como foi a sua experiência com {{produto}} no pedido #{{pedido}}?",
    "",
    "Se você gostou, poderia deixar uma avaliação pra gente? Leva um minutinho e ajuda muito o nosso trabalho. 💛",
    "",
    "E se alguma coisa não saiu como esperado, pode me contar por aqui que a gente resolve.",
  ].join("\n"),
};

export const AJUSTES_FOLLOWUP_PADRAO: AjustesFollowup = {
  ...MODELOS_AVALIACAO_PADRAO,
  dias_para_avaliacao: DIAS_PARA_AVALIACAO_PADRAO,
};

function primeiroNome(nome: string | null): string {
  return (nome ?? "").trim().split(/\s+/)[0] || "cliente";
}

export function aplicarModeloAvaliacao(
  modelo: string,
  pedido: PedidoFollowup,
  empresaNome: string,
): string {
  const produtos = pedido.itens
    .slice(0, 2)
    .map((item) => item.nome)
    .join(" e ");

  const valores: Record<string, string> = {
    nome: primeiroNome(pedido.cliente_nome),
    empresa: empresaNome.trim() || "Sua empresa",
    produto: produtos || "o pedido",
    pedido: String(pedido.numero),
  };

  return modelo.replace(/{{\s*(nome|empresa|produto|pedido)\s*}}/g, (_, chave: string) => valores[chave] ?? "");
}
