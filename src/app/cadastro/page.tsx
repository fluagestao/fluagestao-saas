"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CadastroPage() {
  const router = useRouter();
  const supabase = createClient();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setMensagem("");

    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (senha !== confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }

    setCarregando(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: {
        data: { full_name: nome.trim() },
      },
    });

    setCarregando(false);

    if (error) {
      setErro(error.message);
      return;
    }

    if (data.session) {
      router.replace("/onboarding");
      router.refresh();
      return;
    }

    setMensagem(
      "Cadastro criado. Verifique seu e-mail para confirmar a conta e depois entre normalmente."
    );
  }

  return (
    <main className="min-h-screen bg-[#fafafa] px-5 py-12">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col justify-center">
        <div className="mb-7 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-lg font-bold text-white">
            F
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950">
            Criar conta
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Comece a configurar sua empresa na Flua Gestão.
          </p>
        </div>

        <form
          onSubmit={cadastrar}
          className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm"
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Seu nome</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoComplete="name"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmar">Confirmar senha</Label>
              <Input
                id="confirmar"
                type="password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          {erro && (
            <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </p>
          )}

          {mensagem && (
            <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {mensagem}
            </p>
          )}

          <Button className="mt-6 w-full" disabled={carregando}>
            {carregando ? "Criando conta..." : "Criar conta"}
          </Button>

          <p className="mt-5 text-center text-sm text-zinc-500">
            Já possui uma conta?{" "}
            <Link href="/login" className="font-medium text-zinc-950 underline">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
