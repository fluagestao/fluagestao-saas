export type Fornecedor = {
  id: string;
  nome: string;
  telefone: string | null;
  fornece: string | null;
  observacao: string | null;
  ativo: boolean;
  /** CPF (11 digitos) ou CNPJ (14), sem pontuacao. */
  documento?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  tipo_fornecedor_id?: string | null;
  /** Nome do tipo, resolvido na leitura. Nao existe na tabela. */
  tipo_fornecedor?: string | null;
  gasto?: number;
};

export type TipoFornecedor = { id: string; nome: string };
