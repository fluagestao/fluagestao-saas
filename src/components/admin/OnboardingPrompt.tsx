"use client";

import {
  ArrowRight,
  Check,
  Circle,
  LayoutDashboard,
  Loader2,
  PackagePlus,
  ShoppingBag,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Progresso = {
  companyId: string;
  introducaoConcluida: boolean;
  logoAdicionada: boolean;
  primeiroProduto: boolean;
  primeiroPedido: boolean;
};

type AcaoId = "pedido" | "produto" | "painel";

const ROTA_LOGO = "/admin/conta/empresa";
const ROTA_PRODUTO = "/cadastros/produtos/novo";
const ROTA_PEDIDO = "/vendas/pedidos/novo-pedido";

function mensagemErro(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return fallback;
}

function AcaoCard({
  id,
  titulo,
  descricao,
  rotulo,
  icon: Icon,
  destaque = false,
  acionando,
  onClick,
}: {
  id: AcaoId;
  titulo: string;
  descricao: string;
  rotulo: string;
  icon: LucideIcon;
  destaque?: boolean;
  acionando: AcaoId | null;
  onClick: (id: AcaoId) => void;
}) {
  const carregando = acionando === id;

  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      disabled={Boolean(acionando)}
      className={cn(
        "group flex min-h-48 flex-col rounded-[24px] border p-5 text-left transition-all disabled:cursor-wait disabled:opacity-70",
        destaque
          ? "border-[var(--terracotta)] bg-[var(--terracotta)] text-white shadow-[0_18px_45px_rgba(179,79,68,0.22)] hover:-translate-y-0.5 hover:bg-[var(--wine)]"
          : "border-[var(--admin-border)] bg-white text-foreground shadow-[0_12px_35px_rgba(112,61,58,0.07)] hover:-translate-y-0.5 hover:border-[var(--terracotta)]",
      )}
      aria-busy={carregando}
    >
      <span
        className={cn(
          "mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl",
          destaque
            ? "bg-white/15 text-white"
            : "bg-[var(--cream)] text-[var(--terracotta)]",
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-base font-bold">{titulo}</span>
      <span
        className={cn(
          "mt-1.5 text-sm leading-5",
          destaque ? "text-white/80" : "text-[var(--admin-muted)]",
        )}
      >
        {descricao}
      </span>
      <span className="mt-auto flex items-center gap-2 pt-5 text-sm font-bold">
        {carregando ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            {rotulo}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </span>
    </button>
  );
}

function Checklist({
  progresso,
  compacto = false,
  onNavigate,
}: {
  progresso: Progresso;
  compacto?: boolean;
  onNavigate: (destino: string) => void;
}) {
  const itens = [
    { label: "Empresa configurada", concluido: true, destino: null },
    {
      label: "Logo adicionada",
      concluido: progresso.logoAdicionada,
      destino: ROTA_LOGO,
    },
    {
      label: "Primeiro produto cadastrado",
      concluido: progresso.primeiroProduto,
      destino: ROTA_PRODUTO,
    },
    {
      label: "Primeiro pedido criado",
      concluido: progresso.primeiroPedido,
      destino: ROTA_PEDIDO,
    },
  ];
  const concluidos = itens.filter((item) => item.concluido).length;
  const percentual = (concluidos / itens.length) * 100;

  return (
    <section
      className={cn(
        "rounded-[22px] border border-[var(--admin-border)] bg-[var(--cream-soft)]",
        compacto ? "p-4 shadow-[var(--shadow-lift)]" : "p-5",
      )}
      aria-label="Checklist de configuração"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-bold text-foreground">
            {compacto ? "Primeiros passos" : "Sua empresa no Flua"}
          </p>
          <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
            {concluidos} de {itens.length} concluídos
          </p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[var(--terracotta)]">
          {Math.round(percentual)}%
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full bg-[var(--terracotta)] transition-[width] duration-500"
          style={{ width: `${percentual}%` }}
        />
      </div>

      <div className={cn("mt-3 grid gap-1.5", !compacto && "sm:grid-cols-2")}>
        {itens.map((item) => {
          const Icon = item.concluido ? Check : Circle;
          const destino = item.destino;
          const conteudo = (
            <>
              <span
                className={cn(
                  "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                  item.concluido
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-white text-[var(--admin-muted)]",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 text-sm font-medium",
                  item.concluido
                    ? "text-[var(--admin-ink-soft)]"
                    : "text-foreground",
                )}
              >
                {item.label}
              </span>
              {!item.concluido && destino && (
                <ArrowRight className="h-3.5 w-3.5 text-[var(--terracotta)]" />
              )}
            </>
          );

          if (!item.concluido && destino) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => onNavigate(destino)}
                className="flex items-center gap-2 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white"
              >
                {conteudo}
              </button>
            );
          }

          return (
            <div
              key={item.label}
              className="flex items-center gap-2 rounded-xl px-2 py-2"
            >
              {conteudo}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function OnboardingPrompt() {
  const pathname = usePathname();
  const [progresso, setProgresso] = useState<Progresso | null>(null);
  const [aberto, setAberto] = useState(false);
  const [forcarOnboarding, setForcarOnboarding] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [acionando, setAcionando] = useState<AcaoId | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    const supabase = createClient();
    const forcar =
      new URLSearchParams(window.location.search).get("onboarding") === "1";

    setForcarOnboarding(forcar);

    void (async () => {
      try {
        const { data: userData, error: userError } =
          await supabase.auth.getUser();
        const user = userData.user;
        if (userError || !user) {
          throw new Error("Não foi possível validar sua sessão.");
        }

        const { data: membro, error: membroError } = await supabase
          .from("company_members")
          .select("company_id, role")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (membroError) throw membroError;
        if (!membro || membro.role !== "owner") {
          if (ativo) {
            setAberto(false);
            setProgresso(null);
          }
          return;
        }

        const [empresaResult, produtoResult, pedidoResult] = await Promise.all([
          supabase
            .from("companies")
            .select("id, logo_url, onboarding_completed_at")
            .eq("id", membro.company_id)
            .maybeSingle(),
          supabase
            .from("produtos")
            .select("id")
            .eq("company_id", membro.company_id)
            .eq("rascunho", false)
            .limit(1),
          supabase
            .from("pedidos")
            .select("id")
            .eq("company_id", membro.company_id)
            .limit(1),
        ]);

        if (empresaResult.error) throw empresaResult.error;
        if (produtoResult.error) throw produtoResult.error;
        if (pedidoResult.error) throw pedidoResult.error;
        if (!empresaResult.data) {
          throw new Error("Não foi possível localizar sua empresa.");
        }

        const novoProgresso: Progresso = {
          companyId: empresaResult.data.id,
          introducaoConcluida: Boolean(
            empresaResult.data.onboarding_completed_at,
          ),
          logoAdicionada: Boolean(empresaResult.data.logo_url),
          primeiroProduto: Boolean(produtoResult.data?.length),
          primeiroPedido: Boolean(pedidoResult.data?.length),
        };

        if (!ativo) return;
        setProgresso(novoProgresso);
        setAberto(forcar || !novoProgresso.introducaoConcluida);
      } catch (error) {
        if (ativo) {
          setErro(
            mensagemErro(
              error,
              "Não foi possível carregar os primeiros passos.",
            ),
          );
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    })();

    return () => {
      ativo = false;
    };
  }, [pathname]);

  const todosConcluidos = useMemo(
    () =>
      Boolean(
        progresso?.logoAdicionada &&
          progresso?.primeiroProduto &&
          progresso?.primeiroPedido,
      ),
    [progresso],
  );

  function limparParametroOnboarding() {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("onboarding")) return;
    url.searchParams.delete("onboarding");
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
    setForcarOnboarding(false);
  }

  async function concluirIntroducao(destino?: string) {
    if (!progresso) return;
    setErro(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("companies")
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq("id", progresso.companyId);

    if (error) {
      setErro(
        mensagemErro(error, "Não foi possível salvar seu primeiro acesso."),
      );
      return;
    }

    setProgresso((atual) =>
      atual ? { ...atual, introducaoConcluida: true } : atual,
    );
    setAberto(false);
    limparParametroOnboarding();
    if (destino) window.location.assign(destino);
  }

  async function escolherAcao(id: AcaoId) {
    setAcionando(id);
    const destino =
      id === "pedido"
        ? ROTA_PEDIDO
        : id === "produto"
          ? ROTA_PRODUTO
          : undefined;
    await concluirIntroducao(destino);
    setAcionando(null);
  }

  function navegar(destino: string) {
    window.location.assign(destino);
  }

  if (carregando || !progresso) {
    if (!carregando && forcarOnboarding && erro) {
      return (
        <div className="fixed bottom-6 right-6 z-[70] max-w-sm rounded-2xl border border-red-200 bg-white p-4 text-sm text-red-700 shadow-[var(--shadow-lift)]">
          {erro}
        </div>
      );
    }
    return null;
  }

  const mostrarChecklistCompacto =
    progresso.introducaoConcluida &&
    !todosConcluidos &&
    !aberto &&
    (pathname === "/admin" || pathname === "/inicio");

  return (
    <>
      {aberto && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#2b2421]/55 p-3 backdrop-blur-sm sm:p-6">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-title"
            className="max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl overflow-y-auto rounded-[30px] border border-white/70 bg-[var(--admin-bg)] p-5 shadow-[0_30px_90px_rgba(43,36,33,0.28)] sm:max-h-[calc(100dvh-3rem)] sm:p-8"
          >
            <div className="flex items-start justify-between gap-5">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full bg-[var(--cream)] px-3 py-1.5 text-xs font-bold text-[var(--terracotta)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Primeiros passos
                </span>
                <h1
                  id="onboarding-title"
                  className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
                >
                  Vamos colocar o Flua em movimento
                </h1>
                <p className="mt-2 text-sm leading-6 text-[var(--admin-muted)] sm:text-base">
                  Escolha seu próximo passo. O Flua acompanha o restante
                  automaticamente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void concluirIntroducao()}
                disabled={Boolean(acionando)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--admin-border)] bg-white text-[var(--admin-ink-soft)] transition-colors hover:text-[var(--wine)] disabled:opacity-60"
                aria-label="Fechar primeiros passos"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-7 grid gap-3 md:grid-cols-3">
              <AcaoCard
                id="pedido"
                titulo="Criar o primeiro pedido"
                descricao="Registre uma venda e já organize cliente, entrega e pagamento."
                rotulo="Criar pedido"
                icon={ShoppingBag}
                destaque
                acionando={acionando}
                onClick={(id) => void escolherAcao(id)}
              />
              <AcaoCard
                id="produto"
                titulo="Cadastrar produto"
                descricao="Adicione o que você vende para agilizar os próximos pedidos."
                rotulo="Cadastrar produto"
                icon={PackagePlus}
                acionando={acionando}
                onClick={(id) => void escolherAcao(id)}
              />
              <AcaoCard
                id="painel"
                titulo="Explorar o painel"
                descricao="Conheça a visão geral, agenda, tarefas e indicadores do negócio."
                rotulo="Explorar agora"
                icon={LayoutDashboard}
                acionando={acionando}
                onClick={(id) => void escolherAcao(id)}
              />
            </div>

            {erro && (
              <p
                className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                role="alert"
              >
                {erro}
              </p>
            )}

            <div className="mt-5">
              <Checklist
                progresso={progresso}
                onNavigate={(destino) => void concluirIntroducao(destino)}
              />
            </div>
          </section>
        </div>
      )}

      {mostrarChecklistCompacto && (
        <aside className="fixed bottom-20 right-4 z-50 w-[calc(100%-2rem)] max-w-sm lg:bottom-6 lg:right-6">
          <Checklist progresso={progresso} compacto onNavigate={navegar} />
        </aside>
      )}
    </>
  );
}
