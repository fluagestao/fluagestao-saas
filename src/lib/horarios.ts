// Lógica pura de horário de atendimento (sem Supabase) — usada no site e no admin.

export type DiaConfig = { aberto: boolean; abre: string; fecha: string };
export type ModoHorario = "auto" | "aberto" | "fechado";
export type HorariosConfig = {
  modo: ModoHorario;
  mensagem_fechado: string;
  dias: Record<string, DiaConfig>; // chave = dia da semana 0..6 (0 = domingo)
};

export const DIAS_LABEL: Record<string, string> = {
  "0": "Domingo",
  "1": "Segunda",
  "2": "Terça",
  "3": "Quarta",
  "4": "Quinta",
  "5": "Sexta",
  "6": "Sábado",
};
// Ordem de exibição no admin (começa na segunda).
export const ORDEM_DIAS = ["1", "2", "3", "4", "5", "6", "0"];

const DIA_PADRAO: DiaConfig = { aberto: true, abre: "09:00", fecha: "18:00" };

export const DEFAULT_HORARIOS: HorariosConfig = {
  modo: "aberto",
  mensagem_fechado: "Estamos fechados agora — chame no WhatsApp que respondemos assim que abrir 💛",
  dias: {
    "1": { aberto: true, abre: "09:00", fecha: "18:00" },
    "2": { aberto: true, abre: "09:00", fecha: "18:00" },
    "3": { aberto: true, abre: "09:00", fecha: "18:00" },
    "4": { aberto: true, abre: "09:00", fecha: "18:00" },
    "5": { aberto: true, abre: "09:00", fecha: "18:00" },
    "6": { aberto: true, abre: "09:00", fecha: "13:00" },
    "0": { aberto: false, abre: "09:00", fecha: "18:00" },
  },
};

/** Garante um objeto de config válido a partir de dados possivelmente parciais. */
export function normalizarHorarios(
  raw: Partial<HorariosConfig> | null | undefined,
): HorariosConfig {
  const dias: Record<string, DiaConfig> = {};
  for (const d of ["0", "1", "2", "3", "4", "5", "6"]) {
    dias[d] = { ...DIA_PADRAO, ...DEFAULT_HORARIOS.dias[d], ...(raw?.dias?.[d] ?? {}) };
  }
  return {
    modo: raw?.modo ?? DEFAULT_HORARIOS.modo,
    mensagem_fechado: raw?.mensagem_fechado ?? DEFAULT_HORARIOS.mensagem_fechado,
    dias,
  };
}

function minutosDe(hhmm: string): number {
  const [h, m] = (hhmm || "0:0").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** "09:00" -> "9h" ; "09:30" -> "9h30" */
export function formatarHora(hhmm: string): string {
  const [h, m] = (hhmm || "0:0").split(":");
  const hora = Number(h);
  return m === "00" ? `${hora}h` : `${hora}h${m}`;
}

/** Dia da semana (0..6) e minutos do dia, no fuso de Tubarão/SC. */
export function agoraTubarao(now: Date): { dia: number; min: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hh = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const mm = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { dia: map[wd] ?? 0, min: hh * 60 + mm };
}

function proximaAbertura(cfg: HorariosConfig, dia: number, min: number): string | null {
  const hoje = cfg.dias[String(dia)];
  if (hoje?.aberto && min < minutosDe(hoje.abre)) return `hoje às ${formatarHora(hoje.abre)}`;
  for (let i = 1; i <= 7; i++) {
    const d = (dia + i) % 7;
    const c = cfg.dias[String(d)];
    if (c?.aberto) {
      const quando = i === 1 ? "amanhã" : DIAS_LABEL[String(d)].toLowerCase();
      return `${quando} às ${formatarHora(c.abre)}`;
    }
  }
  return null;
}

export type StatusAtendimento = { aberto: boolean; texto: string };

/** Calcula o status atual do atendimento a partir da config e do horário. */
export function statusAtendimento(cfg: HorariosConfig, now: Date): StatusAtendimento {
  if (cfg.modo === "aberto") return { aberto: true, texto: "Atendimento aberto" };
  if (cfg.modo === "fechado")
    return { aberto: false, texto: cfg.mensagem_fechado?.trim() || "Fechado no momento" };

  // modo automático: segue os horários por dia
  const { dia, min } = agoraTubarao(now);
  const hoje = cfg.dias[String(dia)];
  if (hoje?.aberto && min >= minutosDe(hoje.abre) && min < minutosDe(hoje.fecha)) {
    return { aberto: true, texto: "Atendimento aberto" };
  }
  const prox = proximaAbertura(cfg, dia, min);
  if (prox) return { aberto: false, texto: `Fechado · abre ${prox}` };
  return { aberto: false, texto: cfg.mensagem_fechado?.trim() || "Fechado no momento" };
}
