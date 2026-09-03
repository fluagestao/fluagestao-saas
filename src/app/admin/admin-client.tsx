"use client";

import {
  Bell,
  CalendarDays,
  ChartPie,
  CheckSquare,
  Boxes,
  Calculator,
  ChevronDown,
  ChevronRight,
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

import { CadastrosPanel } from "@/components/admin/CadastrosPanel";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CentralAjudaButton } from "@/components/admin/CentralAjudaButton";
import { CalendarioEntregasPanel } from "@/components/admin/CalendarioEntregasPanel";
import { CategoriasPanel } from "@/components/admin/CategoriasPanel";
import { CategoriasFinanceirasPanel } from "@/components/admin/CategoriasFinanceirasPanel";
import { ContasAPagarPanel } from "@/components/admin/ContasAPagarPanel";
import { CalculadoraPanel } from "@/components/admin/CalculadoraPanel";
import { CozinhaPanel } from "@/components/admin/CozinhaPanel";
import { CustoPanel } from "@/components/admin/CustoPanel";
import { SimuladorPanel } from "@/components/admin/SimuladorPanel";
import { EstoquePanel } from "@/components/admin/EstoquePanel";
import { SinoNotificacoes } from "@/components/admin/SinoNotificacoes";
import { ColecoesPanel } from "@/components/admin/ColecoesPanel";
import { DashboardPanel } from "@/components/admin/DashboardPanel";
import { EtiquetasPanel } from "@/components/admin/EtiquetasPanel";
import { FinanceiroPanel } from "@/components/admin/FinanceiroPanel";
import { FollowupPanel } from "@/components/admin/FollowupPanel";
import { HorariosPanel } from "@/components/admin/HorariosPanel";
import { InicioPanel } from "@/components/admin/InicioPanel";
import { InsumosPanel } from "@/components/admin/InsumosPanel";
import { PerfilContaMenu } from "@/components/admin/PerfilContaMenu";
import { ProdutoDialog } from "@/components/admin/ProdutoDialog";
import { ProdutosPanel } from "@/components/admin/ProdutosPanel";
import { ConfirmProvider } from "@/components/admin/shell";
import { TarefasPanel } from "@/components/admin/TarefasPanel";
import {
  asPrecosExtra,
  type CatalogoRow,
  type CategoriaRow,
  type EtiquetaRow,
  type ProdutoRow,
} from "@/components/admin/tipos";
import { VendasPanel } from "@/components/admin/VendasPanel";
import { carregarCatalogoAdmin } from "@/lib/admin";
import { listarEtiquetas } from "@/lib/etiquetas";
import { DIAS_PARA_AVISAR, type Assinatura } from "@/lib/assinatura-tipos";
import { cn } from "@/lib/utils";

export type AbaId =
  | "inicio"
  | "vendas"
  | "followup"
  | "dashboard"
  | "calendario"
  | "tarefas"
  | "financeiro"
  | "cadastros"
  | "produtos"
  | "colecoes"
  | "custo"
  | "calculadora"
  | "simulador"
  | "cozinha"
  | "estoque"
  | "cadastro-receitas"
  | "cadastro-despesas"
  | "categorias"
  | "etiquetas"
  | "insumos"
  | "horarios";

export type SubFinanceiro = "entradas" | "saidas";

/* Em que ponto do ciclo a lista esta. "pendente" e o padrao nas duas abas
   porque e o trabalho que sobrou: o que falta receber, o que falta pagar. */
export type EstadoFinanceiro = "pendente" | "concluido";
export type SubVendas = "pedidos" | "areceber" | "realizadas" | "followup";
export type SubCadastros =
  | "clientes"
  | "fornecedores"
  | "bairros"
  | "usuarios";

/* Entradas e Saidas, cada uma com os dois momentos do MESMO fato. Antes,
   "A pagar" e "Pagamentos" eram abas separadas — voce pagava numa e ia
   procurar o registro na outra. Sao o mesmo objeto: pagar uma conta cria o
   movimento e guarda o elo (contas.ts:216). Do lado da entrada era pior: o
   que te devem morava em Vendas e o que entrou morava aqui. */
const SUB_FINANCEIRO: { id: SubFinanceiro; label: string }[] = [
  { id: "entradas", label: "Entradas" },
  { id: "saidas", label: "Saídas" },
];

const SUB_VENDAS: { id: SubVendas; label: string }[] = [
  { id: "pedidos", label: "Pedidos" },
  { id: "realizadas", label: "Realizadas" },
  { id: "followup", label: "Follow-up" },
];

