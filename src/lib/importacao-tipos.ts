/**
 * Gabaritos da importação por planilha.
 *
 * Módulo sem "use server" de propósito: o navegador usa para gerar o gabarito
 * e casar os cabeçalhos do arquivo; o servidor usa as mesmas definições para
 * validar. Uma fonte só — o que o gabarito pede é o que o servidor aceita.
 */

export type EntidadeImportacao = "insumos" | "fornecedores" | "clientes" | "produtos";

export const ENTIDADES: EntidadeImportacao[] = ["insumos", "fornecedores", "clientes", "produtos"];

/*
 * Teto por importacao. Nao e gosto: server action do Next 16 aceita 1MB de
 * corpo (serverActions.bodySizeLimit), e mil linhas de clientes com observacao
 * longa passam disso — o erro que aparece nao diz nada. 500 cabe com folga e
 * ja e mais do que qualquer cesteira digita numa sentada.
 */
export const MAX_LINHAS = 500;

/** Linha do gabarito cujo nome começa assim é ignorada na importação. */
export const PREFIXO_EXEMPLO = "exemplo:";

export type ColunaGabarito = {
  /** Chave interna, estável. */
  chave: string;
  /** Cabeçalho que vai no gabarito. */
  rotulo: string;
  /** Outros cabeçalhos aceitos (normalizados: minúsculo, sem acento). */
  aliases?: string[];
  obrigatoria?: boolean;
  /** Orientação curta mostrada na tela e na linha de ajuda do gabarito. */
  ajuda: string;
  exemplo: string;
};

export type DefinicaoEntidade = {
  entidade: EntidadeImportacao;
  rotulo: string;
  rotuloSingular: string;
  descricao: string;
  /** Como a importação decide que a linha "já existe". */
  chaveDuplicidade: string;
  colunas: ColunaGabarito[];
};

