import { useEffect, useMemo, useState } from "react";
import { ChevronRight, GripVertical, ImageIcon, Layers, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
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

import { removerProduto, reordenarProdutos, salvarProduto } from "@/lib/admin";
import { formatPreco } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { type CatalogoRow, type CategoriaRow, type ProdutoRow } from "./tipos";
import { EstadoVazio, PageHeader, useConfirmar } from "./shell";

const CHAVE_FECHADAS = "flua-admin-produtos-fechadas";

// ---------- lista de produtos (arrastÃ¡vel, por coleÃ§Ã£o e categoria) ----------
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
          {!produto.ativo && " Â· oculto"}
          {produto.badge && ` Â· ðŸ·ï¸ ${produto.badge}`}
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
  // Ordem local editÃ¡vel: arraste Ã  vontade e salve tudo de uma vez no fim.
  const [itens, setItens] = useState<ProdutoRow[]>(produtos);
  const confirmar = useConfirmar();
  const [alterado, setAlterado] = useState(false);
  const [salvandoOrdem, setSalvandoOrdem] = useState(false);
  // SÃ³ sincroniza do servidor quando NÃƒO hÃ¡ reordenaÃ§Ã£o pendente (nÃ£o perde o arrasto).
  useEffect(() => {
    if (!alterado) setItens(produtos);
  }, [produtos, alterado]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  /**
   * ColeÃ§Ã£o â†’ categoria â†’ produtos.
   *
   * O nome da categoria se repete entre coleÃ§Ãµes ("CafÃ© da ManhÃ£" existe no
   * Geral e no Dia dos Pais), entÃ£o sem a coleÃ§Ã£o por fora nÃ£o dÃ¡ pra saber
   * qual lista Ã© qual.
   */
  const colecoes = useMemo(() => {
    const byCat = (id: string | null) => itens.filter((p) => (p.categoria_id ?? null) === id);
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

    // Categoria Ã³rfÃ£ e produto sem categoria caem num grupo final, pra nada
    // sumir da tela por causa de cadastro incompleto.
    const orfas = montar(
      cats.filter((c) => !c.catalogo_id || !cols.some((col) => col.id === c.catalogo_id)),
    );
    const semCategoria = byCat(null);
    if (semCategoria.length) {
      orfas.push({ id: null, nome: "Sem categoria", produtos: semCategoria });
    }
    if (orfas.length) grupos.push({ id: null, nome: "Sem coleÃ§Ã£o", categorias: orfas });

    return grupos;
  }, [itens, categorias, catalogos]);

  // Quais categorias estÃ£o recolhidas. Guardado no navegador: reabrir tudo a
  // cada refresh anula o sentido de poder fechar.
  const [fechadas, setFechadas] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_FECHADAS);
      if (salvo) setFechadas(new Set(JSON.parse(salvo) as string[]));
    } catch {
      // modo privado: sÃ³ nÃ£o lembra
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
        // idem
      }
      return proximo;
    });
  }

  async function excluir(p: ProdutoRow) {
    const ok = await confirmar({
      titulo: `Excluir "${p.nome}"?`,
      descricao: "O produto e as fotos dele somem. Isso nÃ£o tem volta.",
      confirmar: "Excluir",
      destrutivo: true,
    });
    if (!ok) return;
    await removerProduto({ data: { id: p.id } });
    setItens((prev) => prev.filter((x) => x.id !== p.id));
    onChange();
  }

  // Arrastar sÃ³ atualiza a ordem local (nÃ£o salva ainda) â€” salva tudo no botÃ£o.
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

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Produtos ({itens.length})
        </h2>
        <Button onClick={onNovo}>
          <Plus className="mr-1.5 h-4 w-4" /> Novo produto
        </Button>
      </div>
      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        Arraste pelo <GripVertical className="inline h-3.5 w-3.5" /> para reordenar dentro da
        categoria.
      </p>

      {colecoes.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-[var(--cream-deep)] p-8 text-center text-sm text-muted-foreground">
          Nenhum produto ainda. Clique em â€œNovo produtoâ€.
        </p>
      ) : (
        <div className="mt-5 space-y-10">
          {colecoes.map((col) => {
            const total = col.categorias.reduce((t, c) => t + c.produtos.length, 0);
            // Prefixo separado: id de coleÃ§Ã£o e de categoria vivem no mesmo Set.
            const chaveColecao = `col:${col.id ?? "sem"}`;
            const colecaoFechada = fechadas.has(chaveColecao);
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
                    const fechada = fechadas.has(chave);
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
            VocÃª reorganizou os produtos â€” salve para aplicar.
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

