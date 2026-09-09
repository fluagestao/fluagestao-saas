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
export type EstadoDoPreparo = "ok" | "documento-duplicado" | "falha";

/* O detalhe existe porque "não conseguimos criar sua loja, costuma ser um
   problema momentâneo" é o que a tela dizia para QUALQUER falha — inclusive
   para as que não têm nada de momentâneo e nunca vão passar sozinhas. A causa
   real vinha do Postgres e era descartada aqui. Sem ela, a única saída era
   pedir para a pessoa mandar print e ir caçar log. */
export type PreparoDaEmpresa = { estado: EstadoDoPreparo; detalhe?: string };

export async function prepararEmpresa(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<PreparoDaEmpresa> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;

  if (userError || !user) {
    return {
      estado: "falha",
      detalhe: userError?.message ?? "Sessão não encontrada no servidor.",
    };
  }

  /* QUEM JÁ TEM EMPRESA NÃO PRECISA DE UMA NOVA.

     A RPC complete_onboarding só reconhece vínculo com role = 'owner'. A
     ajudante convidada entra como 'admin' (usuarios.ts), então a função não a
     via como pertencente a lugar nenhum e criava uma empresa vazia para ela —
     com assinatura de teste própria — toda vez que ela confirmava o e-mail.
     Uma empresa-lixo por ajudante convidada.

     Ela não perdia o acesso: requireCompany pega o vínculo mais ANTIGO, que é
     o da empresa de verdade. O estrago era silencioso, que é o pior tipo.

     Esta checagem cobre qualquer papel, não só owner. Para quem está criando a
     conta de verdade não muda nada: no momento da confirmação ela ainda não
     tem vínculo nenhum, e a RPC roda como antes. */
  const { data: vinculo, error: erroVinculo } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (vinculo?.company_id) return { estado: "ok" };

  /* A consulta que falha devolve vinculo nulo, igualzinho a quem realmente não
     tem empresa. Sem separar os dois, uma falha de leitura manda para o
     onboarding alguém que já tem loja — e a RPC ainda tenta criar outra. */
  if (erroVinculo) {
    return { estado: "falha", detalhe: erroVinculo.message };
  }

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

  if (!error) return { estado: "ok" };

  /* DOCUMENTO REPETIDO NÃO É FALHA MOMENTÂNEA, E TRATAR COMO SE FOSSE PRENDE A
     PESSOA. O cadastro não confere o CPF/CNPJ; quem repete um documento que já
     existe cria a conta, confirma o e-mail e só então esbarra no 23505 que a
     complete_onboarding levanta. Como o documento vai continuar repetido para
     sempre, "tentar de novo" nunca funciona — e era a única saída oferecida.
     Separar o motivo aqui é o que permite a tela dizer a verdade. */
  const duplicado =
    error.code === "23505" || /já possui cadastro/i.test(error.message ?? "");

  return duplicado
    ? { estado: "documento-duplicado", detalhe: error.message }
    : { estado: "falha", detalhe: `${error.code ?? "sem código"}: ${error.message}` };
}
