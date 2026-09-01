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
    erro?: boolean;
    logradouro?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
  };
  if (dados.erro) return null;

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
