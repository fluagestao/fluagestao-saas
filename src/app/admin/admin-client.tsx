"use client";

import {
  BookOpen,
  Bot,
  ChartPie,
  CheckSquare,
  ChevronDown,
  Clock,
  Contact,
  Home,
  Layers,
  Loader2,
  LogOut,
  Package,
  ShoppingCart,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Toaster } from "sonner";

import { BiaPanel } from "@/components/admin/BiaPanel";
import { CadastrosPanel } from "@/components/admin/CadastrosPanel";
import { ColecoesPanel } from "@/components/admin/ColecoesPanel";
import { DashboardPanel } from "@/components/admin/DashboardPanel";
import { FinanceiroPanel } from "@/components/admin/FinanceiroPanel";
import { HorariosPanel } from "@/components/admin/HorariosPanel";
import { InicioPanel } from "@/components/admin/InicioPanel";
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
import { Button } from "@/components/ui/button";
import { carregarCatalogoAdmin } from "@/lib/admin";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

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

const SUB_CADASTROS: { id: SubCadastros; label: string }[] = [
  { id: "clientes", label: "Clientes" },
  { id: "fornecedores", label: "Fornecedores" },
  { id: "bairros", label: "Bairros" },
  { id: "usuarios", label: "Usuários" },
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
  {
    id: "produtos",
    label: "Catálogo",
    icon: BookOpen,
    abas: [
      { id: "produtos", label: "Produtos" },
      { id: "colecoes", label: "Coleções" },
      { id: "horarios", label: "Horários" },
    ],
  },
];

const DO_CATALOGO: AbaId[] = ["produtos", "colecoes", "horarios"];

const ABAS_PLANAS: { id: AbaId; label: string; icon: LucideIcon }[] = [
  { id: "inicio", label: "Início", icon: Home },
  { id: "vendas", label: "Vendas", icon: ShoppingCart },
  { id: "financeiro", label: "Financeiro", icon: Wallet },
  { id: "cadastros", label: "Cadastros", icon: Contact },
  { id: "tarefas", label: "Tarefas", icon: CheckSquare },
  { id: "produtos", label: "Produtos", icon: Package },
  { id: "colecoes", label: "Coleções", icon: Layers },
  { id: "horarios", label: "Horários", icon: Clock },
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
  const router = useRouter();

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

  async function sair() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <ConfirmProvider>
      <Toaster position="bottom-right" richColors />

      <div className="min-h-screen bg-zinc-50">
        <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 font-semibold text-white">
                F
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-lg font-semibold text-zinc-950">
                    Flua Gestão
                  </h1>
                  <span className="hidden text-zinc-300 sm:inline">•</span>
                  <span className="hidden truncate text-sm text-zinc-500 sm:inline">
                    {companyName}
                  </span>
                </div>
                <p className="truncate text-xs text-zinc-500">
                  {displayName} · {email}
                </p>
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={sair}>
              <LogOut className="mr-1.5 h-4 w-4" />
              Sair
            </Button>
          </div>
        </header>

        <div className="flex">
          <aside className="hidden w-60 shrink-0 border-r border-zinc-200 bg-zinc-950 md:block">
            <nav className="sticky top-[65px] flex min-h-[calc(100dvh-65px)] flex-col gap-1 px-3 py-4">
              {MENU.map((item) => {
                const filhos = item.vistas ?? item.abas;
                const ativo = item.abas
                  ? DO_CATALOGO.includes(aba)
                  : aba === item.id;
                const aberta =
                  Boolean(filhos) && expandida === item.id && ativo;

                return (
                  <div key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setAba(item.id);
                        setExpandida(
                          filhos ? (aberta ? null : item.id) : null,
                        );
                      }}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors",
                        ativo
                          ? "bg-white text-zinc-950"
                          : "text-zinc-400 hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <item.icon className="h-4 w-4" strokeWidth={1.9} />
                      {item.label}

                      {filhos && (
                        <ChevronDown
                          className={cn(
                            "ml-auto h-3.5 w-3.5 transition-transform",
                            aberta && "rotate-180",
                          )}
                        />
                      )}
                    </button>

                    {aberta && filhos && (
                      <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-white/15 pl-3">
                        {filhos.map((sub) => {
                          const selecionado = item.vistas
                            ? item.id === "vendas"
                              ? subVendas === sub.id
                              : item.id === "financeiro"
                                ? subFin === sub.id
                                : item.id === "cadastros"
                                  ? subCad === sub.id
                                  : subBia === sub.id
                            : aba === sub.id;

                          return (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => {
                                if (!item.vistas) {
                                  setAba(sub.id as AbaId);
                                  return;
                                }

                                if (item.id === "vendas") {
                                  setSubVendas(sub.id as SubVendas);
                                  return;
                                }

                                if (item.id === "financeiro") {
                                  setSubFin(sub.id as SubFinanceiro);
                                  return;
                                }

                                if (item.id === "cadastros") {
                                  setSubCad(sub.id as SubCadastros);
                                  return;
                                }

                                setSubBia(sub.id as SubBia);
                              }}
                              className={cn(
                                "rounded-lg px-3 py-1.5 text-left text-sm transition-colors",
                                selecionado
                                  ? "bg-white/15 font-medium text-white"
                                  : "text-zinc-500 hover:text-white",
                              )}
                            >
                              {sub.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </aside>

          <main className="min-w-0 flex-1 px-4 py-5 sm:px-6">
            <nav className="mb-5 flex gap-2 overflow-x-auto pb-1 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {ABAS_PLANAS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAba(item.id)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    aba === item.id
                      ? "bg-zinc-950 text-white"
                      : "border border-zinc-200 bg-white text-zinc-600",
                  )}
                >
                  <item.icon className="h-4 w-4" strokeWidth={1.9} />
                  {item.label}
                </button>
              ))}
            </nav>

            {erro && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {erro}
              </div>
            )}

            {carregando ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
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
                      (catalogo?.ordem ?? 99) * 100 +
                      (categoria?.ordem ?? 99),
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
        </div>

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
