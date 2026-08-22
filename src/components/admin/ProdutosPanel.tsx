import { useEffect, useMemo, useState } from "react";
import { ChevronRight, GripVertical, Layers, Loader2, Plus, Search, Trash2, X } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { removerProduto, reordenarProdutos } from "@/lib/admin";
import { formatPreco } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { type CatalogoRow, type CategoriaRow, type ProdutoRow } from "./tipos";
import { useConfirmar } from "./shell";

const CHAVE_FECHADAS = "flua-admin-produtos-fechadas";

function LinhaProduto({
  produto,
  onEditar,
  onExcluir,
}: {
  produto: ProdutoRow;
  onEditar: (p: ProdutoRow) => void;
  onExcluir: (p: ProdutoRow) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: produto.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 20 : undefined,
  };
  const capa = produto.produto_imagens?.slice().sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))[0];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-2xl border border-[var(--cream-deep)] bg-card p-3 sm:gap-3"
    >
      <button
        type="button"
        aria-label="Arrastar para reordenar"
        className="shrink-0 cursor-grab touch-none rounded-md p-1 text-[var(--bronze)] transition-colors hover:bg-[var(--cream-deep)]/60 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[var(--cream-deep)] sm:h-14 sm:w-14">
        {capa && (
          <img src={capa.url} alt="" className="h-full w-full object-cover" loading="lazy" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{produto.nome}</p>
        <p className="truncate text-xs text-muted-foreground">
          {produto.preco != null
            ? formatPreco(produto.preco)
            : produto.preco_label || "sob consulta"}
          {!produto.ativo && " · oculto"}
          {produto.badge && ` · ${produto.badge}`}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground/80">
          Código: {produto.slug || produto.id}
        </p>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1">
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
  const [itens, setItens] = useState<ProdutoRow[]>(produtos);
  const confirmar = useConfirmar();
  const [alterado, setAlterado] = useState(false);
  const [salvandoOrdem, setSalvandoOrdem] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroColecao, setFiltroColecao] = useState("todas");

  useEffect(() => {
    if (!alterado) setItens(produtos);
  }, [produtos, alterado]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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
      const slug = (produto.slug ?? "").toLocaleLowerCase("pt-BR");
      const id = produto.id.toLocaleLowerCase("pt-BR");

      return nome.includes(termo) || slug.includes(termo) || id.includes(termo);
    });
  }, [itens, categorias, busca, filtroColecao]);

  const colecoes = useMemo(() => {
    const byCat = (id: string | null) =>
      itensFiltrados.filter((p) => (p.categoria_id ?? null) === id);
    const cats = categorias.slice().sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
    const cols = catalogos.slice().sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

    const montar = (catsDaColecao: CategoriaRow[]) =>
      catsDaColecao
        .map((c) => ({ id: c.id as string | null, nome: c.nome, produtos: byCat(c.id) }))
        .filter((x) => x.produtos.length > 0);

    const grupos = cols
      .map((col) => ({
        id: col.id as string | null,
        nome: col.nome,
        categorias: montar(cats.filter((c) => c.catalogo_id === col.id)),
      }))
      .filter((g) => g.categorias.length > 0);

    const orfas = montar(
      cats.filter((c) => !c.catalogo_id || !cols.some((col) => col.id === c.catalogo_id)),
    );
    const semCategoria = byCat(null);
    if (semCategoria.length) {
      orfas.push({ id: null, nome: "Sem categoria", produtos: semCategoria });
    }
    if (orfas.length) grupos.push({ id: null, nome: "Sem coleção", categorias: orfas });

    return grupos;
  }, [itensFiltrados, categorias, catalogos]);

  const [fechadas, setFechadas] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_FECHADAS);
      if (salvo) setFechadas(new Set(JSON.parse(salvo) as string[]));
    } catch {
      // modo privado: só não lembra
    }
  }, []);

  function alternar(catId: string) {
    setFechadas((prev) => {
      const proximo = new Set(prev);
      if (proximo.has(catId)) proximo.delete(catId);
      else proximo.add(catId);
      try {
        localStorage.setItem(CHAVE_FECHADAS, JSON.stringify([...proximo]));
      } catch {
        // modo privado: só não lembra
      }
      return proximo;
    });
  }

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

  function onDragEnd(catId: string | null, e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const grupo = itens.filter((p) => (p.categoria_id ?? null) === catId);
    const ids = grupo.map((p) => p.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const novoGrupo = arrayMove(grupo, oldIndex, newIndex);
    const doGrupo = new Set(novoGrupo.map((p) => p.id));
    let i = 0;
    setItens((prev) => prev.map((p) => (doGrupo.has(p.id) ? novoGrupo[i++] : p)));
    setAlterado(true);
  }

  async function salvarOrdem() {
    setSalvandoOrdem(true);
    try {
      await reordenarProdutos({ data: { ids: itens.map((p) => p.id) } });
      setAlterado(false);
    } finally {
      setSalvandoOrdem(false);
    }
  }

  function desfazer() {
    setItens(produtos);
    setAlterado(false);
  }

  const filtrosAtivos = busca.trim() !== "" || filtroColecao !== "todas";

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Produtos ({itensFiltrados.length}{filtrosAtivos ? ` de ${itens.length}` : ""})
          </h2>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            Todos os produtos cadastrados. Arraste pelo <GripVertical className="inline h-3.5 w-3.5" /> para reordenar dentro da categoria.
          </p>
        </div>
        <Button onClick={onNovo}>
          <Plus className="mr-1.5 h-4 w-4" /> Novo produto
        </Button>
      </div>

      <div className="mt-4 grid gap-3 rounded-2xl border border-[var(--cream-deep)] bg-card p-3 md:grid-cols-[minmax(0,1fr)_280px_auto]">
        <label className="flex h-11 items-center gap-2 rounded-xl border border-[var(--cream-deep)] bg-white px-3.5 focus-within:border-[var(--terracotta)]">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou código do produto"
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

        <select
          value={filtroColecao}
          onChange={(e) => setFiltroColecao(e.target.value)}
          className="h-11 w-full rounded-xl border border-[var(--cream-deep)] bg-white px-3.5 text-sm text-foreground outline-none focus:border-[var(--terracotta)]"
          aria-label="Filtrar por coleção"
        >
          <option value="todas">Todas as coleções</option>
          {catalogos
            .slice()
            .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
            .map((catalogo) => (
              <option key={catalogo.id} value={catalogo.id}>
                {catalogo.nome}
              </option>
            ))}
          <option value="sem">Sem coleção</option>
        </select>

        {filtrosAtivos && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setBusca("");
              setFiltroColecao("todas");
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
      ) : colecoes.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[var(--cream-deep)] p-10 text-center">
          <p className="text-sm font-semibold text-foreground">Nenhum produto encontrado</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tente outro nome, código ou coleção.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-8">
          {colecoes.map((col) => {
            const total = col.categorias.reduce((t, c) => t + c.produtos.length, 0);
            const chaveColecao = `col:${col.id ?? "sem"}`;
            const colecaoFechada = filtrosAtivos ? false : fechadas.has(chaveColecao);
            return (
              <section key={col.id ?? "sem-colecao"}>
                <button
                  type="button"
                  onClick={() => alternar(chaveColecao)}
                  aria-expanded={!colecaoFechada}
                  className="mb-3 flex w-full items-center gap-2 border-b border-[var(--cream-deep)] pb-2 text-left"
                >
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 shrink-0 text-[var(--bronze)] transition-transform",
                      !colecaoFechada && "rotate-90",
                    )}
                  />
                  <Layers className="h-4 w-4 text-[var(--bronze)]" />
                  <h3 className="text-xl font-semibold text-foreground">{col.nome}</h3>
                  <span className="text-xs text-muted-foreground">
                    {total} produto{total === 1 ? "" : "s"}
                  </span>
                </button>

                <div className={cn("space-y-4 pl-2", colecaoFechada && "hidden")}>
                  {col.categorias.map((g) => {
                    const chave = g.id ?? `sem-categoria-${col.id ?? "orfas"}`;
                    const fechada = filtrosAtivos ? false : fechadas.has(chave);
                    return (
                      <div key={chave}>
                        <button
                          type="button"
                          onClick={() => alternar(chave)}
                          className="mb-2.5 flex w-full items-center gap-2 text-left"
                          aria-expanded={!fechada}
                        >
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 shrink-0 text-[var(--bronze)] transition-transform",
                              !fechada && "rotate-90",
                            )}
                          />
                          <h4 className="text-lg font-semibold text-foreground">{g.nome}</h4>
                          <span className="text-xs text-muted-foreground">
                            ({g.produtos.length})
                          </span>
                        </button>

                        {!fechada && (
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(e) => onDragEnd(g.id, e)}
                          >
                            <SortableContext
                              items={g.produtos.map((p) => p.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              <div className="space-y-2 pl-6">
                                {g.produtos.map((p) => (
                                  <LinhaProduto
                                    key={p.id}
                                    produto={p}
                                    onEditar={onEditar}
                                    onExcluir={excluir}
                                  />
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {alterado && (
        <div className="sticky bottom-3 z-10 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--terracotta)]/40 bg-card p-3 shadow-[var(--shadow-lift)]">
          <span className="text-sm font-medium text-foreground">
            Você reorganizou os produtos — salve para aplicar.
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={desfazer} disabled={salvandoOrdem}>
              Desfazer
            </Button>
            <Button size="sm" onClick={salvarOrdem} disabled={salvandoOrdem}>
              {salvandoOrdem && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Salvar ordem
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
