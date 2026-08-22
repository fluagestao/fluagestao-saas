import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { removerProduto, salvarProduto } from "@/lib/admin";
import { formatPreco } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  asPrecosExtra,
  asStringArray,
  type CatalogoRow,
  type CategoriaRow,
  type ProdutoRow,
} from "./tipos";
import { useConfirmar } from "./shell";

const ITENS_POR_PAGINA = 7;

function LinhaProduto({
  produto,
  categoriaNome,
  onEditar,
  onExcluir,
  onVisibilidade,
}: {
  produto: ProdutoRow;
  categoriaNome: string;
  onEditar: (p: ProdutoRow) => void;
  onExcluir: (p: ProdutoRow) => void;
  onVisibilidade: (p: ProdutoRow, ativo: boolean) => void;
}) {
  const capa = produto.produto_imagens
    ?.slice()
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))[0];

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--cream-deep)] bg-card p-3">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[var(--cream-deep)] sm:h-14 sm:w-14">
        {capa && <img src={capa.url} alt="" className="h-full w-full object-cover" loading="lazy" />}
      </div>

      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="truncate font-medium text-foreground">{produto.nome}</p>
          <span className="shrink-0 rounded-full bg-[var(--cream)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--terracotta)]">
            {categoriaNome}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {produto.preco != null
            ? formatPreco(produto.preco)
            : produto.preco_label || "sob consulta"}
          {produto.badge && ` · ${produto.badge}`}
        </p>
        <p className="mt-0.5 truncate text-[10px] font-semibold tabular-nums text-[var(--terracotta)]">
          Código: {produto.sku}
        </p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <label className="flex items-center gap-2 rounded-xl border border-[var(--cream-deep)] bg-[var(--cream-soft)] px-3 py-2 text-xs font-medium text-[var(--admin-ink-soft)]">
          <Switch
            checked={produto.ativo !== false}
            onCheckedChange={(ativo) => onVisibilidade(produto, ativo)}
          />
          <span className="hidden sm:inline">Visível no site</span>
        </label>

        <Button variant="outline" size="sm" onClick={() => onEditar(produto)}>
          Editar
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onExcluir(produto)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

