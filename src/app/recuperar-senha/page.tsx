"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail } from "lucide-react";

import AuthShell from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function enviarRecuperacao(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/redefinir-senha`;

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo }
      );

      if (error) {
        if (error.status === 429) {
          setErro("Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.");
        } else {
          setErro("Não foi possível enviar o e-mail agora. Tente novamente em instantes.");
        }
        return;
      }

      setEnviado(true);
    } catch {
      setErro("Não foi possível enviar o e-mail agora. Tente novamente em instantes.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <AuthShell
      title="Recuperar acesso"
      subtitle="Informe seu e-mail. Se ele estiver cadastrado, enviaremos um link seguro para criar uma nova senha."
    >
      {enviado ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-[#74745B]/25 bg-[#74745B]/10 p-4 text-sm leading-6 text-[#55553f]">
            <p className="font-semibold">Confira sua caixa de entrada.</p>
            <p className="mt-1">
              Por segurança, mostramos a mesma confirmação mesmo quando o e-mail não existe no sistema.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => {
              setEnviado(false);
              setErro(null);
            }}
            className="h-12 w-full rounded-xl bg-[#A94F45] font-semibold text-white hover:bg-[#703D3A]"
          >
            Enviar novamente
          </Button>
        </div>
      ) : (
        <form onSubmit={enviarRecuperacao} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#3f2422]">
              E-mail
            </Label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74745B]"
                aria-hidden="true"
              />
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@empresa.com.br"
                required
                className="h-12 rounded-xl border-[#D9C6B2] bg-white/85 pl-10 text-[#3f2422] shadow-sm placeholder:text-[#74745B]/65 focus-visible:border-[#A94F45] focus-visible:ring-[#A94F45]/20"
              />
            </div>
          </div>

          {erro && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700"
            >
              {erro}
            </div>
          )}

          <Button
            type="submit"
            disabled={carregando || !email.trim()}
            className="h-12 w-full rounded-xl bg-[#A94F45] font-semibold text-white shadow-[0_12px_30px_rgba(169,79,69,0.24)] hover:bg-[#703D3A]"
          >
            {carregando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar link de recuperação
          </Button>
        </form>
      )}

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A94F45] transition-colors hover:text-[#703D3A]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Voltar para o login
        </Link>
      </div>
    </AuthShell>
  );
}
