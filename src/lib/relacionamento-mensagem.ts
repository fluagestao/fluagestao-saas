/**
 * O texto que ela manda para quem sumiu.
 *
 * Módulo puro, sem "use server": o painel é componente de cliente e monta a
 * mensagem enquanto a pessoa escolhe a linha, sem ida ao servidor.
 *
 * O Flua NÃO envia. Isto devolve texto; quem abre o WhatsApp é ela, e a
 * conversa chega pronta para revisar antes de mandar. Não é limitação técnica
 * a contornar: disparo automático em massa é o caminho mais curto para o
 * número ser banido, e uma mensagem de reativação que a dona não leu antes é
 * exatamente a que sai errada.
 */

/** Primeiro nome, que é como se fala com cliente no WhatsApp. */
export function primeiroNome(nome: string): string {
  const limpo = nome.trim().split(/\s+/)[0] ?? nome.trim();
  return limpo.length > 1 ? limpo : nome.trim();
}

/**
 * "faz 45 dias", "faz 2 meses", "faz mais de um ano".
 *
 * Em dias corridos acima de uns dois meses o número deixa de significar algo
 * — "faz 187 dias" faz a pessoa parar para calcular, e ainda soa a cobrança de
 * cobrador. Arredondar para a unidade que ela usaria falando é mais gentil e
 * igualmente verdadeiro.
 */
export function tempoParado(dias: number): string {
  if (dias < 45) return `${dias} dias`;
  if (dias < 365) {
    const meses = Math.round(dias / 30);
    return meses <= 1 ? "mais de um mês" : `${meses} meses`;
  }
  return "mais de um ano";
}

export type DadosMensagem = {
  nome: string;
  dias: number;
  /** O que ela costuma levar. Null quando o histórico não diz. */
  produto: string | null;
  /** Nome da próxima data comemorativa, e quanto falta. */
  dataNome: string;
  /** "o" ou "a". Vem junto do dado: "o Páscoa" ia para a cliente. */
  dataArtigo: "o" | "a";
  dataDiasRestantes: number;
};

/**
 * Monta a mensagem juntando só o que é verdade.
 *
 * Cada pedaço é condicional de propósito. Citar o produto que ela costuma
 * levar é o que separa "olá, sumida" de uma mensagem que mostra que alguém
 * lembra dela — mas inventar isso quando o histórico não diz sai pior do que
 * não dizer nada. O mesmo vale para a data comemorativa: mencionar o Natal em
 * agosto não convence ninguém.
 */
export function montarMensagem(d: DadosMensagem): string {
  const linhas: string[] = [`Olá ${primeiroNome(d.nome)}, tudo bem?`];

  /* "seu último pedido de X" e nao "sua última X": o nome do produto vem do
     cadastro dela e tem genero imprevisivel. "sua última Tábua" funciona, "sua
     última Kit vinho e queijos" nao — e essa frase vai na frente da cliente. */
  const meio = d.produto
    ? `Vi aqui que faz ${tempoParado(d.dias)} desde seu último pedido de ${d.produto}`
    : `Vi aqui que faz ${tempoParado(d.dias)} desde sua última compra`;

  /* Só entra a data que está perto o bastante para ser motivo. Acima de 45
     dias ela ainda não é assunto, e a mensagem fica melhor sem. */
  const dataPerto = d.dataDiasRestantes >= 0 && d.dataDiasRestantes <= 45;

  linhas.push(dataPerto ? `${meio}, e ${d.dataArtigo} ${d.dataNome} está chegando.` : `${meio}.`);

  linhas.push(
    dataPerto
      ? "Quer ver o que temos disponível para presentear alguém especial?"
      : "Quer ver o que temos disponível por aqui?",
  );

  return linhas.join("\n");
}

/** Link que abre a conversa já com o texto. Vazio quando não há WhatsApp. */
export function linkWhatsApp(whatsapp: string | null, mensagem: string): string | null {
  const numeros = (whatsapp ?? "").replace(/\D/g, "");
  if (numeros.length < 10) return null;
  // Sem DDI digitado, assume Brasil — é o que o resto do sistema faz.
  const completo = numeros.length <= 11 ? `55${numeros}` : numeros;
  return `https://wa.me/${completo}?text=${encodeURIComponent(mensagem)}`;
}

/* ---------------------------------------------------------------- modelo ---
   O texto deixou de ser fixo no código: cada cesteira escreve do jeito dela.

   A regra que faz isso funcionar sem quebrar português: TODO marcador sempre
   vira alguma coisa, e quem escreve a frase ao redor é ela. Foi assim que a
   concordância deixou de ser problema — o sistema nao tenta adivinhar se o
   produto e masculino ou feminino, ela e quem escolhe "sua última" ou "seu
   último" olhando o que vende.

   A unica excecao e {data}: quando nao ha data comemorativa perto, a LINHA
   inteira que a menciona some. Sem isso sobraria " está chegando" sozinho no
   meio da mensagem. */

export const MARCADORES = [
  { chave: "{nome}", descricao: "primeiro nome da cliente" },
  { chave: "{tempo}", descricao: "há quanto tempo ela não compra" },
  { chave: "{produto}", descricao: "o que ela costuma levar (ou “compra”)" },
  { chave: "{data}", descricao: "a próxima data comemorativa — a linha some se não houver" },
] as const;

export const MODELO_PADRAO = `Olá {nome}, tudo bem?
Faz {tempo} desde sua última {produto} aqui com a gente.
E {data} está chegando — quer ver o que temos disponível para presentear alguém especial?`;

export type DadosModelo = {
  nome: string;
  dias: number;
  produto: string | null;
  dataNome: string;
  dataArtigo: "o" | "a";
  dataDiasRestantes: number;
};

/** Acima disto a data ainda não é assunto: citar o Natal em agosto não convence. */
const DIAS_DATA_PERTO = 45;

export function aplicarModelo(modelo: string, d: DadosModelo): string {
  const dataPerto = d.dataDiasRestantes >= 0 && d.dataDiasRestantes <= DIAS_DATA_PERTO;

  return modelo
    .split("\n")
    // Sem data por perto, a linha que a cita sai inteira.
    .filter((linha) => dataPerto || !linha.includes("{data}"))
    .map((linha) =>
      linha
        .replaceAll("{nome}", primeiroNome(d.nome))
        .replaceAll("{tempo}", tempoParado(d.dias))
        // "compra" e feminino como "cesta" e "tábua": cai bem no lugar do nome
        // do produto na maioria das frases que ela vai escrever.
        .replaceAll("{produto}", d.produto ?? "compra")
        .replaceAll("{data}", `${d.dataArtigo} ${d.dataNome}`),
    )
    .join("\n")
    .trim();
}
