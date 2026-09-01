import type { PedidoFollowup } from "@/lib/followup-ops.server";

export type TipoMensagemAvaliacao = "presente" | "consumo_proprio";

export type ModelosAvaliacao = Record<TipoMensagemAvaliacao, string>;

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
