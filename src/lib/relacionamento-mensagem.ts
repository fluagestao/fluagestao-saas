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
