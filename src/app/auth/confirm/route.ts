import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { registrarEvento } from "@/lib/auth-limite";
import { prepararEmpresa } from "@/lib/preparar-empresa";
import { createClient } from "@/lib/supabase/server";

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

    /* O motivo era descartado, e "esse link não funcionou" era tudo o que
       sobrava para investigar. O token_hash é de USO ÚNICO: um antivírus ou
       scanner corporativo que visite a URL antes da pessoa já o queima, e a
       falha fica idêntica à de um link expirado ou de um segundo clique.
       Sem saber qual é, não há o que consertar.

       Sem e-mail e sem o token no detalhe: o que importa é a causa. */
    await registrarEvento(
      "cadastro",
      "falha",
      undefined,
      `confirm type=${type}: ${error.message?.slice(0, 160)}`,
    );
  } else {
    await registrarEvento(
      "cadastro",
      "falha",
      undefined,
      `confirm sem token_hash ou type (token_hash=${tokenHash ? "sim" : "nao"}, type=${type ?? "vazio"})`,
    );
  }

  const errorUrl = request.nextUrl.clone();
  errorUrl.pathname = "/login";
  errorUrl.search = "";
  errorUrl.searchParams.set("erro", "link-invalido");

  return NextResponse.redirect(errorUrl);
}
