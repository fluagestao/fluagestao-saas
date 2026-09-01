"use client";

import {
  Building2,
  ChevronDown,
  CreditCard,
  FileCheck2,
  LogOut,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type AssinaturaConta = {
  plan: string | null;
  status: string | null;
};

type DadosEmpresaPendencia = {
  legal_name: string | null;
  name: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  postal_code: string | null;
  street: string | null;
  address_number: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
};

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

function empresaIncompleta(empresa?: DadosEmpresaPendencia | null) {
  if (!empresa) return true;

  return [
    empresa.legal_name || empresa.name,
    empresa.document,
    empresa.email,
    empresa.phone,
    empresa.postal_code,
    empresa.street,
    empresa.address_number,
    empresa.district,
    empresa.city,
    empresa.state,
  ].some((valor) => !String(valor ?? "").trim());
}

function consumirSinalPrimeiroAcesso() {
  if (typeof window === "undefined") return false;

  const url = new URL(window.location.href);
  if (url.searchParams.get("onboarding") !== "1") return false;

  url.searchParams.delete("onboarding");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  return true;
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
  onUsuarios?: () => void;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [aberto, setAberto] = useState(false);
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false);
  const [pendenciaDocumentos, setPendenciaDocumentos] = useState(true);
  const [assinatura, setAssinatura] = useState<AssinaturaConta | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const inicial = (companyName || displayName || email || "F")
    .trim()
    .charAt(0)
    .toUpperCase();

  const recarregarPendencia = useCallback(
    async (id?: string | null) => {
      const empresaId = id ?? companyId;
      if (!empresaId) return;

      const { data: empresa } = await supabase
        .from("companies")
        .select(
          "legal_name,name,document,email,phone,postal_code,street,address_number,district,city,state",
        )
        .eq("id", empresaId)
        .maybeSingle();

      setPendenciaDocumentos(
        empresaIncompleta((empresa ?? null) as DadosEmpresaPendencia | null),
      );
    },
    [companyId, supabase],
  );

  useEffect(() => {
    let ativo = true;

    void (async () => {
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

      if (!membro?.company_id || !ativo) return;
      setCompanyId(membro.company_id);

      const { data: empresa } = await supabase
        .from("companies")
        .select(
          "logo_url,legal_name,name,document,email,phone,postal_code,street,address_number,district,city,state",
        )
        .eq("id", membro.company_id)
        .maybeSingle();

      if (!ativo) return;

      const pendente = empresaIncompleta(
        (empresa ?? null) as DadosEmpresaPendencia | null,
      );

      setLogoUrl(empresa?.logo_url ?? null);
      setPendenciaDocumentos(pendente);

      if (pendente && consumirSinalPrimeiroAcesso()) {
        setAberto(false);
        setNotificacoesAbertas(true);
      }
    })();

    return () => {
      ativo = false;
    };
  }, [supabase]);

  useEffect(() => {
    const botoes = Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        'button[aria-label="Notificações"]',
      ),
    );

    const abrirNotificacoes = () => {
      setAberto(false);
      setNotificacoesAbertas((valor) => !valor);
      void recarregarPendencia();
    };

    botoes.forEach((botao) => {
      botao.addEventListener("click", abrirNotificacoes);
      const ponto = botao.querySelector<HTMLElement>("span");
      if (ponto) ponto.style.display = pendenciaDocumentos ? "" : "none";
    });

    return () => {
      botoes.forEach((botao) =>
        botao.removeEventListener("click", abrirNotificacoes),
      );
    };
  }, [pendenciaDocumentos, recarregarPendencia]);

  useEffect(() => {
    if (!aberto || assinatura || !companyId) return;

    let ativo = true;
    void (async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("plan,status")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ativo && data) setAssinatura(data as AssinaturaConta);
    })();

    return () => {
      ativo = false;
    };
  }, [aberto, assinatura, companyId, supabase]);

  async function sair() {
    await supabase.auth.signOut();
    window.location.assign("https://www.fluagestao.com.br");
  }

  const plano = rotuloPlano(assinatura?.plan);
  const status = rotuloStatus(assinatura?.status);

  const itens = [
    { label: "Dados da empresa", icon: Building2, href: "/conta/empresa" },
    { label: "Plano e assinatura", icon: CreditCard, href: "/conta/plano" },
    { label: "Usuários", icon: Users, href: "/conta/usuarios" },
    { label: "Configurações", icon: Settings, href: "/conta/configuracoes" },
  ];

  const marcaEmpresa = (tamanho: "pequena" | "grande") => {
    const dimensao = tamanho === "pequena" ? "h-9 w-9" : "h-11 w-11";
    const texto = tamanho === "pequena" ? "text-sm" : "text-base";

    if (logoUrl) {
      return (
        <span className={`grid ${dimensao} shrink-0 place-items-center`}>
          <img
            src={logoUrl}
            alt={`Logo ${companyName}`}
            className="h-full w-full object-contain"
          />
        </span>
      );
    }

    return (
      <span
        className={`grid ${dimensao} shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--cream)] ${texto} font-bold text-[var(--wine)] ring-1 ring-[var(--admin-border)]`}
      >
        {inicial}
      </span>
    );
  };

  return (
    <div className="relative ml-1">
      <button
        type="button"
        onClick={() => {
          setNotificacoesAbertas(false);
          setAberto((valor) => !valor);
        }}
        className="flex min-w-0 items-center gap-2 rounded-xl px-2 py-1.5 text-left transition hover:bg-[var(--cream-soft)]"
        aria-expanded={aberto}
      >
        {marcaEmpresa("pequena")}
        <span className="hidden min-w-0 sm:block">
          <strong className="block max-w-32 truncate text-xs font-semibold text-[var(--admin-ink)]">
            {companyName}
          </strong>
          <span className="block max-w-32 truncate text-[10px] text-[var(--admin-muted)]">
            {displayName || "Usuário"}
          </span>
        </span>
        <ChevronDown
          className={`hidden h-3.5 w-3.5 text-[var(--admin-muted)] transition-transform sm:block ${aberto ? "rotate-180" : ""}`}
        />
      </button>

      {notificacoesAbertas && (
        <div className="fixed right-4 top-[70px] z-[70] w-[330px] overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-white shadow-[var(--shadow-lift)] md:right-[180px]">
          <div className="flex items-center justify-between border-b border-[var(--admin-border)] px-4 py-3">
            <strong className="text-sm text-[var(--admin-ink)]">Notificações</strong>
            <button
              type="button"
              onClick={() => setNotificacoesAbertas(false)}
              className="grid h-7 w-7 place-items-center rounded-lg text-[var(--admin-muted)] transition hover:bg-[var(--cream)] hover:text-[var(--wine)]"
              aria-label="Fechar notificações"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {pendenciaDocumentos ? (
            <button
              type="button"
              onClick={() => {
                setNotificacoesAbertas(false);
                router.push("/conta/empresa");
              }}
              className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-[var(--cream-soft)]"
            >
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--cream)] text-[var(--terracotta)]">
                <FileCheck2 className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <strong className="block text-sm text-[var(--admin-ink)]">
                  Complete os dados da empresa
                </strong>
                <span className="mt-1 block text-xs leading-5 text-[var(--admin-muted)]">
                  Confirme seus documentos e dados cadastrais para manter sua conta completa.
                </span>
                <span className="mt-2 block text-xs font-semibold text-[var(--terracotta)]">
                  Confirmar documentos →
                </span>
              </span>
            </button>
          ) : (
            <div className="p-5 text-center text-sm text-[var(--admin-muted)]">
              Nenhuma pendência no momento.
            </div>
          )}
        </div>
      )}

      {aberto && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[300px] overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-white shadow-[var(--shadow-lift)]">
          <div className="flex items-start gap-3 border-b border-[var(--admin-border)] p-4">
            {marcaEmpresa("grande")}
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
            {itens.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setAberto(false);
                  if (item.label === "Usuários" && onUsuarios) {
                    onUsuarios();
                    return;
                  }
                  router.push(item.href);
                }}
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
  );
}
