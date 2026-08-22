"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Form = {
  nome: string;
  cpf: string;
  empresa: string;
  tipoDocumento: "cnpj" | "cpf";
  documento: string;
  telefone: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
};

const inicial: Form = {
  nome: "",
  cpf: "",
  empresa: "",
  tipoDocumento: "cnpj",
  documento: "",
  telefone: "",
  cep: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
};

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState<Form>(inicial);
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      const { data, error } = await supabase.auth.getUser();

      if (!ativo) return;

      if (error || !data.user) {
        router.replace("/login");
        return;
      }

      setEmail(data.user.email ?? "");
      setForm((atual) => ({
        ...atual,
        nome:
          typeof data.user.user_metadata?.full_name === "string"
            ? data.user.user_metadata.full_name
            : "",
      }));
      setCarregando(false);
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, [router, supabase]);

  function alterar<K extends keyof Form>(campo: K, valor: Form[K]) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  async function concluir(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setSalvando(true);

    const { error } = await supabase.rpc("complete_onboarding", {
      p_full_name: form.nome.trim(),
      p_cpf: form.cpf,
      p_store_name: form.empresa.trim(),
      p_document_type: form.tipoDocumento,
      p_document: form.documento,
      p_email: email,
      p_phone: form.telefone || null,
      p_postal_code: form.cep || null,
      p_street: form.rua || null,
      p_address_number: form.numero || null,
      p_complement: form.complemento || null,
      p_district: form.bairro || null,
      p_city: form.cidade || null,
      p_state: form.estado || null,
    });

    setSalvando(false);

    if (error) {
      setErro(error.message);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fafafa]">
        <p className="text-sm text-zinc-500">Carregando...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fafafa] px-5 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-7">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black font-bold text-white">
            F
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950">
            Configure sua empresa
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Só precisamos destes dados para criar seu ambiente na Flua Gestão.
          </p>
        </div>

        <form
          onSubmit={concluir}
          className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Seu nome</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => alterar("nome", e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cpf">Seu CPF</Label>
              <Input
                id="cpf"
                value={form.cpf}
                onChange={(e) => alterar("cpf", e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="empresa">Nome da empresa</Label>
              <Input
                id="empresa"
                value={form.empresa}
                onChange={(e) => alterar("empresa", e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo de documento</Label>
              <select
                id="tipo"
                value={form.tipoDocumento}
                onChange={(e) =>
                  alterar("tipoDocumento", e.target.value as "cnpj" | "cpf")
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="cnpj">CNPJ</option>
                <option value="cpf">CPF</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="documento">
                {form.tipoDocumento === "cnpj" ? "CNPJ" : "CPF da empresa"}
              </Label>
              <Input
                id="documento"
                value={form.documento}
                onChange={(e) => alterar("documento", e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={form.telefone}
                onChange={(e) => alterar("telefone", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cep">CEP</Label>
              <Input
                id="cep"
                value={form.cep}
                onChange={(e) => alterar("cep", e.target.value)}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="rua">Rua</Label>
              <Input
                id="rua"
                value={form.rua}
                onChange={(e) => alterar("rua", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="numero">Número</Label>
              <Input
                id="numero"
                value={form.numero}
                onChange={(e) => alterar("numero", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="complemento">Complemento</Label>
              <Input
                id="complemento"
                value={form.complemento}
                onChange={(e) => alterar("complemento", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bairro">Bairro</Label>
              <Input
                id="bairro"
                value={form.bairro}
                onChange={(e) => alterar("bairro", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                value={form.cidade}
                onChange={(e) => alterar("cidade", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="estado">UF</Label>
              <Input
                id="estado"
                maxLength={2}
                value={form.estado}
                onChange={(e) => alterar("estado", e.target.value.toUpperCase())}
              />
            </div>
          </div>

          {erro && (
            <p className="mt-5 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </p>
          )}

          <Button className="mt-7 w-full" disabled={salvando}>
            {salvando ? "Criando ambiente..." : "Concluir configuração"}
          </Button>
        </form>
      </div>
    </main>
  );
}
