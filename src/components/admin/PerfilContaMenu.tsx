"use client";

import {
  Building2,
  ChevronDown,
  CreditCard,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type AssinaturaConta = {
  plan: string | null;
  status: string | null;
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

export function PerfilContaMenu({
  email,
  displayName,
  companyName,
}: {
  email: string;
  displayName: string;
  companyName: string;
  onUsuarios?: () => void;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [aberto, setAberto] = useState(false);
  const [assinatura, setAssinatura] = useState<AssinaturaConta | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const inicial = (companyName || displayName || email || "F")
    .trim()
    .charAt(0)
    .toUpperCase();

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
        .select("logo_url")
        .eq("id", membro.company_id)
        .maybeSingle();

      if (ativo) setLogoUrl(empresa?.logo_url ?? null);
    })();

    return () => {
      ativo = false;
    };
  }, [supabase]);

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
    router.replace("/login");
    router.refresh();
  }

  const plano = rotuloPlano(assinatura?.plan);
  const status = rotuloStatus(assinatura?.status);

  const itens = [
    { label: "Dados da empresa", icon: Building2, href: "/admin/conta/empresa" },
    { label: "Plano e assinatura", icon: CreditCard, href: "/admin/conta/plano" },
    { label: "Usuários", icon: Users, href: "/admin/conta/usuarios" },
    { label: "Configurações", icon: Settings, href: "/admin/conta/configuracoes" },
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
        onClick={() => setAberto((valor) => !valor)}
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
