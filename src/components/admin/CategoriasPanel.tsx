import { useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { removerCategoria, salvarCategoria } from "@/lib/admin";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CORES_DESTAQUE, type CatalogoRow, type CategoriaRow } from "./tipos";
import { EstadoVazio, PageHeader, useConfirmar } from "./shell";

const SEM_COLECAO = "sem";
const COR_PADRAO = "#B8893B";

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
  const [catalogoId, setCatalogoId] = useState(SEM_COLECAO);
  const [cor, setCor] = useState(COR_PADRAO);
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
      e_adicional: Boolean(categoria.e_adicional),
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
          cor,
          catalogo_id: catalogoId === SEM_COLECAO ? null : catalogoId,
        },
      });
      setNome("");
      setCatalogoId(SEM_COLECAO);
      setCor(COR_PADRAO);
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

  const opcoesColecao = (
    <>
      <SelectItem value={SEM_COLECAO} className="rounded-2xl px-4 py-3">
        Sem coleção
      </SelectItem>
      {catalogosOrdenados.map((catalogo) => (
        <SelectItem key={catalogo.id} value={catalogo.id} className="rounded-2xl px-4 py-3">
          {catalogo.nome}
        </SelectItem>
      ))}
    </>
  );

  return (
    <section data-tela-cheia>
      <PageHeader
        titulo={`Categorias (${categorias.length})`}
        descricao="Crie e organize as categorias usadas no cadastro dos produtos. Cada categoria pode pertencer a uma coleção."
      />

      <div className="mt-4 rounded-2xl border border-[var(--cream-deep)] bg-card p-4">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--terracotta)]">Novo cadastro</p>
          <h3 className="mt-1 text-base font-semibold text-foreground">Nova categoria</h3>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1.3fr)_minmax(220px,280px)_auto_auto] lg:items-center">
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && criarCategoria()}
            placeholder="Nome da nova categoria"
            className="h-11"
          />

          <Select value={catalogoId} onValueChange={setCatalogoId}>
            <SelectTrigger className="h-11 rounded-xl border-[var(--cream-deep)] px-4">
              <SelectValue placeholder="Sem coleção" />
            </SelectTrigger>
            <SelectContent
              align="end"
              sideOffset={8}
              className="min-w-[280px] rounded-3xl border border-[var(--cream-deep)] bg-white p-2 shadow-[0_22px_55px_rgba(84,52,48,0.18)]"
            >
              {opcoesColecao}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5 rounded-xl border border-[var(--cream-deep)] bg-[var(--cream-soft)] px-3 py-2">
            {CORES_DESTAQUE.filter((item) => item.valor).map((item) => (
              <button
                key={item.nome}
                type="button"
                onClick={() => setCor(item.valor)}
                title={item.nome}
                aria-label={`Cor ${item.nome}`}
                className={cn(
                  "h-6 w-6 rounded-full border transition-transform hover:scale-110",
                  cor === item.valor
                    ? "ring-2 ring-foreground ring-offset-1"
                    : "border-[var(--cream-deep)]",
                )}
                style={{ backgroundColor: item.valor }}
              />
            ))}
          </div>

          <Button onClick={criarCategoria} disabled={salvando || !nome.trim()} className="h-11">
            <Plus className="mr-1.5 h-4 w-4" /> Adicionar categoria
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
        <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {categoriasFiltradas.map((categoria) => (
            <article
              key={categoria.id}
              className="grid gap-3 rounded-2xl border border-[var(--cream-deep)] bg-card p-3 lg:grid-cols-[minmax(200px,1.1fr)_minmax(200px,1fr)_minmax(220px,1.1fr)_auto_auto] lg:items-center"
            >
              <Input
                defaultValue={categoria.nome}
                onBlur={(e) => {
                  const valor = e.target.value.trim();
                  if (valor && valor !== categoria.nome) atualizarCategoria(categoria, { nome: valor });
                }}
                className="h-10 font-medium"
              />

              <Select
                value={categoria.catalogo_id ?? SEM_COLECAO}
                onValueChange={(valor) =>
                  atualizarCategoria(categoria, {
                    catalogo_id: valor === SEM_COLECAO ? null : valor,
                  })
                }
              >
                <SelectTrigger className="h-10 rounded-xl border-[var(--cream-deep)] px-4 text-sm">
                  <SelectValue placeholder="Sem coleção" />
                </SelectTrigger>
                <SelectContent
                  sideOffset={8}
                  className="min-w-[240px] rounded-3xl border border-[var(--cream-deep)] bg-white p-2 shadow-[0_22px_55px_rgba(84,52,48,0.18)]"
                >
                  {opcoesColecao}
                </SelectContent>
              </Select>

              <Input
                defaultValue={categoria.subtitulo ?? ""}
                onBlur={(e) => {
                  const valor = e.target.value.trim() || null;
                  if (valor !== (categoria.subtitulo ?? null)) atualizarCategoria(categoria, { subtitulo: valor });
                }}
                placeholder="Descrição curta (opcional)"
                className="h-10 text-sm"
              />

              <div className="flex items-center gap-1.5">
                {CORES_DESTAQUE.filter((item) => item.valor).map((item) => (
                  <button
                    key={item.nome}
                    type="button"
                    onClick={() => atualizarCategoria(categoria, { cor: item.valor })}
                    title={item.nome}
                    aria-label={`Cor ${item.nome}`}
                    className={cn(
                      "h-6 w-6 rounded-full border transition-transform hover:scale-110",
                      (categoria.cor || COR_PADRAO) === item.valor
                        ? "ring-2 ring-foreground ring-offset-1"
                        : "border-[var(--cream-deep)]",
                    )}
                    style={{ backgroundColor: item.valor }}
                  />
                ))}
              </div>

              <div className="flex items-center justify-end gap-2">
                <label
                  title="Marque quando esta categoria for de itens vendidos junto de uma cesta, como bebidas, cartão ou chocolate. Alimenta a aba Adicionais e a taxa de anexo do Dashboard."
                  className="flex items-center gap-2 rounded-xl border border-[var(--cream-deep)] bg-[var(--cream-soft)] px-3 py-2 text-xs text-muted-foreground"
                >
                  <Switch
                    checked={Boolean(categoria.e_adicional)}
                    onCheckedChange={(e_adicional) =>
                      atualizarCategoria(categoria, { e_adicional })
                    }
                  />
                  Adicionais
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
