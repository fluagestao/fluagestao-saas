// Versículo do dia da tela inicial do painel.
//
// A lista mora no código de propósito: sem chamada de rede, sem API que pode
// sair do ar, e o versículo é sempre o mesmo para todo mundo naquele dia.
//
// Para trocar ou acrescentar, é só editar a lista — a escolha do dia é
// automática. As traduções variam entre versões da Bíblia; estes textos
// seguem o português mais corrente e podem ser ajustados ao gosto da casa.

export type Versiculo = { texto: string; referencia: string };

export const VERSICULOS: Versiculo[] = [
  { texto: "Tudo posso naquele que me fortalece.", referencia: "Filipenses 4:13" },
  {
    texto: "O Senhor é o meu pastor, nada me faltará.",
    referencia: "Salmos 23:1",
  },
  {
    texto: "Entrega o teu caminho ao Senhor, confia nele, e ele tudo fará.",
    referencia: "Salmos 37:5",
  },
  {
    texto: "Alegrem-se na esperança, sejam pacientes na tribulação, perseverem na oração.",
    referencia: "Romanos 12:12",
  },
  {
    texto: "Tudo o que fizerem, façam de todo o coração, como para o Senhor.",
    referencia: "Colossenses 3:23",
  },
  {
    texto: "O amor é paciente, o amor é bondoso. Tudo sofre, tudo crê, tudo espera.",
    referencia: "1 Coríntios 13:4,7",
  },
  {
    texto: "Seja forte e corajoso. O Senhor, o seu Deus, estará com você por onde você andar.",
    referencia: "Josué 1:9",
  },
  {
    texto: "Lancem sobre ele toda a sua ansiedade, porque ele tem cuidado de vocês.",
    referencia: "1 Pedro 5:7",
  },
  {
    texto: "O Senhor é a minha luz e a minha salvação; de quem terei medo?",
    referencia: "Salmos 27:1",
  },
  {
    texto: "Melhor é serem dois do que um, porque têm melhor recompensa no seu trabalho.",
    referencia: "Eclesiastes 4:9",
  },
  {
    texto: "Confie no Senhor de todo o seu coração e não se apoie em seu próprio entendimento.",
    referencia: "Provérbios 3:5",
  },
  {
    texto: "Este é o dia que o Senhor fez; alegremo-nos e regozijemo-nos nele.",
    referencia: "Salmos 118:24",
  },
  {
    texto: "A alegria do Senhor é a nossa força.",
    referencia: "Neemias 8:10",
  },
  {
    texto: "Deem graças em todas as circunstâncias.",
    referencia: "1 Tessalonicenses 5:18",
  },
  {
    texto: "O que sai da boca do justo é sabedoria, e a sua língua fala o que é justo.",
    referencia: "Salmos 37:30",
  },
  {
    texto: "Não se esqueçam da hospitalidade e de repartir o que vocês têm.",
    referencia: "Hebreus 13:16",
  },
  {
    texto: "As palavras agradáveis são como um favo de mel: doçura para a alma.",
    referencia: "Provérbios 16:24",
  },
  {
    texto: "Há mais felicidade em dar do que em receber.",
    referencia: "Atos 20:35",
  },
  {
    texto: "Que a paz de Cristo seja o juiz em seu coração, e sejam agradecidos.",
    referencia: "Colossenses 3:15",
  },
  {
    texto: "O coração do homem planeja o seu caminho, mas o Senhor lhe dirige os passos.",
    referencia: "Provérbios 16:9",
  },
  {
    texto: "Sejam bondosos e compassivos uns para com os outros.",
    referencia: "Efésios 4:32",
  },
  {
    texto: "Fortes são as mãos que trabalham com alegria.",
    referencia: "Provérbios 31:17",
  },
  {
    texto: "Assim brilhe a luz de vocês diante dos homens.",
    referencia: "Mateus 5:16",
  },
  {
    texto: "Não andem ansiosos por coisa alguma.",
    referencia: "Filipenses 4:6",
  },
  {
    texto: "O trabalho diligente traz fartura.",
    referencia: "Provérbios 13:4",
  },
  {
    texto: "Servam uns aos outros mediante o amor.",
    referencia: "Gálatas 5:13",
  },
  {
    texto: "A esperança não decepciona.",
    referencia: "Romanos 5:5",
  },
  {
    texto: "Grandes coisas fez o Senhor por nós, por isso estamos alegres.",
    referencia: "Salmos 126:3",
  },
  {
    texto: "Cada um exerça o dom que recebeu para servir aos outros.",
    referencia: "1 Pedro 4:10",
  },
  {
    texto: "As misericórdias do Senhor se renovam a cada manhã.",
    referencia: "Lamentações 3:22-23",
  },
  {
    texto: "Buscai primeiro o Reino de Deus, e todas as demais coisas vos serão acrescentadas.",
    referencia: "Mateus 6:33",
  },
];

/**
 * Versículo do dia, escolhido pela data — todo mundo vê o mesmo, e ele só muda
 * quando o dia vira. `dataISO` no formato YYYY-MM-DD.
 */
export function versiculoDoDia(dataISO: string): Versiculo {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  // Dias desde 1970 em UTC: um número que anda de 1 em 1 a cada dia.
  const diasCorridos = Math.floor(Date.UTC(ano, mes - 1, dia) / 86_400_000);
  return VERSICULOS[Math.abs(diasCorridos) % VERSICULOS.length];
}

/** "Bom dia" / "Boa tarde" / "Boa noite" pelo horário de Tubarão. */
export function saudacao(now = new Date()): string {
  const hora = Number(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hour12: false,
    }).format(now),
  );
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}
