"use client";

import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast, Toaster } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  enviarImagem,
  removerImagem,
  reordenarImagens,
  salvarProduto,
} from "@/lib/admin";
import { mensagemDeErro } from "@/lib/erros";
import { cn } from "@/lib/utils";
import {
  fileToBase64,
  slugFromNome,
  type CatalogoRow,
  type CategoriaRow,
  type EtiquetaRow,
  type ImagemRow,
} from "@/components/admin/tipos";

export function NovoProdutoClient({
  categorias,
  catalogos,
  etiquetas,
  companyName,
  displayName,
}: {
  categorias: CategoriaRow[];
  catalogos: CatalogoRow[];
  etiquetas: EtiquetaRow[];
  companyName: string;
  displayName: string;
}) {
  const router = useRouter();
  const [id, setId] = useState<string | undefined>();
  const [slug, setSlug] = useState("");
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [categoriaId, setCategoriaId] = useState<string | "">("");
  const [categoriasAbertas, setCategoriasAbertas] = useState(false);
  const [etiquetasAbertas, setEtiquetasAbertas] = useState(false);
  const [preco, setPreco] = useState("");
  const [precoLabel, setPrecoLabel] = useState("");
  const [serve, setServe] = useState("");
  const [descricao, setDescricao] = useState("");
  const [badge, setBadge] = useState("");
  const [badgeCor, setBadgeCor] = useState("");
  const [imagens, setImagens] = useState<ImagemRow[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const categoriaSelecionada = categorias.find((categoria) => categoria.id === categoriaId);
  const etiquetaSelecionada = etiquetas.find((etiqueta) => etiqueta.nome === badge);

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

  const etiquetasDisponiveis = useMemo(
    () =>
      etiquetas
        .filter((etiqueta) => etiqueta.ativo)
        .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
    [etiquetas],
  );

  function rotuloCategoria(categoria: CategoriaRow) {
    const colecao = catalogos.find((catalogo) => catalogo.id === categoria.catalogo_id);
    return colecao ? `${colecao.nome} · ${categoria.nome}` : categoria.nome;
  }

  async function salvar() {
    setErro(null);
    const nomeLimpo = nome.trim();
    const valorPreco = Number(preco.replace(",", "."));

    if (!nomeLimpo) {
      setErro("Informe o nome do produto.");
      return;
    }
    if (!preco.trim() || Number.isNaN(valorPreco) || valorPreco < 0) {
      setErro("Informe um preço válido para o produto.");
      return;
    }

    setSalvando(true);
    try {
      const res = await salvarProduto({
        data: {
          id,
          nome: nomeLimpo,
          categoria_id: categoriaId || null,
          preco: valorPreco,
          preco_label: precoLabel.trim() || null,
          serve: serve.trim() || null,
          itens: [],
          precos_extra: [],
          observacao: descricao.trim() || null,
          ativo: true,
          ordem: 0,
          badge: badge.trim() || null,
          badge_cor: badge.trim() ? badgeCor || null : null,
        },
      });

      const primeiraVez = !id;
      setId(res.id);
      setSlug(res.slug || slugFromNome(nomeLimpo));
      setCodigo(res.sku);
      toast.success(
        primeiraVez
          ? `Produto ${res.sku} cadastrado com sucesso.`
          : `Produto ${res.sku} atualizado com sucesso.`,
      );
    } catch (e) {
      setErro(mensagemDeErro(e, "salvar produto"));
    } finally {
      setSalvando(false);
    }
  }

  async function adicionarFoto(file: File) {
    if (!id) {
      setErro("Salve o produto primeiro para adicionar fotos.");
      return;
    }

    setEnviando(true);
    setErro(null);
    try {
      const base64 = await fileToBase64(file);
      const nova = await enviarImagem({
        data: {
          produtoId: id,
          slug: slug || slugFromNome(nome),
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
    await reordenarImagens({ data: { ids: nova.map((imagem) => imagem.id) } });
  }

  return (
    <div className="min-h-screen bg-[var(--admin-bg)] text-foreground">
      <Toaster position="bottom-right" richColors />

      <header className="border-b border-[var(--admin-border)] bg-white">
        <div className="mx-auto flex h-[74px] max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 xl:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <img
              src="/flua-logo.webp"
              alt="Flua Gestão"
              className="h-10 w-[112px] shrink-0 object-contain object-left"
            />
            <span className="hidden h-7 w-px bg-[var(--admin-border)] sm:block" />
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--admin-ink-soft)] transition-colors hover:text-[var(--terracotta)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar aos produtos
            </button>
          </div>

          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-[var(--admin-ink)]">{companyName}</p>
            <p className="text-xs text-[var(--admin-muted)]">{displayName}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 xl:px-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--terracotta)]">
              Cadastros · Produtos
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Novo produto
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Preencha os dados do produto. O código é sequencial e definitivo.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando || !nome.trim()}>
              {salvando && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {id ? "Salvar alterações" : "Salvar produto"}
            </Button>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-3xl border border-[var(--admin-border)] bg-white p-5 shadow-[0_10px_35px_rgba(112,61,58,0.04)] sm:p-6">
            <div className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
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
                  <div>
                    <Input
                      value={codigo || "Gerado ao salvar"}
                      readOnly
                      aria-readonly="true"
                      className={cn(
                        "h-11 bg-[var(--cream-soft)] font-semibold tabular-nums",
                        codigo
                          ? "text-[var(--terracotta)]"
                          : "text-muted-foreground",
                      )}
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Sequencial e não pode ser alterado depois do cadastro.
                    </p>
                  </div>
                </Campo>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Campo label="Categoria">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setCategoriasAbertas((aberta) => !aberta);
                        setEtiquetasAbertas(false);
                      }}
                      className="flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-input bg-background px-3.5 text-left text-sm transition-colors hover:border-[var(--terracotta)]"
                    >
                      <span className={cn("truncate", !categoriaSelecionada && "text-muted-foreground")}>
                        {categoriaSelecionada
                          ? rotuloCategoria(categoriaSelecionada)
                          : "Selecionar categoria"}
                      </span>
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--cream)] text-[var(--terracotta)]">
                        <Plus
                          className={cn(
                            "h-4 w-4 transition-transform",
                            categoriasAbertas && "rotate-45",
                          )}
                        />
                      </span>
                    </button>

                    {categoriasAbertas && (
                      <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-[var(--admin-border)] bg-white p-1.5 shadow-[var(--shadow-lift)]">
                        <button
                          type="button"
                          onClick={() => {
                            setCategoriaId("");
                            setCategoriasAbertas(false);
                          }}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-[var(--cream-soft)]"
                        >
                          Sem categoria
                          {!categoriaId && <Check className="h-4 w-4 text-[var(--terracotta)]" />}
                        </button>

                        {categoriasOrdenadas.map((categoria) => (
                          <button
                            key={categoria.id}
                            type="button"
                            onClick={() => {
                              setCategoriaId(categoria.id);
                              setCategoriasAbertas(false);
                            }}
                            className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--cream-soft)]"
                          >
                            <span className="min-w-0 truncate">
                              {rotuloCategoria(categoria)}
                              {!categoria.ativa && (
                                <span className="ml-1 text-xs text-muted-foreground">(oculta)</span>
                              )}
                            </span>
                            {categoria.id === categoriaId && (
                              <Check className="h-4 w-4 shrink-0 text-[var(--terracotta)]" />
                            )}
                          </button>
                        ))}

                        {categoriasOrdenadas.length === 0 && (
                          <p className="px-3 py-3 text-xs text-muted-foreground">
                            Nenhuma categoria cadastrada ainda.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </Campo>

                <Campo label="Etiqueta">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setEtiquetasAbertas((aberta) => !aberta);
                        setCategoriasAbertas(false);
                      }}
                      className="flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-input bg-background px-3.5 text-left text-sm transition-colors hover:border-[var(--terracotta)]"
                    >
                      <span className={cn("flex min-w-0 items-center gap-2 truncate", !badge && "text-muted-foreground")}>
                        {badge && (
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{
                              backgroundColor:
                                etiquetaSelecionada?.cor || badgeCor || "#B8893B",
                            }}
                          />
                        )}
                        <span className="truncate">{badge || "Selecionar etiqueta"}</span>
                      </span>
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--cream)] text-[var(--terracotta)]">
                        <Plus
                          className={cn(
                            "h-4 w-4 transition-transform",
                            etiquetasAbertas && "rotate-45",
                          )}
                        />
                      </span>
                    </button>

                    {etiquetasAbertas && (
                      <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-[var(--admin-border)] bg-white p-1.5 shadow-[var(--shadow-lift)]">
                        <button
                          type="button"
                          onClick={() => {
                            setBadge("");
                            setBadgeCor("");
                            setEtiquetasAbertas(false);
                          }}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-[var(--cream-soft)]"
                        >
                          Sem etiqueta
                          {!badge && <Check className="h-4 w-4 text-[var(--terracotta)]" />}
                        </button>

                        {etiquetasDisponiveis.map((etiqueta) => (
                          <button
                            key={etiqueta.id}
                            type="button"
                            onClick={() => {
                              setBadge(etiqueta.nome);
                              setBadgeCor(etiqueta.cor || "#B8893B");
                              setEtiquetasAbertas(false);
                            }}
                            className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--cream-soft)]"
                          >
                            <span className="flex min-w-0 items-center gap-2 truncate">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: etiqueta.cor || "#B8893B" }}
                              />
                              <span className="truncate">{etiqueta.nome}</span>
                            </span>
                            {badge === etiqueta.nome && (
                              <Check className="h-4 w-4 shrink-0 text-[var(--terracotta)]" />
                            )}
                          </button>
                        ))}

                        {etiquetasDisponiveis.length === 0 && (
                          <p className="px-3 py-3 text-xs text-muted-foreground">
                            Nenhuma etiqueta cadastrada ainda.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </Campo>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
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
                    placeholder="145,00"
                    className="h-11"
                  />
                </Campo>
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
                  rows={7}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva o produto, diferenciais, tamanho, apresentação ou outras informações importantes."
                  className="min-h-[170px] resize-none"
                />
              </Campo>

              {erro && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-destructive">
                  {erro}
                </p>
              )}
            </div>
          </section>

          <aside className="self-start rounded-3xl border border-[var(--admin-border)] bg-white p-5 shadow-[0_10px_35px_rgba(112,61,58,0.04)] sm:p-6 xl:sticky xl:top-6">
            <div className="mb-4">
              <h2 className="text-base font-semibold">Fotos do produto</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {id
                  ? "Adicione e organize as imagens do produto."
                  : "Salve o produto primeiro para liberar o envio de fotos."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-2">
              {imagens.map((img, index) => (
                <div
                  key={img.id}
                  className="group relative aspect-square overflow-hidden rounded-2xl bg-[var(--cream-deep)]"
                >
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => excluirFoto(img)}
                    className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Remover foto"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
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

              {id && (
                <label
                  className={cn(
                    "flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--bronze)]/50 text-[var(--bronze)] transition-colors hover:bg-[var(--cream-soft)]",
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
              )}
            </div>

            {!id && (
              <div className="mt-4 rounded-2xl bg-[var(--cream-soft)] px-4 py-3 text-xs text-muted-foreground">
                Depois do primeiro salvamento, esta área será liberada sem sair da tela.
              </div>
            )}

            {codigo && (
              <div className="mt-4 rounded-2xl border border-[var(--admin-border)] bg-[var(--cream-soft)] px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Código definitivo
                </p>
                <p className="mt-1 text-xl font-bold tabular-nums text-[var(--terracotta)]">
                  {codigo}
                </p>
              </div>
            )}
          </aside>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Voltar
          </Button>
          <Button onClick={salvar} disabled={salvando || !nome.trim()}>
            {salvando && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {id ? "Salvar alterações" : "Salvar produto"}
          </Button>
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
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {obrigatorio && <span className="ml-1 text-[var(--terracotta)]">*</span>}
      </Label>
      {children}
    </div>
  );
}
