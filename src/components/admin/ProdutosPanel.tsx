import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  FileSpreadsheet,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { removerProduto } from "@/lib/admin";
import { formatPreco } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type CatalogoRow,
  type CategoriaRow,
  type ProdutoRow,
} from "./tipos";
import { useConfirmar } from "./shell";

/* Chave dos que nao tem colecao/categoria. Nao e id de nada: e o balde onde
   caem os produtos soltos, sempre no fim da lista. */
const SEM = "__sem__";

function LinhaProduto({
  produto,
  categoriaNome,
  onEditar,
  onExcluir,
}: {
  produto: ProdutoRow;
  categoriaNome: string;
  onEditar: (p: ProdutoRow) => void;
  onExcluir: (p: ProdutoRow) => void;
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
        </p>
        <p className="mt-0.5 truncate text-[10px] font-semibold tabular-nums text-[var(--terracotta)]">
          Código: {produto.sku}
        </p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
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

  /* Produtos agrupados por colecao e, dentro dela, por categoria.
     A colecao nao vive no produto: ela vem da categoria (categorias.catalogo_id).
     Por isso o caminho e sempre produto -> categoria -> colecao. */
  const grupos = useMemo(() => {
    const porColecao = new Map<string, Map<string, ProdutoRow[]>>();

    for (const produto of itensFiltrados) {
      const categoria = categorias.find((item) => item.id === produto.categoria_id);
      const colecaoId = categoria?.catalogo_id ?? SEM;
      const categoriaId = categoria?.id ?? SEM;

      if (!porColecao.has(colecaoId)) porColecao.set(colecaoId, new Map());
      const daColecao = porColecao.get(colecaoId)!;
      if (!daColecao.has(categoriaId)) daColecao.set(categoriaId, []);
      daColecao.get(categoriaId)!.push(produto);
    }

    // Sem colecao/categoria vai para o fim, na ordem definida no cadastro.
    const ordemColecao = (id: string) =>
      id === SEM ? Number.MAX_SAFE_INTEGER : (catalogos.find((c) => c.id === id)?.ordem ?? 999);
    const ordemCategoria = (id: string) =>
      id === SEM ? Number.MAX_SAFE_INTEGER : (categorias.find((c) => c.id === id)?.ordem ?? 999);

    return [...porColecao.entries()]
      .sort((a, b) => ordemColecao(a[0]) - ordemColecao(b[0]))
      .map(([colecaoId, daColecao]) => {
        const listaCategorias = [...daColecao.entries()]
          .sort((a, b) => ordemCategoria(a[0]) - ordemCategoria(b[0]))
          .map(([categoriaId, produtos]) => ({
            id: categoriaId,
            nome:
              categoriaId === SEM
                ? "Sem categoria"
                : (categorias.find((c) => c.id === categoriaId)?.nome ?? "Sem categoria"),
            produtos,
          }));

        const soSoltos =
          colecaoId === SEM && listaCategorias.length === 1 && listaCategorias[0].id === SEM;

        return {
          id: colecaoId,
          // Quando o produto nao tem nem colecao nem categoria, um cabecalho so
          // ja diz tudo — dois empilhados seriam ruido.
          nome: soSoltos
            ? "Sem categoria e coleção"
            : colecaoId === SEM
              ? "Sem coleção"
              : (catalogos.find((c) => c.id === colecaoId)?.nome ?? "Sem coleção"),
          semSubtitulos: soSoltos,
          categorias: listaCategorias,
          total: listaCategorias.reduce((n, c) => n + c.produtos.length, 0),
        };
      });
  }, [itensFiltrados, categorias, catalogos]);

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

  const filtrosAtivos = busca.trim() !== "" || filtroColecao !== "todas";

  return (
    <section data-tela-cheia>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Produtos ({itensFiltrados.length}{filtrosAtivos ? ` de ${itens.length}` : ""})
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Cadastre e organize os produtos da sua empresa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <a href="/conta/configuracoes?importar=produtos">
              <FileSpreadsheet className="mr-1.5 h-4 w-4" />
              Importar planilha
            </a>
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
          <div className="mt-5 min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
            {grupos.map((grupo) => (
              <section key={grupo.id}>
                <header className="sticky top-0 z-10 flex items-baseline gap-2 bg-[var(--admin-bg)] pb-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--bronze)]">
                    {grupo.nome}
                  </h3>
                  <span className="text-[11px] text-muted-foreground">{grupo.total}</span>
                </header>

                <div className="space-y-3">
                  {grupo.categorias.map((categoria) => (
                    <div key={categoria.id}>
                      {!grupo.semSubtitulos && (
                        <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">
                          {categoria.nome}
                          <span className="ml-1.5 font-normal">{categoria.produtos.length}</span>
                        </p>
                      )}
                      <div className="space-y-2">
                        {categoria.produtos.map((p) => (
                          <LinhaProduto
                            key={p.id}
                            produto={p}
                            categoriaNome={categoria.nome}
                            onEditar={onEditar}
                            onExcluir={excluir}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-0.5 flex h-10 items-center gap-4">
            <p className="text-xs text-muted-foreground">
              {itensFiltrados.length} {itensFiltrados.length === 1 ? "produto" : "produtos"}
              {grupos.length > 1 ? ` em ${grupos.length} coleções` : ""}
            </p>
          </div>
        </>
      )}
    </section>
  );
}
