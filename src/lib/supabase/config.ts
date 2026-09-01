const URL_PADRAO = "https://dwfjwbyzhuefnwfgggyz.supabase.co";
const CHAVE_PUBLICA_PADRAO =
  "sb_publishable_Rcov0SjrQfQ4Gal11_rHvA_REGLWiC3";

/**
 * O projeto usa somente a chave publicável do Supabase no navegador.
 * As variáveis da Vercel continuam tendo prioridade quando configuradas.
 */
export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? URL_PADRAO;
export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? CHAVE_PUBLICA_PADRAO;
