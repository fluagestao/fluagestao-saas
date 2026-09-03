"use client";

import {
  ArrowLeft,
  Calculator,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast, Toaster } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  enviarImagem,
  removerImagem,
  removerProduto,
  reordenarImagens,
  salvarProduto,
} from "@/lib/admin";
import {
  salvarComposicaoProduto,
  type InsumoRow,
} from "@/lib/insumos";
import { mensagemDeErro } from "@/lib/erros";
import { cn } from "@/lib/utils";
import {
  asPrecosExtra,
  asStringArray,
  fileToBase64,
  slugFromNome,
  type CatalogoRow,
  type CategoriaRow,
  type ImagemRow,
} from "@/components/admin/tipos";

type DraftProduto = {
  id: string;
  sku: string;
  slug: string;
  rascunho: boolean;
};

type ProdutoInicial = {
  nome: string;
  categoria_id: string | null;
  preco: number | null;
  preco_label: string | null;
  serve: string | null;
  itens: unknown;
  precos_extra: unknown;
  observacao: string | null;
  ativo: boolean | null;
  ordem: number | null;
  badge: string | null;
  badge_cor: string | null;
  imagens: ImagemRow[];
};


const TODAS_COLECOES = "__todas__";
const SEM_COLECAO = "__sem__";

