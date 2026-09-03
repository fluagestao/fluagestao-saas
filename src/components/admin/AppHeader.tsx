"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  Search,
  Settings,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PerfilContaMenu } from "@/components/admin/PerfilContaMenu";
import { CentralAjudaButton } from "@/components/admin/CentralAjudaButton";
import { cn } from "@/lib/utils";

type ItemFilho = { label: string; href: string };
type ItemMenu = { label: string; href?: string; filhos?: ItemFilho[] };

const MENU: ItemMenu[] = [
  { label: "Início", href: "/inicio" },
  {
    label: "Vendas",
    filhos: [
      { label: "Pedidos", href: "/vendas/pedidos" },
      { label: "Realizadas", href: "/vendas/realizadas" },
      { label: "Follow-up", href: "/followup" },
    ],
  },
  { label: "Dashboard", href: "/dashboard" },
  {
    label: "Financeiro",
    filhos: [
      { label: "Entradas", href: "/financeiro/entradas" },
      { label: "Saídas", href: "/financeiro/saidas" },
    ],
  },
  { label: "Margem", href: "/margem" },
  {
    label: "Cadastros",
    filhos: [
      { label: "Produtos", href: "/cadastros/produtos" },
      // Coleção agrupa categorias e categoria agrupa produto. As duas telas já
      // existiam e continuavam alcançáveis pela URL, mas sem elas no menu não
      // dava para montar a corrente que alimenta o "Por coleção" do Dashboard.
      { label: "Coleções", href: "/cadastros/colecoes" },
      { label: "Categorias", href: "/cadastros/categorias" },
      { label: "Insumos", href: "/cadastros/insumos" },
      { label: "Clientes", href: "/cadastros/clientes" },
      { label: "Fornecedores", href: "/cadastros/fornecedores" },
      { label: "Tipos de receita", href: "/cadastros/financeiro/receitas" },
      { label: "Tipos de despesa", href: "/cadastros/financeiro/despesas" },
    ],
  },
  { label: "Tarefas", href: "/tarefas" },
];

function itemAtivo(pathname: string, item: ItemMenu) {
  if (item.href) return pathname === item.href || pathname.startsWith(`${item.href}/`);
  return item.filhos?.some((filho) => pathname === filho.href || pathname.startsWith(`${filho.href}/`)) ?? false;
}

export function AppHeader({
  email,
  displayName,
  companyName,
}: {
  email: string;
  displayName: string;
  companyName: string;
}) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState<string | null>(null);

  useEffect(() => {
    setAberto(null);
  }, [pathname]);

  return (
    <header className="app-top-header sticky top-0 z-50 border-b border-[var(--admin-border)] bg-white/96 shadow-[0_6px_24px_rgba(112,61,58,0.04)] backdrop-blur-xl">
      <div className="mx-auto flex h-[74px] max-w-[1680px] items-center gap-4 px-4 sm:px-6 xl:px-8">
        <Link href="/inicio" className="flex shrink-0 items-center" aria-label="Ir para o início">
          <img
            src="/flua-logo.webp"
            alt="Flua Gestão"
            className="h-10 w-[108px] object-contain object-left sm:w-[116px]"
          />
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
          {MENU.map((item) => {
            const ativo = itemAtivo(pathname, item);
            const estaAberto = aberto === item.label;

            if (!item.filhos) {
              return (
                <Link
                  key={item.label}
                  href={item.href!}
                  className={cn(
                    "inline-flex h-10 items-center rounded-xl px-3 text-[13px] font-semibold transition-all",
                    ativo
                      ? "bg-[var(--cream)] text-[var(--terracotta)]"
                      : "text-[var(--admin-ink-soft)] hover:bg-[var(--cream-soft)] hover:text-[var(--wine)]",
                  )}
                >
                  {item.label}
                </Link>
              );
            }

            return (
              <div key={item.label} className="relative">
                <button
                  type="button"
                  onClick={() => setAberto(estaAberto ? null : item.label)}
                  className={cn(
                    "inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold transition-all",
                    ativo
                      ? "bg-[var(--cream)] text-[var(--terracotta)]"
                      : "text-[var(--admin-ink-soft)] hover:bg-[var(--cream-soft)] hover:text-[var(--wine)]",
                  )}
                  aria-expanded={estaAberto}
                >
                  {item.label}
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", estaAberto && "rotate-180")} />
                </button>

                {estaAberto && (
                  <div className="absolute left-0 top-full mt-2 min-w-48 rounded-2xl border border-[var(--admin-border)] bg-white p-2 shadow-[var(--shadow-lift)]">
                    {item.filhos.map((filho) => (
                      <Link
                        key={filho.href}
                        href={filho.href}
                        className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[var(--admin-ink-soft)] transition-colors hover:bg-[var(--cream)] hover:text-[var(--terracotta)]"
                      >
                        {filho.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="ml-auto hidden min-w-[220px] max-w-[300px] flex-1 xl:block">
          <label className="flex h-11 items-center gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--cream-soft)] px-3.5 text-[var(--admin-muted)] transition focus-within:border-[var(--terracotta)] focus-within:bg-white">
            <Search className="h-4 w-4 shrink-0" />
            <input
              type="search"
              placeholder="Buscar no sistema..."
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--admin-ink)] outline-none placeholder:text-[var(--admin-muted)]"
            />
            <span className="rounded-md border border-[var(--admin-border)] bg-white px-1.5 py-0.5 text-[10px] font-semibold">⌘ K</span>
          </label>
        </div>

        {/* Os quatro icones so tinham aria-label: quem enxerga nao descobria
            para que servem. O balao no hover conta, sem ocupar espaco fixo. */}
        <TooltipProvider delayDuration={250}>
          <div className="hidden items-center gap-1 md:flex">
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="relative grid h-10 w-10 place-items-center rounded-xl text-[var(--admin-ink-soft)] transition hover:bg-[var(--cream)] hover:text-[var(--terracotta)]" aria-label="Notificações">
                  <Bell className="h-[18px] w-[18px]" />
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--terracotta)] ring-2 ring-white" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Avisos e lembretes do sistema</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/tarefas" className="grid h-10 w-10 place-items-center rounded-xl text-[var(--admin-ink-soft)] transition hover:bg-[var(--cream)] hover:text-[var(--terracotta)]" aria-label="Agenda">
                  <CalendarDays className="h-[18px] w-[18px]" />
                </Link>
              </TooltipTrigger>
              <TooltipContent>Agenda: suas tarefas e prazos</TooltipContent>
            </Tooltip>

            <CentralAjudaButton />

            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/conta/configuracoes" className="grid h-10 w-10 place-items-center rounded-xl text-[var(--admin-ink-soft)] transition hover:bg-[var(--cream)] hover:text-[var(--terracotta)]" aria-label="Configurações">
                  <Settings className="h-[18px] w-[18px]" />
                </Link>
              </TooltipTrigger>
              <TooltipContent>Configurações da conta e da empresa</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        <PerfilContaMenu email={email} displayName={displayName} companyName={companyName} />
      </div>

      <nav className="mx-auto flex max-w-[1680px] gap-2 overflow-x-auto px-4 pb-3 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {MENU.map((item) => {
          const href = item.href ?? item.filhos?.[0]?.href ?? "/inicio";
          return (
            <Link
              key={item.label}
              href={href}
              className={cn(
                "inline-flex shrink-0 items-center rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors",
                itemAtivo(pathname, item)
                  ? "border-[var(--terracotta)] bg-[var(--terracotta)] text-white"
                  : "border-[var(--admin-border)] bg-white text-[var(--admin-ink-soft)]",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
