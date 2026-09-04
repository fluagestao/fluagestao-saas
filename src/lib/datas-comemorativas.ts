import { hojeISO, somarDias } from "./prazo";

export type DataComemorativa = {
  nome: string;
  /* Chave estavel gravada em pedidos.ocasiao. NUNCA derivada do nome em tempo
     de execucao: se um dia o rotulo virar "Dia dos Irmãos", os pedidos antigos
     precisam continuar casando. Renomear e de graca; mudar o slug parte o
     historico ao meio, calado. */
  slug: string;
  /* Artigo que acompanha o nome numa frase. Existe porque "o Páscoa" e "o Black
     Friday" iam para a cliente na mensagem do Relacionamento. Obrigatorio de
     proposito: quem acrescentar uma data nova e forcado a decidir. */
  artigo: "o" | "a";
  data: string;
  mensagem: string;
};

export type ProximaDataComemorativa = DataComemorativa & {
  diasRestantes: number;
};

function iso(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function dataUTC(data: string): Date {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function enesimoDiaDaSemana(
  ano: number,
  mes: number,
  diaDaSemana: number,
  ocorrencia: number,
): string {
  const primeiro = new Date(Date.UTC(ano, mes - 1, 1));
  const deslocamento = (diaDaSemana - primeiro.getUTCDay() + 7) % 7;
  return iso(ano, mes, 1 + deslocamento + (ocorrencia - 1) * 7);
}

function ultimoDiaDaSemana(
  ano: number,
  mes: number,
  diaDaSemana: number,
): string {
  const ultimo = new Date(Date.UTC(ano, mes, 0));
  const deslocamento = (ultimo.getUTCDay() - diaDaSemana + 7) % 7;
  return iso(ano, mes, ultimo.getUTCDate() - deslocamento);
}

function pascoa(ano: number): string {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(ano, mes, dia);
}

function diasEntre(inicio: string, fim: string): number {
  return Math.round((dataUTC(fim).getTime() - dataUTC(inicio).getTime()) / 86_400_000);
}

export function datasComemorativasDoAno(ano: number): DataComemorativa[] {
  const datas: DataComemorativa[] = [
    {
      nome: "Ano Novo",
      slug: "ano-novo",
      artigo: "o",
      data: iso(ano, 1, 1),
      mensagem: "Antecipe kits de celebração e presentes para começar o ano.",
    },
    {
      nome: "Dia Internacional da Mulher",
      slug: "dia-da-mulher",
      artigo: "o",
      data: iso(ano, 3, 8),
      mensagem: "Prepare presentes e campanhas para homenagear mulheres especiais.",
    },
    {
      nome: "Páscoa",
      slug: "pascoa",
      artigo: "a",
      data: pascoa(ano),
      mensagem: "Planeje cestas, chocolates e encomendas sazonais com antecedência.",
    },
    {
      nome: "Dia das Mães",
      slug: "dia-das-maes",
      artigo: "o",
      data: enesimoDiaDaSemana(ano, 5, 0, 2),
      mensagem: "Organize campanhas, presentes e entregas para uma das maiores datas do ano.",
    },
    {
      nome: "Dia dos Namorados",
      slug: "dia-dos-namorados",
      artigo: "o",
      data: iso(ano, 6, 12),
      mensagem: "Prepare kits românticos, cartões e entregas com horário marcado.",
    },
    {
      nome: "Dia dos Avós",
      slug: "dia-dos-avos",
      artigo: "o",
      data: iso(ano, 7, 26),
      mensagem: "Crie opções carinhosas de presente para avós e famílias.",
    },
    {
      nome: "Dia dos Pais",
      slug: "dia-dos-pais",
      artigo: "o",
      data: enesimoDiaDaSemana(ano, 8, 0, 2),
      mensagem: "Antecipe combos, lembranças e campanhas para celebrar os pais.",
    },
    {
      nome: "Dia do Irmão",
      slug: "dia-do-irmao",
      artigo: "o",
      data: iso(ano, 9, 5),
      mensagem: "Aproveite a data para divulgar presentes e pequenas surpresas.",
    },
    {
      nome: "Dia do Cliente",
      slug: "dia-do-cliente",
      artigo: "o",
      data: iso(ano, 9, 15),
      mensagem: "Planeje ações de agradecimento, cupons e mimos para clientes.",
    },
    {
      nome: "Dia das Crianças",
      slug: "dia-das-criancas",
      artigo: "o",
      data: iso(ano, 10, 12),
      mensagem: "Prepare campanhas, encomendas e kits especiais com antecedência.",
    },
    {
      nome: "Dia dos Professores",
      slug: "dia-dos-professores",
      artigo: "o",
      data: iso(ano, 10, 15),
      mensagem: "Divulgue lembranças e presentes para homenagear professores.",
    },
    {
      nome: "Halloween",
      slug: "halloween",
      artigo: "o",
      data: iso(ano, 10, 31),
      mensagem: "Planeje produtos temáticos e ações divertidas para a data.",
    },
    {
      nome: "Black Friday",
      slug: "black-friday",
      artigo: "a",
      data: ultimoDiaDaSemana(ano, 11, 5),
      mensagem: "Organize ofertas, estoque e capacidade de entrega para a campanha.",
    },
    {
      nome: "Natal",
      slug: "natal",
      artigo: "o",
      data: iso(ano, 12, 25),
      mensagem: "Antecipe cestas, presentes e a operação de entregas de fim de ano.",
    },
  ];

  return datas.sort((a, b) => a.data.localeCompare(b.data));
}

export function proximasDatasComemorativas(
  agora: Date = new Date(),
  limite = 6,
): ProximaDataComemorativa[] {
  const hoje = hojeISO(agora);
  const ano = Number(hoje.slice(0, 4));

  return [
    ...datasComemorativasDoAno(ano),
    ...datasComemorativasDoAno(ano + 1),
  ]
    .filter((evento) => evento.data >= hoje)
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, limite)
    .map((evento) => ({
      ...evento,
      diasRestantes: diasEntre(hoje, evento.data),
    }));
}

export function proximaDataComemorativa(
  agora: Date = new Date(),
): ProximaDataComemorativa {
  return proximasDatasComemorativas(agora, 1)[0] ?? {
    nome: "Próxima data especial",
    slug: "proxima-data",
    artigo: "a",
    data: somarDias(hojeISO(agora), 1),
    mensagem: "Antecipe suas campanhas e encomendas para as próximas datas.",
    diasRestantes: 1,
  };
}


/* ------------------------------------------------------------- ocasiões ---
   O "porquê" de um pedido. As datas do calendário já estão acima; aqui entram
   as que não têm dia fixo e vivem o ano inteiro.

   Sem cadastro de Ocasiões na tela de propósito: seria mais um lugar para
   manter e para desalinhar. A lista do calendário já se atualiza sozinha a
   cada ano, e estas cinco não mudam. */

export type Ocasiao = { slug: string; label: string; artigo: "o" | "a" };

export const OCASIOES_PESSOAIS: Ocasiao[] = [
  { slug: "aniversario", label: "Aniversário", artigo: "o" },
  { slug: "casamento", label: "Casamento", artigo: "o" },
  { slug: "nascimento", label: "Nascimento", artigo: "o" },
  { slug: "agradecimento", label: "Agradecimento", artigo: "o" },
  { slug: "corporativo", label: "Pedido corporativo", artigo: "o" },
];

/** Tudo que pode ser escolhido: as datas do ano mais as perenes. */
export function ocasioesDisponiveis(ano: number = new Date().getFullYear()): Ocasiao[] {
  const doCalendario = datasComemorativasDoAno(ano)
    .filter((d) => d.slug !== "proxima-data")
    .map((d) => ({ slug: d.slug, label: d.nome, artigo: d.artigo }));

  return [...doCalendario, ...OCASIOES_PESSOAIS];
}

/**
 * Nome para mostrar. Slug desconhecido — de uma data que saiu da lista — vira
 * texto legível em vez de sumir: o pedido antigo continua dizendo o que era.
 */
export function ocasiaoPorSlug(slug: string | null | undefined): Ocasiao | null {
  if (!slug) return null;
  const achada = ocasioesDisponiveis().find((o) => o.slug === slug);
  if (achada) return achada;
  /* Slug de uma data que saiu da lista: vira texto legivel em vez de sumir, e
     o artigo cai no masculino, que erra menos. */
  return {
    slug,
    label: slug.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase()),
    artigo: "o",
  };
}

