import { createHash } from "node:crypto";
import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";

/**
 * Limite de tentativas, contado no servidor.
 *
 * Antes disso a única defesa era o rate limit do projeto Supabase — por IP e
 * generoso. Aqui conta-se por IP E por conta, de propósito: só por IP, um
 * ataque distribuído passa; só por conta, dá para varrer mil contas de um IP.
 *
 * Não usa chave de serviço. As funções `private.*` são security definer e não
 * devolvem nenhum dado de usuário — só contador e prazo.
 */

export type Acao = "login" | "cadastro" | "recuperar" | "reenviar" | "trocar_senha" | "mfa";

type Regra = { limite: number; janelaMin: number };

/* Limites por ação. O de conta é mais frouxo que o de IP porque a chave de
   conta pode ser inflada por terceiro: um atacante que saiba seu e-mail
   conseguiria te trancar para fora. Por isso estourar o limite da conta pede
   CAPTCHA, e só estourar o do IP bloqueia. */
const POR_IP: Record<Acao, Regra> = {
  login: { limite: 10, janelaMin: 15 },
  cadastro: { limite: 5, janelaMin: 60 },
  recuperar: { limite: 5, janelaMin: 60 },
  reenviar: { limite: 5, janelaMin: 60 },
  trocar_senha: { limite: 10, janelaMin: 60 },
  mfa: { limite: 8, janelaMin: 15 },
};

const POR_CONTA: Record<Acao, Regra> = {
  login: { limite: 6, janelaMin: 15 },
  cadastro: { limite: 3, janelaMin: 60 },
  recuperar: { limite: 3, janelaMin: 60 },
  reenviar: { limite: 3, janelaMin: 60 },
  trocar_senha: { limite: 5, janelaMin: 60 },
  mfa: { limite: 5, janelaMin: 15 },
};

/** Hash do e-mail: correlaciona tentativas sem guardar a lista de clientes. */
export function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 32);
}

async function contexto() {
  const h = await headers();
  // Na Vercel o IP real vem no primeiro item do x-forwarded-for.
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "desconhecido";
  const userAgent = h.get("user-agent") ?? "";
  return { ip, userAgent };
}

export type Veredito = {
  bloqueado: boolean;
  /** Segundos até liberar. 0 quando não está bloqueado. */
  esperaSegundos: number;
  /** true quando o comportamento já pede CAPTCHA, mesmo sem bloquear. */
  exigirCaptcha: boolean;
};

/**
 * Conta a tentativa e diz se pode seguir.
 *
 * Nunca lança: se o contador falhar (tabela ausente, banco lento), o login
 * continua funcionando. Segurança que derruba a porta de entrada quando falha
 * vira indisponibilidade — e indisponibilidade também é incidente.
 */
export async function contarTentativa(acao: Acao, email?: string): Promise<Veredito> {
  const { ip } = await contexto();
  const supabase = await createClient();

  const chaves: { chave: string; regra: Regra; tipo: "ip" | "conta" }[] = [
    { chave: `${acao}:ip:${ip}`, regra: POR_IP[acao], tipo: "ip" },
  ];
  if (email) {
    chaves.push({ chave: `${acao}:conta:${hashEmail(email)}`, regra: POR_CONTA[acao], tipo: "conta" });
  }

  let esperaSegundos = 0;
  let exigirCaptcha = false;

  for (const { chave, regra, tipo } of chaves) {
    try {
      const { data, error } = await supabase.rpc("registrar_tentativa", {
        p_chave: chave,
        p_acao: acao,
        p_limite: regra.limite,
        p_janela: `${regra.janelaMin} minutes`,
      });
      if (error) continue;

      const linha = Array.isArray(data) ? data[0] : data;
      if (!linha) continue;

      const tentativas = Number(linha.tentativas ?? 0);
      const ate = linha.bloqueado_ate ? new Date(linha.bloqueado_ate as string) : null;

      // Metade do limite já pede CAPTCHA: atrapalha o robô antes de bloquear
      // uma pessoa que só errou a senha.
      if (tentativas >= Math.ceil(regra.limite / 2)) exigirCaptcha = true;

      if (ate && ate.getTime() > Date.now()) {
        const faltam = Math.ceil((ate.getTime() - Date.now()) / 1000);
        // Estourar o limite da CONTA não bloqueia, só endurece o CAPTCHA —
        // senão qualquer um tranca a conta alheia sabendo o e-mail.
        if (tipo === "ip") esperaSegundos = Math.max(esperaSegundos, faltam);
        else exigirCaptcha = true;
      }
    } catch {
      // Contador indisponível não pode derrubar o login.
    }
  }

  return { bloqueado: esperaSegundos > 0, esperaSegundos, exigirCaptcha };
}

/** Sucesso zera o contador daquele IP e daquela conta. */
export async function limparTentativas(acao: Acao, email?: string): Promise<void> {
  const { ip } = await contexto();
  const supabase = await createClient();
  const chaves = [`${acao}:ip:${ip}`];
  if (email) chaves.push(`${acao}:conta:${hashEmail(email)}`);

  for (const chave of chaves) {
    try {
      await supabase.rpc("limpar_tentativa", { p_chave: chave });
    } catch {
      // Falhar ao limpar só deixa o contador vivo até a janela expirar.
    }
  }
}

/** Trilha de eventos. Nunca recebe senha nem token. */
export async function registrarEvento(
  acao: Acao,
  resultado: "ok" | "falha" | "bloqueado" | "captcha",
  email?: string,
  detalhe?: string,
): Promise<void> {
  try {
    const { ip, userAgent } = await contexto();
    const supabase = await createClient();
    await supabase.rpc("registrar_evento", {
      p_acao: acao,
      p_resultado: resultado,
      p_email_hash: email ? hashEmail(email) : null,
      p_ip: ip,
      p_user_agent: userAgent,
      p_detalhe: detalhe ?? null,
    });
  } catch {
    // Log é para investigação, não para o fluxo: nunca derruba a ação.
  }
}

/** Mensagem única de bloqueio, sem revelar qual limite foi atingido. */
export function mensagemBloqueio(segundos: number): string {
  const minutos = Math.ceil(segundos / 60);
  return `Muitas tentativas. Tente novamente em ${minutos} ${minutos === 1 ? "minuto" : "minutos"}.`;
}
