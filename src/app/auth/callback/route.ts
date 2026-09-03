import { NextRequest, NextResponse } from "next/server";

import { prepararEmpresa } from "@/lib/preparar-empresa";
import { createClient } from "@/lib/supabase/server";

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
