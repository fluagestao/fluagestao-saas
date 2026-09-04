import { hojeISO, somarDias } from "./prazo";

export type DataComemorativa = {
  nome: string;
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
      artigo: "o",
      data: iso(ano, 1, 1),
      mensagem: "Antecipe kits de celebração e presentes para começar o ano.",
    },
    {
      nome: "Dia Internacional da Mulher",
      artigo: "o",
      data: iso(ano, 3, 8),
      mensagem: "Prepare presentes e campanhas para homenagear mulheres especiais.",
    },
    {
      nome: "Páscoa",
      artigo: "a",
      data: pascoa(ano),
      mensagem: "Planeje cestas, chocolates e encomendas sazonais com antecedência.",
    },
    {
      nome: "Dia das Mães",
      artigo: "o",
      data: enesimoDiaDaSemana(ano, 5, 0, 2),
      mensagem: "Organize campanhas, presentes e entregas para uma das maiores datas do ano.",
    },
    {
      nome: "Dia dos Namorados",
      artigo: "o",
      data: iso(ano, 6, 12),
      mensagem: "Prepare kits românticos, cartões e entregas com horário marcado.",
    },
    {
      nome: "Dia dos Avós",
      artigo: "o",
      data: iso(ano, 7, 26),
      mensagem: "Crie opções carinhosas de presente para avós e famílias.",
    },
    {
      nome: "Dia dos Pais",
      artigo: "o",
      data: enesimoDiaDaSemana(ano, 8, 0, 2),
      mensagem: "Antecipe combos, lembranças e campanhas para celebrar os pais.",
    },
    {
      nome: "Dia do Irmão",
      artigo: "o",
      data: iso(ano, 9, 5),
      mensagem: "Aproveite a data para divulgar presentes e pequenas surpresas.",
    },
    {
      nome: "Dia do Cliente",
      artigo: "o",
      data: iso(ano, 9, 15),
      mensagem: "Planeje ações de agradecimento, cupons e mimos para clientes.",
    },
    {
      nome: "Dia das Crianças",
      artigo: "o",
      data: iso(ano, 10, 12),
      mensagem: "Prepare campanhas, encomendas e kits especiais com antecedência.",
    },
    {
      nome: "Dia dos Professores",
      artigo: "o",
      data: iso(ano, 10, 15),
      mensagem: "Divulgue lembranças e presentes para homenagear professores.",
    },
    {
      nome: "Halloween",
      artigo: "o",
      data: iso(ano, 10, 31),
      mensagem: "Planeje produtos temáticos e ações divertidas para a data.",
    },
    {
      nome: "Black Friday",
      artigo: "a",
      data: ultimoDiaDaSemana(ano, 11, 5),
      mensagem: "Organize ofertas, estoque e capacidade de entrega para a campanha.",
    },
    {
      nome: "Natal",
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
    artigo: "a",
    data: somarDias(hojeISO(agora), 1),
    mensagem: "Antecipe suas campanhas e encomendas para as próximas datas.",
    diasRestantes: 1,
  };
}