/* Custo virou guarda-chuva. Cada filho e uma tela propria (uma AbaId), e nao
   uma "vista" de um painel so — por isso entram tambem em DO_CUSTO e em
   ABAS_PLANAS, que e onde o AdminPathSync acha o botao pelo rotulo. */
const SUB_CUSTO: { id: string; label: string }[] = [
  { id: "custo", label: "Margem" },
  { id: "calculadora", label: "Calculadora" },
  { id: "simulador", label: "Simulador" },
  { id: "cozinha", label: "Cozinha" },
];

const SUB_CADASTROS: { id: string; label: string; grupo?: string }[] = [
  { id: "produtos", label: "Produtos" },
  // Também é por aqui que o AdminPathSync abre a tela certa: ele procura no
  // cabeçalho um botão com o rótulo da rota e clica nele. Sem a entrada aqui,
  // /cadastros/colecoes navegaria e cairia no Início.
  { id: "colecoes", label: "Coleções" },
  { id: "categorias", label: "Categorias" },
  { id: "insumos", label: "Insumos" },
  { id: "clientes", label: "Clientes" },
  { id: "fornecedores", label: "Fornecedores" },
  // Os dois vivem sob o grupo "Financeiro" no menu do desktop. A barra do
  // celular continua plana, e e nela que o AdminPathSync acha o botao pelo
  // rotulo — por isso o grupo nao entra no caminho da navegacao.
  { id: "cadastro-receitas", label: "Tipos de receita", grupo: "Financeiro" },
  { id: "cadastro-despesas", label: "Tipos de despesa", grupo: "Financeiro" },
];

type ItemMenu = {
  id: AbaId;
  label: string;
  icon: LucideIcon;
  vistas?: { id: string; label: string; grupo?: string }[];
  abas?: { id: AbaId; label: string }[];
};

/** Junta os filhos que declaram o mesmo grupo, preservando a ordem em que aparecem. */
function agruparFilhos(filhos: { id: string; label: string; grupo?: string }[]) {
  const grupos = new Map<string, { id: string; label: string }[]>();
  for (const filho of filhos) {
    if (!filho.grupo) continue;
    const atual = grupos.get(filho.grupo) ?? [];
    atual.push(filho);
    grupos.set(filho.grupo, atual);
  }
  return [...grupos.entries()];
}

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
  { id: "custo", label: "Custo", icon: Calculator, vistas: SUB_CUSTO },
  { id: "estoque", label: "Estoque", icon: Boxes },
  {
    id: "cadastros",
    label: "Cadastros",
    icon: Contact,
    vistas: SUB_CADASTROS,
  },
];

/** Telas que vivem sob o menu Custo. Mesma ideia do DO_CATALOGO. */
const DO_CUSTO: AbaId[] = ["custo", "calculadora", "simulador", "cozinha"];

const DO_CATALOGO: AbaId[] = [
  "produtos",
  "colecoes",
  "categorias",
  "etiquetas",
  "insumos",
  "horarios",
  "cadastro-receitas",
  "cadastro-despesas",
];

const ABAS_PLANAS: { id: AbaId; label: string; icon: LucideIcon }[] = [
  { id: "inicio", label: "Início", icon: Home },
  { id: "vendas", label: "Vendas", icon: ShoppingCart },
  { id: "dashboard", label: "Dashboard", icon: ChartPie },
  { id: "calendario", label: "Agenda", icon: CalendarDays },
  { id: "financeiro", label: "Financeiro", icon: Wallet },
  { id: "custo", label: "Custo", icon: Calculator },
  { id: "estoque", label: "Estoque", icon: Boxes },
  { id: "cadastros", label: "Cadastros", icon: Contact },
  { id: "tarefas", label: "Tarefas", icon: CheckSquare },
];

