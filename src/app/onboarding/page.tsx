import Link from "next/link";
import { redirect } from "next/navigation";

import { prepararEmpresa } from "@/lib/preparar-empresa";
import { createClient } from "@/lib/supabase/server";

/**
 * Rede de segurança de quem entrou mas ficou sem empresa.
 *
 * Antes esta página era só `redirect("/admin")`, e /admin devolve para /login
 * quando não acha o vínculo — então login → /onboarding → /admin → /login
 * fechava um ciclo do qual não se saía. A pessoa tinha senha certa e e-mail
 * confirmado e mesmo assim nunca entrava, sem nada na tela explicando por quê.
 *
 * Agora a tentativa de criar a empresa acontece AQUI, e o fim da linha é uma
 * tela, não outro salto.
 */
export default async function OnboardingPage() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  // Sem sessão não há o que preparar: é só entrar.
  if (claimsError || !userId) redirect("/login");

  const { data: membro } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  // Já tem empresa: chegou aqui por link velho ou botão de voltar.
  if (membro) redirect("/inicio");

  const preparo = await prepararEmpresa(supabase);
  if (preparo === "ok") redirect("/inicio?onboarding=1");

  const documentoDuplicado = preparo === "documento-duplicado";

  const email =
    typeof claimsData?.claims?.email === "string" ? claimsData.claims.email : null;

  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--cream-soft)] px-5 py-10">
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-[var(--shadow-card)]">
        <h1 className="text-xl font-semibold text-foreground">
          {documentoDuplicado
            ? "Esse CPF/CNPJ já tem conta na Flua"
            : "Falta um passo para sua conta ficar pronta"}
        </h1>

        {documentoDuplicado ? (
          <p className="mt-3 text-sm text-[var(--admin-ink-soft)]">
            Seu e-mail{email ? ` (${email})` : ""} foi confirmado, mas o CPF/CNPJ que
            você informou já está cadastrado em outra conta. Entre com o e-mail usado
            da primeira vez — ou fale com a gente que a gente junta as duas.
          </p>
        ) : (
          <p className="mt-3 text-sm text-[var(--admin-ink-soft)]">
            Seu acesso está confirmado{email ? ` (${email})` : ""}, mas não conseguimos
            criar sua loja. Isso costuma ser um problema momentâneo.
          </p>
        )}

        {/* "Tentar de novo" só é oferecido quando tentar de novo pode dar certo.
            Com documento repetido o resultado é sempre o mesmo, e o botão vira
            um laço com cara de saída. */}
        <Link
          href={documentoDuplicado ? "/login" : "/onboarding"}
          className="mt-5 grid h-11 place-items-center rounded-xl bg-[var(--terracotta)] text-sm font-medium text-[var(--cream-soft)] transition hover:opacity-90"
        >
          {documentoDuplicado ? "Ir para o login" : "Tentar de novo"}
        </Link>

        {/* Sai daqui em vez de mandar de volta para o login, que era o laço. */}
        <p className="mt-4 t-support text-center text-muted-foreground">
          {documentoDuplicado ? "Não sabe qual e-mail usou? Fale com a gente pelo " : null}
          {documentoDuplicado ? null : "Se continuar assim, fale com a gente pelo "}
          <a
            href="https://wa.me/5548996510100"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-[var(--terracotta)] hover:underline"
          >
            WhatsApp
          </a>{" "}
          que resolvemos na hora.
        </p>
      </div>
    </main>
  );
}
