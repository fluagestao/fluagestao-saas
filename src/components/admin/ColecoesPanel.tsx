import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  removerCatalogo,
  removerCategoria,
  salvarCatalogo,
  salvarCategoria,
} from "@/lib/admin";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CORES_DESTAQUE, type CatalogoRow, type CategoriaRow } from "./tipos";
import { EstadoVazio, PageHeader, useConfirmar } from "./shell";

/**
 * Coleções: catálogos e as categorias de cada um, na mesma tela.
 *
 * Antes eram duas abas, e a hierarquia (catálogo → categoria → produto) não
 * aparecia em lugar nenhum — dava pra desativar uma coleção sem perceber que
 * as categorias dela continuavam marcadas como ativas.
 */
export function ColecoesPanel({
  catalogos,
  categorias,
  onChange,
}: {
  catalogos: CatalogoRow[];
  categorias: CategoriaRow[];
  onChange: () => void;
}) {
  const [novoCatalogo, setNovoCatalogo] = useState("");
  const [novaCategoria, setNovaCategoria] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const confirmar = useConfirmar();

  const semColecao = categorias.filter((c) => !c.catalogo_id);

  // ---------- catálogos ----------
  function baseCatalogo(c: CatalogoRow) {
    return {
      id: c.id,
      nome: c.nome,
      ordem: c.ordem ?? 0,
      ativo: c.ativo,
      cor: c.cor,
      subtitulo: c.subtitulo,
      // Preserva as mensagens ao salvar cor/nome/ativo (senão iam pra null).
      msg_saudacao: c.msg_saudacao ?? null,
      msg_fecho: c.msg_fecho ?? null,
      msg_produto: c.msg_produto ?? null,
    };
  }

  async function criarCatalogo() {
    if (!novoCatalogo.trim()) return;
    setSalvando(true);
    await salvarCatalogo({
      data: { nome: novoCatalogo.trim(), ordem: catalogos.length, ativo: true },
    });
    toast.success(`Coleção "${novoCatalogo.trim()}" criada.`);
    setNovoCatalogo("");
    setSalvando(false);
    onChange();
  }

  async function salvarCat(c: CatalogoRow, patch: Partial<ReturnType<typeof baseCatalogo>>) {
    await salvarCatalogo({ data: { ...baseCatalogo(c), ...patch } });
    onChange();
  }

  async function excluirCatalogo(c: CatalogoRow) {
    const filhas = categorias.filter((x) => x.catalogo_id === c.id);
    const ok = await confirmar({
      titulo: `Excluir a coleção "${c.nome}"?`,
      descricao: filhas.length
        ? `As ${filhas.length} categoria(s) dela ficam sem coleção. Nenhum produto é apagado.`
        : "Nenhum produto é apagado.",
      confirmar: "Excluir",
      destrutivo: true,
    });
    if (!ok) return;
    await removerCatalogo({ data: { id: c.id } });
    toast.success(`Coleção "${c.nome}" excluída.`);
    onChange();
  }

  async function moverCatalogo(index: number, dir: -1 | 1) {
    const alvo = index + dir;
    if (alvo < 0 || alvo >= catalogos.length) return;
    const a = catalogos[index];
    const b = catalogos[alvo];
    let ordA = a.ordem ?? index;
    let ordB = b.ordem ?? alvo;
    if (ordA === ordB) {
      ordA = index;
      ordB = alvo;
    }
    await Promise.all([
      salvarCatalogo({ data: { ...baseCatalogo(a), ordem: ordB } }),
      salvarCatalogo({ data: { ...baseCatalogo(b), ordem: ordA } }),
    ]);
    onChange();
  }

  // ---------- categorias ----------
  function baseCategoria(c: CategoriaRow) {
    return {
      id: c.id,
      nome: c.nome,
      ordem: c.ordem ?? 0,
      ativa: c.ativa,
      cor: c.cor,
      subtitulo: c.subtitulo,
      catalogo_id: c.catalogo_id,
    };
  }

  async function salvarCatg(c: CategoriaRow, patch: Partial<ReturnType<typeof baseCategoria>>) {
    await salvarCategoria({ data: { ...baseCategoria(c), ...patch } });
    onChange();
  }

  async function criarCategoria(catalogoId: string | null) {
    const nome = (novaCategoria[catalogoId ?? "sem"] ?? "").trim();
    if (!nome) return;
    setSalvando(true);
    await salvarCategoria({
      data: { nome, ordem: categorias.length, ativa: true, catalogo_id: catalogoId },
    });
    toast.success(`Categoria "${nome}" criada.`);
    setNovaCategoria((v) => ({ ...v, [catalogoId ?? "sem"]: "" }));
    setSalvando(false);
    onChange();
  }

  async function excluirCategoria(c: CategoriaRow) {
    const ok = await confirmar({
      titulo: `Excluir a categoria "${c.nome}"?`,
      descricao: "Os produtos dela ficam sem categoria — eles não são apagados.",
      confirmar: "Excluir",
      destrutivo: true,
    });
    if (!ok) return;
    await removerCategoria({ data: { id: c.id } });
    toast.success(`Categoria "${c.nome}" excluída.`);
    onChange();
  }

  /** Ordena trocando com a vizinha dentro do MESMO catálogo. */
  async function moverCategoria(lista: CategoriaRow[], index: number, dir: -1 | 1) {
    const alvo = index + dir;
    if (alvo < 0 || alvo >= lista.length) return;
    const a = lista[index];
    const b = lista[alvo];
    let ordA = a.ordem ?? index;
    let ordB = b.ordem ?? alvo;
    if (ordA === ordB) {
      ordA = index;
      ordB = alvo;
    }
    await Promise.all([
      salvarCategoria({ data: { ...baseCategoria(a), ordem: ordB } }),
      salvarCategoria({ data: { ...baseCategoria(b), ordem: ordA } }),
    ]);
    onChange();
  }

  function ListaCategorias({
    lista,
    catalogoAtivo,
    catalogoId,
  }: {
    lista: CategoriaRow[];
    catalogoAtivo: boolean;
    catalogoId: string | null;
  }) {
    return (
      <div className="space-y-1.5">
        {lista.map((c, i) => {
          // Categoria "ativa" numa coleção desligada não aparece no site.
          // Mostrar o switch como ativo aqui seria mentira.
          const ocultaPelaColecao = c.ativa && !catalogoAtivo;
          return (
            <div
              key={c.id}
              className={cn(
                "flex flex-wrap items-center gap-2 rounded-xl border border-[var(--cream-deep)] bg-[var(--cream-soft)] px-2.5 py-2",
                !catalogoAtivo && "opacity-70",
              )}
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => moverCategoria(lista, i, -1)}
                  disabled={i === 0}
                  aria-label="Mover para cima"
                  className="text-[var(--bronze)] hover:text-[var(--terracotta)] disabled:opacity-30"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moverCategoria(lista, i, 1)}
                  disabled={i === lista.length - 1}
                  aria-label="Mover para baixo"
                  className="text-[var(--bronze)] hover:text-[var(--terracotta)] disabled:opacity-30"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>

              <Input
                defaultValue={c.nome}
                onBlur={(e) => e.target.value !== c.nome && salvarCatg(c, { nome: e.target.value })}
                className="h-8 max-w-[13rem] border-transparent bg-transparent px-2 text-sm font-medium focus:border-[var(--cream-deep)]"
              />

              <Input
                defaultValue={c.subtitulo ?? ""}
                onBlur={(e) =>
                  (e.target.value.trim() || null) !== (c.subtitulo ?? null) &&
                  salvarCatg(c, { subtitulo: e.target.value.trim() || null })
                }
                placeholder="subtítulo"
                className="h-8 min-w-[8rem] flex-1 text-xs"
              />

              <div className="flex items-center gap-1">
                {CORES_DESTAQUE.map((cor) => {
                  const sel = (c.cor ?? "") === cor.valor;
                  return (
                    <button
                      key={cor.nome}
                      type="button"
                      onClick={() => salvarCatg(c, { cor: cor.valor || null })}
                      title={cor.nome}
                      aria-label={`Cor ${cor.nome}`}
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border text-[9px] text-muted-foreground transition-transform hover:scale-110",
                        sel ? "ring-2 ring-foreground ring-offset-1" : "border-[var(--cream-deep)]",
                      )}
                      style={cor.valor ? { backgroundColor: cor.valor } : undefined}
                    >
                      {cor.valor === "" ? "—" : ""}
                    </button>
                  );
                })}
              </div>

              {ocultaPelaColecao ? (
                <span
                  className="rounded-full bg-[var(--cream-deep)] px-2 py-0.5 text-[10px] text-muted-foreground"
                  title="A coleção está desativada, então esta categoria não aparece no site."
                >
                  oculta pela coleção
                </span>
              ) : (
                <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Switch
                    checked={c.ativa}
                    onCheckedChange={() => salvarCatg(c, { ativa: !c.ativa })}
                  />
                  {c.ativa ? "no site" : "oculta"}
                </label>
              )}

              <Button variant="ghost" size="icon" onClick={() => excluirCategoria(c)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          );
        })}

        <div className="flex gap-2 pt-0.5">
          <Input
            placeholder="Nova categoria"
            value={novaCategoria[catalogoId ?? "sem"] ?? ""}
            onChange={(e) =>
              setNovaCategoria((v) => ({ ...v, [catalogoId ?? "sem"]: e.target.value }))
            }
            onKeyDown={(e) => e.key === "Enter" && criarCategoria(catalogoId)}
            className="h-8 max-w-[13rem] text-sm"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => criarCategoria(catalogoId)}
            disabled={salvando || !(novaCategoria[catalogoId ?? "sem"] ?? "").trim()}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <section>
      <PageHeader
        titulo="Coleções"
        descricao="Coleção agrupa categorias, e categoria agrupa produtos. Desative uma coleção inteira para tirá-la do site fora de época — os produtos ficam guardados."
      />

      {catalogos.length === 0 && semColecao.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma coleção ainda"
          descricao='Crie a primeira (ex.: "Catálogo Geral") e depois pendure as categorias nela.'
        />
      ) : (
        <div className="space-y-3">
          {catalogos.map((cat, i) => {
            const filhas = categorias.filter((c) => c.catalogo_id === cat.id);
            return (
              <article
                key={cat.id}
                className={cn(
                  "rounded-2xl border border-[var(--cream-deep)] bg-card p-3",
                  !cat.ativo && "border-dashed",
                )}
              >
                {/* cabeçalho da coleção */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => moverCatalogo(i, -1)}
                      disabled={i === 0}
                      aria-label="Mover para cima"
                      className="text-[var(--bronze)] hover:text-[var(--terracotta)] disabled:opacity-30"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moverCatalogo(i, 1)}
                      disabled={i === catalogos.length - 1}
                      aria-label="Mover para baixo"
                      className="text-[var(--bronze)] hover:text-[var(--terracotta)] disabled:opacity-30"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>

                  <Input
                    defaultValue={cat.nome}
                    onBlur={(e) =>
                      e.target.value !== cat.nome && salvarCat(cat, { nome: e.target.value })
                    }
                    className="max-w-xs border-transparent bg-transparent px-2 text-base font-semibold focus:border-[var(--cream-deep)]"
                  />

                  <span className="text-xs text-muted-foreground">
                    {filhas.length} categoria(s)
                  </span>

                  <div className="ml-auto flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {CORES_DESTAQUE.map((cor) => {
                        const sel = (cat.cor ?? "") === cor.valor;
                        return (
                          <button
                            key={cor.nome}
                            type="button"
                            onClick={() => salvarCat(cat, { cor: cor.valor || null })}
                            title={cor.nome}
                            aria-label={`Cor ${cor.nome}`}
                            className={cn(
                              "flex h-5 w-5 items-center justify-center rounded-full border text-[9px] text-muted-foreground transition-transform hover:scale-110",
                              sel
                                ? "ring-2 ring-foreground ring-offset-1"
                                : "border-[var(--cream-deep)]",
                            )}
                            style={cor.valor ? { backgroundColor: cor.valor } : undefined}
                          >
                            {cor.valor === "" ? "—" : ""}
                          </button>
                        );
                      })}
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Switch
                        checked={cat.ativo}
                        onCheckedChange={() => {
                          salvarCat(cat, { ativo: !cat.ativo });
                          toast.success(
                            cat.ativo
                              ? `"${cat.nome}" saiu do site (com as categorias dela).`
                              : `"${cat.nome}" voltou pro site.`,
                          );
                        }}
                      />
                      {cat.ativo ? "no site" : "fora do site"}
                    </label>
                    <Button variant="ghost" size="icon" onClick={() => excluirCatalogo(cat)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="mt-2 pl-6">
                  <Input
                    defaultValue={cat.subtitulo ?? ""}
                    onBlur={(e) =>
                      (e.target.value.trim() || null) !== (cat.subtitulo ?? null) &&
                      salvarCat(cat, { subtitulo: e.target.value.trim() || null })
                    }
                    placeholder="subtítulo do banner (vazio = sem destaque)"
                    className="h-8 max-w-md text-xs"
                  />
                </div>

                {/* categorias da coleção */}
                <div className="mt-3 border-t border-[var(--cream-deep)] pl-6 pt-3">
                  <ListaCategorias
                    lista={filhas}
                    catalogoAtivo={cat.ativo}
                    catalogoId={cat.id}
                  />
                </div>
              </article>
            );
          })}

          {/* categorias órfãs: antes sumiam de vista */}
          {semColecao.length > 0 && (
            <article className="rounded-2xl border border-dashed border-[var(--cream-deep)] bg-card p-3">
              <h3 className="text-lg font-semibold text-foreground">Sem coleção</h3>
              <p className="mb-3 text-xs text-muted-foreground">
                Estas categorias não estão em nenhuma coleção. Elas aparecem no site normalmente.
              </p>
              <ListaCategorias lista={semColecao} catalogoAtivo catalogoId={null} />
            </article>
          )}

          {/* nova coleção */}
          <div className="flex gap-2">
            <Input
              placeholder="Nova coleção (ex.: Natal)"
              value={novoCatalogo}
              onChange={(e) => setNovoCatalogo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && criarCatalogo()}
              className="max-w-xs"
            />
            <Button onClick={criarCatalogo} disabled={salvando || !novoCatalogo.trim()} variant="outline">
              <Plus className="mr-1.5 h-4 w-4" /> Adicionar coleção
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
