"use client";

import {
  Bell,
  Bot,
  CalendarDays,
  ChartPie,
  CheckSquare,
  ChevronDown,
  CircleHelp,
  Contact,
  Home,
  Loader2,
  Search,
  Settings,
  ShoppingCart,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Toaster } from "sonner";

import { BiaPanel } from "@/components/admin/BiaPanel";
import { CadastrosPanel } from "@/components/admin/CadastrosPanel";
import { ColecoesPanel } from "@/components/admin/ColecoesPanel";
import { DashboardPanel } from "@/components/admin/DashboardPanel";
import { FinanceiroPanel } from "@/components/admin/FinanceiroPanel";
import { HorariosPanel } from "@/components/admin/HorariosPanel";
import { InicioPanel } from "@/components/admin/InicioPanel";
import { PerfilContaMenu } from "@/components/admin/PerfilContaMenu";
import { ProdutoDialog } from "@/components/admin/ProdutoDialog";
import { ProdutosPanel } from "@/components/admin/ProdutosPanel";
import { ConfirmProvider } from "@/components/admin/shell";
import { TarefasPanel } from "@/components/admin/TarefasPanel";
import {
  asPrecosExtra,
  type CatalogoRow,
  type CategoriaRow,
  type ProdutoRow,
} from "@/components/admin/tipos";
import { VendasPanel } from "@/components/admin/VendasPanel";
import { carregarCatalogoAdmin } from "@/lib/admin";
import { cn } from "@/lib/utils";

export type AbaId =
  | "inicio"
  | "vendas"
  | "dashboard"
  | "tarefas"
  | "financeiro"
  | "cadastros"
  | "bia"
  | "produtos"
  | "colecoes"
  | "horarios";

export type SubFinanceiro = "entradas" | "saidas";
export type SubBia = "simulador" | "conversas" | "ajustes";
export type SubVendas = "pedidos" | "areceber" | "realizadas";
export type SubCadastros =
  | "clientes"
  | "fornecedores"
  | "bairros"
  | "usuarios";

const SUB_FINANCEIRO: { id: SubFinanceiro; label: string }[] = [
  { id: "entradas", label: "Entradas" },
  { id: "saidas", label: "Saídas" },
];

const SUB_BIA: { id: SubBia; label: string }[] = [
  { id: "simulador", label: "Simulador" },
  { id: "conversas", label: "Conversas" },
  { id: "ajustes", label: "Ajustes" },
];

const SUB_VENDAS: { id: SubVendas; label: string }[] = [
  { id: "pedidos", label: "Pedidos" },
  { id: "areceber", label: "A receber" },
  { id: "realizadas", label: "Realizadas" },
];

const SUB_CADASTROS: { id: string; label: string }[] = [
  { id: "clientes", label: "Clientes" },
  { id: "fornecedores", label: "Fornecedores" },
  { id: "bairros", label: "Bairros" },
  { id: "usuarios", label: "Usuários" },
  { id: "produtos", label: "Produtos" },
  { id: "colecoes", label: "Coleções" },
  { id: "horarios", label: "Horários" },
];

type ItemMenu = {
  id: AbaId;
  label: string;
  icon: LucideIcon;
  vistas?: { id: string; label: string }[];
  abas?: { id: AbaId; label: string }[];
};

const MENU: ItemMenu[] = [
  { id: "inicio", label: "Início", icon: Home },
  { id: "vendas", label: "Vendas", icon: ShoppingCart, vistas: SUB_VENDAS },
  { id: "dashboard", label: "Dashboard", icon: ChartPie },
  {
    id: "financeiro",
    label: "Financeiro",
    icon: Wallet,
    vistas: SUB_FINANCEIRO,
  },
  {
    id: "cadastros",
    label: "Cadastros",
    icon: Contact,
    vistas: SUB_CADASTROS,
  },
  { id: "tarefas", label: "Tarefas", icon: CheckSquare },
  { id: "bia", label: "BIA", icon: Bot, vistas: SUB_BIA },
];

const DO_CATALOGO: AbaId[] = ["produtos", "colecoes", "horarios"];

const ABAS_PLANAS: { id: AbaId; label: string; icon: LucideIcon }[] = [
  { id: "inicio", label: "Início", icon: Home },
  { id: "vendas", label: "Vendas", icon: ShoppingCart },
  { id: "dashboard", label: "Dashboard", icon: ChartPie },
  { id: "financeiro", label: "Financeiro", icon: Wallet },
  { id: "cadastros", label: "Cadastros", icon: Contact },
  { id: "tarefas", label: "Tarefas", icon: CheckSquare },
  { id: "bia", label: "BIA", icon: Bot },
];

