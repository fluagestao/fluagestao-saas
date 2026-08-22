"use client";

import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });

      if (error) {
        setErro("E-mail ou senha inválidos.");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setErro("Não foi possível entrar agora. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-5">
      <div className="w-full max-w-sm">
        <div className="mb-7 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-950 text-lg font-semibold text-white">
            F
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950">
            Flua Gestão
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Acesse sua empresa para continuar.
          </p>
        </div>

        <form
          onSubmit={entrar}
          className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm"
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@empresa.com.br"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                required
              />
            </div>
          </div>

          {erro && (
            <p className="mt-4 text-sm font-medium text-red-600">{erro}</p>
          )}

          <Button type="submit" disabled={carregando} className="mt-6 w-full">
            {carregando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Entrar
          </Button>
        </form>
      </div>
    </main>
  );
}