export const DEFINICOES: Record<EntidadeImportacao, DefinicaoEntidade> = {
  insumos: {
    entidade: "insumos",
    rotulo: "Insumos",
    rotuloSingular: "insumo",
    descricao: "O que você compra para montar os produtos. Preencha como compra: a embalagem e o preço dela.",
    chaveDuplicidade: "nome",
    colunas: [
      { chave: "nome", rotulo: "Nome", obrigatoria: true, ajuda: "Nome do insumo", exemplo: "Exemplo: Queijo colonial" },
      {
        chave: "unidade",
        rotulo: "Unidade de consumo",
        aliases: ["unidade", "un", "medida"],
        obrigatoria: true,
        ajuda: "UN, KG, G, L, ML, CX ou PCT",
        exemplo: "KG",
      },
      {
        chave: "quantidade",
        rotulo: "Quantidade por embalagem",
        aliases: ["quantidade", "qtd", "qtd embalagem", "quantidade embalagem"],
        ajuda: "Quanto vem na embalagem. Vazio = 1",
        exemplo: "1",
      },
      {
        chave: "tipo_embalagem",
        rotulo: "Tipo de embalagem",
        aliases: ["embalagem", "tipo embalagem"],
        ajuda: "pacote, caixa, garrafa...",
        exemplo: "peça",
      },
      {
        chave: "preco_embalagem",
        rotulo: "Custo da embalagem (R$)",
        aliases: ["custo da embalagem", "custo embalagem", "preco", "preço", "custo", "valor"],
        obrigatoria: true,
        ajuda: "Quanto custou a embalagem inteira",
        exemplo: "42,90",
      },
      { chave: "categoria", rotulo: "Categoria", ajuda: "Frios e queijos, Bebidas, Embalagens...", exemplo: "Frios e queijos" },
      {
        chave: "fornecedor",
        rotulo: "Fornecedor",
        ajuda: "Nome exatamente como está no cadastro de fornecedores",
        exemplo: "Atacadão",
      },
      {
        chave: "frequencia_compra",
        rotulo: "Frequência de compra",
        aliases: ["frequencia", "frequência"],
        ajuda: "semanal, quinzenal, mensal ou esporádica",
        exemplo: "semanal",
      },
      { chave: "observacao", rotulo: "Observação", aliases: ["obs", "observacoes", "observações"], ajuda: "Livre", exemplo: "Pedir sempre a peça inteira" },
    ],
  },

  fornecedores: {
    entidade: "fornecedores",
    rotulo: "Fornecedores",
    rotuloSingular: "fornecedor",
    descricao: "Quem vende para você. O nome aparece como sugestão ao lançar um pagamento.",
    chaveDuplicidade: "nome ou CNPJ/CPF",
    colunas: [
      { chave: "nome", rotulo: "Nome", obrigatoria: true, ajuda: "Nome do fornecedor", exemplo: "Exemplo: Atacadão" },
      { chave: "telefone", rotulo: "Telefone", aliases: ["whatsapp", "celular", "fone"], ajuda: "Com DDD", exemplo: "(48) 99999-0000" },
      {
        chave: "documento",
        rotulo: "CNPJ ou CPF",
        aliases: ["cnpj", "cpf", "documento", "cnpj/cpf", "cpf/cnpj"],
        ajuda: "Só números ou com pontuação, tanto faz",
        exemplo: "12.345.678/0001-90",
      },
      { chave: "tipo", rotulo: "Tipo", aliases: ["tipo de fornecedor", "tipo fornecedor"], ajuda: "Atacado, Supermercado, Hortifruti...", exemplo: "Atacado" },
      { chave: "fornece", rotulo: "O que fornece", aliases: ["fornece", "produtos"], ajuda: "Resumo do que você compra dele", exemplo: "Frios, vinhos e embalagens" },
      { chave: "endereco", rotulo: "Endereço", aliases: ["endereco", "rua"], ajuda: "Rua e número", exemplo: "Av. Centenário, 1200" },
      { chave: "cidade", rotulo: "Cidade", ajuda: "", exemplo: "Tubarão" },
      { chave: "observacao", rotulo: "Observação", aliases: ["obs", "observacoes", "observações"], ajuda: "Livre", exemplo: "Entrega às terças" },
    ],
  },

  clientes: {
    entidade: "clientes",
    rotulo: "Clientes",
    rotuloSingular: "cliente",
    descricao: "Sua lista de clientes. O WhatsApp é a chave: dois cadastros com o mesmo número viram um só.",
    chaveDuplicidade: "WhatsApp",
    colunas: [
      { chave: "nome", rotulo: "Nome", obrigatoria: true, ajuda: "Nome do cliente", exemplo: "Exemplo: Maria Souza" },
      {
        chave: "whatsapp",
        rotulo: "WhatsApp",
        aliases: ["telefone", "celular", "fone", "whats"],
        obrigatoria: true,
        ajuda: "Com DDD, 10 ou 11 dígitos",
        exemplo: "(48) 99999-0000",
      },
      { chave: "email", rotulo: "E-mail", aliases: ["email"], ajuda: "", exemplo: "maria@email.com" },
      { chave: "documento", rotulo: "CPF ou CNPJ", aliases: ["cpf", "cnpj", "documento"], ajuda: "Opcional", exemplo: "" },
      { chave: "cep", rotulo: "CEP", ajuda: "", exemplo: "88700-000" },
      { chave: "endereco", rotulo: "Endereço", aliases: ["endereco", "rua"], ajuda: "Rua e número", exemplo: "Rua das Flores, 45" },
      { chave: "bairro", rotulo: "Bairro", ajuda: "", exemplo: "Centro" },
      { chave: "cidade", rotulo: "Cidade", ajuda: "", exemplo: "Tubarão" },
      { chave: "referencia", rotulo: "Referência", aliases: ["referencia", "ponto de referencia", "ponto de referência"], ajuda: "Ajuda na entrega", exemplo: "Em frente à padaria" },
      {
        chave: "aniversario",
        rotulo: "Aniversário",
        aliases: ["aniversario", "nascimento", "data de nascimento"],
        ajuda: "DD/MM/AAAA",
        exemplo: "15/03/1990",
      },
      { chave: "observacao", rotulo: "Observação", aliases: ["obs", "observacoes", "observações"], ajuda: "Livre", exemplo: "Prefere entrega à tarde" },
    ],
  },

  produtos: {
    entidade: "produtos",
    rotulo: "Produtos",
    rotuloSingular: "produto",
    descricao: "Cestas, tábuas e kits que você vende. A composição (quais insumos entram) você monta depois, dentro do sistema.",
    chaveDuplicidade: "nome",
    colunas: [
      { chave: "nome", rotulo: "Nome", obrigatoria: true, ajuda: "Nome do produto", exemplo: "Exemplo: Cesta café da manhã" },
      {
        chave: "preco",
        rotulo: "Preço (R$)",
        aliases: ["preco", "preço", "valor", "preco de venda", "preço de venda"],
        obrigatoria: true,
        ajuda: "Preço de venda",
        exemplo: "189,90",
      },
      {
        chave: "categoria",
        rotulo: "Categoria",
        ajuda: "Nome exatamente como está no cadastro de categorias",
        exemplo: "Cestas",
      },
      { chave: "serve", rotulo: "Serve", aliases: ["serve quantas pessoas", "pessoas"], ajuda: "Ex.: 2 pessoas", exemplo: "2 pessoas" },
      { chave: "observacao", rotulo: "Descrição", aliases: ["descricao", "descrição", "observacao", "observação", "obs"], ajuda: "Texto que aparece no catálogo", exemplo: "Pães, geleia, frios e suco natural" },
      { chave: "ativo", rotulo: "Ativo", aliases: ["ativo?", "status"], ajuda: "sim ou não. Vazio = sim", exemplo: "sim" },
    ],
  },
};

export type StatusLinha = "criar" | "existe" | "erro" | "exemplo";

export type LinhaPrevia = {
  /** Número da linha no arquivo (1 = primeira linha de dados). */
  numero: number;
  status: StatusLinha;
  /** Presente quando status = erro ou existe. */
  mensagem?: string;
  /** Alertas que não impedem: um campo ficou em branco por não ter cadastro, etc. */
  avisos: string[];
  /** Valores já normalizados, prontos para mostrar. */
  dados: Record<string, string>;
};

export type ResumoPrevia = {
  total: number;
  criar: number;
  existe: number;
  erro: number;
  exemplo: number;
};

export type ResultadoImportacao = {
  id: string;
  criados: number;
  pulados: number;
  comErro: number;
};

export type LoteImportacao = {
  id: string;
  entidade: EntidadeImportacao;
  arquivo: string | null;
  total_linhas: number;
  criados: number;
  pulados: number;
  com_erro: number;
  desfeita_em: string | null;
  desfeitos: number | null;
  created_at: string;
};

export function resumir(linhas: LinhaPrevia[]): ResumoPrevia {
  return linhas.reduce(
    (acc, l) => {
      acc.total += 1;
      acc[l.status] += 1;
      return acc;
    },
    { total: 0, criar: 0, existe: 0, erro: 0, exemplo: 0 },
  );
}
