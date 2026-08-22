"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
} from "lucide-react";

import AuthShell from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const EMAIL_STORAGE_KEY = "flua.login.email";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrarEmail, setLembrarEmail] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const emailSalvo = window.localStorage.getItem(EMAIL_STORAGE_KEY);
    if (emailSalvo) {
      setEmail(emailSalvo);
      setLembrarEmail(true);
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("senha") === "alterada") {
      setSucesso("Senha alterada com sucesso. Entre novamente para continuar.");
      window.history.replaceState({}, "", "/login");
    }

    if (params.get("erro") === "link-invalido") {
      setErro("O link de recuperação expirou ou não é mais válido.");
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  async function entrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setSucesso(null);
    setCarregando(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: senha,
      });

      if (error) {
        setErro("E-mail ou senha inválidos.");
        return;
      }

      if (lembrarEmail) {
        window.localStorage.setItem(EMAIL_STORAGE_KEY, email.trim().toLowerCase());
      } else {
        window.localStorage.removeItem(EMAIL_STORAGE_KEY);
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setErro("Não foi possível entrar agora. Tente novamente em instantes.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <AuthShell
      title="Acesse sua conta"
      subtitle="Entre com seus dados para acessar a gestão da sua empresa."
      hideIntro
    >
      <form onSubmit={entrar} className="space-y-5" noValidate>
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
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@empresa.com.br"
              required
              className="h-12 rounded-xl border-[#D9C6B2] bg-white/85 pl-10 text-[#3f2422] shadow-sm outline-none placeholder:text-[#74745B]/65 focus-visible:border-[#A94F45] focus-visible:ring-[#A94F45]/20"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="senha" className="text-[#3f2422]">
              Senha
            </Label>
            <Link
              href="/recuperar-senha"
              className="text-xs font-semibold text-[#A94F45] transition-colors hover:text-[#703D3A]"
            >
              Esqueceu a senha?
            </Link>
          </div>

          <div className="relative">
            <LockKeyhole
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74745B]"
              aria-hidden="true"
            />
            <Input
              id="senha"
              type={mostrarSenha ? "text" : "password"}
              autoComplete="current-password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              required
              className="h-12 rounded-xl border-[#D9C6B2] bg-white/85 px-10 text-[#3f2422] shadow-sm outline-none focus-visible:border-[#A94F45] focus-visible:ring-[#A94F45]/20"
            />
            <button
              type="button"
              onClick={() => setMostrarSenha((valor) => !valor)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#74745B] transition-colors hover:bg-[#D9C6B2]/35 hover:text-[#703D3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94F45]/30"
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

        <label className="flex w-fit cursor-pointer items-center gap-2 text-xs font-medium text-[#703D3A]/75">
          <input
            type="checkbox"
            checked={lembrarEmail}
            onChange={(event) => setLembrarEmail(event.target.checked)}
            className="h-4 w-4 rounded border-[#D9C6B2] accent-[#A94F45]"
          />
          Lembrar meu e-mail
        </label>

        {erro && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700"
          >
            {erro}
          </div>
        )}

        {sucesso && (
          <div
            role="status"
            className="rounded-xl border border-[#74745B]/25 bg-[#74745B]/10 px-3.5 py-3 text-sm font-medium text-[#55553f]"
          >
            {sucesso}
          </div>
        )}

        <Button
          type="submit"
          disabled={carregando}
          className="h-12 w-full rounded-xl bg-[#A94F45] text-sm font-semibold text-white shadow-[0_12px_30px_rgba(169,79,69,0.24)] transition-all hover:bg-[#703D3A] hover:shadow-[0_14px_34px_rgba(112,61,58,0.28)]"
        >
          {carregando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Entrar
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-[#703D3A]/65">
        Ainda não tem uma conta?{" "}
        <Link
          href="/cadastro"
          className="font-semibold text-[#A94F45] transition-colors hover:text-[#703D3A]"
        >
          Criar acesso
        </Link>
      </p>
    </AuthShell>
  );
}
