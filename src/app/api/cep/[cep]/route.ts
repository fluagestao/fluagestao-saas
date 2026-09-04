type EnderecoCep = {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
};

async function consultarViaCep(cep: string): Promise<EnderecoCep | null> {
  const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
    signal: AbortSignal.timeout(4000),
  });
  if (!resposta.ok) return null;

  const dados = (await resposta.json()) as {
    /* String, nao booleano: o ViaCEP responde `{"erro": "true"}` para CEP que
       nao existe. O tipo dizia `boolean` e a checagem funcionava por acidente
       — "true" e truthy. O acidente tinha um custo: no dia em que a resposta
       trouxesse `"false"`, ela tambem seria truthy e um CEP valido viraria
       "nao encontrado". Versoes antigas mandavam o booleano, entao os dois
       formatos ficam declarados. */
    erro?: boolean | string;
    logradouro?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
  };

  /* Erro e a ausencia de negacao, nao a presenca de "true": assim uma mudanca
     de formato do ViaCEP (`1`, `"sim"`, o que for) continua sendo tratada como
     erro, em vez de deixar passar um endereco vazio como se fosse valido. */
  const semRegistro =
    dados.erro !== undefined && dados.erro !== false && dados.erro !== "false";
  if (semRegistro) return null;

  return {
    cep,
    logradouro: dados.logradouro ?? "",
    bairro: dados.bairro ?? "",
    cidade: dados.localidade ?? "",
    uf: dados.uf ?? "",
  };
}

async function consultarBrasilApi(cep: string): Promise<EnderecoCep | null> {
  const resposta = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`, {
    signal: AbortSignal.timeout(4000),
  });
  if (!resposta.ok) return null;

  const dados = (await resposta.json()) as {
    street?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };

  /* Sem cidade nao ha endereco. Devolver o objeto vazio faria a rota responder
     200 com tudo em branco, e a tela trataria como sucesso — pior que o 404,
     porque nao ha o que dizer para a pessoa. */
  if (!dados.city) return null;

  return {
    cep,
    logradouro: dados.street ?? "",
    bairro: dados.neighborhood ?? "",
    cidade: dados.city ?? "",
    uf: dados.state ?? "",
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ cep: string }> },
) {
  const { cep: recebido } = await context.params;
  const cep = recebido.replace(/\D/g, "");

  if (!/^\d{8}$/.test(cep)) {
    return Response.json({ erro: "CEP inválido." }, { status: 400 });
  }

  try {
    const endereco =
      (await consultarViaCep(cep).catch(() => null)) ??
      (await consultarBrasilApi(cep).catch(() => null));

    if (!endereco) {
      return Response.json({ erro: "CEP não encontrado." }, { status: 404 });
    }

    return Response.json(endereco, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch {
    return Response.json({ erro: "Não foi possível consultar o CEP." }, { status: 503 });
  }
}
