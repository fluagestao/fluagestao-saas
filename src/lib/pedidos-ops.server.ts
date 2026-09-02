export type Cliente = {
  id: string;
  nome: string;
  whatsapp: string | null;
  email: string | null;
  documento: string | null;
  cep: string | null;
  endereco: string | null;
  bairro: string | null;
  referencia: string | null;
  aniversario: string | null;
  observacao: string | null;
  ativo: boolean;
};

export type ClienteComHistorico = Cliente & {
  pedidos: number;
  gasto: number;
  ultimo: string | null;
};

export type VendaAgrupada = {
  chave: string;
  nome: string;
  sub?: string;
  qtd: number;
  valor: number;
};

export type DashboardVendas = {
  totalVendido: number;
  totalPedidos: number;
  ticketMedio: number;
  produtos: VendaAgrupada[];
  adicionais: VendaAgrupada[];
  porCategoria: VendaAgrupada[];
  porColecao: VendaAgrupada[];
  porPagamento: VendaAgrupada[];
  colecoes: { id: string; nome: string }[];
  /** Quanto o adicional acompanha a cesta, e quanto ele soma ao ticket. */
  anexo: {
    comAdicional: number;
    semAdicional: number;
    soAdicional: number;
    taxa: number;
    ticketComAdicional: number;
    ticketSemAdicional: number;
  };
};
