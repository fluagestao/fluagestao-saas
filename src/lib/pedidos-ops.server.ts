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

/** Um mês da série do ano. Sempre os 12, mesmo os sem venda. */
export type MesDaSerie = {
  /** 1 a 12. */
  mes: number;
  pedidos: number;
  /** Cestas, tábuas, cafés — o que dá para virar meta. */
  principais: number;
  adicionais: number;
  valor: number;
};

export type DashboardVendas = {
  totalVendido: number;
  totalPedidos: number;
  ticketMedio: number;
  /** Quantas unidades saíram, separadas: meta se estipula sobre a principal. */
  unidades: { principais: number; adicionais: number };
  /** Os 12 meses do ano selecionado, para enxergar sazonalidade. */
  serieMensal: MesDaSerie[];
  /** Mesmo período anterior (mês passado ou ano passado). Null se não houver. */
  anterior: { pedidos: number; principais: number; valor: number } | null;
  /** Rótulo pronto do período anterior: "agosto", "2025". */
  rotuloAnterior: string;
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
