// Traduz o que dá errado para uma frase que diz o que fazer.
//
// Três origens de erro chegam na tela: validação (faltou preencher), banco
// (regra violada) e migration pendente. Todas apareciam como "erro ao salvar",
// que não ajuda ninguém.

/** Nome da coluna → como o campo se chama na tela. */
const ROTULOS: Record<string, string> = {
  nome: "Nome",
  titulo: "Título",
  descricao: "Descrição",
  valor: "Valor",
  preco: "Preço",
  custo: "Custo",
  quantidade: "Quantidade",
  qtd: "Quantidade",
  cliente_nome: "Cliente",
  cliente_whatsapp: "WhatsApp",
  whatsapp: "WhatsApp",
  email: "E-mail",
  documento: "CNPJ/CPF",
  categoria_id: "Categoria",
  fornecedor_id: "Fornecedor",
  insumo_id: "Insumo",
  produto_id: "Produto",
  competencia: "Competência",
  vencimento: "Vencimento",
  pago_em: "Data do pagamento",
  recebido_em: "Data do recebimento",
  data_entrega: "Data de entrega",
  prazo: "Prazo",
  itens: "Itens",
  status: "Status",
  tipo: "Tipo",
  unidade: "Unidade",
  slug: "Endereço do produto",
  cep: "CEP",
  endereco: "Endereço",
  bairro: "Bairro",
  cartao_mensagem: "Mensagem do cartão",
  forma_pagamento: "Forma de pagamento",
  taxa_entrega: "Taxa de entrega",
  despesas_pct: "Despesas %",
  margem_pct: "Margem %",
};

function rotulo(campo: string): string {
  return ROTULOS[campo] ?? campo.replace(/_/g, " ");
}

/** Traduz uma falha de validação do zod para linguagem de gente. */
function daValidacao(issues: { path?: (string | number)[]; code?: string; message?: string }[]) {
  const faltando: string[] = [];
  const invalidos: string[] = [];

  for (const i of issues) {
    const campo = rotulo(String(i.path?.[0] ?? ""));
    const msg = i.message ?? "";
    // O zod usa "Required" e "expected ... received undefined" pra campo vazio.
    if (
      i.code === "invalid_type" &&
      /required|received undefined|received null/i.test(msg)
    ) {
      faltando.push(campo);
    } else if (/too_small|at least|greater than/i.test(`${i.code} ${msg}`)) {
      faltando.push(campo);
    } else {
      invalidos.push(`${campo}${msg ? ` (${msg})` : ""}`);
    }
  }

  const partes: string[] = [];
  if (faltando.length) {
    const unicos = [...new Set(faltando)];
    partes.push(
      unicos.length === 1
        ? `Falta preencher: ${unicos[0]}.`
        : `Faltam preencher: ${unicos.join(", ")}.`,
    );
  }
  if (invalidos.length) {
    partes.push(`Confira: ${[...new Set(invalidos)].join(", ")}.`);
  }
  return partes.join(" ");
}

/**
 * Tira o nome da coluna de mensagens cruas do Postgres.
 * Aceita "column pedidos.cliente_id" e devolve a coluna, não a tabela.
 */
function campoNaMensagem(msg: string): string | null {
  const m =
    msg.match(/column "?(?:[a-z_]+\.)?([a-z_]+)"?/i) ??
    msg.match(/coluna "?(?:[a-z_]+\.)?([a-z_]+)"?/i) ??
    msg.match(/Key \(([a-z_]+)\)/i) ??
    msg.match(/"([a-z_]+)" violates/i);
  return m?.[1] ?? null;
}

/**
 * Mensagem final para a tela. Sempre devolve algo acionável — nunca string
 * vazia, nunca "[object Object]".
 */
export function mensagemDeErro(e: unknown, contexto = "salvar"): string {
  if (!e) return `Não consegui ${contexto}. Tente de novo.`;

  const bruto = e as {
    message?: string;
    code?: string;
    issues?: { path?: (string | number)[]; code?: string; message?: string }[];
    name?: string;
  };

  // 1) Validação (zod), venha como objeto ou serializada em texto.
  if (Array.isArray(bruto.issues) && bruto.issues.length) {
    return daValidacao(bruto.issues);
  }
  const texto = String(bruto.message ?? e);
  if (texto.trim().startsWith("[") && texto.includes('"path"')) {
    try {
      const issues = JSON.parse(texto);
      if (Array.isArray(issues) && issues.length) return daValidacao(issues);
    } catch {
      /* segue para os outros casos */
    }
  }

  // 2) Regras do banco.
  const codigo = bruto.code ?? "";
  const campo = campoNaMensagem(texto);

  if (codigo === "23502" || /not-null|null value in column/i.test(texto)) {
    return campo ? `Falta preencher: ${rotulo(campo)}.` : "Falta preencher um campo obrigatório.";
  }
  if (codigo === "23505" || /duplicate key|already exists/i.test(texto)) {
    return campo
      ? `Já existe um registro com esse ${rotulo(campo).toLowerCase()}.`
      : "Esse registro já existe.";
  }
  if (codigo === "23503" || /foreign key/i.test(texto)) {
    return "Esse item está sendo usado em outro lugar e não pode ser removido.";
  }
  if (codigo === "23514" || /check constraint/i.test(texto)) {
    return "Algum valor não é aceito aqui. Confira as opções do formulário.";
  }
  if (codigo === "22P02" || /invalid input syntax/i.test(texto)) {
    return campo
      ? `O valor de ${rotulo(campo)} está em formato inválido.`
      : "Algum valor está em formato inválido.";
  }

  // 3) Migration pendente — dá o nome do que falta.
  if (/does not exist|schema cache|PGRST205|42P01|42703/i.test(`${codigo} ${texto}`)) {
    const tabela = texto.match(/table '?(?:public\.)?([a-z_]+)'?/i)?.[1];
    if (campo) {
      return `O sistema pede o campo "${rotulo(campo)}", que ainda não existe no banco. Fale com o Lucas: falta rodar uma migration.`;
    }
    return `Falta criar ${tabela ? `a tabela "${tabela}"` : "uma tabela"} no banco. Fale com o Lucas: falta rodar uma migration.`;
  }

  // 4) Sessão e rede.
  if (/unauthorized|não autorizado|acesso negado/i.test(texto)) {
    return "Sua sessão expirou ou você não tem permissão. Saia e entre de novo.";
  }
  if (/failed to fetch|networkerror|load failed/i.test(texto)) {
    return "Sem conexão com o servidor. Confira a internet e tente de novo.";
  }

  // 5) Sobrou o texto original, que já é melhor que "erro".
  return texto.length > 2 && texto.length < 200
    ? texto
    : `Não consegui ${contexto}. Tente de novo.`;
}
