import type { createClient } from "@/lib/supabase/server";

/**
 * Cria a empresa da pessoa a partir do que ela digitou no cadastro.
 *
 * Vivia copiada em /auth/callback e /auth/confirm. Virou uma função só porque
 * agora /onboarding também precisa dela: quando a criação falha no momento da
 * confirmação, é ali que a pessoa consegue tentar de novo em vez de ficar
 * presa entre o login e uma tela que a devolve para o login.
 *
 * Chamar duas vezes é seguro: `complete_onboarding` é a mesma RPC do cadastro
 * e já trata a empresa que existe.
 */
export async function prepararEmpresa(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<boolean> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;

  if (userError || !user) return false;

  const metadata = user.user_metadata ?? {};
  const fullName =
    typeof metadata.full_name === "string" && metadata.full_name.trim()
      ? metadata.full_name.trim()
      : user.email?.split("@")[0] || "Usuário";
  const storeName =
    typeof metadata.store_name === "string" && metadata.store_name.trim()
      ? metadata.store_name.trim()
      : "Minha empresa";
  const document = typeof metadata.document === "string" ? metadata.document : "";
  const documentType = metadata.document_type === "cpf" ? "cpf" : "cnpj";
  const phone = typeof metadata.phone === "string" ? metadata.phone : null;

  const { error } = await supabase.rpc("complete_onboarding", {
    p_full_name: fullName,
    p_cpf: "",
    p_store_name: storeName,
    p_document_type: documentType,
    p_document: document,
    p_email: user.email ?? "",
    p_phone: phone,
    p_postal_code: null,
    p_street: null,
    p_address_number: null,
    p_complement: null,
    p_district: null,
    p_city: null,
    p_state: null,
  });

  return !error;
}