export function ProdutosPanel({
  produtos,
  categorias,
  catalogos,
  onNovo,
  onEditar,
  onChange,
}: {
  produtos: ProdutoRow[];
  categorias: CategoriaRow[];
  catalogos: CatalogoRow[];
  onNovo: () => void;
  onEditar: (p: ProdutoRow) => void;
  onChange: () => void;
}) {
  void onNovo;
  const [itens, setItens] = useState<ProdutoRow[]>(produtos);
  const confirmar = useConfirmar();
  const [busca, setBusca] = useState("");
  const [filtroColecao, setFiltroColecao] = useState("todas");
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    setItens(produtos);
  }, [produtos]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const desktop = window.matchMedia("(min-width: 1024px)");
    if (!desktop.matches) return;

    const overflowHtml = document.documentElement.style.overflow;
    const overflowBody = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = overflowHtml;
      document.body.style.overflow = overflowBody;
    };
  }, []);

  const itensFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");

    return itens.filter((produto) => {
      const categoria = categorias.find((item) => item.id === produto.categoria_id);
      const catalogoId = categoria?.catalogo_id ?? null;

      const passaColecao =
        filtroColecao === "todas" ||
        (filtroColecao === "sem" ? !catalogoId : catalogoId === filtroColecao);

      if (!passaColecao) return false;
      if (!termo) return true;

      const nome = produto.nome.toLocaleLowerCase("pt-BR");
      const codigo = (produto.sku ?? "").toLocaleLowerCase("pt-BR");
      const slug = (produto.slug ?? "").toLocaleLowerCase("pt-BR");
      const id = produto.id.toLocaleLowerCase("pt-BR");
      const categoriaNome = (categoria?.nome ?? "").toLocaleLowerCase("pt-BR");

      return (
        nome.includes(termo) ||
        codigo.includes(termo) ||
        slug.includes(termo) ||
        id.includes(termo) ||
        categoriaNome.includes(termo)
      );
    });
  }, [itens, categorias, busca, filtroColecao]);

  const totalPaginas = Math.max(1, Math.ceil(itensFiltrados.length / ITENS_POR_PAGINA));

  const itensPagina = useMemo(() => {
    const inicio = (pagina - 1) * ITENS_POR_PAGINA;
    return itensFiltrados.slice(inicio, inicio + ITENS_POR_PAGINA);
  }, [itensFiltrados, pagina]);

  useEffect(() => {
    setPagina(1);
  }, [busca, filtroColecao]);

  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas);
  }, [pagina, totalPaginas]);

  async function excluir(p: ProdutoRow) {
    const ok = await confirmar({
      titulo: `Excluir "${p.nome}"?`,
      descricao: "O produto e as fotos dele somem. Isso não tem volta.",
      confirmar: "Excluir",
      destrutivo: true,
    });
    if (!ok) return;

    await removerProduto({ data: { id: p.id } });
    setItens((prev) => prev.filter((x) => x.id !== p.id));
    onChange();
  }

  async function alterarVisibilidade(p: ProdutoRow, ativo: boolean) {
    const anterior = p.ativo !== false;
    setItens((prev) => prev.map((item) => (item.id === p.id ? { ...item, ativo } : item)));

    try {
      await salvarProduto({
        data: {
          id: p.id,
          nome: p.nome,
          categoria_id: p.categoria_id,
          preco: p.preco,
          preco_label: p.preco_label,
          serve: p.serve,
          itens: asStringArray(p.itens),
          precos_extra: asPrecosExtra(p.precos_extra),
          observacao: p.observacao,
          ativo,
          ordem: p.ordem ?? 0,
          badge: p.badge,
          badge_cor: p.badge_cor,
        },
      });
      toast.success(ativo ? "Produto visível no site." : "Produto ocultado do site.");
      onChange();
    } catch {
      setItens((prev) => prev.map((item) => (item.id === p.id ? { ...item, ativo: anterior } : item)));
      toast.error("Não foi possível alterar a visibilidade do produto.");
    }
  }

  const filtrosAtivos = busca.trim() !== "" || filtroColecao !== "todas";
  const inicioExibido =
    itensFiltrados.length === 0 ? 0 : (pagina - 1) * ITENS_POR_PAGINA + 1;
  const fimExibido = Math.min(pagina * ITENS_POR_PAGINA, itensFiltrados.length);

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Produtos ({itensFiltrados.length}{filtrosAtivos ? ` de ${itens.length}` : ""})
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Cadastre os produtos e gere uma vitrine pública automaticamente.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/catalogo/gerar" target="_blank" rel="noreferrer">
              <Sparkles className="mr-1.5 h-4 w-4 text-[var(--terracotta)]" />
              Gerar catálogo inteligente
              <ExternalLink className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>

          <Button asChild>
            <Link href="/cadastros/produtos/novo">
              <Plus className="mr-1.5 h-4 w-4" /> Novo produto
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 rounded-2xl border border-[var(--cream-deep)] bg-card p-3 md:grid-cols-[minmax(0,1fr)_280px_auto]">
        <label className="flex h-11 items-center gap-2 rounded-xl border border-[var(--cream-deep)] bg-white px-3.5 focus-within:border-[var(--terracotta)]">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, código ou categoria"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca("")}
              className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-[var(--cream-soft)] hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </label>

        <Select value={filtroColecao} onValueChange={setFiltroColecao}>
          <SelectTrigger
            className="h-11 rounded-xl border-[var(--cream-deep)] px-4 text-sm font-medium"
            aria-label="Filtrar por coleção"
          >
            <SelectValue placeholder="Todas as coleções" />
          </SelectTrigger>
          <SelectContent
            align="end"
            sideOffset={8}
            className="min-w-[280px] rounded-3xl border border-[var(--cream-deep)] bg-white p-2 shadow-[0_22px_55px_rgba(84,52,48,0.18)]"
          >
            <SelectItem value="todas" className="rounded-2xl px-4 py-3">
              Todas as coleções
            </SelectItem>
            {catalogos
              .slice()
              .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
              .map((catalogo) => (
                <SelectItem key={catalogo.id} value={catalogo.id} className="rounded-2xl px-4 py-3">
                  {catalogo.nome}
                </SelectItem>
              ))}
            <SelectItem value="sem" className="rounded-2xl px-4 py-3">
              Sem coleção
            </SelectItem>
          </SelectContent>
        </Select>

        {filtrosAtivos && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setBusca("");
              setFiltroColecao("todas");
              setPagina(1);
            }}
            className="h-11"
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {itens.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-[var(--cream-deep)] p-8 text-center text-sm text-muted-foreground">
          Nenhum produto ainda. Clique em “Novo produto”.
        </p>
      ) : itensFiltrados.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[var(--cream-deep)] p-10 text-center">
          <p className="text-sm font-semibold text-foreground">Nenhum produto encontrado</p>
          <p className="mt-1 text-xs text-muted-foreground">Tente outro nome, código, categoria ou coleção.</p>
        </div>
      ) : (
        <>
          <div className="mt-5 space-y-2">
            {itensPagina.map((p) => {
              const categoria = categorias.find((item) => item.id === p.categoria_id);
              return (
                <LinhaProduto
                  key={p.id}
                  produto={p}
                  categoriaNome={categoria?.nome ?? "Sem categoria"}
                  onEditar={onEditar}
                  onExcluir={excluir}
                  onVisibilidade={alterarVisibilidade}
                />
              );
            })}
          </div>

          <div className="mt-0.5 flex h-10 items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              Exibindo {inicioExibido}–{fimExibido} de {itensFiltrados.length} produtos
            </p>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPagina((atual) => Math.max(1, atual - 1))}
                disabled={pagina === 1}
                className="h-8 px-2.5"
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {Array.from({ length: totalPaginas }, (_, index) => index + 1).map(
                (numero) => (
                  <button
                    key={numero}
                    type="button"
                    onClick={() => setPagina(numero)}
                    className={`grid h-8 min-w-8 place-items-center rounded-lg px-2 text-xs font-semibold transition-colors ${
                      pagina === numero
                        ? "bg-[var(--terracotta)] text-white"
                        : "border border-[var(--cream-deep)] bg-white text-[var(--admin-ink-soft)] hover:bg-[var(--cream-soft)]"
                    }`}
                  >
                    {numero}
                  </button>
                ),
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setPagina((atual) => Math.min(totalPaginas, atual + 1))
                }
                disabled={pagina === totalPaginas}
                className="h-8 px-2.5"
                aria-label="Próxima página"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