export function NovoProdutoClient({
  categorias,
  catalogos,
  insumos,
  companyName,
  displayName,
  draft,
  produtoInicial = null,
  custoInicial = 0,
  temCustoInicial = false,
}: {
  categorias: CategoriaRow[];
  catalogos: CatalogoRow[];
  insumos: InsumoRow[];
  companyName: string;
  displayName: string;
  draft: DraftProduto;
  produtoInicial?: ProdutoInicial | null;
  custoInicial?: number;
  temCustoInicial?: boolean;
}) {
  const router = useRouter();
  const modoEdicao = Boolean(produtoInicial);

  const [slug, setSlug] = useState(draft.slug);
  const [nome, setNome] = useState(produtoInicial?.nome ?? "");
  const [categoriaId, setCategoriaId] = useState<string | "">(
    produtoInicial?.categoria_id ?? "",
  );
  const [categoriasAbertas, setCategoriasAbertas] = useState(false);
  /* Colecao NAO e campo do produto: ela vive na categoria (categorias.catalogo_id).
     Este seletor filtra as categorias em cascata — assim o produto nunca fica
     numa colecao que contradiz a categoria dele. Ao abrir para editar, comeca
     na colecao da categoria que ja esta escolhida. */
  const [filtroColecao, setFiltroColecao] = useState<string>(() => {
    const categoria = categorias.find((c) => c.id === produtoInicial?.categoria_id);
    return categoria?.catalogo_id ?? TODAS_COLECOES;
  });
  const [colecoesAbertas, setColecoesAbertas] = useState(false);
  const [preco, setPreco] = useState(
    produtoInicial?.preco == null
      ? ""
      : String(produtoInicial.preco).replace(".", ","),
  );
  const [precoLabel, setPrecoLabel] = useState(produtoInicial?.preco_label ?? "");
  const [serve, setServe] = useState(produtoInicial?.serve ?? "");
  const [descricao, setDescricao] = useState(produtoInicial?.observacao ?? "");
  const [imagens, setImagens] = useState<ImagemRow[]>(
    (produtoInicial?.imagens ?? [])
      .slice()
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
  );
  const [rascunho, setRascunho] = useState(draft.rascunho);
  const [salvando, setSalvando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [custoSalvo, setCustoSalvo] = useState(custoInicial);
  const [temCusto, setTemCusto] = useState(temCustoInicial);

  const categoriaSelecionada = categorias.find((categoria) => categoria.id === categoriaId);

  const categoriasOrdenadas = useMemo(() => {
    const ordemCatalogos = new Map(
      catalogos
        .slice()
        .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
        .map((catalogo, index) => [catalogo.id, index]),
    );

    return categorias.slice().sort((a, b) => {
      const ordemA = a.catalogo_id ? (ordemCatalogos.get(a.catalogo_id) ?? 999) : 999;
      const ordemB = b.catalogo_id ? (ordemCatalogos.get(b.catalogo_id) ?? 999) : 999;
      if (ordemA !== ordemB) return ordemA - ordemB;
      return (a.ordem ?? 0) - (b.ordem ?? 0);
    });
  }, [categorias, catalogos]);

  const categoriasVisiveis = useMemo(() => {
    if (filtroColecao === TODAS_COLECOES) return categoriasOrdenadas;
    if (filtroColecao === SEM_COLECAO) return categoriasOrdenadas.filter((c) => !c.catalogo_id);
    return categoriasOrdenadas.filter((c) => c.catalogo_id === filtroColecao);
  }, [categoriasOrdenadas, filtroColecao]);


  function rotuloCategoria(categoria: CategoriaRow) {
    const colecao = catalogos.find((catalogo) => catalogo.id === categoria.catalogo_id);
    return colecao ? `${colecao.nome} · ${categoria.nome}` : categoria.nome;
  }

  async function cancelar() {
    if (cancelando) return;
    setCancelando(true);
    setErro(null);

    try {
      if (rascunho) await removerProduto({ data: { id: draft.id } });
      router.replace("/cadastros/produtos");
      router.refresh();
    } catch (e) {
      setErro(mensagemDeErro(e, "cancelar cadastro"));
      setCancelando(false);
    }
  }

  async function salvar() {
    setErro(null);
    const nomeLimpo = nome.trim();
    const valorPreco = Number(preco.replace(",", "."));

    if (!nomeLimpo) return setErro("Informe o nome do produto.");
    if (!preco.trim() || Number.isNaN(valorPreco) || valorPreco < 0) {
      return setErro("Informe um preço válido para o produto.");
    }

    setSalvando(true);
    try {
      const primeiraVez = rascunho;
      const res = await salvarProduto({
        data: {
          id: draft.id,
          nome: nomeLimpo,
          categoria_id: categoriaId || null,
          preco: valorPreco,
          preco_label: precoLabel.trim() || null,
          serve: serve.trim() || null,
          itens: asStringArray(produtoInicial?.itens),
          precos_extra: asPrecosExtra(produtoInicial?.precos_extra),
          observacao: descricao.trim() || null,
          ativo: produtoInicial?.ativo ?? true,
          ordem: produtoInicial?.ordem ?? 0,
          // Os controles de etiqueta foram removidos; preserve os dados existentes.
          badge: produtoInicial?.badge ?? null,
          badge_cor: produtoInicial?.badge_cor ?? null,
        },
      });

      setSlug(res.slug || slugFromNome(nomeLimpo));
      setRascunho(false);
      toast.success(
        primeiraVez
          ? `Produto ${draft.sku} cadastrado com sucesso.`
          : `Produto ${draft.sku} atualizado com sucesso.`,
      );
      router.replace("/cadastros/produtos");
      router.refresh();
    } catch (e) {
      setErro(mensagemDeErro(e, "salvar produto"));
    } finally {
      setSalvando(false);
    }
  }


  async function adicionarFoto(file: File) {
    setEnviando(true);
    setErro(null);

    try {
      const base64 = await fileToBase64(file);
      const nova = await enviarImagem({
        data: {
          produtoId: draft.id,
          slug: slug || `produto-${draft.sku}`,
          base64,
          contentType: file.type,
        },
      });
      setImagens((prev) => [...prev, nova as ImagemRow]);
      toast.success("Foto adicionada.");
    } catch (e) {
      setErro(mensagemDeErro(e, "enviar foto"));
    } finally {
      setEnviando(false);
    }
  }

  async function excluirFoto(img: ImagemRow) {
    try {
      await removerImagem({ data: { id: img.id, url: img.url } });
      setImagens((prev) => prev.filter((item) => item.id !== img.id));
      toast.success("Foto removida.");
    } catch (e) {
      setErro(mensagemDeErro(e, "remover foto"));
    }
  }

  async function moverFoto(index: number, direcao: -1 | 1) {
    const destino = index + direcao;
    if (destino < 0 || destino >= imagens.length) return;

    const nova = imagens.slice();
    [nova[index], nova[destino]] = [nova[destino], nova[index]];
    setImagens(nova);

    try {
      await reordenarImagens({ data: { ids: nova.map((imagem) => imagem.id) } });
    } catch (e) {
      setErro(mensagemDeErro(e, "reordenar fotos"));
    }
  }

  return (
    <div className="min-h-screen bg-[var(--admin-bg)] text-foreground xl:h-dvh xl:min-h-0 xl:overflow-hidden">
      <Toaster position="bottom-right" richColors />

      <header className="border-b border-[var(--admin-border)] bg-white">
        <div className="mx-auto flex h-[68px] max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 xl:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <img
              src="/flua-logo.webp"
              alt="Flua Gestão"
              className="h-9 w-[104px] shrink-0 object-contain object-left"
            />
            <span className="hidden h-7 w-px bg-[var(--admin-border)] sm:block" />
            <button
              type="button"
              onClick={cancelar}
              disabled={cancelando}
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--admin-ink-soft)] transition-colors hover:text-[var(--terracotta)] disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar aos produtos
            </button>
          </div>

          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-[var(--admin-ink)]">{companyName}</p>
            <p className="text-xs text-[var(--admin-muted)]">{displayName}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-3 sm:px-6 xl:h-[calc(100dvh-68px)] xl:overflow-hidden xl:px-8 xl:py-3">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--terracotta)]">
              Cadastros · Produtos
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              {modoEdicao ? "Editar produto" : "Novo produto"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {modoEdicao
                ? "Altere as informações do produto e salve as mudanças."
                : "O código já é reservado ao abrir o cadastro e permanece definitivo."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={cancelar} disabled={cancelando || salvando}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando || cancelando || !nome.trim()}>
              {salvando && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {modoEdicao || !rascunho ? "Salvar alterações" : "Salvar produto"}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 xl:h-[calc(100%-82px)] xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="rounded-3xl border border-[var(--admin-border)] bg-white p-5 shadow-[0_10px_35px_rgba(112,61,58,0.04)] xl:overflow-hidden">
            <div className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                <Campo label="Nome" obrigatorio>
                  <Input
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Nome do produto"
                    className="h-11"
                  />
                </Campo>

                <Campo label="Código do produto">
                  <Input
                    value={draft.sku}
                    readOnly
                    aria-readonly="true"
                    className="h-11 bg-[var(--cream-soft)] font-semibold tabular-nums text-[var(--terracotta)]"
                  />
                </Campo>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Campo label="Coleção">
                  <DropdownCampo
                    aberto={colecoesAbertas}
                    onToggle={() => setColecoesAbertas((v) => !v)}
                    texto={
                      filtroColecao === TODAS_COLECOES
                        ? "Todas as coleções"
                        : filtroColecao === SEM_COLECAO
                          ? "Sem coleção"
                          : (catalogos.find((c) => c.id === filtroColecao)?.nome ?? "Todas as coleções")
                    }
                    vazio={filtroColecao === TODAS_COLECOES}
                  >
                    {[
                      { id: TODAS_COLECOES, nome: "Todas as coleções" },
                      ...catalogos
                        .slice()
                        .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
                        .map((c) => ({ id: c.id, nome: c.nome })),
                      { id: SEM_COLECAO, nome: "Sem coleção" },
                    ].map((opcao) => (
                      <button
                        key={opcao.id}
                        type="button"
                        onClick={() => {
                          setFiltroColecao(opcao.id);
                          setColecoesAbertas(false);
                          // A categoria escolhida pode nao pertencer a colecao
                          // nova. Manter seria deixar os dois campos dizendo
                          // coisas diferentes na tela.
                          const atual = categorias.find((c) => c.id === categoriaId);
                          const cabe =
                            !atual ||
                            opcao.id === TODAS_COLECOES ||
                            (opcao.id === SEM_COLECAO ? !atual.catalogo_id : atual.catalogo_id === opcao.id);
                          if (!cabe) setCategoriaId("");
                        }}
                        className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-[var(--cream-soft)]"
                      >
                        <span className="truncate">{opcao.nome}</span>
                        {opcao.id === filtroColecao && (
                          <Check className="h-4 w-4 shrink-0 text-[var(--terracotta)]" />
                        )}
                      </button>
                    ))}
                  </DropdownCampo>
                </Campo>

                <Campo label="Categoria">
                  <DropdownCampo
                    aberto={categoriasAbertas}
                    onToggle={() => {
                      setCategoriasAbertas((v) => !v);
                    }}
                    texto={categoriaSelecionada ? rotuloCategoria(categoriaSelecionada) : "Selecionar categoria"}
                    vazio={!categoriaSelecionada}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setCategoriaId("");
                        setCategoriasAbertas(false);
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-[var(--cream-soft)]"
                    >
                      Sem categoria
                      {!categoriaId && <Check className="h-4 w-4 text-[var(--terracotta)]" />}
                    </button>
                    {categoriasVisiveis.map((categoria) => (
                      <button
                        key={categoria.id}
                        type="button"
                        onClick={() => {
                          setCategoriaId(categoria.id);
                          setCategoriasAbertas(false);
                        }}
                        className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-[var(--cream-soft)]"
                      >
                        <span className="truncate">{rotuloCategoria(categoria)}</span>
                        {categoria.id === categoriaId && (
                          <Check className="h-4 w-4 shrink-0 text-[var(--terracotta)]" />
                        )}
                      </button>
                    ))}
                  </DropdownCampo>
                </Campo>
              </div>

              <div className={cn("grid gap-3", temCusto ? "md:grid-cols-3" : "md:grid-cols-2")}>
                <Campo label="Serve (ex.: Ideal para 2 pessoas)">
                  <Input
                    value={serve}
                    onChange={(e) => setServe(e.target.value)}
                    placeholder="Ex.: 2 pessoas"
                    className="h-11"
                  />
                </Campo>

                <Campo label="Preço (R$)" obrigatorio>
                  <Input
                    required
                    inputMode="decimal"
                    value={preco}
                    onChange={(e) => setPreco(e.target.value)}
                    className="h-11"
                  />
                </Campo>

                {temCusto && (
                  <Campo label="Custo (R$)">
                    <Input
                      value={custoSalvo.toFixed(2).replace(".", ",")}
                      readOnly
                      className="h-11 bg-[var(--cream-soft)] font-semibold text-[var(--wine)]"
                    />
                  </Campo>
                )}
              </div>

              <Campo label="Rótulo de preço (opcional)">
                <Input
                  value={precoLabel}
                  onChange={(e) => setPrecoLabel(e.target.value)}
                  placeholder="a partir de / sob consulta"
                  className="h-11"
                />
              </Campo>

              <Campo label="Descrição do produto">
                <Textarea
                  rows={4}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva o produto, diferenciais, tamanho, apresentação ou outras informações importantes."
                  className="min-h-[108px] resize-none xl:min-h-[92px]"
                />
              </Campo>

              {/* O custo saiu daqui: ele vive na tela de Custo, que lista todos
                  os produtos e mostra quem ainda esta sem. Montar custo e um
                  trabalho em lote; cadastro de produto e um trabalho unitario. */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--cream-soft)] px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Custo do produto</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Os insumos e quantidades agora ficam na tela de Margem, junto com o quanto sobra.
                  </p>
                </div>
                <Button type="button" variant="outline" asChild>
                  <a href="/margem">
                    <Calculator className="mr-1.5 h-4 w-4" />
                    Abrir Margem
                  </a>
                </Button>
              </div>

              {erro && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-destructive">{erro}</p>
              )}
            </div>
          </section>

          <aside className="self-start rounded-3xl border border-[var(--admin-border)] bg-white p-5 shadow-[0_10px_35px_rgba(112,61,58,0.04)] xl:h-full xl:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <h2 className="text-base font-semibold">Fotos do produto</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Você já pode adicionar as fotos antes de salvar.
            </p>
            <p className="mt-1 text-xs font-medium text-[var(--terracotta)]">
              Recomendado: 500 × 500 px, formato quadrado.
            </p>

            <div className="mt-4 grid max-h-[420px] grid-cols-2 gap-3 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {imagens.map((img, index) => (
                <div
                  key={img.id}
                  className="group relative aspect-square overflow-hidden rounded-2xl bg-[var(--cream-deep)]"
                >
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => excluirFoto(img)}
                    className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                    aria-label="Remover foto"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/45 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => moverFoto(index, -1)}
                      className="p-2 text-white"
                      aria-label="Mover foto para a esquerda"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moverFoto(index, 1)}
                      className="p-2 text-white"
                      aria-label="Mover foto para a direita"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              <label
                className={cn(
                  "flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--bronze)]/50 text-[var(--bronze)] transition hover:bg-[var(--cream-soft)]",
                  enviando && "pointer-events-none opacity-60",
                )}
              >
                {enviando ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-6 w-6" />
                    <span className="text-xs font-medium">Adicionar foto</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) adicionarFoto(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </aside>
        </div>
      </main>

    </div>
  );
}

function Campo({
  label,
  obrigatorio = false,
  children,
}: {
  label: string;
  obrigatorio?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">
        {label}
        {obrigatorio && <span className="ml-1 text-[var(--terracotta)]">*</span>}
      </Label>
      {children}
    </div>
  );
}

function DropdownCampo({
  aberto,
  onToggle,
  texto,
  vazio,
  children,
}: {
  aberto: boolean;
  onToggle: () => void;
  texto: string;
  vazio?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-input bg-background px-3.5 text-left text-sm transition-colors hover:border-[var(--terracotta)]"
      >
        <span className={cn("flex min-w-0 items-center gap-2 truncate", vazio && "text-muted-foreground")}>
          <span className="truncate">{texto}</span>
        </span>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--cream)] text-[var(--terracotta)]">
          <Plus className={cn("h-4 w-4 transition-transform", aberto && "rotate-45")} />
        </span>
      </button>

      {aberto && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-60 overflow-y-auto rounded-2xl border border-[var(--admin-border)] bg-white p-2 shadow-[0_20px_50px_rgba(84,52,48,0.16)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {children}
        </div>
      )}
    </div>
  );
}
