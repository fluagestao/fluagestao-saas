"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Check,
  CreditCard,
  ImagePlus,
  Loader2,
  Settings,
  Upload,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Toaster, toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import {
  carregarConfigNotificacoes,
  salvarConfigNotificacoes,
} from "@/lib/notificacoes";
import { CATALOGO_AVISOS, type TipoAviso } from "@/lib/notificacoes-tipos";
import { ConfirmProvider } from "@/components/admin/shell";
import { ImportacaoConfig } from "@/components/admin/ImportacaoConfig";
import { UsuariosView } from "@/components/admin/UsuariosView";
import { createClient } from "@/lib/supabase/client";

export type ContaSecao = "empresa" | "plano" | "usuarios" | "configuracoes";

type EmpresaConta = {
  id: string;
  name: string;
  legal_name: string | null;
  logo_url: string | null;
  document_type: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  postal_code: string | null;
  street: string | null;
  address_number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  timezone: string | null;
};

type AssinaturaConta = {
  plan: string | null;
  status: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
};

function somenteNumeros(valor: string) {
  return valor.replace(/\D/g, "");
}

function formatarDocumento(valor: string) {
  const numeros = somenteNumeros(valor).slice(0, 14);
  if (numeros.length <= 11) {
    return numeros
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }
  return numeros
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatarWhatsapp(valor: string) {
  const numeros = somenteNumeros(valor).slice(0, 11);
  if (numeros.length <= 10) {
    return numeros.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return numeros.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

function formatarCep(valor: string) {
  return somenteNumeros(valor).slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
}

function formatarData(valor?: string | null) {
  if (!valor) return "—";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR").format(data);
}

function rotuloPlano(plano?: string | null) {
  if (!plano || plano === "trial") return "Teste grátis";
  return plano.charAt(0).toUpperCase() + plano.slice(1);
}

function rotuloStatus(status?: string | null) {
  if (status === "active") return "Ativo";
  if (status === "trialing") return "Em teste";
  if (status === "past_due") return "Pagamento pendente";
  if (status === "canceled") return "Cancelado";
  return status || "Em teste";
}

const NAVEGACAO = [
  { id: "empresa" as const, label: "Dados da empresa", icon: Building2 },
  { id: "plano" as const, label: "Plano e assinatura", icon: CreditCard },
  { id: "usuarios" as const, label: "Usuários", icon: Users },
  { id: "configuracoes" as const, label: "Configurações", icon: Settings },
];

const TITULOS: Record<ContaSecao, { titulo: string; descricao: string }> = {
  empresa: {
    titulo: "Dados da empresa",
    descricao: "Essas informações serão usadas nos pedidos, entregas e documentos da sua empresa.",
  },
  plano: {
    titulo: "Plano e assinatura",
    descricao: "Acompanhe seu plano atual, status e datas do ciclo da assinatura.",
  },
  usuarios: {
    titulo: "Usuários",
    descricao: "Gerencie as pessoas que podem acessar o ambiente da sua empresa.",
  },
  configuracoes: {
    titulo: "Configurações",
    descricao: "Defina as preferências gerais do ambiente da sua empresa.",
  },
};

/**
 * Quais avisos aparecem no sino.
 *
 * Guarda so o que esta desligado: tipo novo nasce ligado, e adicionar um aviso
 * depois nao exige mexer na configuracao de ninguem.
 */
function AvisosConfig() {
  const [desligados, setDesligados] = useState<TipoAviso[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarConfigNotificacoes()
      .then(setDesligados)
      .catch(() => setDesligados([]))
      .finally(() => setCarregando(false));
  }, []);

  async function alternar(tipo: TipoAviso) {
    const proximo = desligados.includes(tipo)
      ? desligados.filter((t) => t !== tipo)
      : [...desligados, tipo];
    setDesligados(proximo);
    try {
      await salvarConfigNotificacoes({ data: { desligados: proximo } });
    } catch {
      toast.error("Não consegui salvar a preferência.");
      setDesligados(desligados);
    }
  }

  const familias = ["operacao", "dinheiro", "relacionamento", "tarefas"] as const;
  const rotuloFamilia: Record<(typeof familias)[number], string> = {
    operacao: "Operação",
    dinheiro: "Dinheiro",
    relacionamento: "Relacionamento",
    tarefas: "Tarefas",
  };

  return (
    <div className="rounded-2xl border border-[var(--admin-border)] bg-white p-5 sm:p-6 xl:col-span-2">
      <p className="text-sm font-semibold text-[var(--admin-ink)]">Avisos do sino</p>
      <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
        Desligue o que não quiser ver. Nada aqui é histórico: o aviso aparece enquanto o
        motivo existe e some sozinho quando ele acaba.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {familias.map((familia) => {
          const itens = CATALOGO_AVISOS.filter((a) => a.familia === familia);
          if (!itens.length) return null;
          return (
            <div key={familia}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--bronze)]">
                {rotuloFamilia[familia]}
              </p>
              <ul className="space-y-2">
                {itens.map((item) => (
                  <li key={item.tipo} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-[var(--admin-ink)]">{item.rotulo}</p>
                      <p className="text-xs text-[var(--admin-muted)]">{item.ajuda}</p>
                    </div>
                    <Switch
                      checked={!desligados.includes(item.tipo)}
                      disabled={carregando}
                      onCheckedChange={() => alternar(item.tipo)}
                      aria-label={item.rotulo}
                    />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ContaPageClient({
  secao,
  email,
  displayName,
  companyName,
}: {
  secao: ContaSecao;
  email: string;
  displayName: string;
  companyName: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [empresa, setEmpresa] = useState<EmpresaConta | null>(null);
  const [assinatura, setAssinatura] = useState<AssinaturaConta | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [razaoSocial, setRazaoSocial] = useState(companyName);
  const [nomeFantasia, setNomeFantasia] = useState(companyName);
  const [documento, setDocumento] = useState("");
  const [telefone, setTelefone] = useState("");
  const [emailEmpresa, setEmailEmpresa] = useState("");
  const [responsavel, setResponsavel] = useState(displayName);
  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);

  /**
   * CEP completo preenche rua, bairro, cidade e UF.
   *
   * A tela do pedido já fazia isso desde sempre; esta e a de clientes não —
   * a pessoa digitava o mesmo endereço três vezes em telas diferentes.
   *
   * Vai pela rota interna /api/cep, que tem o BrasilAPI de reserva quando o
   * ViaCEP cai. Falha em silêncio de propósito: aqui o endereço é opcional e
   * um aviso vermelho no cadastro da empresa assustaria à toa — quem quiser
   * digita à mão, que é o que já fazia.
   */
  async function buscarCep(valor: string) {
    const digitos = somenteNumeros(valor);
    if (digitos.length !== 8) return;
    setBuscandoCep(true);
    try {
      const r = await fetch(`/api/cep/${digitos}`);
      if (!r.ok) return;
      const d = (await r.json()) as {
        logradouro?: string;
        bairro?: string;
        cidade?: string;
        uf?: string;
      };
      /* Só preenche o que veio. CEP de cidade pequena costuma valer para o
         município inteiro e não traz rua nenhuma — sobrescrever com vazio
         apagaria o que a pessoa já tinha digitado. */
      if (d.logradouro) setRua(d.logradouro);
      if (d.bairro) setBairro(d.bairro);
      if (d.cidade) setCidade(d.cidade);
      if (d.uf) setUf(d.uf.toUpperCase());
    } catch {
      /* sem rede: digita à mão */
    } finally {
      setBuscandoCep(false);
    }
  }
  const [timezone, setTimezone] = useState("America/Sao_Paulo");

  const inicial = (nomeFantasia || companyName || displayName || email || "F")
    .trim()
    .charAt(0)
    .toUpperCase();

  useEffect(() => {
    let ativo = true;

    void (async () => {
      setCarregando(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        const usuarioId = userData.user?.id;
        if (!usuarioId) return;
        if (ativo) setUserId(usuarioId);

        const { data: membro } = await supabase
          .from("company_members")
          .select("company_id,display_name")
          .eq("user_id", usuarioId)
          .eq("status", "active")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!membro?.company_id) return;

        const [{ data: empresaData }, { data: assinaturaData }] = await Promise.all([
          supabase
            .from("companies")
            .select("id,name,legal_name,logo_url,document_type,document,email,phone,postal_code,street,address_number,complement,district,city,state,timezone")
            .eq("id", membro.company_id)
            .maybeSingle(),
          supabase
            .from("subscriptions")
            .select("plan,status,trial_ends_at,current_period_end")
            .eq("company_id", membro.company_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (!ativo) return;

        if (empresaData) {
          const empresaAtual = empresaData as EmpresaConta;
          setEmpresa(empresaAtual);
          setRazaoSocial(empresaAtual.legal_name || empresaAtual.name || companyName);
          setNomeFantasia(empresaAtual.name || companyName);
          setDocumento(formatarDocumento(empresaAtual.document || ""));
          setTelefone(formatarWhatsapp(empresaAtual.phone || ""));
          setEmailEmpresa(empresaAtual.email || "");
          setCep(formatarCep(empresaAtual.postal_code || ""));
          setRua(empresaAtual.street || "");
          setNumero(empresaAtual.address_number || "");
          setComplemento(empresaAtual.complement || "");
          setBairro(empresaAtual.district || "");
          setCidade(empresaAtual.city || "");
          setUf(empresaAtual.state || "");
          setTimezone(empresaAtual.timezone || "America/Sao_Paulo");
        }
        setResponsavel(membro.display_name || displayName || "");
        if (assinaturaData) setAssinatura(assinaturaData as AssinaturaConta);
      } finally {
        if (ativo) setCarregando(false);
      }
    })();

    return () => {
      ativo = false;
    };
  }, [companyName, displayName, supabase]);

  async function salvarEmpresa() {
    if (!empresa?.id || !nomeFantasia.trim() || !razaoSocial.trim()) return;
    setSalvando(true);

    const empresaUpdate = supabase
      .from("companies")
      .update({
        legal_name: razaoSocial.trim(),
        name: nomeFantasia.trim(),
        document: somenteNumeros(documento) || null,
        phone: somenteNumeros(telefone) || null,
        email: emailEmpresa.trim().toLowerCase() || null,
        postal_code: somenteNumeros(cep) || null,
        street: rua.trim() || null,
        address_number: numero.trim() || null,
        complement: complemento.trim() || null,
        district: bairro.trim() || null,
        city: cidade.trim() || null,
        state: uf.trim().toUpperCase() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", empresa.id);

    const membroUpdate = userId
      ? supabase
          .from("company_members")
          .update({ display_name: responsavel.trim() || null })
          .eq("company_id", empresa.id)
          .eq("user_id", userId)
      : Promise.resolve({ error: null });

    const [{ error: empresaError }, membroResultado] = await Promise.all([empresaUpdate, membroUpdate]);
    const membroError = "error" in membroResultado ? membroResultado.error : null;

    setSalvando(false);
    if (empresaError || membroError) {
      toast.error("Não foi possível salvar todos os dados da empresa.");
      return;
    }

    setEmpresa((atual) =>
      atual
        ? {
            ...atual,
            legal_name: razaoSocial.trim(),
            name: nomeFantasia.trim(),
            document: somenteNumeros(documento) || null,
            phone: somenteNumeros(telefone) || null,
            email: emailEmpresa.trim().toLowerCase() || null,
            postal_code: somenteNumeros(cep) || null,
            street: rua.trim() || null,
            address_number: numero.trim() || null,
            complement: complemento.trim() || null,
            district: bairro.trim() || null,
            city: cidade.trim() || null,
            state: uf.trim().toUpperCase() || null,
          }
        : atual,
    );
    toast.success("Dados da empresa atualizados.");
  }

  async function enviarLogo(arquivo?: File | null) {
    if (!arquivo || !empresa?.id) return;
    if (!arquivo.type.match(/^image\/(png|jpeg|webp)$/)) {
      toast.error("Use uma imagem PNG, JPG ou WebP.");
      return;
    }
    if (arquivo.size > 2 * 1024 * 1024) {
      toast.error("A logo deve ter no máximo 2 MB.");
      return;
    }

    setEnviandoLogo(true);
    const extensao = arquivo.type === "image/png" ? "png" : arquivo.type === "image/webp" ? "webp" : "jpg";
    const caminho = `${empresa.id}/logo.${extensao}`;

    const { error: uploadError } = await supabase.storage.from("empresas").upload(caminho, arquivo, {
      upsert: true,
      contentType: arquivo.type,
      cacheControl: "3600",
    });

    if (uploadError) {
      setEnviandoLogo(false);
      toast.error("Não foi possível enviar a logo.");
      return;
    }

    const { data: publicData } = supabase.storage.from("empresas").getPublicUrl(caminho);
    const logoUrl = `${publicData.publicUrl}?v=${Date.now()}`;
    const { error: updateError } = await supabase
      .from("companies")
      .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
      .eq("id", empresa.id);

    setEnviandoLogo(false);
    if (updateError) {
      toast.error("A logo foi enviada, mas não foi possível vinculá-la à empresa.");
      return;
    }

    setEmpresa((atual) => (atual ? { ...atual, logo_url: logoUrl } : atual));
    toast.success("Logo atualizada.");
  }

  async function salvarConfiguracoes() {
    if (!empresa?.id) return;
    setSalvando(true);

    const { error } = await supabase
      .from("companies")
      .update({ timezone, updated_at: new Date().toISOString() })
      .eq("id", empresa.id);

    setSalvando(false);
    if (error) {
      toast.error("Não foi possível salvar as configurações.");
      return;
    }

    setEmpresa((atual) => (atual ? { ...atual, timezone } : atual));
    toast.success("Configurações atualizadas.");
  }

  const plano = rotuloPlano(assinatura?.plan);
  const status = rotuloStatus(assinatura?.status);
  const fimPeriodo = assinatura?.current_period_end || assinatura?.trial_ends_at;
  const cabecalho = TITULOS[secao];
  const inputClass = "h-11 w-full rounded-xl border border-[var(--admin-border)] bg-white px-3 text-sm outline-none transition focus:border-[var(--terracotta)] focus:ring-2 focus:ring-[var(--terracotta)]/10";

  return (
    <ConfirmProvider>
      <Toaster position="bottom-right" richColors />
      <div data-flua-painel className="min-h-dvh bg-[var(--admin-bg)] text-[var(--admin-ink)]">
        <header className="sticky top-0 z-40 border-b border-[var(--admin-border)] bg-white/96 backdrop-blur-xl">
          <div className="mx-auto flex h-[74px] max-w-[1540px] items-center justify-between gap-4 px-4 sm:px-6 xl:px-8">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="flex items-center" aria-label="Voltar ao painel Flua">
                <Image src="/flua-logo.webp" alt="Flua Gestão" width={150} height={64} priority className="h-auto w-[112px] object-contain" />
              </Link>
              <span className="hidden h-7 w-px bg-[var(--admin-border)] sm:block" />
              <Link href="/admin" className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[var(--admin-ink-soft)] transition hover:bg-[var(--cream-soft)] sm:inline-flex">
                <ArrowLeft className="h-4 w-4" />
                Voltar ao painel
              </Link>
            </div>

            <div className="flex min-w-0 items-center gap-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--cream)] text-sm font-bold text-[var(--wine)] ring-1 ring-[var(--admin-border)]">
                {empresa?.logo_url ? <img src={empresa.logo_url} alt="Logo da empresa" className="h-full w-full object-contain p-1" /> : inicial}
              </span>
              <span className="hidden min-w-0 sm:block">
                <strong className="block max-w-40 truncate text-xs font-semibold">{nomeFantasia || companyName}</strong>
                <span className="block max-w-40 truncate text-[10px] text-[var(--admin-muted)]">{responsavel || displayName || email}</span>
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1540px] px-4 py-5 sm:px-6 lg:py-7 xl:px-8">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[var(--terracotta)]">Conta Flua</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">{cabecalho.titulo}</h1>
              <p className="mt-1.5 max-w-2xl text-sm text-[var(--admin-muted)]">{cabecalho.descricao}</p>
            </div>
            {secao === "empresa" && (
              <button type="button" onClick={salvarEmpresa} disabled={salvando || carregando} className="hidden h-11 shrink-0 items-center gap-2 rounded-xl bg-[var(--terracotta)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--wine)] disabled:opacity-60 sm:inline-flex">
                {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Salvar alterações
              </button>
            )}
          </div>

          <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
            <aside className="h-fit rounded-2xl border border-[var(--admin-border)] bg-white p-2 shadow-sm lg:sticky lg:top-[94px]">
              {NAVEGACAO.map((item) => {
                const ativo = secao === item.id;
                return (
                  <Link key={item.id} href={`/admin/conta/${item.id}`} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${ativo ? "bg-[var(--cream)] text-[var(--wine)]" : "text-[var(--admin-ink-soft)] hover:bg-[var(--cream-soft)] hover:text-[var(--wine)]"}`}>
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </aside>

            <section className="min-w-0">
              {carregando && secao !== "usuarios" ? (
                <div className="grid min-h-[420px] place-items-center rounded-2xl border border-[var(--admin-border)] bg-white">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--terracotta)]" />
                </div>
              ) : secao === "empresa" ? (
                <div className="space-y-5">
                  <div className="grid gap-5 xl:grid-cols-[290px_minmax(0,1fr)]">
                    <div className="rounded-2xl border border-[var(--admin-border)] bg-white p-5">
                      <h2 className="text-base font-semibold">Identidade visual</h2>
                      <p className="mt-1 text-xs text-[var(--admin-muted)]">Logo oficial usada no ambiente da empresa.</p>

                      <div className="mt-5 grid min-h-[160px] place-items-center overflow-hidden rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--cream-soft)] p-5">
                        {empresa?.logo_url ? (
                          <img src={empresa.logo_url} alt={`Logo ${nomeFantasia}`} className="max-h-[110px] max-w-full object-contain" />
                        ) : (
                          <div className="text-center text-[var(--admin-muted)]">
                            <ImagePlus className="mx-auto h-8 w-8 text-[var(--terracotta)]" />
                            <p className="mt-2 text-xs">Sua logo aparecerá aqui</p>
                          </div>
                        )}
                      </div>

                      <label className="mt-4 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--admin-border)] bg-white text-sm font-semibold text-[var(--wine)] transition hover:bg-[var(--cream-soft)]">
                        {enviandoLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {enviandoLogo ? "Enviando..." : "Selecionar logo"}
                        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={enviandoLogo} onChange={(e) => void enviarLogo(e.target.files?.[0])} />
                      </label>
                      <p className="mt-3 text-center text-[10px] leading-5 text-[var(--admin-muted)]">PNG, JPG ou WebP · até 2 MB.</p>
                    </div>

                    <div className="rounded-2xl border border-[var(--admin-border)] bg-white p-5 sm:p-6">
                      <h2 className="text-base font-semibold">Dados cadastrais</h2>
                      <p className="mt-1 text-xs text-[var(--admin-muted)]">Os dados informados no primeiro cadastro já aparecem preenchidos.</p>

                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <label>
                          <span className="mb-1.5 block text-xs font-semibold text-[var(--admin-ink-soft)]">Razão social</span>
                          <input value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} className={inputClass} />
                        </label>
                        <label>
                          <span className="mb-1.5 block text-xs font-semibold text-[var(--admin-ink-soft)]">Nome fantasia</span>
                          <input value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} className={inputClass} />
                        </label>
                        <label className="sm:col-span-2 sm:max-w-[50%] sm:pr-2">
                          <span className="mb-1.5 block text-xs font-semibold text-[var(--admin-ink-soft)]">CNPJ/CPF</span>
                          <input value={documento} onChange={(e) => setDocumento(formatarDocumento(e.target.value))} inputMode="numeric" className={inputClass} />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,.75fr)]">
                    <div className="rounded-2xl border border-[var(--admin-border)] bg-white p-5 sm:p-6">
                      <h2 className="text-base font-semibold">Endereço</h2>
                      <p className="mt-1 text-xs text-[var(--admin-muted)]">Endereço principal usado nas informações da empresa.</p>

                      <div className="mt-5 grid gap-4 sm:grid-cols-6">
                        <label className="sm:col-span-2">
                          <span className="mb-1.5 block text-xs font-semibold text-[var(--admin-ink-soft)]">
                            CEP
                            {buscandoCep && (
                              <span className="ml-1.5 font-normal text-[var(--admin-muted)]">
                                buscando…
                              </span>
                            )}
                          </span>
                          <input
                            value={cep}
                            onChange={(e) => {
                              const v = formatarCep(e.target.value);
                              setCep(v);
                              void buscarCep(v);
                            }}
                            inputMode="numeric"
                            className={inputClass}
                          />
                        </label>
                        <label className="sm:col-span-1">
                          <span className="mb-1.5 block text-xs font-semibold text-[var(--admin-ink-soft)]">UF</span>
                          <input value={uf} onChange={(e) => setUf(e.target.value.slice(0, 2).toUpperCase())} maxLength={2} className={inputClass} />
                        </label>
                        <label className="sm:col-span-3">
                          <span className="mb-1.5 block text-xs font-semibold text-[var(--admin-ink-soft)]">Cidade</span>
                          <input value={cidade} onChange={(e) => setCidade(e.target.value)} className={inputClass} />
                        </label>
                        <label className="sm:col-span-2">
                          <span className="mb-1.5 block text-xs font-semibold text-[var(--admin-ink-soft)]">Bairro</span>
                          <input value={bairro} onChange={(e) => setBairro(e.target.value)} className={inputClass} />
                        </label>
                        <label className="sm:col-span-4">
                          <span className="mb-1.5 block text-xs font-semibold text-[var(--admin-ink-soft)]">Endereço</span>
                          <input value={rua} onChange={(e) => setRua(e.target.value)} className={inputClass} />
                        </label>
                        <label className="sm:col-span-2">
                          <span className="mb-1.5 block text-xs font-semibold text-[var(--admin-ink-soft)]">Número</span>
                          <input value={numero} onChange={(e) => setNumero(e.target.value)} className={inputClass} />
                        </label>
                        <label className="sm:col-span-4">
                          <span className="mb-1.5 block text-xs font-semibold text-[var(--admin-ink-soft)]">Complemento</span>
                          <input value={complemento} onChange={(e) => setComplemento(e.target.value)} className={inputClass} />
                        </label>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--admin-border)] bg-white p-5 sm:p-6">
                      <h2 className="text-base font-semibold">Contato</h2>
                      <p className="mt-1 text-xs text-[var(--admin-muted)]">Responsável principal pela conta da empresa.</p>

                      <div className="mt-5 space-y-4">
                        <label>
                          <span className="mb-1.5 block text-xs font-semibold text-[var(--admin-ink-soft)]">Nome do contato</span>
                          <input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className={inputClass} />
                        </label>
                        <label>
                          <span className="mb-1.5 block text-xs font-semibold text-[var(--admin-ink-soft)]">WhatsApp</span>
                          <input value={telefone} onChange={(e) => setTelefone(formatarWhatsapp(e.target.value))} inputMode="tel" className={inputClass} />
                        </label>
                        <label>
                          <span className="mb-1.5 block text-xs font-semibold text-[var(--admin-ink-soft)]">E-mail</span>
                          <input type="email" value={emailEmpresa} onChange={(e) => setEmailEmpresa(e.target.value)} className={inputClass} />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end sm:hidden">
                    <button type="button" onClick={salvarEmpresa} disabled={salvando} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--terracotta)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--wine)] disabled:opacity-60">
                      {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Salvar alterações
                    </button>
                  </div>
                </div>
              ) : secao === "plano" ? (
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="rounded-2xl border border-[var(--admin-border)] bg-white p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[.12em] text-[var(--terracotta)]">Plano atual</p>
                        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">{plano}</h2>
                        <p className="mt-1 text-sm text-[var(--admin-muted)]">Status da assinatura: {status}</p>
                      </div>
                      <span className="rounded-full bg-[#74745B]/12 px-3 py-1.5 text-xs font-semibold text-[#74745B]">{status}</span>
                    </div>

                    <div className="mt-7 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-[var(--cream-soft)] p-4">
                        <p className="text-xs text-[var(--admin-muted)]">Próxima renovação / fim do teste</p>
                        <strong className="mt-1 block text-sm">{formatarData(fimPeriodo)}</strong>
                      </div>
                      <div className="rounded-xl bg-[var(--cream-soft)] p-4">
                        <p className="text-xs text-[var(--admin-muted)]">Empresa</p>
                        <strong className="mt-1 block truncate text-sm">{nomeFantasia || companyName}</strong>
                      </div>
                    </div>
                  </div>

                  <aside className="rounded-2xl border border-[var(--admin-border)] bg-[linear-gradient(145deg,#F7F1E8,#fff)] p-5">
                    <CreditCard className="h-5 w-5 text-[var(--terracotta)]" />
                    <h2 className="mt-3 text-base font-semibold">Assinatura Flua</h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--admin-muted)]">Nesta página ficam o plano contratado, a situação da assinatura e as datas do ciclo.</p>
                  </aside>
                </div>
              ) : secao === "usuarios" ? (
                <div className="rounded-2xl border border-[var(--admin-border)] bg-white p-4 sm:p-5">
                  <UsuariosView />
                </div>
              ) : (
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <ImportacaoConfig />
                  <AvisosConfig />
                  <div className="rounded-2xl border border-[var(--admin-border)] bg-white p-5 sm:p-6 xl:col-span-2">

                    <div className="mt-6 flex justify-end">
                      <button type="button" onClick={salvarConfiguracoes} disabled={salvando} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--terracotta)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--wine)] disabled:opacity-60">
                        {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Salvar configurações
                      </button>
                    </div>
                  </div>

                  <aside className="rounded-2xl border border-[var(--admin-border)] bg-white p-5">
                    <Settings className="h-5 w-5 text-[var(--terracotta)]" />
                    <h2 className="mt-3 text-base font-semibold">Conta do usuário</h2>
                    <p className="mt-2 text-sm text-[var(--admin-muted)]">{responsavel || displayName || "Usuário"}</p>
                    <p className="mt-1 break-all text-xs text-[var(--admin-muted)]">{email}</p>
                  </aside>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </ConfirmProvider>
  );
}