export function rotuloOcasiao(slug: string | null | undefined): string | null {
  return ocasiaoPorSlug(slug)?.label ?? null;
}

/**
 * Palpite pela data de entrega: entrega perto de uma data comemorativa quase
 * sempre É aquela data. Serve para pré-marcar o chip no pedido e para o
 * preenchimento retroativo — nos dois casos como sugestão, nunca como verdade.
 */
export function ocasiaoSugerida(
  dataEntrega: string | null | undefined,
  janelaDias = 10,
): Ocasiao | null {
  if (!dataEntrega) return null;
  const ano = Number(dataEntrega.slice(0, 4));
  if (!Number.isFinite(ano)) return null;

  /* Olha o ano anterior e o seguinte tambem: entrega de 02/01 esta a um dia do
     Ano Novo, que pertence ao ano de tras. */
  const candidatas = [
    ...datasComemorativasDoAno(ano - 1),
    ...datasComemorativasDoAno(ano),
    ...datasComemorativasDoAno(ano + 1),
  ].filter((d) => d.slug !== "proxima-data");

  let melhor: DataComemorativa | null = null;
  let menor = Number.POSITIVE_INFINITY;

  for (const d of candidatas) {
    const dist = Math.abs(diasEntre(d.data, dataEntrega));
    if (dist <= janelaDias && dist < menor) {
      menor = dist;
      melhor = d;
    }
  }

  return melhor ? { slug: melhor.slug, label: melhor.nome, artigo: melhor.artigo } : null;
}
