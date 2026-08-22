"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
} from "lucide-react";

import AuthShell from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

function senhaForte(senha: string) {
  return (
    senha.length >= 10 &&
    /[a-z]/.test(senha) &&
    /[A-Z]/.test(senha) &&
    /[0-9]/.test(senha) &&
    /[^A-Za-z0-9]/.test(senha)
  );
}

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [sessaoValida, setSessaoValida] = useState<boolean | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    let ativo = true;
    const supabase = createClient();

    supabase.auth.getUser().then(({ data, error }) => {
      if (!ativo) return;
      setSessaoValida(!error && Boolean(data.user));
    });

    return () => {
      ativo = false;
    };
  }, []);

  async function redefinir(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);

    if (!senhaForte(senha)) {
      setErro(
        "Use pelo menos 10 caracteres, com letra maiúscula, minúscula, número e símbolo."
      );
      return;
    }

    if (senha !== confirmacao) {
      setErro("As senhas não coincidem.");
      return;
    }

    setCarregando(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: senha });

      if (error) {
        setErro("Não foi possível alterar a senha. Solicite um novo link e tente novamente.");
        return;
      }

      await supabase.auth.signOut({ scope: "global" });
      router.replace("/login?senha=alterada");
      router.refresh();
    } catch {
      setErro("Não foi possível alterar a senha agora. Tente novamente em instantes.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <AuthShell
      title="Crie uma nova senha"
      subtitle="Escolha uma senha forte e diferente das que você usa em outros serviços."
    >
      {sessaoValida === null ? (
        <div className="flex min-h-32 items-center justify-center text-[#703D3A]/70">
          <Loader2 className="h-5 w-5 animate-spin" aria-label="Validando link" />
        </div>
      ) : sessaoValida === false ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
            Este link expirou ou já foi utilizado. Solicite uma nova recuperação para continuar.
          </div>
          <Button
            asChild
            className="h-12 w-full rounded-xl bg-[#A94F45] font-semibold text-white hover:bg-[#703D3A]"
          >
            <Link href="/recuperar-senha">Solicitar novo link</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={redefinir} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="nova-senha" className="text-[#3f2422]">
              Nova senha
            </Label>
            <div className="relative">
              <LockKeyhole
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74745B]"
                aria-hidden="true"
              />
              <Input
                id="nova-senha"
                type={mostrarSenha ? "text" : "password"}
                autoComplete="new-password"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                required
                minLength={10}
                className="h-12 rounded-xl border-[#D9C6B2] bg-white/85 px-10 text-[#3f2422] shadow-sm focus-visible:border-[#A94F45] focus-visible:ring-[#A94F45]/20"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((valor) => !valor)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#74745B] hover:bg-[#D9C6B2]/35 hover:text-[#703D3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94F45]/30"
                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              >
                {mostrarSenha ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmar-senha" className="text-[#3f2422]">
              Confirmar nova senha
            </Label>
            <div className="relative">
              <LockKeyhole
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74745B]"
                aria-hidden="true"
              />
              <Input
                id="confirmar-senha"
                type={mostrarConfirmacao ? "text" : "password"}
                autoComplete="new-password"
                value={confirmacao}
                onChange={(event) => setConfirmacao(event.target.value)}
                required
                minLength={10}
                className="h-12 rounded-xl border-[#D9C6B2] bg-white/85 px-10 text-[#3f2422] shadow-sm focus-visible:border-[#A94F45] focus-visible:ring-[#A94F45]/20"
              />
              <button
                type="button"
                onClick={() => setMostrarConfirmacao((valor) => !valor)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#74745B] hover:bg-[#D9C6B2]/35 hover:text-[#703D3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94F45]/30"
                aria-label={mostrarConfirmacao ? "Ocultar senha" : "Mostrar senha"}
              >
                {mostrarConfirmacao ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[#D9C6B2]/80 bg-white/45 px-3.5 py-3 text-xs leading-5 text-[#703D3A]/70">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#74745B]" aria-hidden="true" />
              <span>10+ caracteres, incluindo maiúscula, minúscula, número e símbolo.</span>
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
            disabled={carregando}
            className="h-12 w-full rounded-xl bg-[#A94F45] font-semibold text-white shadow-[0_12px_30px_rgba(169,79,69,0.24)] hover:bg-[#703D3A]"
          >
            {carregando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar nova senha
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
