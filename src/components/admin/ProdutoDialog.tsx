import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Loader2, Plus, Upload, X } from "lucide-react";

import {
  enviarImagem,
  removerImagem,
  reordenarImagens,
  salvarProduto,
} from "@/lib/admin";
import { cn } from "@/lib/utils";
import { mensagemDeErro } from "@/lib/erros";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  asPrecosExtra,
  asStringArray,
  fileToBase64,
  slugFromNome,
  type CatalogoRow,
  type CategoriaRow,
  type EtiquetaRow,
  type ImagemRow,
  type ProdutoRow,
} from "./tipos";

export function ProdutoDialog({
  produto,
  categorias,
  catalogos,
  etiquetas,
  onClose,
  onSaved,
}: {
  produto: ProdutoRow | null;
  categorias: CategoriaRow[];
  catalogos: CatalogoRow[];
  etiquetas: EtiquetaRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [id, setId] = useState<string | undefined>(produto?.id);
  const [nome, setNome] = useState(produto?.nome ?? "");
  const [categoriaId, setCategoriaId] = useState<string | "">(produto?.categoria_id ?? "");
  const [categoriasAbertas, setCategoriasAbertas] = useState(false);
  const [etiquetasAbertas, setEtiquetasAbertas] = useState(false);
  const [preco, setPreco] = useState<string>(produto?.preco != null ? String(produto.preco) : "");
  const [precoLabel, setPrecoLabel] = useState(produto?.preco_label ?? "");
  const [serve, setServe] = useState(produto?.serve ?? "");
  const [itens, setItens] = useState(asStringArray(produto?.itens).join("\n"));
  const [precosExtra] = useState(asPrecosExtra(produto?.precos_extra));
  const [descricao, setDescricao] = useState(produto?.observacao ?? "");
  const [ativo, setAtivo] = useState(produto?.ativo ?? true);
  const [ordem, setOrdem] = useState<string>(String(produto?.ordem ?? 0));
  const [badge, setBadge] = useState(produto?.badge ?? "");
  const [badgeCor, setBadgeCor] = useState(produto?.badge_cor ?? "");
  const [imagens, setImagens] = useState<ImagemRow[]>(
    (produto?.produto_imagens ?? []).slice().sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
  );
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const slugAtual = produto?.slug ?? slugFromNome(nome);
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
    () => etiquetas.filter((etiqueta) => etiqueta.ativo).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
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
    const listaItens = itens
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!nomeLimpo) {
      setErro("Informe o nome do produto.");
      return;
    }
    if (!preco.trim() || Number.isNaN(valorPreco) || valorPreco < 0) {
      setErro("Informe um preço válido para o produto.");
      return;
    }
    if (listaItens.length === 0) {
      setErro("Informe pelo menos um item na composição do produto.");
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
          itens: listaItens,
          precos_extra: precosExtra.filter((p) => p.label.trim() && p.valor >= 0),
          observacao: descricao.trim() || null,
          ativo,
          ordem: Number(ordem) || 0,
          badge: badge.trim() || null,
          badge_cor: badge.trim() ? badgeCor || null : null,
        },
      });
      setId(res.id);
      onSaved();
    } catch (e) {
      setErro(mensagemDeErro(e, "salvar"));
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
        data: { produtoId: id, slug: slugAtual, base64, contentType: file.type },
      });
      setImagens((prev) => [...prev, nova as ImagemRow]);
      onSaved();
    } catch (e) {
      setErro(mensagemDeErro(e, "enviar foto"));
    } finally {
      setEnviando(false);
    }
  }

  async function excluirFoto(img: ImagemRow) {
    await removerImagem({ data: { id: img.id, url: img.url } });
    setImagens((prev) => prev.filter((i) => i.id !== img.id));
    onSaved();
  }

  async function mover(idx: number, dir: -1 | 1) {
    const alvo = idx + dir;
    if (alvo < 0 || alvo >= imagens.length) return;
    const nova = imagens.slice();
    [nova[idx], nova[alvo]] = [nova[alvo], nova[idx]];
    setImagens(nova);
    await reordenarImagens({ data: { ids: nova.map((i) => i.id) } });
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold tracking-tight">
            {produto ? "Editar produto" : "Novo produto"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Campo label="Nome" obrigatorio>
            <Input required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do produto" />
          </Campo>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Categoria">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setCategoriasAbertas((aberta) => !aberta);
                    setEtiquetasAbertas(false);
                  }}
                  className="flex h-10 w-full items-center justify-between gap-3 rounded-md border border-input bg-background px-3 text-left text-sm transition-colors hover:border-[var(--terracotta)]"
                >
                  <span className={cn("truncate", !categoriaSelecionada && "text-muted-foreground")}>
                    {categoriaSelecionada ? rotuloCategoria(categoriaSelecionada) : "Selecionar categoria"}
                  </span>
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[var(--cream)] text-[var(--terracotta)]">
                    <Plus className={cn("h-4 w-4 transition-transform", categoriasAbertas && "rotate-45")} />
                  </span>
                </button>

                {categoriasAbertas && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-[var(--admin-border)] bg-white p-1.5 shadow-[var(--shadow-lift)]">
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
                          {!categoria.ativa && <span className="ml-1 text-xs text-muted-foreground">(oculta)</span>}
                        </span>
                        {categoria.id === categoriaId && <Check className="h-4 w-4 shrink-0 text-[var(--terracotta)]" />}
                      </button>
                    ))}
                    {categoriasOrdenadas.length === 0 && (
                      <p className="px-3 py-3 text-xs text-muted-foreground">Nenhuma categoria cadastrada ainda.</p>
                    )}
                  </div>
                )}
              </div>
            </Campo>

            <Campo label="Serve (ex.: Ideal para 2 pessoas)">
              <Input value={serve} onChange={(e) => setServe(e.target.value)} />
            </Campo>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Preço (R$)" obrigatorio>
              <Input required inputMode="decimal" placeholder="145,00" value={preco} onChange={(e) => setPreco(e.target.value)} />
            </Campo>
            <Campo label="Rótulo de preço (opcional)">
              <Input placeholder="a partir de / sob consulta" value={precoLabel} onChange={(e) => setPrecoLabel(e.target.value)} />
            </Campo>
          </div>

          {produto ? (
            <Campo label="Ordem (posição na categoria)">
              <Input inputMode="numeric" value={ordem} onChange={(e) => setOrdem(e.target.value)} className="max-w-[160px]" />
            </Campo>
          ) : (
            <p className="text-xs text-muted-foreground">O produto novo entra no fim da categoria. Depois você pode ajustar a posição editando.</p>
          )}

          <Campo label="Descrição do produto">
            <Textarea
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o produto, diferenciais, tamanho, apresentação ou outras informações importantes."
            />
          </Campo>

          <Campo label="Itens da caixa (um por linha)" obrigatorio>
            <Textarea
              required
              rows={5}
              value={itens}
              onChange={(e) => setItens(e.target.value)}
              placeholder={"Croissant\nSuco natural 300ml\nPão de queijo"}
            />
          </Campo>

          <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
            <Campo label="Etiqueta">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setEtiquetasAbertas((aberta) => !aberta);
                    setCategoriasAbertas(false);
                  }}
                  className="flex h-10 w-full items-center justify-between gap-3 rounded-md border border-input bg-background px-3 text-left text-sm transition-colors hover:border-[var(--terracotta)]"
                >
                  <span className={cn("flex min-w-0 items-center gap-2 truncate", !badge && "text-muted-foreground")}>
                    {badge && (
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: etiquetaSelecionada?.cor || badgeCor || "#B8893B" }}
                      />
                    )}
                    <span className="truncate">{badge || "Selecionar etiqueta"}</span>
                  </span>
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[var(--cream)] text-[var(--terracotta)]">
                    <Plus className={cn("h-4 w-4 transition-transform", etiquetasAbertas && "rotate-45")} />
                  </span>
                </button>

                {etiquetasAbertas && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-[var(--admin-border)] bg-white p-1.5 shadow-[var(--shadow-lift)]">
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
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: etiqueta.cor || "#B8893B" }} />
                          <span className="truncate">{etiqueta.nome}</span>
                        </span>
                        {badge === etiqueta.nome && <Check className="h-4 w-4 shrink-0 text-[var(--terracotta)]" />}
                      </button>
                    ))}

                    {etiquetasDisponiveis.length === 0 && (
                      <p className="px-3 py-3 text-xs text-muted-foreground">Nenhuma etiqueta cadastrada. Crie em Cadastros &gt; Etiquetas.</p>
                    )}
                  </div>
                )}
              </div>
            </Campo>

            <label className="flex h-10 items-center gap-2 text-sm">
              <Switch checked={ativo} onCheckedChange={setAtivo} />
              Produto visível no site
            </label>
          </div>

          <div className="rounded-2xl border border-[var(--cream-deep)] p-4">
            <p className="text-sm font-medium text-foreground">Fotos</p>
            {!id && <p className="mt-1 text-xs text-muted-foreground">Salve o produto para liberar o envio de fotos.</p>}
            <div className="mt-3 flex flex-wrap gap-3">
              {imagens.map((img, i) => (
                <div key={img.id} className="group relative h-24 w-24 overflow-hidden rounded-xl bg-[var(--cream-deep)]">
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => excluirFoto(img)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Remover foto"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <button type="button" onClick={() => mover(i, -1)} className="p-1 text-white" aria-label="Mover foto para a esquerda">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => mover(i, 1)} className="p-1 text-white" aria-label="Mover foto para a direita">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {id && (
                <label
                  className={cn(
                    "flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--bronze)]/50 text-[var(--bronze)] hover:bg-[var(--cream-soft)]",
                    enviando && "pointer-events-none opacity-60",
                  )}
                >
                  {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Upload className="h-5 w-5" /><span className="text-[11px]">Adicionar</span></>}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) adicionarFoto(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-destructive">{erro}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={salvar} disabled={salvando || !nome.trim()}>
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Campo({
  label,
  children,
  obrigatorio = false,
}: {
  label: string;
  children: React.ReactNode;
  obrigatorio?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {obrigatorio && <span className="ml-1 text-[var(--terracotta)]">*</span>}
      </Label>
      {children}
    </div>
  );
}
