/** Um pedido já entregue, do jeito que a tela de Follow-up precisa dele. */
export type PedidoFollowup = {
  id: string;
  numero: number;
  cliente_nome: string | null;
  cliente_whatsapp: string | null;
  itens: { nome: string; qtd: number; variacao?: string | null }[];
  total: number;
  data_entrega: string | null;
  created_at: string | null;
  /** null = ainda não convidamos essa pessoa a avaliar. */
  avaliacao_pedida_em: string | null;
  /** Quantas entregas essa pessoa já recebeu, contando esta. */
  compras: number;
};
