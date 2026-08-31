"use client";

import { BellRing, Loader2, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
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

function mensagemErro(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message?: unknown }).message ?? "").trim();
    if (message) return message;
  }
  return fallback;
}

export function OnboardingPrompt() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [pendente, setPendente] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erro, setErro] = useState("");
  const [email, setEmail] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(inicial);

  useEffect(() => {
    if (!pathname.startsWith("/admin")) {
      setPendente(false);
      setAberto(false);
      return;
    }

    let ativo = true;
    setCarregando(true);

    void (async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        const user = userData.user;
        if (!ativo || userError || !user) return;

        const { data: membro } = await supabase
          .from("company_members")
          .select("company_id, role, display_name")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!ativo || !membro || membro.role !== "owner") return;

        const [{ data: perfil }, { data: empresa }] = await Promise.all([
          supabase
            .from("profiles")
            .select("full_name, cpf, phone")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("companies")
            .select(
              "name, document_type, document, phone, postal_code, street, address_number, complement, district, city, state, onboarding_completed_at",
            )
            .eq("id", membro.company_id)
            .maybeSingle(),
        ]);

        if (!ativo || !empresa || empresa.onboarding_completed_at) {
          setPendente(false);
          return;
        }

        const metadata = user.user_metadata ?? {};
        const tipoDocumento: "cnpj" | "cpf" =
          empresa.document_type === "cpf" || metadata.document_type === "cpf"
            ? "cpf"
            : "cnpj";
        const documento =
          empresa.document ??
          (typeof metadata.document === "string" ? metadata.document : "");
        const telefone =
          perfil?.phone ??
          empresa.phone ??
          (typeof metadata.phone === "string" ? metadata.phone : "");

        setUserId(user.id);
        setCompanyId(membro.company_id);
        setEmail(user.email ?? "");
        setForm({
          nome:
            perfil?.full_name ??
            membro.display_name ??
            (typeof metadata.full_name === "string" ? metadata.full_name : ""),
          cpf: perfil?.cpf ? formatarCpf(perfil.cpf) : "",
          empresa:
            empresa.name ??
            (typeof metadata.store_name === "string" ? metadata.store_name : ""),
          tipoDocumento,
          documento: formatarDocumento(documento, tipoDocumento),
          telefone: telefone ? formatarTelefone(telefone) : "",
          cep: empresa.postal_code ? formatarCep(empresa.postal_code) : "",
          rua: empresa.street ?? "",
          numero: empresa.address_number ?? "",
          complemento: empresa.complement ?? "",
          bairro: empresa.district ?? "",
          cidade: empresa.city ?? "",
          estado: empresa.state ?? "",
        });
        setPendente(true);

        const deveAbrir =
          typeof window !== "undefined" &&
          new URLSearchParams(window.location.search).get("onboarding") === "1";
        if (deveAbrir) setAberto(true);
      } finally {
        if (ativo) setCarregando(false);
      }
    })();

    return () => {
      ativo = false;
    };
  }, [pathname, supabase]);

  function alterar<K extends keyof Form>(campo: K, valor: Form[K]) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function limparParametroOnboarding() {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("onboarding")) return;
    url.searchParams.delete("onboarding");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function fechar() {
    setAberto(false);
    setErro("");
    limparParametroOnboarding();
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
      // O preenchimento manual continua disponível se o ViaCEP não responder.
    } finally {
      setBuscandoCep(false);
    }
  }

  async function concluir(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");

    if (!companyId || !userId) {
      setErro("Não foi possível localizar sua empresa. Atualize a página e tente novamente.");
      return;
    }

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
      setErro(
        `Informe um ${form.tipoDocumento === "cnpj" ? "CNPJ" : "CPF"} válido para a empresa.`,
      );
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
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: nome,
          cpf,
          email,
          phone: telefone || null,
        })
        .eq("id", userId);
      if (profileError) throw profileError;

      const { error: companyError } = await supabase
        .from("companies")
        .update({
          name: empresa,
          legal_name: empresa,
          document_type: form.tipoDocumento,
          document: documento,
          email,
          phone: telefone || null,
          postal_code: cep || null,
          street: form.rua.trim() || null,
          address_number: form.numero.trim() || null,
          complement: form.complemento.trim() || null,
          district: form.bairro.trim() || null,
          city: form.cidade.trim() || null,
          state: form.estado.trim().toUpperCase() || null,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq("id", companyId);

      if (companyError) {
        if (companyError.code === "23505") {
          throw new Error("Este CPF/CNPJ já está vinculado a outra empresa na Flua.");
        }
        throw companyError;
      }

      const { error: memberError } = await supabase
        .from("company_members")
        .update({ display_name: nome, email })
        .eq("company_id", companyId)
        .eq("user_id", userId);
      if (memberError) throw memberError;

      const { data: userData } = await supabase.auth.getUser();
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          ...(userData.user?.user_metadata ?? {}),
          full_name: nome,
          store_name: empresa,
          document_type: form.tipoDocumento,
          document: documento,
          phone: telefone || null,
        },
      });
      if (metadataError) throw metadataError;

      setPendente(false);
      setAberto(false);
      limparParametroOnboarding();
      router.replace("/admin");
      router.refresh();
    } catch (error) {
      setErro(mensagemErro(error, "Não foi possível concluir o cadastro agora."));
    } finally {
      setSalvando(false);
    }
  }

  if (!pathname.startsWith("/admin") || !pendente) return null;

  const campo =
    "h-11 rounded-xl border-[#D9C6B2]/80 bg-white text-[#3F2422] shadow-sm focus-visible:border-[#A94F45] focus-visible:ring-[#A94F45]/15";

  return (
    <>
      <div className="fixed left-1/2 top-[82px] z-[55] w-[calc(100%-24px)] max-w-3xl -translate-x-1/2 rounded-2xl border border-[#D9C6B2] bg-white/95 px-4 py-3 shadow-[0_16px_44px_rgba(112,61,58,0.16)] backdrop-blur sm:px-5">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#F7F1E8] text-[#A94F45]">
            {carregando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BellRing className="h-4 w-4" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#3F2422]">Finalize o cadastro da sua empresa</p>
            <p className="hidden text-xs text-[#703D3A]/65 sm:block">
              Você já pode usar a Flua. Complete os dados quando puder.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setAberto(true)}
            className="h-9 shrink-0 rounded-xl bg-[#A94F45] px-4 text-xs font-semibold text-white hover:bg-[#703D3A]"
          >
            Finalizar cadastro
          </Button>
        </div>
      </div>

      {aberto && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#2C2421]/45 p-3 backdrop-blur-[2px] sm:p-6">
          <div className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-white/80 bg-[#F7F1E8] shadow-[0_28px_90px_rgba(44,36,33,0.28)]">
            <div className="flex items-start justify-between gap-4 border-b border-[#D9C6B2]/70 bg-white px-5 py-4 sm:px-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#A94F45]">Primeiro acesso</p>
                <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#2C2421] sm:text-2xl">Configure sua empresa</h2>
                <p className="mt-1 text-xs text-[#703D3A]/65 sm:text-sm">
                  Você pode fechar agora e continuar usando o sistema. A notificação ficará disponível no topo.
                </p>
              </div>
              <button
                type="button"
                onClick={fechar}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[#703D3A]/70 transition hover:bg-[#F7F1E8] hover:text-[#3F2422]"
                aria-label="Fechar onboarding"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={concluir} className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="onboarding-nome">Seu nome *</Label>
                  <Input id="onboarding-nome" value={form.nome} onChange={(e) => alterar("nome", e.target.value)} required className={campo} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="onboarding-cpf">Seu CPF *</Label>
                  <Input id="onboarding-cpf" value={form.cpf} onChange={(e) => alterar("cpf", formatarCpf(e.target.value))} inputMode="numeric" required className={campo} />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="onboarding-empresa">Nome da empresa *</Label>
                  <Input id="onboarding-empresa" value={form.empresa} onChange={(e) => alterar("empresa", e.target.value)} required className={campo} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="onboarding-tipo">Documento da empresa *</Label>
                  <select
                    id="onboarding-tipo"
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
                  <Label htmlFor="onboarding-documento">
                    {form.tipoDocumento === "cnpj" ? "CNPJ" : "CPF da empresa"} *
                  </Label>
                  <Input
                    id="onboarding-documento"
                    value={form.documento}
                    onChange={(e) => alterar("documento", formatarDocumento(e.target.value, form.tipoDocumento))}
                    inputMode="numeric"
                    required
                    className={campo}
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="onboarding-telefone">WhatsApp / telefone</Label>
                  <Input id="onboarding-telefone" value={form.telefone} onChange={(e) => alterar("telefone", formatarTelefone(e.target.value))} inputMode="tel" className={campo} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="onboarding-cep">CEP</Label>
                  <div className="relative">
                    <Input id="onboarding-cep" value={form.cep} onChange={(e) => alterar("cep", formatarCep(e.target.value))} onBlur={buscarCep} inputMode="numeric" className={campo} />
                    {buscandoCep && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#A94F45]" />}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="onboarding-cidade">Cidade</Label>
                  <Input id="onboarding-cidade" value={form.cidade} onChange={(e) => alterar("cidade", e.target.value)} className={campo} />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="onboarding-rua">Rua</Label>
                  <Input id="onboarding-rua" value={form.rua} onChange={(e) => alterar("rua", e.target.value)} className={campo} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="onboarding-numero">Número</Label>
                  <Input id="onboarding-numero" value={form.numero} onChange={(e) => alterar("numero", e.target.value)} className={campo} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="onboarding-complemento">Complemento</Label>
                  <Input id="onboarding-complemento" value={form.complemento} onChange={(e) => alterar("complemento", e.target.value)} className={campo} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="onboarding-bairro">Bairro</Label>
                  <Input id="onboarding-bairro" value={form.bairro} onChange={(e) => alterar("bairro", e.target.value)} className={campo} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="onboarding-estado">UF</Label>
                  <Input id="onboarding-estado" maxLength={2} value={form.estado} onChange={(e) => alterar("estado", e.target.value.toUpperCase())} className={campo} />
                </div>
              </div>

              {erro && (
                <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700">
                  {erro}
                </p>
              )}

              <div className="sticky bottom-0 -mx-5 mt-6 flex items-center justify-end gap-2 border-t border-[#D9C6B2]/70 bg-[#F7F1E8]/95 px-5 pb-1 pt-4 backdrop-blur sm:-mx-6 sm:px-6">
                <Button type="button" variant="outline" onClick={fechar} className="h-11 rounded-xl border-[#D9C6B2] bg-white px-5 text-[#703D3A]">
                  Fazer depois
                </Button>
                <Button type="submit" disabled={salvando} className="h-11 rounded-xl bg-[#A94F45] px-5 font-semibold text-white hover:bg-[#703D3A]">
                  {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {salvando ? "Salvando..." : "Concluir cadastro"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
