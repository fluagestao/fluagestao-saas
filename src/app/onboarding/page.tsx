"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

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

function somenteNumeros(valor: string) {
  return valor.replace(/\D/g, "");
}

function formatarCpf(valor: string) {
  return somenteNumeros(valor)
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function formatarDocumento(valor: string, tipo: "cnpj" | "cpf") {
  if (tipo === "cpf") return formatarCpf(valor);
  return somenteNumeros(valor)
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatarTelefone(valor: string) {
  const numeros = somenteNumeros(valor).slice(0, 11);
  if (numeros.length <= 10) {
    return numeros
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return numeros
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function formatarCep(valor: string) {
  return somenteNumeros(valor).slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [form, setForm] = useState<Form>(inicial);
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

  useEffect(() => {
    let ativo = true;

    void (async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const user = userData.user;

      if (!ativo) return;
      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data: membro } = await supabase
        .from("company_members")
        .select("company_id, role, display_name")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!ativo) return;
      if (membro && membro.role !== "owner") {
        router.replace("/admin");
        return;
      }

      const [{ data: perfil }, empresaResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, cpf, phone")
          .eq("id", user.id)
          .maybeSingle(),
        membro?.company_id
          ? supabase
              .from("companies")
              .select(
                "name, document_type, document, phone, postal_code, street, address_number, complement, district, city, state, onboarding_completed_at",
              )
              .eq("id", membro.company_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (!ativo) return;

      const empresa = empresaResult.data;
      if (empresa?.onboarding_completed_at) {
        router.replace("/admin");
        return;
      }

      const metadata = user.user_metadata ?? {};
      const tipoDocumento =
        empresa?.document_type === "cpf" || metadata.document_type === "cpf"
          ? "cpf"
          : "cnpj";
      const documento =
        empresa?.document ??
        (typeof metadata.document === "string" ? metadata.document : "");
      const telefone =
        perfil?.phone ??
        empresa?.phone ??
        (typeof metadata.phone === "string" ? metadata.phone : "");

      setEmail(user.email ?? "");
      setForm({
        nome:
          perfil?.full_name ??
          membro?.display_name ??
          (typeof metadata.full_name === "string" ? metadata.full_name : ""),
        cpf: perfil?.cpf ? formatarCpf(perfil.cpf) : "",
        empresa:
          empresa?.name ??
          (typeof metadata.store_name === "string" ? metadata.store_name : ""),
        tipoDocumento,
        documento: formatarDocumento(documento, tipoDocumento),
        telefone: telefone ? formatarTelefone(telefone) : "",
        cep: empresa?.postal_code ? formatarCep(empresa.postal_code) : "",
        rua: empresa?.street ?? "",
        numero: empresa?.address_number ?? "",
        complemento: empresa?.complement ?? "",
        bairro: empresa?.district ?? "",
        cidade: empresa?.city ?? "",
        estado: empresa?.state ?? "",
      });
      setCarregando(false);
    })();

    return () => {
      ativo = false;
    };
  }, [router, supabase]);

  function alterar<K extends keyof Form>(campo: K, valor: Form[K]) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  async function buscarCep() {
    const cep = somenteNumeros(form.cep);
    if (cep.length !== 8 || buscandoCep) return;

    setBuscandoCep(true);
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const dados = (await resposta.json()) as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };
      if (!dados.erro) {
        setForm((atual) => ({
          ...atual,
          rua: dados.logradouro || atual.rua,
          bairro: dados.bairro || atual.bairro,
          cidade: dados.localidade || atual.cidade,
          estado: dados.uf || atual.estado,
        }));
      }
    } catch {
      // Se o CEP não responder, o preenchimento manual continua disponível.
    } finally {
      setBuscandoCep(false);
    }
  }

  async function concluir(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");

    const nome = form.nome.trim();
    const cpf = somenteNumeros(form.cpf);
    const empresa = form.empresa.trim();
    const documento = somenteNumeros(form.documento);
    const telefone = somenteNumeros(form.telefone);
    const cep = somenteNumeros(form.cep);

    if (!nome || !empresa) {
      setErro("Preencha seu nome e o nome da empresa.");
      return;
    }
    if (cpf.length !== 11) {
      setErro("Informe um CPF válido para o responsável.");
      return;
    }
    if (
      (form.tipoDocumento === "cpf" && documento.length !== 11) ||
      (form.tipoDocumento === "cnpj" && documento.length !== 14)
    ) {
      setErro(`Informe um ${form.tipoDocumento === "cnpj" ? "CNPJ" : "CPF"} válido para a empresa.`);
      return;
    }
    if (telefone && telefone.length < 10) {
      setErro("Informe um telefone válido com DDD.");
      return;
    }
    if (cep && cep.length !== 8) {
      setErro("Informe um CEP válido.");
      return;
    }

    setSalvando(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const user = userData.user;
      if (userError || !user) throw new Error("Sua sessão expirou. Entre novamente.");

      const { data: companyId, error: onboardingError } = await supabase.rpc(
        "complete_onboarding",
        {
          p_full_name: nome,
          p_cpf: cpf,
          p_store_name: empresa,
          p_document_type: form.tipoDocumento,
          p_document: documento,
          p_email: email || user.email || "",
          p_phone: telefone || null,
          p_postal_code: cep || null,
          p_street: form.rua.trim() || null,
          p_address_number: form.numero.trim() || null,
          p_complement: form.complemento.trim() || null,
          p_district: form.bairro.trim() || null,
          p_city: form.cidade.trim() || null,
          p_state: form.estado.trim().toUpperCase() || null,
        },
      );

      if (onboardingError || !companyId) {
        throw new Error(onboardingError?.message || "Não foi possível preparar a empresa.");
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: nome,
          cpf,
          email: email || user.email || "",
          phone: telefone || null,
        })
        .eq("id", user.id);
      if (profileError) throw profileError;

      const { error: companyError } = await supabase
        .from("companies")
        .update({
          name: empresa,
          legal_name: empresa,
          document_type: form.tipoDocumento,
          document: documento,
          email: email || user.email || "",
          phone: telefone || null,
          postal_code: cep || null,
          street: form.rua.trim() || null,
          address_number: form.numero.trim() || null,
          complement: form.complemento.trim() || null,
          district: form.bairro.trim() || null,
          city: form.cidade.trim() || null,
          state: form.estado.trim().toUpperCase() || null,
        })
        .eq("id", companyId);
      if (companyError) throw companyError;

      const { error: memberError } = await supabase
        .from("company_members")
        .update({
          display_name: nome,
          email: email || user.email || "",
        })
        .eq("company_id", companyId)
        .eq("user_id", user.id);
      if (memberError) throw memberError;

      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          full_name: nome,
          store_name: empresa,
          document_type: form.tipoDocumento,
          document: documento,
          phone: telefone || null,
        },
      });
      if (metadataError) throw metadataError;

      const { error: completionError } = await supabase
        .from("companies")
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq("id", companyId);
      if (completionError) throw completionError;

      router.replace("/inicio");
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível concluir o onboarding.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#F7F1E8]">
        <div className="flex items-center gap-2 text-sm text-[#703D3A]/70">
          <Loader2 className="h-4 w-4 animate-spin" /> Preparando seu primeiro acesso...
        </div>
      </main>
    );
  }

  const campo =
    "h-11 rounded-xl border-[#D9C6B2]/80 bg-white text-[#3F2422] shadow-sm focus-visible:border-[#A94F45] focus-visible:ring-[#A94F45]/15";

  return (
    <main className="min-h-dvh bg-[#F7F1E8] px-4 py-7 text-[#2C2421] sm:px-6">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Image
              src="/flua-logo.webp"
              alt="Flua Gestão"
              width={180}
              height={78}
              priority
              className="h-auto w-[138px] object-contain"
            />
            <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A94F45]">
              Primeiro acesso
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">
              Configure sua empresa
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#703D3A]/65">
              Complete os dados uma única vez. Depois disso, seus próximos acessos vão direto para a Flua.
            </p>
          </div>
          <div className="rounded-full border border-[#D9C6B2] bg-white px-4 py-2 text-xs font-medium text-[#703D3A]/70">
            {email}
          </div>
        </div>

        <form
          onSubmit={concluir}
          className="rounded-[28px] border border-white/90 bg-white/95 p-5 shadow-[0_24px_70px_rgba(112,61,58,0.11)] sm:p-7"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Seu nome *</Label>
              <Input id="nome" value={form.nome} onChange={(e) => alterar("nome", e.target.value)} required className={campo} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cpf">Seu CPF *</Label>
              <Input id="cpf" value={form.cpf} onChange={(e) => alterar("cpf", formatarCpf(e.target.value))} inputMode="numeric" required className={campo} />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="empresa">Nome da empresa *</Label>
              <Input id="empresa" value={form.empresa} onChange={(e) => alterar("empresa", e.target.value)} required className={campo} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tipo">Documento da empresa *</Label>
              <select
                id="tipo"
                value={form.tipoDocumento}
                onChange={(e) => {
                  const tipo = e.target.value as "cnpj" | "cpf";
                  setForm((atual) => ({ ...atual, tipoDocumento: tipo, documento: "" }));
                }}
                className={`${campo} w-full px-3`}
              >
                <option value="cnpj">CNPJ</option>
                <option value="cpf">CPF</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="documento">{form.tipoDocumento === "cnpj" ? "CNPJ" : "CPF da empresa"} *</Label>
              <Input
                id="documento"
                value={form.documento}
                onChange={(e) => alterar("documento", formatarDocumento(e.target.value, form.tipoDocumento))}
                inputMode="numeric"
                required
                className={campo}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="telefone">WhatsApp / telefone</Label>
              <Input id="telefone" value={form.telefone} onChange={(e) => alterar("telefone", formatarTelefone(e.target.value))} inputMode="tel" className={campo} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cep">CEP</Label>
              <div className="relative">
                <Input
                  id="cep"
                  value={form.cep}
                  onChange={(e) => alterar("cep", formatarCep(e.target.value))}
                  onBlur={buscarCep}
                  inputMode="numeric"
                  className={campo}
                />
                {buscandoCep && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#A94F45]" />}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cidade">Cidade</Label>
              <Input id="cidade" value={form.cidade} onChange={(e) => alterar("cidade", e.target.value)} className={campo} />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="rua">Rua</Label>
              <Input id="rua" value={form.rua} onChange={(e) => alterar("rua", e.target.value)} className={campo} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="numero">Número</Label>
              <Input id="numero" value={form.numero} onChange={(e) => alterar("numero", e.target.value)} className={campo} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="complemento">Complemento</Label>
              <Input id="complemento" value={form.complemento} onChange={(e) => alterar("complemento", e.target.value)} className={campo} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bairro">Bairro</Label>
              <Input id="bairro" value={form.bairro} onChange={(e) => alterar("bairro", e.target.value)} className={campo} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="estado">UF</Label>
              <Input id="estado" maxLength={2} value={form.estado} onChange={(e) => alterar("estado", e.target.value.toUpperCase())} className={campo} />
            </div>
          </div>

          {erro && (
            <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700">
              {erro}
            </p>
          )}

          <Button
            type="submit"
            disabled={salvando}
            className="mt-6 h-12 w-full rounded-xl bg-[#A94F45] font-semibold text-white hover:bg-[#703D3A]"
          >
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {salvando ? "Salvando configuração..." : "Concluir e entrar na Flua"}
          </Button>
        </form>
      </div>
    </main>
  );
}
