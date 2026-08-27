import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

async function prepararEmpresa(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;

  if (userError || !user) {
    return false;
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

  return !error;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      const empresaPreparada = await prepararEmpresa(supabase);

      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = empresaPreparada ? "/cadastro/sucesso" : "/login";
      redirectUrl.search = "";
      if (!empresaPreparada) {
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