export default function AdminClient({
  email,
  displayName,
  companyName,
  companyLogoUrl,
  companyAddress,
  companyCityState,
  assinatura,
  initialAba = "inicio",
  initialNovoPedido = false,
}: {
  email: string;
  displayName: string;
  companyName: string;
  companyLogoUrl?: string | null;
  companyAddress?: string | null;
  companyCityState?: string | null;
  assinatura?: Assinatura | null;
  initialAba?: AbaId;
  initialNovoPedido?: boolean;
}) {
  const [catalogos, setCatalogos] = useState<CatalogoRow[]>([]);
  const [categorias, setCategorias] = useState<CategoriaRow[]>([]);
  const [produtos, setProdutos] = useState<ProdutoRow[]>([]);
  const [etiquetas, setEtiquetas] = useState<EtiquetaRow[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [editando, setEditando] = useState<ProdutoRow | "novo" | null>(null);

  const [aba, setAba] = useState<AbaId>(initialAba);
  const [subVendas, setSubVendas] = useState<SubVendas>(
    initialAba === "followup" ? "followup" : "pedidos",
  );
  const [subFin, setSubFin] = useState<SubFinanceiro>("entradas");
  const [estadoFin, setEstadoFin] = useState<EstadoFinanceiro>("pendente");
  // Terceiro nivel do menu do desktop. Fecha junto com o menu que o contem.
  const [grupoAberto, setGrupoAberto] = useState<string | null>(null);
  const [subCad, setSubCad] = useState<SubCadastros>("clientes");
  const [expandida, setExpandida] = useState<AbaId | null>(null);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      const [res, listaEtiquetas] = await Promise.all([
        carregarCatalogoAdmin(),
        listarEtiquetas(),
      ]);
      setCatalogos((res.catalogos ?? []) as CatalogoRow[]);
      setCategorias((res.categorias ?? []) as CategoriaRow[]);
      setProdutos((res.produtos ?? []) as ProdutoRow[]);
      setEtiquetas((listaEtiquetas ?? []) as EtiquetaRow[]);
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
    if (item.id === "custo") return DO_CUSTO.includes(aba);
    if (item.id === "vendas" && aba === "followup") return true;
    return item.abas ? DO_CATALOGO.includes(aba) : aba === item.id;
  }

  function selecionarSub(item: ItemMenu, subId: string) {
    // Filho de Custo e tela propria, nao vista de um painel.
    if (item.id === "custo" && DO_CUSTO.includes(subId as AbaId)) {
      setAba(subId as AbaId);
      setExpandida(null);
      return;
    }

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
    setExpandida(null);
  }

  function abrirUsuarios() {
    setAba("cadastros");
    setSubCad("usuarios");
    setExpandida(null);
  }

  /* Uma definicao so: a mesma tela de 'A receber' agora vive no Financeiro,
     e repetir estas trinta linhas de props seria garantir que as duas
     divirjam na primeira mudanca. */
  const painelVendas = (vista: "pedidos" | "areceber" | "realizadas") => (
              <VendasPanel
      vista={vista}
      onVista={setSubVendas}
      empresaNome={companyName}
      abrirNovoAoMontar={initialNovoPedido}
      categorias={categorias.map((categoria) => ({
        id: categoria.id,
        nome: categoria.nome,
        ordem: categoria.ordem,
      }))}
      onCatalogoChange={recarregar}
      produtos={produtos.map((produto) => {
        const categoria = categorias.find((item) => item.id === produto.categoria_id);
        const catalogo = catalogos.find((item) => item.id === categoria?.catalogo_id);

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
          ordemGrupo: (catalogo?.ordem ?? 99) * 100 + (categoria?.ordem ?? 99),
        };
      })}
    />
  );

  return (
    <ConfirmProvider>
      <Toaster position="bottom-right" richColors />
      <div className="min-h-screen bg-[var(--admin-bg)] text-foreground">
        {/* Faixa do teste. Fica ACIMA do header sticky de propósito: ela some
            quando a pessoa rola, em vez de ocupar altura fixa para sempre —
            no celular o cabeçalho já come tela demais. */}
        {assinatura?.emTeste &&
          assinatura.diasRestantes !== null &&
          assinatura.diasRestantes <= DIAS_PARA_AVISAR && (
            <div
              className={cn(
                "px-4 py-2 text-center text-sm sm:px-6",
                assinatura.expirada
                  ? "bg-[var(--terracotta)] text-[var(--cream-soft)]"
                  : "bg-[var(--cream)] text-[var(--admin-ink)]",
              )}
            >
              {assinatura.expirada ? (
                <>
                  <strong>Seu teste terminou.</strong> Tudo que você cadastrou continua aqui para
                  consultar — para voltar a lançar,{" "}
                  <a
                    href="https://wa.me/5548996510100"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold underline underline-offset-2"
                  >
                    fale com a gente
                  </a>
                  .
                </>
              ) : (
                <>
                  Seu teste termina{" "}
                  <strong>
                    {assinatura.diasRestantes <= 0
                      ? "hoje"
                      : assinatura.diasRestantes === 1
                        ? "amanhã"
                        : `em ${assinatura.diasRestantes} dias`}
                  </strong>
                  .{" "}
                  <a
                    href="https://wa.me/5548996510100"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-[var(--terracotta)] underline underline-offset-2"
                  >
                    Quero continuar
                  </a>
                </>
              )}
            </div>
          )}

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
                className="h-10 w-[108px] object-contain object-left sm:w-[116px]"
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
                          setGrupoAberto(null);
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
                        {filhos
                          .filter((sub) => !("grupo" in sub) || !sub.grupo)
                          .map((sub) => (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => selecionarSub(item, sub.id)}
                              className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[var(--admin-ink-soft)] transition-colors hover:bg-[var(--cream)] hover:text-[var(--terracotta)]"
                            >
                              {sub.label}
                            </button>
                          ))}

                        {/* Terceiro nivel: so no desktop. A barra do celular
                            segue plana, e e la que o AdminPathSync procura o
                            botao pelo rotulo. */}
                        {agruparFilhos(filhos).map(([nome, membros]) => (
                          <div key={nome} className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setGrupoAberto((atual) => (atual === nome ? null : nome))
                              }
                              aria-expanded={grupoAberto === nome}
                              className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[var(--admin-ink-soft)] transition-colors hover:bg-[var(--cream)] hover:text-[var(--terracotta)]"
                            >
                              {nome}
                              <ChevronRight
                                className={cn(
                                  "h-3.5 w-3.5 shrink-0 transition-transform",
                                  grupoAberto === nome && "rotate-90",
                                )}
                              />
                            </button>

                            {grupoAberto === nome && (
                              <div className="absolute left-full top-0 z-10 ml-1 w-max min-w-48 rounded-2xl border border-[var(--admin-border)] bg-white p-2 shadow-[var(--shadow-lift)]">
                                {membros.map((sub) => (
                                  <button
                                    key={sub.id}
                                    type="button"
                                    onClick={() => selecionarSub(item, sub.id)}
                                    className="flex w-full items-center whitespace-nowrap rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[var(--admin-ink-soft)] transition-colors hover:bg-[var(--cream)] hover:text-[var(--terracotta)]"
                                  >
                                    {sub.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
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

            {/* Os baloes moram aqui, e nao no AppHeader: aquele componente so
                e usado nas paginas de conta. Este e o cabecalho do painel. */}
            <TooltipProvider delayDuration={250}>
              <div className="hidden items-center gap-1 md:flex">
                <SinoNotificacoes
                  onIrPara={(destino) => {
                    setExpandida(null);
                    window.location.assign(destino);
                  }}
                />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => {
                        setAba("calendario");
                        setExpandida(null);
                      }}
                      className={cn(
                        "grid h-10 w-10 place-items-center rounded-xl transition",
                        aba === "calendario"
                          ? "bg-[var(--cream)] text-[var(--terracotta)]"
                          : "text-[var(--admin-ink-soft)] hover:bg-[var(--cream)] hover:text-[var(--terracotta)]",
                      )}
                      aria-label="Calendário de entregas"
                      aria-pressed={aba === "calendario"}
                    >
                      <CalendarDays className="h-[18px] w-[18px]" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Calendário de entregas</TooltipContent>
                </Tooltip>

                <CentralAjudaButton />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      /* Navegacao completa, e nao setAba: /conta e outra arvore
                         de paginas (com o AppHeader), nao uma aba do painel. */
                      onClick={() => window.location.assign("/conta/configuracoes")}
                      className="grid h-10 w-10 place-items-center rounded-xl text-[var(--admin-ink-soft)] transition hover:bg-[var(--cream)] hover:text-[var(--terracotta)]"
                      aria-label="Configurações"
                    >
                      <Settings className="h-[18px] w-[18px]" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Configurações da conta e da empresa</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>

            <PerfilContaMenu email={email} displayName={displayName} companyName={companyName} onUsuarios={abrirUsuarios} />
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

          {(aba === "vendas" || aba === "followup") && (
            <nav className="mx-auto flex max-w-[1680px] gap-2 overflow-x-auto border-t border-[var(--admin-border)] px-4 py-2 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {SUB_VENDAS.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => {
                    setAba("vendas");
                    setSubVendas(sub.id);
                  }}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    (aba === "followup" && sub.id === "followup") ||
                      (aba === "vendas" && subVendas === sub.id)
                      ? "bg-[var(--cream)] text-[var(--terracotta)]"
                      : "text-[var(--admin-ink-soft)] hover:bg-[var(--cream-soft)]",
                  )}
                >
                  {sub.label}
                </button>
              ))}
            </nav>
          )}

          {DO_CUSTO.includes(aba) && (
            <nav className="mx-auto flex max-w-[1680px] gap-2 overflow-x-auto border-t border-[var(--admin-border)] px-4 py-2 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {SUB_CUSTO.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setAba(sub.id as AbaId)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    aba === sub.id
                      ? "bg-[var(--cream)] text-[var(--terracotta)]"
                      : "text-[var(--admin-ink-soft)] hover:bg-[var(--cream-soft)]",
                  )}
                >
                  {sub.label}
                </button>
              ))}
            </nav>
          )}

          {aba === "financeiro" && (
            <nav className="mx-auto flex max-w-[1680px] gap-2 overflow-x-auto border-t border-[var(--admin-border)] px-4 py-2 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {SUB_FINANCEIRO.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => {
                    setAba("financeiro");
                    setSubFin(sub.id);
                  }}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    subFin === sub.id
                      ? "bg-[var(--cream)] text-[var(--terracotta)]"
                      : "text-[var(--admin-ink-soft)] hover:bg-[var(--cream-soft)]",
                  )}
                >
                  {sub.label}
                </button>
              ))}
            </nav>
          )}

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
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
          )}

          {carregando ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--terracotta)]" />
            </div>
          ) : aba === "inicio" ? (
            <InicioPanel onIrPara={setAba} />
          ) : aba === "dashboard" ? (
            <DashboardPanel />
          ) : aba === "followup" ? (
            <FollowupPanel empresaNome={companyName} />
          ) : aba === "calendario" ? (
            <CalendarioEntregasPanel
              empresa={{
                nome: companyName,
                logoUrl: companyLogoUrl ?? null,
                endereco: companyAddress ?? null,
                cidadeUf: companyCityState ?? null,
              }}
            />
          ) : aba === "financeiro" ? (
            <>
              {/* Cada estado tem o seu eixo de tempo: o que falta ordena por
                  vencimento, o que ja aconteceu ordena pela data do fato. Por
                  isso sao paineis diferentes, e nao um filtro na mesma lista. */}
              <div className="mb-4 flex gap-1 rounded-full border border-[var(--admin-border)] bg-card p-1 w-fit">
                {(
                  [
                    { v: "pendente", label: subFin === "entradas" ? "A receber" : "A pagar" },
                    { v: "concluido", label: subFin === "entradas" ? "Recebidas" : "Pagas" },
                  ] as const
                ).map(({ v, label }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setEstadoFin(v)}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                      estadoFin === v
                        ? "bg-[var(--terracotta)] text-[var(--cream-soft)]"
                        : "text-[var(--admin-ink-soft)] hover:bg-[var(--cream-soft)]",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {estadoFin === "pendente" ? (
                subFin === "entradas" ? (
                  painelVendas("areceber")
                ) : (
                  <ContasAPagarPanel />
                )
              ) : (
                <FinanceiroPanel vista={subFin} />
              )}
            </>
          ) : aba === "cadastros" ? (
            <CadastrosPanel vista={subCad} />
          ) : aba === "tarefas" ? (
            <TarefasPanel />
          ) : aba === "vendas" ? (
            subVendas === "followup" ? (
              <FollowupPanel empresaNome={companyName} />
            ) : (
              painelVendas(subVendas as "pedidos" | "areceber" | "realizadas")
            )
          ) : aba === "produtos" ? (
            <ProdutosPanel
              produtos={produtos}
              categorias={categorias}
              catalogos={catalogos}
              onNovo={() => setEditando("novo")}
              onEditar={(produto) => setEditando(produto)}
              onChange={recarregar}
            />
          ) : aba === "custo" ? (
            <CustoPanel />
          ) : aba === "calculadora" ? (
            <CalculadoraPanel />
          ) : aba === "simulador" ? (
            <SimuladorPanel />
          ) : aba === "cozinha" ? (
            <CozinhaPanel />
          ) : aba === "estoque" ? (
            <EstoquePanel />
          ) : aba === "cadastro-receitas" || aba === "cadastro-despesas" ? (
            <CategoriasFinanceirasPanel
              lado={aba === "cadastro-receitas" ? "receita" : "despesa"}
              onIrPara={(destino) => {
                setAba("financeiro");
                setSubFin(destino);
                setExpandida(null);
              }}
            />
          ) : aba === "colecoes" ? (
            <ColecoesPanel catalogos={catalogos} categorias={categorias} onChange={recarregar} />
          ) : aba === "categorias" ? (
            <CategoriasPanel categorias={categorias} catalogos={catalogos} onChange={recarregar} />
          ) : aba === "etiquetas" ? (
            <EtiquetasPanel etiquetas={etiquetas} onChange={recarregar} />
          ) : aba === "insumos" ? (
            <InsumosPanel />
          ) : (
            <HorariosPanel />
          )}
        </main>

        {editando && (
          <ProdutoDialog
            produto={editando === "novo" ? null : editando}
            categorias={categorias}
            catalogos={catalogos}
            etiquetas={etiquetas}
            onClose={() => setEditando(null)}
            onSaved={recarregar}
          />
        )}
      </div>
    </ConfirmProvider>
  );
}
