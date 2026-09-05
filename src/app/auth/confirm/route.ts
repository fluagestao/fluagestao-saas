import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { registrarEvento } from "@/lib/auth-limite";
import { prepararEmpresa } from "@/lib/preparar-empresa";
import { createClient } from "@/lib/supabase/server";

/* Destinos internos aceitos no `next`. Lista fechada de propósito: o valor vem
   da URL do e-mail, e tratar como confiável abriria redirecionamento para fora
   do domínio. Mesma regra do /auth/callback. */
const DESTINOS_PERMITIDOS = new Set(["/redefinir-senha"]);

function destinoSeguro(bruto: string | null): string | null {
  if (!bruto) return null;
  // "//evil.com" é URL absoluta para o navegador, apesar de começar com barra.
  if (!bruto.startsWith("/") || bruto.startsWith("//")) return null;
  const caminho = bruto.split("?")[0].split("#")[0];
  return DESTINOS_PERMITIDOS.has(caminho) ? caminho : null;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const destino = destinoSeguro(requestUrl.searchParams.get("next"));

  if (tokenHash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      /* RECUPERAÇÃO DE SENHA passa por aqui e NÃO é cadastro.
         Sem isto, quem clicava no link de trocar a senha caía em
         /cadastro/sucesso — com uma empresa preparada de brinde — e nunca via
         a tela de escolher a senha nova. O `next` é o que distingue os dois
         usos do mesmo endereço. */
      if (destino) {
        const url = request.nextUrl.clone();
        url.pathname = destino;
        url.search = "";
        return NextResponse.redirect(url);
      }

      const empresaPreparada = await prepararEmpresa(supabase);

      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = empresaPreparada ? "/cadastro/sucesso" : "/login";
      redirectUrl.search = "";
      if (!empresaPreparada) {
        redirectUrl.searchParams.set("erro", "preparacao-conta");
      }
      return NextResponse.redirect(redirectUrl);
    }

    /* SEGUNDO CLIQUE NÃO É FRACASSO.
       O token é de uso único: o primeiro clique confirma a conta E abre a
       sessão. Quem clica de novo — no botão e depois no link de texto do
       mesmo e-mail, que é o caso comum — via uma tela vermelha dizendo que o
       link não funcionou, um minuto depois de ter funcionado. A pessoa achava
       que o cadastro tinha falhado quando já estava dentro.

       Se há sessão, a confirmação JÁ deu certo. Levar para dentro é a resposta
       honesta; o erro era sobre o token, não sobre a conta. */
    const { data: sessao } = await supabase.auth.getUser();
    if (sessao?.user) {
      if (destino) {
        const url = request.nextUrl.clone();
        url.pathname = destino;
        url.search = "";
        return NextResponse.redirect(url);
      }
      const jaPreparada = await prepararEmpresa(supabase);
      const url = request.nextUrl.clone();
      url.pathname = jaPreparada ? "/inicio" : "/login";
      url.search = "";
      if (!jaPreparada) url.searchParams.set("erro", "preparacao-conta");
      return NextResponse.redirect(url);
    }

    /* Sem sessão, o motivo era descartado e "esse link não funcionou" era tudo
       o que sobrava para investigar. Antivírus e scanner corporativo de e-mail
       visitam a URL para conferir se é segura e queimam o token antes da
       pessoa; link expirado falha igual. Sem saber qual é, não há conserto.

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
