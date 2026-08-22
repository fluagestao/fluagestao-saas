export type Fornecedor = {
  id: string;
  nome: string;
  telefone: string | null;
  fornece: string | null;
  observacao: string | null;
  ativo: boolean;
  gasto?: number;
};