export default function AdminClient({
  email,
  displayName,
  companyName,
}: {
  email: string;
  displayName: string;
  companyName: string;
}) {
  const [catalogos, setCatalogos] = useState<CatalogoRow[]>([]);
  const [categorias, setCategorias] = useState<CategoriaRow[]>([]);
  const [produtos, setProdutos] = useState<ProdutoRow[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState<ProdutoRow | "novo" | null>(null);

  const [aba, setAba] = useState<AbaId>("inicio");
  const [subVendas, setSubVendas] = useState<SubVendas>("pedidos");
  const [subBia, setSubBia] = useState<SubBia>("simulador");
  const [subFin, setSubFin] = useState<SubFinanceiro>("entradas");
  const [subCad, setSubCad] = useState<SubCadastros>("clientes");
  const [expandida, setExpandida] = useState<AbaId | null>(null);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      const res = await carregarCatalogoAdmin();
      setCatalogos((res.catalogos ?? []) as CatalogoRow[]);
      setCategorias((res.categorias ?? []) as CategoriaRow[]);
      setProdutos((res.produtos ?? []) as ProdutoRow[]);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os dados do painel.",
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  function itemAtivo(item: ItemMenu) {
    if (item.id === "cadastros") {
      return aba === "cadastros" || DO_CATALOGO.includes(aba);
    }
    return item.abas ? DO_CATALOGO.includes(aba) : aba === item.id;
  }

  function selecionarSub(item: ItemMenu, subId: string) {
    if (item.id === "cadastros" && DO_CATALOGO.includes(subId as AbaId)) {
      setAba(subId as AbaId);
      setExpandida(null);
      return;
    }

    if (!item.vistas) {
      setAba(subId as AbaId);
      setExpandida(null);
      return;
    }

    setAba(item.id);
    if (item.id === "vendas") setSubVendas(subId as SubVendas);
    else if (item.id === "financeiro") setSubFin(subId as SubFinanceiro);
    else if (item.id === "cadastros") setSubCad(subId as SubCadastros);
    else setSubBia(subId as SubBia);
    setExpandida(null);
  }

  function abrirUsuarios() {
    setAba("cadastros");
    setSubCad("usuarios");
    setExpandida(null);
  }

  return (
    <ConfirmProvider>
      <Toaster position="bottom-right" richColors />

      <div className="min-h-screen bg-[var(--admin-bg)] text-foreground">
        <header className="sticky top-0 z-40 border-b border-[var(--admin-border)] bg-white/96 shadow-[0_6px_24px_rgba(112,61,58,0.04)] backdrop-blur-xl">
          <div className="mx-auto flex h-[74px] max-w-[1680px] items-center gap-4 px-4 sm:px-6 xl:px-8">
            <button
              type="button"
              onClick={() => {
                setAba("inicio");
                setExpandida(null);
              }}
              className="flex shrink-0 items-center"
              aria-label="Ir para o início"
            >
              <img
                src="/flua-logo.webp"
                alt="Flua Gestão"
                className="h-12 w-[118px] object-contain object-left sm:w-[128px]"
              />
            </button>

            <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
              {MENU.map((item) => {
                const filhos = item.vistas ?? item.abas;
                const ativo = itemAtivo(item);
                const aberta = Boolean(filhos) && expandida === item.id;

                return (
                  <div key={item.id} className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        if (filhos) {
                          setExpandida(aberta ? null : item.id);
                          return;
                        }
                        setAba(item.id);
                        setExpandida(null);
                      }}
                      className={cn(
                        "inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold transition-all",
                        ativo
                          ? "bg-[var(--cream)] text-[var(--terracotta)]"
                          : "text-[var(--admin-ink-soft)] hover:bg-[var(--cream-soft)] hover:text-[var(--wine)]",
                      )}
                    >
                      {item.label}
                      {filhos && (
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 transition-transform",
                            aberta && "rotate-180",
                          )}
                        />
                      )}
                    </button>

                    {aberta && filhos && (
                      <div className="absolute left-0 top-full mt-2 min-w-48 rounded-2xl border border-[var(--admin-border)] bg-white p-2 shadow-[var(--shadow-lift)]">
                        {filhos.map((sub) => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => selecionarSub(item, sub.id)}
                            className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[var(--admin-ink-soft)] transition-colors hover:bg-[var(--cream)] hover:text-[var(--terracotta)]"
                          >
                            {sub.label}
                          </button>
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
                <span className="rounded-md border border-[var(--admin-border)] bg-white px-1.5 py-0.5 text-[10px] font-semibold">
                  ⌘ K
                </span>
              </label>
            </div>

            <div className="hidden items-center gap-1 md:flex">
              <button
                type="button"
                className="relative grid h-10 w-10 place-items-center rounded-xl text-[var(--admin-ink-soft)] transition hover:bg-[var(--cream)] hover:text-[var(--terracotta)]"
                aria-label="Notificações"
              >
                <Bell className="h-[18px] w-[18px]" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--terracotta)] ring-2 ring-white" />
              </button>
              <button
                type="button"
                onClick={() => setAba("tarefas")}
                className="grid h-10 w-10 place-items-center rounded-xl text-[var(--admin-ink-soft)] transition hover:bg-[var(--cream)] hover:text-[var(--terracotta)]"
                aria-label="Agenda"
              >
                <CalendarDays className="h-[18px] w-[18px]" />
              </button>
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-xl text-[var(--admin-ink-soft)] transition hover:bg-[var(--cream)] hover:text-[var(--terracotta)]"
                aria-label="Ajuda"
              >
                <CircleHelp className="h-[18px] w-[18px]" />
              </button>
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-xl text-[var(--admin-ink-soft)] transition hover:bg-[var(--cream)] hover:text-[var(--terracotta)]"
                aria-label="Configurações"
              >
                <Settings className="h-[18px] w-[18px]" />
              </button>
            </div>

            <PerfilContaMenu
              email={email}
              displayName={displayName}
              companyName={companyName}
              onUsuarios={abrirUsuarios}
            />
          </div>

          <nav className="mx-auto flex max-w-[1680px] gap-2 overflow-x-auto px-4 pb-3 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {ABAS_PLANAS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setAba(item.id);
                  setExpandida(null);
                }}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors",
                  itemAtivo(item)
                    ? "border-[var(--terracotta)] bg-[var(--terracotta)] text-white"
                    : "border-[var(--admin-border)] bg-white text-[var(--admin-ink-soft)]",
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            ))}
          </nav>

          {(aba === "cadastros" || DO_CATALOGO.includes(aba)) && (
            <nav className="mx-auto flex max-w-[1680px] gap-2 overflow-x-auto border-t border-[var(--admin-border)] px-4 py-2 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {SUB_CADASTROS.map((sub) => {
                const ativo = DO_CATALOGO.includes(sub.id as AbaId)
                  ? aba === sub.id
                  : aba === "cadastros" && subCad === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => selecionarSub(MENU.find((item) => item.id === "cadastros")!, sub.id)}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                      ativo
                        ? "bg-[var(--cream)] text-[var(--terracotta)]"
                        : "text-[var(--admin-ink-soft)] hover:bg-[var(--cream-soft)]",
                    )}
                  >
                    {sub.label}
                  </button>
                );
              })}
            </nav>
          )}
        </header>

        <main className="mx-auto min-w-0 max-w-[1680px] px-4 py-5 sm:px-6 lg:py-6 xl:px-8">
          {erro && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {erro}
            </div>
          )}

          {carregando ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--terracotta)]" />
            </div>
          ) : aba === "inicio" ? (
            <InicioPanel onIrPara={setAba} />
          ) : aba === "dashboard" ? (
            <DashboardPanel />
          ) : aba === "financeiro" ? (
            <FinanceiroPanel vista={subFin} />
          ) : aba === "cadastros" ? (
            <CadastrosPanel vista={subCad} />
          ) : aba === "tarefas" ? (
            <TarefasPanel />
          ) : aba === "bia" ? (
            <BiaPanel vista={subBia} />
          ) : aba === "vendas" ? (
            <VendasPanel
              vista={subVendas}
              onVista={setSubVendas}
              empresaNome={companyName}
              produtos={produtos.map((produto) => {
                const categoria = categorias.find(
                  (item) => item.id === produto.categoria_id,
                );
                const catalogo = catalogos.find(
                  (item) => item.id === categoria?.catalogo_id,
                );

                return {
                  slug: produto.slug,
                  nome: produto.nome,
                  preco: produto.preco,
                  precos_extra: asPrecosExtra(produto.precos_extra),
                  grupo: categoria
                    ? catalogo
                      ? `${categoria.nome} · ${catalogo.nome}`
                      : categoria.nome
                    : "Sem categoria",
                  ordemGrupo:
                    (catalogo?.ordem ?? 99) * 100 + (categoria?.ordem ?? 99),
                };
              })}
            />
          ) : aba === "produtos" ? (
            <ProdutosPanel
              produtos={produtos}
              categorias={categorias}
              catalogos={catalogos}
              onNovo={() => setEditando("novo")}
              onEditar={(produto) => setEditando(produto)}
              onChange={recarregar}
            />
          ) : aba === "colecoes" ? (
            <ColecoesPanel
              catalogos={catalogos}
              categorias={categorias}
              onChange={recarregar}
            />
          ) : (
            <HorariosPanel />
          )}
        </main>

        {editando && (
          <ProdutoDialog
            produto={editando === "novo" ? null : editando}
            categorias={categorias}
            catalogos={catalogos}
            onClose={() => setEditando(null)}
            onSaved={recarregar}
          />
        )}
      </div>
    </ConfirmProvider>
  );
}
