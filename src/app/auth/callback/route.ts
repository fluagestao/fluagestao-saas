import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { registrarEvento } from "@/lib/auth-limite";
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

/**
 * Recebe o clique no link do e-mail: confirmar conta e recuperar senha.
 *
 * ACEITA OS DOIS FORMATOS DE LINK, e isso não é firula:
 *
 * - `code` é o fluxo PKCE. Ele exige um cookie (o code_verifier) gravado no
 *   NAVEGADOR EXATO que iniciou o cadastro. Quem se cadastra no computador e
 *   abre o e-mail no celular nunca confirma a conta. E o código é de uso
 *   único: um antivírus ou scanner corporativo que visite a URL antes da
 *   pessoa já o queima.
 *
 * - `token_hash` é verificado direto no servidor do Supabase. Funciona de
 *   qualquer aparelho e navegador, sem cookie nenhum.
 *
 * O `token_hash` é o caminho certo, e depende do MODELO DE E-MAIL no painel do
 * Supabase usar {{ .TokenHash }} em vez de {{ .ConfirmationURL }} — mudança
 * que não é código. Enquanto isso não muda, o `code` continua atendido aqui,
 * então trocar o modelo não quebra nada e passa a funcionar na hora.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const destino = destinoSeguro(requestUrl.searchParams.get("next"));

  if (code || (tokenHash && type)) {
    const supabase = await createClient();

    const { error } = tokenHash && type
      ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
      : await supabase.auth.exchangeCodeForSession(code!);

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

    /* SEGUNDO CLIQUE NÃO É FRACASSO. O token é de uso único, e o primeiro
       clique já abriu a sessão. Aqui isso pesa ainda mais: no link de
       recuperar senha, quem clica duas vezes é justamente quem está sem
       conseguir entrar — e receber "esse link não funcionou" fecha a única
       porta que restava. Com sessão aberta, o destino certo é a tela de trocar
       a senha, que era para onde o link levava. */
    const { data: sessao } = await supabase.auth.getUser();
    if (sessao?.user) {
      const url = request.nextUrl.clone();
      url.search = "";
      if (destino) {
        url.pathname = destino;
        return NextResponse.redirect(url);
      }
      const jaPreparada = await prepararEmpresa(supabase);
      url.pathname = jaPreparada ? "/inicio" : "/login";
      if (!jaPreparada) url.searchParams.set("erro", "preparacao-conta");
      return NextResponse.redirect(url);
    }

    /* Sem sessão, o motivo era descartado. Sem ele, "esse link não funcionou"
       era tudo o que existia para investigar — nem dava para saber se o link
       chegou sem código, se o código já tinha sido usado ou se o cookie do
       PKCE faltava. Sem e-mail e sem token no detalhe: só a causa. */
    await registrarEvento(
      "cadastro",
      "falha",
      undefined,
      `callback ${tokenHash ? "token_hash" : "code"}: ${error.message?.slice(0, 160)}`,
    );
  } else {
    await registrarEvento("cadastro", "falha", undefined, "callback sem code nem token_hash");
  }

  const errorUrl = request.nextUrl.clone();
  errorUrl.pathname = "/login";
  errorUrl.search = "";
  errorUrl.searchParams.set("erro", "link-invalido");

  return NextResponse.redirect(errorUrl);
}
