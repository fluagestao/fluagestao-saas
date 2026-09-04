import "server-only";

import { type Assinatura } from "@/lib/assinatura-tipos";
import type { createClient } from "@/lib/supabase/server";

/**
 * Estado da assinatura da empresa.
 *
 * A `subscriptions` já nascia com `plan='trial'`, `status='trialing'` e
 * `trial_ends_at = now() + 30 days` — criada pela RPC de onboarding desde
 * sempre. O que não existia era alguém LENDO isso para decidir acesso: a única
 * leitura no sistema era a página de conta, para exibir o plano. Passado o
 * sétimo dia, todo mundo seguia usando de graça, para sempre e sem aviso.
 */



const PLANOS_ATIVOS = new Set(["active", "trialing"]);

function diasAte(iso: string | null): number | null {
  if (!iso) return null;
  const fim = new Date(iso).getTime();
  if (!Number.isFinite(fim)) return null;
  return Math.ceil((fim - Date.now()) / 86_400_000);
}

/**
 * Lê a assinatura da empresa.
 *
 * Devolve null quando não consegue ler — e quem chama trata null como
 * "pode usar". É deliberado: o mesmo princípio do limite de tentativas de
 * login. Uma falha de leitura que tranca a cliente para fora do próprio
 * trabalho é pior do que um dia de uso além do prazo, e nenhuma cesteira
 * merece perder o sábado porque uma consulta falhou.
 */
export async function lerAssinatura(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
): Promise<Assinatura | null> {
  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("plan, status, trial_ends_at, current_period_end")
      .eq("company_id", companyId)
      .maybeSingle();

    if (error || !data) return null;

    const status = String(data.status ?? "");
    const plano = String(data.plan ?? "");
    const emTeste = status === "trialing" || plano === "trial";

    const terminaEm =
      (data.current_period_end as string | null) ?? (data.trial_ends_at as string | null) ?? null;
    const diasRestantes = diasAte(terminaEm);

    // Assinatura paga em dia nunca expira por prazo: quem paga tem a renovação
    // controlada pelo pagamento, não por este cálculo.
    const expirada =
      !PLANOS_ATIVOS.has(status) ||
      (emTeste && diasRestantes !== null && diasRestantes <= 0);

    return { plano, status, terminaEm, diasRestantes, expirada, emTeste };
  } catch {
    return null;
  }
}


export { DIAS_PARA_AVISAR, MOTIVO_EXPIRADA, type Assinatura } from "@/lib/assinatura-tipos";
