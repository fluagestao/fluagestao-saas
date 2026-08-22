import { useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { removerCategoria, salvarCategoria } from "@/lib/admin";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CORES_DESTAQUE, type CatalogoRow, type CategoriaRow } from "./tipos";
import { EstadoVazio, PageHeader, useConfirmar } from "./shell";

export function CategoriasPanel({
  categorias,
  catalogos,
  onChange,
}: {
  categorias: CategoriaRow[];
  catalogos: CatalogoRow[];
  onChange: () => void;
}) {
  const [nome, setNome] = useState("");
  const [catalogoId, setCatalogoId] = useState("");
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState(false);
  const confirmar = useConfirmar();

  const catalogosOrdenados = useMemo(
    () => catalogos.slice().sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
    [catalogos],
  );

  const categoriasFiltradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return categorias
      .slice()
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
      .filter((categoria) => {
        if (!termo) return true;
        const colecao = catalogos.find((item) => item.id === categoria.catalogo_id);
        return (
          categoria.nome.toLocaleLowerCase("pt-BR").includes(termo) ||
          (categoria.subtitulo ?? "").toLocaleLowerCase("pt-BR").includes(termo) ||
          (colecao?.nome ?? "").toLocaleLowerCase("pt-BR").includes(termo)
        );
      });
  }, [busca, categorias, catalogos]);

  function baseCategoria(categoria: CategoriaRow) {
    return {
      id: categoria.id,
      nome: categoria.nome,
      ordem: categoria.ordem ?? 0,
      ativa: categoria.ativa,
      cor: categoria.cor,
      subtitulo: categoria.subtitulo,
      catalogo_id: categoria.catalogo_id,
    };
  }

  async function criarCategoria() {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) return;

    setSalvando(true);
    try {
      await salvarCategoria({
        data: {
          nome: nomeLimpo,
          ordem: categorias.length,
          ativa: true,
          catalogo_id: catalogoId || null,
        },
      });
      setNome("");
      setCatalogoId("");
      toast.success(`Categoria "${nomeLimpo}" criada.`);
      onChange();
    } finally {
      setSalvando(false);
    }
  }

  async function atualizarCategoria(
    categoria: CategoriaRow,
    patch: Partial<ReturnType<typeof baseCategoria>>,
  ) {
    await salvarCategoria({ data: { ...baseCategoria(categoria), ...patch } });
    onChange();
  }

  async function excluirCategoria(categoria: CategoriaRow) {
    const ok = await confirmar({
      titulo: `Excluir a categoria "${categoria.nome}"?`,
      descricao: "Os produtos vinculados ficam sem categoria. Nenhum produto é apagado.",
      confirmar: "Excluir",
      destrutivo: true,
    });
    if (!ok) return;

    await removerCategoria({ data: { id: categoria.id } });
    toast.success(`Categoria "${categoria.nome}" excluída.`);
    onChange();
  }

  return (
    <section>
      <PageHeader
        titulo={`Categorias (${categorias.length})`}
        descricao="Crie e organize as categorias usadas no cadastro dos produtos. Cada categoria pode pertencer a uma coleção."
      />

      <div className="mt-4 rounded-2xl border border-[var(--cream-deep)] bg-card p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_280px_auto]">
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && criarCategoria()}
            placeholder="Nome da nova categoria"
            className="h-11"
          />

          <select
            value={catalogoId}
            onChange={(e) => setCatalogoId(e.target.value)}
            className="h-11 rounded-xl border border-[var(--cream-deep)] bg-white px-3.5 text-sm outline-none focus:border-[var(--terracotta)]"
            aria-label="Coleção da categoria"
          >
            <option value="">Sem coleção</option>
            {catalogosOrdenados.map((catalogo) => (
              <option key={catalogo.id} value={catalogo.id}>
                {catalogo.nome}
              </option>
            ))}
          </select>

          <Button onClick={criarCategoria} disabled={salvando || !nome.trim()} className="h-11">
            <Plus className="mr-1.5 h-4 w-4" /> Nova categoria
          </Button>
        </div>
      </div>

      <label className="mt-4 flex h-11 items-center gap-2 rounded-xl border border-[var(--cream-deep)] bg-white px-3.5 focus-within:border-[var(--terracotta)]">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar categoria ou coleção"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </label>

      {categorias.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma categoria ainda"
          descricao="Crie a primeira categoria para organizar seus produtos."
        />
      ) : categoriasFiltradas.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--cream-deep)] p-10 text-center text-sm text-muted-foreground">
          Nenhuma categoria encontrada.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {categoriasFiltradas.map((categoria) => (
            <article
              key={categoria.id}
              className="grid gap-3 rounded-2xl border border-[var(--cream-deep)] bg-card p-3 lg:grid-cols-[minmax(180px,1.1fr)_minmax(180px,1fr)_minmax(180px,1.1fr)_auto_auto] lg:items-center"
            >
              <Input
                defaultValue={categoria.nome}
                onBlur={(e) => {
                  const valor = e.target.value.trim();
                  if (valor && valor !== categoria.nome) {
                    atualizarCategoria(categoria, { nome: valor });
                  }
                }}
                className="h-10 font-medium"
              />

              <select
                value={categoria.catalogo_id ?? ""}
                onChange={(e) =>
                  atualizarCategoria(categoria, { catalogo_id: e.target.value || null })
                }
                className="h-10 rounded-xl border border-[var(--cream-deep)] bg-white px-3 text-sm outline-none focus:border-[var(--terracotta)]"
              >
                <option value="">Sem coleção</option>
                {catalogosOrdenados.map((catalogo) => (
                  <option key={catalogo.id} value={catalogo.id}>
                    {catalogo.nome}
                  </option>
                ))}
              </select>

              <Input
                defaultValue={categoria.subtitulo ?? ""}
                onBlur={(e) => {
                  const valor = e.target.value.trim() || null;
                  if (valor !== (categoria.subtitulo ?? null)) {
                    atualizarCategoria(categoria, { subtitulo: valor });
                  }
                }}
                placeholder="Descrição curta (opcional)"
                className="h-10 text-sm"
              />

              <div className="flex items-center gap-1.5">
                {CORES_DESTAQUE.map((cor) => {
                  const selecionada = (categoria.cor ?? "") === cor.valor;
                  return (
                    <button
                      key={cor.nome}
                      type="button"
                      onClick={() => atualizarCategoria(categoria, { cor: cor.valor || null })}
                      title={cor.nome}
                      aria-label={`Cor ${cor.nome}`}
                      className={cn(
                        "grid h-6 w-6 place-items-center rounded-full border text-[9px] transition-transform hover:scale-110",
                        selecionada
                          ? "ring-2 ring-foreground ring-offset-1"
                          : "border-[var(--cream-deep)]",
                      )}
                      style={cor.valor ? { backgroundColor: cor.valor } : undefined}
                    >
                      {!cor.valor ? "—" : ""}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2">
                <label className="flex items-center gap-2 rounded-xl border border-[var(--cream-deep)] bg-[var(--cream-soft)] px-3 py-2 text-xs text-muted-foreground">
                  <Switch
                    checked={categoria.ativa}
                    onCheckedChange={(ativa) => atualizarCategoria(categoria, { ativa })}
                  />
                  {categoria.ativa ? "Visível" : "Oculta"}
                </label>

                <Button variant="ghost" size="icon" onClick={() => excluirCategoria(categoria)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
