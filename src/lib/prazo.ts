// Prazo desejado pelo cliente ("para quando você precisa?"). Serve para o
// atendimento priorizar quem tem a data mais apertada — o pedido em si continua
// sendo fechado no WhatsApp.

const TZ = "America/Sao_Paulo";

export type PrazoOpcao = "hoje" | "amanha" | "data";

/**
 * Hoje em Tubarão no formato YYYY-MM-DD.
 *
 * Passa pelo Intl em vez de `toISOString()` porque o servidor (SSR) roda em UTC:
 * depois das 21h no horário de Brasília o UTC já virou o dia, e o cliente veria
 * "hoje" apontando para amanhã.
 */
export function hojeISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Soma dias a uma data YYYY-MM-DD, em UTC puro (sem horário de verão no meio). */
export function somarDias(iso: string, dias: number): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(ano, mes - 1, dia));
  dt.setUTCDate(dt.getUTCDate() + dias);
  return dt.toISOString().slice(0, 10);
}

/** "2026-08-15" → "15/08" */
export function formatarDataCurta(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

const DIAS_SEMANA = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;

/** "2026-08-15" → "Sábado, 15/08" */
export function formatarDataLonga(iso: string): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const diaSemana = DIAS_SEMANA[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()];
  return `${diaSemana}, ${formatarDataCurta(iso)}`;
}

/**
 * A data cai num domingo? (entrega de domingo tem adicional no frete)
 *
 * Opera sobre a string YYYY-MM-DD em UTC puro, como `formatarDataLonga`: a data
 * já vem escolhida, então não há fuso envolvido.
 */
export function ehDomingo(iso: string | null | undefined): boolean {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay() === 0;
}

/**
 * Texto que vai na mensagem do WhatsApp. As opções rápidas carregam a data
 * concreta junto ("Hoje (11/08)") para a mensagem continuar fazendo sentido
 * quando for lida no dia seguinte.
 */
export function rotuloPrazo(
  opcao: PrazoOpcao,
  dataEscolhida: string,
  now: Date = new Date(),
): string {
  const hoje = hojeISO(now);
  switch (opcao) {
    case "hoje":
      return `Hoje (${formatarDataCurta(hoje)})`;
    case "amanha":
      return `Amanhã (${formatarDataCurta(somarDias(hoje, 1))})`;
    case "data":
      return dataEscolhida ? formatarDataLonga(dataEscolhida) : "";
  }
}

/** "Bom dia" / "Boa tarde" / "Boa noite" pelo horário de Tubarão. */
export function saudacao(now: Date = new Date()): string {
  const hora = Number(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: TZ,
      hour: "2-digit",
      hour12: false,
    }).format(now),
  );
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

/**
 * "04/09" no fuso de Tubarão. Aceita data pura (YYYY-MM-DD) ou timestamp.
 *
 * A data pura não tem fuso: passá-la pelo Intl com timeZone deslocaria o dia.
 * O timestamp precisa do contrário — sem o fuso, uma entrega das 22h vira o
 * dia seguinte, porque o banco guarda em UTC.
 */
export function diaMes(iso: string | null | undefined): string {
  if (!iso) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [, mes, dia] = iso.split("-");
    return `${dia}/${mes}`;
  }
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(iso));
}

/* --------------------------------------------------------------------------
   Períodos de calendário

   Um atalho chamado "mês" precisa ir do dia 1 ao último dia do mês. A versão
   antiga fazia "hoje menos 29 dias" e chamava isso de mês: em 02/09 o filtro
   ia de 04/08 a 02/09, misturando dois meses e batendo com nenhum fechamento.
   Mesma regra para semana (segunda a domingo) e ano (1º de janeiro a 31/12).
   -------------------------------------------------------------------------- */

export type Intervalo = { de: string; ate: string };

function iso(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Último dia do mês, respeitando ano bissexto. */
function ultimoDia(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

export function intervaloMes(referencia: string = hojeISO(), deslocamento = 0): Intervalo {
  const [ano, mes] = referencia.split("-").map(Number);
  const total = ano * 12 + (mes - 1) + deslocamento;
  const a = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return { de: iso(a, m, 1), ate: iso(a, m, ultimoDia(a, m)) };
}

/** Semana de segunda a domingo. Domingo pertence à semana que começou antes. */
export function intervaloSemana(referencia: string = hojeISO(), deslocamento = 0): Intervalo {
  const [ano, mes, dia] = referencia.split("-").map(Number);
  const base = new Date(Date.UTC(ano, mes - 1, dia));
  const diaDaSemana = base.getUTCDay(); // 0 = domingo
  const recuo = diaDaSemana === 0 ? 6 : diaDaSemana - 1;
  base.setUTCDate(base.getUTCDate() - recuo + deslocamento * 7);
  const fim = new Date(base);
  fim.setUTCDate(fim.getUTCDate() + 6);
  return {
    de: iso(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate()),
    ate: iso(fim.getUTCFullYear(), fim.getUTCMonth() + 1, fim.getUTCDate()),
  };
}

export function intervaloAno(referencia: string = hojeISO(), deslocamento = 0): Intervalo {
  const ano = Number(referencia.slice(0, 4)) + deslocamento;
  return { de: iso(ano, 1, 1), ate: iso(ano, 12, 31) };
}
