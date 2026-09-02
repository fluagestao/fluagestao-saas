// Entradas e saídas de dinheiro. Puro: sem UI, sem Supabase.

export type Movimento = {
  id: string;
  tipo: "entrada" | "saida";
  data: string; // YYYY-MM-DD
  valor: number;
  descricao: string;
  fornecedor: string | null;
  tipo_despesa: string | null;
  /** Entrada que veio de um pedido pago — não existe na tabela, é derivada. */
  pedido_numero?: number | null;
  /** Forma de pagamento do pedido de origem. Derivada, como o número. */
  forma_pagamento?: string | null;
};

export type ResumoCaixa = { entradas: number; saidas: number; saldo: number };

export function resumoDoCaixa(movs: Movimento[]): ResumoCaixa {
  let entradas = 0;
  let saidas = 0;
  for (const m of movs) {
    if (m.tipo === "entrada") entradas += m.valor;
    else saidas += m.valor;
  }
  return { entradas, saidas, saldo: entradas - saidas };
}

/** Agrupa por dia, do mais recente para o mais antigo. */
export function porDia(movs: Movimento[]): { dia: string; itens: Movimento[]; total: number }[] {
  const mapa = new Map<string, Movimento[]>();
  for (const m of movs) {
    mapa.set(m.data, [...(mapa.get(m.data) ?? []), m]);
  }
  return [...mapa.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([dia, itens]) => ({
      dia,
      itens,
      total: itens.reduce((t, i) => t + (i.tipo === "entrada" ? i.valor : -i.valor), 0),
    }));
}
