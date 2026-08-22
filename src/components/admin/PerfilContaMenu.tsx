"use client";

import {
  Building2,
  Check,
  ChevronDown,
  CreditCard,
  Loader2,
  LogOut,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";

type TelaConta = "empresa" | "plano" | "configuracoes" | null;

type EmpresaConta = {
  id: string;
  name: string;
  document_type: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
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

export function PerfilContaMenu({
  email,
  displayName,
  companyName,
  onUsuarios,
}: {
  email: string;
  displayName: string;
  companyName: string;
  onUsuarios: () => void;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [aberto, setAberto] = useState(false);
  const [tela, setTela] = useState<TelaConta>(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [empresa, setEmpresa] = useState<EmpresaConta | null>(null);
  const [assinatura, setAssinatura] = useState<AssinaturaConta | null>(null);
  const [nome, setNome] = useState(companyName);
  const [documento, setDocumento] = useState("");
  const [telefone, setTelefone] = useState("");
  const [emailEmpresa, setEmailEmpresa] = useState("");

  const inicial = (companyName || displayName || email || "F")
    .trim()
    .charAt(0)
    .toUpperCase();

  async function carregarConta() {
    if (empresa || carregando) return;
    setCarregando(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;

      const { data: membro } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!membro?.company_id) return;

      const [{ data: empresaData }, { data: assinaturaData }] = await Promise.all([
        supabase
          .from("companies")
          .select("id,name,document_type,document,email,phone,city,state,timezone")
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

      if (empresaData) {
        setEmpresa(empresaData as EmpresaConta);
        setNome(empresaData.name ?? companyName);
        setDocumento(empresaData.document ?? "");
        setTelefone(empresaData.phone ?? "");
        setEmailEmpresa(empresaData.email ?? "");
      }
      if (assinaturaData) setAssinatura(assinaturaData as AssinaturaConta);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (aberto || tela) void carregarConta();
  }, [aberto, tela]);

  async function sair() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  function abrirTela(destino: Exclude<TelaConta, null>) {
    setTela(destino);
    setAberto(false);
  }

  async function salvarEmpresa() {
    if (!empresa?.id || !nome.trim()) return;
    setSalvando(true);
    const { error } = await supabase
      .from("companies")
      .update({
        name: nome.trim(),
        document: documento.trim() || null,
        phone: telefone.trim() || null,
        email: emailEmpresa.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", empresa.id);
    setSalvando(false);

    if (error) {
      toast.error("Não foi possível salvar os dados da empresa.");
      return;
    }

    setEmpresa((atual) =>
      atual
        ? {
            ...atual,
            name: nome.trim(),
            document: documento.trim() || null,
            phone: telefone.trim() || null,
            email: emailEmpresa.trim() || null,
          }
        : atual,
    );
    toast.success("Dados da empresa atualizados.");
    router.refresh();
  }

  const plano = rotuloPlano(assinatura?.plan);
  const status = rotuloStatus(assinatura?.status);
  const fimPeriodo = assinatura?.current_period_end || assinatura?.trial_ends_at;

  return (
    <>
      <div className="relative ml-1">
        <button
          type="button"
          onClick={() => setAberto((valor) => !valor)}
          className="flex min-w-0 items-center gap-2 rounded-xl px-2 py-1.5 text-left transition hover:bg-[var(--cream-soft)]"
          aria-expanded={aberto}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--cream)] text-sm font-bold text-[var(--wine)] ring-1 ring-[var(--admin-border)]">
            {inicial}
          </span>
          <span className="hidden min-w-0 sm:block">
            <strong className="block max-w-32 truncate text-xs font-semibold text-[var(--admin-ink)]">
              {companyName}
            </strong>
            <span className="block max-w-32 truncate text-[10px] text-[var(--admin-muted)]">
              {displayName || "Usuário"}
            </span>
          </span>
          <ChevronDown className={`hidden h-3.5 w-3.5 text-[var(--admin-muted)] transition-transform sm:block ${aberto ? "rotate-180" : ""}`} />
        </button>

        {aberto && (
          <div className="absolute right-0 top-full z-50 mt-2 w-[300px] overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-white shadow-[var(--shadow-lift)]">
            <div className="flex items-start gap-3 border-b border-[var(--admin-border)] p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--cream)] text-base font-bold text-[var(--wine)] ring-1 ring-[var(--admin-border)]">
                {inicial}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <strong className="truncate text-sm text-[var(--admin-ink)]">{companyName}</strong>
                  <span className="shrink-0 rounded-full bg-[#74745B]/12 px-2 py-1 text-[9px] font-semibold text-[#74745B]">
                    {plano}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-[var(--admin-muted)]">{email}</p>
                <p className="mt-1 text-[10px] font-medium text-[var(--terracotta)]">{status}</p>
              </div>
            </div>

            <div className="p-2">
              {[
                { label: "Dados da empresa", icon: Building2, acao: () => abrirTela("empresa") },
                { label: "Plano e assinatura", icon: CreditCard, acao: () => abrirTela("plano") },
                {
                  label: "Usuários",
                  icon: Users,
                  acao: () => {
                    setAberto(false);
                    onUsuarios();
                  },
                },
                { label: "Configurações", icon: Settings, acao: () => abrirTela("configuracoes") },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.acao}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[var(--admin-ink-soft)] transition hover:bg-[var(--cream-soft)] hover:text-[var(--wine)]"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </div>

            <div className="border-t border-[var(--admin-border)] p-2">
              <button
                type="button"
                onClick={sair}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Sair da conta
              </button>
            </div>
          </div>
        )}
      </div>

      {tela && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#2C2421]/28 p-4 backdrop-blur-sm">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-4xl overflow-y-auto rounded-[26px] border border-[var(--admin-border)] bg-[var(--admin-bg)] shadow-[0_28px_90px_rgba(44,36,33,.28)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--admin-border)] bg-white/96 px-6 py-4 backdrop-blur-xl">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[var(--terracotta)]">Conta Flua</p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--admin-ink)]">
                  {tela === "empresa" ? "Dados da empresa" : tela === "plano" ? "Plano e assinatura" : "Configurações"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setTela(null)}
                className="grid h-10 w-10 place-items-center rounded-xl text-[var(--admin-ink-soft)] transition hover:bg-[var(--cream)]"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {carregando ? (
              <div className="grid min-h-80 place-items-center">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--terracotta)]" />
              </div>
            ) : tela === "empresa" ? (
              <div className="grid gap-5 p-6 lg:grid-cols-[1fr_280px]">
                <section className="rounded-2xl border border-[var(--admin-border)] bg-white p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="sm:col-span-2">
                      <span className="mb-1.5 block text-xs font-semibold text-[var(--admin-ink-soft)]">Nome da empresa</span>
                      <input value={nome} onChange={(e) => setNome(e.target.value)} className="h-11 w-full rounded-xl border border-[var(--admin-border)] bg-white px-3 text-sm outline-none focus:border-[var(--terracotta)]" />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-xs font-semibold text-[var(--admin-ink-soft)]">CNPJ/CPF</span>
                      <input value={documento} onChange={(e) => setDocumento(e.target.value)} className="h-11 w-full rounded-xl border border-[var(--admin-border)] bg-white px-3 text-sm outline-none focus:border-[var(--terracotta)]" />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-xs font-semibold text-[var(--admin-ink-soft)]">WhatsApp</span>
                      <input value={telefone} onChange={(e) => setTelefone(e.target.value)} className="h-11 w-full rounded-xl border border-[var(--admin-border)] bg-white px-3 text-sm outline-none focus:border-[var(--terracotta)]" />
                    </label>
                    <label className="sm:col-span-2">
                      <span className="mb-1.5 block text-xs font-semibold text-[var(--admin-ink-soft)]">E-mail da empresa</span>
                      <input type="email" value={emailEmpresa} onChange={(e) => setEmailEmpresa(e.target.value)} className="h-11 w-full rounded-xl border border-[var(--admin-border)] bg-white px-3 text-sm outline-none focus:border-[var(--terracotta)]" />
                    </label>
                  </div>
                  <div className="mt-5 flex justify-end">
                    <button type="button" onClick={salvarEmpresa} disabled={salvando} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--terracotta)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--wine)] disabled:opacity-60">
                      {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Salvar alterações
                    </button>
                  </div>
                </section>
                <aside className="rounded-2xl border border-[var(--admin-border)] bg-white p-5">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--cream)] text-xl font-bold text-[var(--wine)]">{inicial}</span>
                  <h3 className="mt-4 text-base font-semibold text-[var(--admin-ink)]">{empresa?.name || companyName}</h3>
                  <p className="mt-1 text-xs text-[var(--admin-muted)]">{empresa?.city && empresa?.state ? `${empresa.city}/${empresa.state}` : "Empresa cadastrada na Flua"}</p>
                  <div className="mt-5 rounded-xl bg-[var(--cream-soft)] p-3 text-xs leading-5 text-[var(--admin-ink-soft)]">
                    Esses dados identificam sua empresa dentro da plataforma e são compartilhados entre os módulos da Flua.
                  </div>
                </aside>
              </div>
            ) : tela === "plano" ? (
              <div className="grid gap-5 p-6 lg:grid-cols-[1.25fr_.75fr]">
                <section className="rounded-2xl border border-[var(--admin-border)] bg-white p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[.12em] text-[var(--terracotta)]">Plano atual</p>
                      <h3 className="mt-2 text-2xl font-semibold text-[var(--admin-ink)]">{plano}</h3>
                      <p className="mt-1 text-sm text-[var(--admin-muted)]">Status: {status}</p>
                    </div>
                    <span className="rounded-full bg-[#74745B]/12 px-3 py-1.5 text-xs font-semibold text-[#74745B]">{status}</span>
                  </div>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-[var(--cream-soft)] p-4">
                      <p className="text-xs text-[var(--admin-muted)]">Próxima renovação / fim do teste</p>
                      <strong className="mt-1 block text-sm text-[var(--admin-ink)]">{formatarData(fimPeriodo)}</strong>
                    </div>
                    <div className="rounded-xl bg-[var(--cream-soft)] p-4">
                      <p className="text-xs text-[var(--admin-muted)]">Empresa</p>
                      <strong className="mt-1 block truncate text-sm text-[var(--admin-ink)]">{companyName}</strong>
                    </div>
                  </div>
                </section>
                <aside className="rounded-2xl border border-[var(--admin-border)] bg-[linear-gradient(145deg,#F7F1E8,#fff)] p-5">
                  <CreditCard className="h-5 w-5 text-[var(--terracotta)]" />
                  <h3 className="mt-3 text-base font-semibold text-[var(--admin-ink)]">Assinatura Flua</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--admin-muted)]">Aqui ficam o plano contratado, situação da assinatura e datas do ciclo.</p>
                </aside>
              </div>
            ) : (
              <div className="grid gap-4 p-6 md:grid-cols-2">
                <button type="button" onClick={onUsuarios} className="rounded-2xl border border-[var(--admin-border)] bg-white p-5 text-left transition hover:border-[var(--terracotta)]/45 hover:shadow-sm">
                  <Users className="h-5 w-5 text-[var(--terracotta)]" />
                  <h3 className="mt-3 text-sm font-semibold text-[var(--admin-ink)]">Usuários e acessos</h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--admin-muted)]">Gerencie quem pode entrar no ambiente da sua empresa.</p>
                </button>
                <div className="rounded-2xl border border-[var(--admin-border)] bg-white p-5">
                  <Settings className="h-5 w-5 text-[#74745B]" />
                  <h3 className="mt-3 text-sm font-semibold text-[var(--admin-ink)]">Preferências da empresa</h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--admin-muted)]">Fuso horário atual: {empresa?.timezone || "America/Sao_Paulo"}.</p>
                </div>
                <div className="rounded-2xl border border-[var(--admin-border)] bg-white p-5 md:col-span-2">
                  <h3 className="text-sm font-semibold text-[var(--admin-ink)]">Conta do usuário</h3>
                  <p className="mt-1 text-xs text-[var(--admin-muted)]">{displayName || "Usuário"} · {email}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
