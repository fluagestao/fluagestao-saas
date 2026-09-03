/**
 * Tipos e catálogo dos avisos.
 *
 * Fora do módulo "use server" de propósito: lá só pode sair função async, e a
 * tela de configuração precisa importar a lista para desenhar os interruptores.
 */
/** Dias sem pagamento depois da entrega para virar aviso de cobrança. */
export const DIAS_PARA_COBRAR = 7;

/** Antecedência do aviso de data comemorativa. */
export const DIAS_DATA_ESPECIAL = 10;

export type TipoAviso =
  | "entregas_hoje"
  | "entrega_atrasada"
  | "boleto"
  | "cobranca"
  | "caixa_negativo"
  | "followup"
  | "data_especial"
  | "tarefa_prazo";

export type Aviso = {
  tipo: TipoAviso;
  familia: "operacao" | "dinheiro" | "relacionamento" | "tarefas";
  titulo: string;
  detalhe: string;
  quantidade: number;
  /** true pinta o aviso de vermelho: é problema, não recado. */
  urgente: boolean;
  /** Para onde o clique leva. */
  destino: string;
};

export const CATALOGO_AVISOS: {
  tipo: TipoAviso;
  familia: Aviso["familia"];
  rotulo: string;
  ajuda: string;
}[] = [
  { tipo: "entregas_hoje", familia: "operacao", rotulo: "Entregas de hoje", ajuda: "Quantos pedidos precisam sair hoje." },
  { tipo: "entrega_atrasada", familia: "operacao", rotulo: "Entrega atrasada", ajuda: "A data passou e o pedido não saiu." },
  { tipo: "boleto", familia: "dinheiro", rotulo: "Boleto vencendo", ajuda: "Contas a pagar que vencem hoje ou já venceram." },
  { tipo: "cobranca", familia: "dinheiro", rotulo: "Cobrança", ajuda: `Entregue e sem pagamento há mais de ${DIAS_PARA_COBRAR} dias.` },
  { tipo: "caixa_negativo", familia: "dinheiro", rotulo: "Caixa no vermelho", ajuda: "A projeção mostra o caixa negativo em algum dia à frente." },
  { tipo: "followup", familia: "relacionamento", rotulo: "Follow-up", ajuda: "Clientes no dia de pedir avaliação, ou em atraso." },
  { tipo: "data_especial", familia: "relacionamento", rotulo: "Data comemorativa", ajuda: `Avisa quando faltam ${DIAS_DATA_ESPECIAL} dias ou menos.` },
  { tipo: "tarefa_prazo", familia: "tarefas", rotulo: "Tarefa no prazo", ajuda: "Tarefa que vence hoje ou já venceu." },
];

