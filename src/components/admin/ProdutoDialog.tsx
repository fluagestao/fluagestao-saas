import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";

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
  BADGES_PRESET,
  CORES_DESTAQUE,
  asPrecosExtra,
  asStringArray,
  fileToBase64,
  slugFromNome,
  type CatalogoRow,
  type CategoriaRow,
  type ImagemRow,
  type ProdutoRow,
} from "./tipos";
import { useConfirmar } from "./shell";

// ---------- dialog de edição de produto ----------
export function ProdutoDialog({
  produto,
  categorias,
  catalogos,
  onClose,
  onSaved,
}: {
  produto: ProdutoRow | null;
  categorias: CategoriaRow[];
  catalogos: CatalogoRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [id, setId] = useState<string | undefined>(produto?.id);
  const [nome, setNome] = useState(produto?.nome ?? "");
  const [categoriaId, setCategoriaId] = useState<string | "">(produto?.categoria_id ?? "");
  const [preco, setPreco] = useState<string>(produto?.preco != null ? String(produto.preco) : "");
  const [precoLabel, setPrecoLabel] = useState(produto?.preco_label ?? "");
  const [serve, setServe] = useState(produto?.serve ?? "");
  const [itens, setItens] = useState(asStringArray(produto?.itens).join("\n"));
  const [precosExtra, setPrecosExtra] = useState(asPrecosExtra(produto?.precos_extra));
  const [observacao, setObservacao] = useState(produto?.observacao ?? "");
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

  async function salvar() {
    setErro(null);
    setSalvando(true);
    try {
      const res = await salvarProduto({
        data: {
          id,
          nome: nome.trim(),
          categoria_id: categoriaId || null,
          preco: preco.trim() === "" ? null : Number(preco.replace(",", ".")),
          preco_label: precoLabel.trim() || null,
          serve: serve.trim() || null,
          itens: itens
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          precos_extra: precosExtra.filter((p) => p.label.trim() && p.valor >= 0),
          observacao: observacao.trim() || null,
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
    }
    setSalvando(false);
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
    }
    setEnviando(false);
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
          <Campo label="Nome">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </Campo>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Categoria">
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">— sem categoria —</option>
                {catalogos.length === 0
                  ? categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                        {!c.ativa ? " (oculta)" : ""}
                      </option>
                    ))
                  : catalogos.map((cl) => {
                      const subs = categorias.filter((c) => c.catalogo_id === cl.id);
                      if (subs.length === 0) return null;
                      return (
                        <optgroup key={cl.id} label={cl.nome}>
                          {subs.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nome}
                              {!c.ativa ? " (oculta)" : ""}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                {catalogos.length > 0 &&
                  categorias.some((c) => !catalogos.some((cl) => cl.id === c.catalogo_id)) && (
                    <optgroup label="Sem catálogo">
                      {categorias
                        .filter((c) => !catalogos.some((cl) => cl.id === c.catalogo_id))
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome}
                            {!c.ativa ? " (oculta)" : ""}
                          </option>
                        ))}
                    </optgroup>
                  )}
              </select>
            </Campo>
            <Campo label="Serve (ex.: Ideal para 2 pessoas)">
              <Input value={serve} onChange={(e) => setServe(e.target.value)} />
            </Campo>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Preço (R$)">
              <Input
                inputMode="decimal"
                placeholder="145.00"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
              />
            </Campo>
            <Campo label="Rótulo de preço (opcional)">
              <Input
                placeholder="a partir de / sob consulta"
                value={precoLabel}
                onChange={(e) => setPrecoLabel(e.target.value)}
              />
            </Campo>
          </div>

          {/* Ordem: só ao editar. Produto novo entra no fim da categoria. */}
          {produto ? (
            <Campo label="Ordem (posição na categoria)">
              <Input
                inputMode="numeric"
                value={ordem}
                onChange={(e) => setOrdem(e.target.value)}
                className="max-w-[160px]"
              />
            </Campo>
          ) : (
            <p className="text-xs text-muted-foreground">
              O produto novo entra no fim da categoria. Depois você pode ajustar a posição editando.
            </p>
          )}

          <VariacoesEditor precos={precosExtra} onChange={setPrecosExtra} />

          <Campo label="Itens da caixa (um por linha)">
            <Textarea
              rows={4}
              value={itens}
              onChange={(e) => setItens(e.target.value)}
              placeholder={"Croissant\nSuco natural 300ml\nPão de queijo"}
            />
          </Campo>

          <Campo label="Observação (opcional)">
            <Textarea rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </Campo>

          <label className="flex items-center gap-2 text-sm">
            <Switch checked={ativo} onCheckedChange={setAtivo} />
            Produto visível no site
          </label>

          {/* etiqueta de destaque (badge) */}
          <div className="rounded-2xl border border-[var(--cream-deep)] p-4">
            <p className="text-sm font-medium text-foreground">Etiqueta de destaque</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Aparece sobre a foto no site (ex.: Mais vendido). Deixe vazio para nenhuma.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {BADGES_PRESET.map((b) => (
                <button
                  key={b.nome}
                  type="button"
                  onClick={() => {
                    setBadge(b.nome);
                    setBadgeCor(b.cor);
                  }}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold text-white transition-transform hover:scale-105",
                    badge === b.nome && "ring-2 ring-foreground ring-offset-1",
                  )}
                  style={{ backgroundColor: b.cor }}
                >
                  {b.nome}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setBadge("");
                  setBadgeCor("");
                }}
                className={cn(
                  "rounded-full border border-[var(--cream-deep)] px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-[var(--cream-soft)]",
                  !badge.trim() && "ring-2 ring-foreground ring-offset-1",
                )}
              >
                Nenhuma
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Input
                placeholder="Texto personalizado da etiqueta"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                className="h-9 min-w-[200px] flex-1 text-sm"
              />
              <div className="flex items-center gap-1.5">
                {CORES_DESTAQUE.filter((c) => c.valor).map((cor) => (
                  <button
                    key={cor.nome}
                    type="button"
                    onClick={() => setBadgeCor(cor.valor)}
                    title={cor.nome}
                    aria-label={`Cor ${cor.nome}`}
                    className={cn(
                      "h-6 w-6 rounded-full border transition-transform hover:scale-110",
                      (badgeCor || "") === cor.valor
                        ? "ring-2 ring-foreground ring-offset-1"
                        : "border-[var(--cream-deep)]",
                    )}
                    style={{ backgroundColor: cor.valor }}
                  />
                ))}
              </div>
            </div>
            {badge.trim() && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Prévia:</span>
                <span
                  className="inline-flex items-center rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white"
                  style={{ backgroundColor: badgeCor || "#B8893B" }}
                >
                  {badge.trim()}
                </span>
              </div>
            )}
          </div>

          {/* fotos */}
          <div className="rounded-2xl border border-[var(--cream-deep)] p-4">
            <p className="text-sm font-medium text-foreground">Fotos</p>
            {!id && (
              <p className="mt-1 text-xs text-muted-foreground">
                Salve o produto para liberar o envio de fotos.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-3">
              {imagens.map((img, i) => (
                <div
                  key={img.id}
                  className="group relative h-24 w-24 overflow-hidden rounded-xl bg-[var(--cream-deep)]"
                >
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
                    <button type="button" onClick={() => mover(i, -1)} className="p-1 text-white">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => mover(i, 1)} className="p-1 text-white">
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
                  {enviando ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      <span className="text-[11px]">Adicionar</span>
                    </>
                  )}
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

          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={salvar} disabled={salvando || !nome.trim()}>
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- editor de variações de preço ----------
function VariacoesEditor({
  precos,
  onChange,
}: {
  precos: { label: string; valor: number }[];
  onChange: (v: { label: string; valor: number }[]) => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--cream-deep)] p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Variações de tamanho/preço (opcional)</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...precos, { label: "", valor: 0 }])}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Variação
        </Button>
      </div>
      {precos.length > 0 && (
        <div className="mt-3 space-y-2">
          {precos.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                placeholder="Ex.: Pequena"
                value={p.label}
                onChange={(e) => {
                  const n = precos.slice();
                  n[i] = { ...n[i], label: e.target.value };
                  onChange(n);
                }}
              />
              <Input
                inputMode="decimal"
                placeholder="valor"
                className="max-w-[120px]"
                value={p.valor ? String(p.valor) : ""}
                onChange={(e) => {
                  const n = precos.slice();
                  n[i] = { ...n[i], valor: Number(e.target.value.replace(",", ".")) || 0 };
                  onChange(n);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onChange(precos.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
