// Taxa de entrega por bairro. Puro: sem UI, sem Supabase.
//
// A mesma função roda no cliente (mostra a conta enquanto se preenche o pedido)
// e no servidor (que é a autoridade sobre o valor gravado). É isso que garante
// que os dois nunca divirjam.

import { ehDomingo } from "./prazo";

export type Bairro = {
  id: string;
  nome: string;
  taxa: number;
  observacao: string | null;
  ordem: number;
  ativo: boolean;
};

export type Frete = {
  base: number;
  adicional: number;
  total: number;
  /** "Vila Moema — R$ 15,00 + R$ 5,00 domingo = R$ 20,00", pronto pra tela. */
  explicacao: string;
};

function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Frete do bairro na data. Devolve null quando não há bairro escolhido — aí a
 * taxa é digitada à mão, como sempre foi.
 */
export function calcularFrete(
  bairro: Bairro | null | undefined,
  data_entrega: string | null | undefined,
  adicional_domingo: number,
): Frete | null {
  if (!bairro) return null;
  const base = Number(bairro.taxa) || 0;
  const adicional = ehDomingo(data_entrega) ? Math.max(0, Number(adicional_domingo) || 0) : 0;
  const total = base + adicional;
  const explicacao = adicional
    ? `${bairro.nome} — ${brl(base)} + ${brl(adicional)} domingo = ${brl(total)}`
    : `${bairro.nome} — ${brl(base)}`;
  return { base, adicional, total, explicacao };
}

/** Casa o bairro que veio do ViaCEP com o cadastro, ignorando acento e caixa. */
export function acharBairro(bairros: Bairro[], nome: string | null | undefined): Bairro | null {
  if (!nome) return null;
  const chave = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  const alvo = chave(nome);
  return bairros.find((b) => chave(b.nome) === alvo) ?? null;
}
