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
