import { createClient } from "@supabase/supabase-js";
import { receberPedido } from "@/lib/integracao-pedidos";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return receberPedido(request, async (token, payload) => {
    // Cliente sem sessão: a RPC autentica o token próprio da integração.
    const supabase = createClient(supabaseUrl, supabasePublishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await supabase.rpc("integrar_pedido_site", {
      p_token: token, p_payload: payload,
    }).abortSignal(AbortSignal.timeout(3500));
    if (error) throw new Error("integration_unavailable");
    return data;
  });
}
