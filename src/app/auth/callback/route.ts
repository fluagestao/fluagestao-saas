import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

async function prepararEmpresa(supabase: Awaited<ReturnType<typeof createClient>>) {
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

/* Destinos internos aceitos no parametro `next`. Lista fechada de proposito:
   o valor vem da URL do e-mail, e tratar como confiavel abriria redirecionamento
   para fora do dominio. */
const DESTINOS_PERMITIDOS = new Set(["/redefinir-senha"]);

function destinoSeguro(bruto: string | null): string | null {
  if (!bruto) return null;
  // "//evil.com" e URL absoluta para o navegador, apesar de comecar com barra.
  if (!bruto.startsWith("/") || bruto.startsWith("//")) return null;
  const caminho = bruto.split("?")[0].split("#")[0];
  return DESTINOS_PERMITIDOS.has(caminho) ? caminho : null;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const destino = destinoSeguro(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      /* Recuperacao de senha: o link so serve para chegar na tela de troca.
         Antes o `next` era descartado e a pessoa caia logada no /inicio sem
         nunca trocar a senha — quem esqueceu continuava sem saber a senha.
         E preparar empresa aqui criaria empresa para quem so quer trocar a
         senha, porque este handler serve os dois tipos de link. */
      if (destino) {
        const url = request.nextUrl.clone();
        url.pathname = destino;
        url.search = "";
        return NextResponse.redirect(url);
      }

      const empresaPreparada = await prepararEmpresa(supabase);
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = empresaPreparada ? "/inicio" : "/login";
      redirectUrl.search = "";
      if (empresaPreparada) {
        redirectUrl.searchParams.set("onboarding", "1");
      } else {
        redirectUrl.searchParams.set("erro", "preparacao-conta");
      }
      return NextResponse.redirect(redirectUrl);
    }
  }

  const errorUrl = request.nextUrl.clone();
  errorUrl.pathname = "/login";
  errorUrl.search = "";
  errorUrl.searchParams.set("erro", "link-invalido");

  return NextResponse.redirect(errorUrl);
}
