"use client";

import { Calculator, Check, Search, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  atualizarPrecoProduto,
  carregarMargemProdutos,
  type MargemProduto,
} from "@/lib/custo";
import { mensagemDeErro } from "@/lib/erros";
import { listarInsumos, type InsumoRow } from "@/lib/insumos";
import { hojeISO, intervaloAno } from "@/lib/prazo";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/vendas";
import { ProdutoInsumosEditor, type ItemComposicaoProduto } from "./ProdutoInsumosEditor";
import { Carregando, EstadoVazio, PageHeader } from "./shell";

type Filtro = "todos" | "sem_custo";

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);
}

function paraNumero(texto: string): number {
  const bruto = texto.trim();
  if (!bruto) return Number.NaN;
  return Number(bruto.includes(",") ? bruto.replace(/\./g, "").replace(",", ".") : bruto);
}

/** Verde acima de 50, âmbar entre 25 e 50, vermelho abaixo. */
function corDaMargem(margem: number | null) {
  if (margem == null) return "text-muted-foreground";
  if (margem >= 0.5) return "text-[var(--green-ink)]";
  if (margem >= 0.25) return "text-[var(--bronze)]";
  return "text-destructive";
}

/**
 * Calculadora: onde o custo é montado e o preço é decidido.
 *
 * Separada da Margem de propósito. Aqui se trabalha — lança insumo, mexe no
 * preço, salva. Lá se lê o que aconteceu. Misturar as duas fazia a tela de
 * relatório carregar a responsabilidade de ser também formulário.
 */
export function CalculadoraPanel() {
  const [produtos, setProdutos] = useState<MargemProduto[]>([]);
  const [insumos, setInsumos] = useState<InsumoRow[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [editando, setEditando] = useState<MargemProduto | null>(null);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      // O ano inteiro: aqui a venda não importa, importa a lista de produtos e
      // o custo de cada um. O período existe só porque a consulta pede um.
      const ano = intervaloAno(hojeISO());
      const dados = await carregarMargemProdutos({ data: { de: ano.de, ate: ano.ate } });
      setProdutos(dados.produtos);
    } catch (e) {
      setErro(mensagemDeErro(e, "carregar os produtos"));
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  useEffect(() => {
    listarInsumos()
      .then(setInsumos)
      .catch(() => setInsumos([]));
  }, []);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return produtos.filter((p) => {
      if (filtro === "sem_custo" && p.custo != null) return false;
      if (!termo) return true;
      return `${p.nome} ${p.categoria ?? ""} ${p.colecao ?? ""}`
        .toLocaleLowerCase("pt-BR")
        .includes(termo);
    });
  }, [produtos, busca, filtro]);

  const semCusto = produtos.filter((p) => p.custo == null).length;

  return (
    <section data-tela-cheia className="min-w-0">
      <PageHeader
        titulo="Calculadora"
        descricao="Monte o custo de cada produto e descubra por quanto precisa vender. É aqui que os insumos de cada produto são lançados."
      />

      {erro && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex h-11 min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-[var(--cream-deep)] bg-white px-3.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </div>

        {([
          ["todos", `Todos (${produtos.length})`],
          ["sem_custo", `Sem custo (${semCusto})`],
        ] as [Filtro, string][]).map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFiltro(id)}
            className={cn(
              "h-11 rounded-xl border px-4 text-sm font-medium transition-colors",
              filtro === id
                ? "border-[var(--terracotta)] bg-[var(--terracotta)] text-white"
                : "border-[var(--cream-deep)] bg-card text-[var(--admin-ink-soft)] hover:bg-[var(--cream-soft)]",
            )}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {carregando ? (
        <Carregando texto="carregando produtos…" />
      ) : !visiveis.length ? (
        <EstadoVazio
          titulo={filtro === "sem_custo" ? "Todo produto já tem custo" : "Nenhum produto encontrado"}
          descricao={
            filtro === "sem_custo"
              ? "Nada a lançar por aqui."
              : "Cadastre produtos em Cadastros → Produtos."
          }
        />
      ) : (
        <ul className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {visiveis.map((p) => {
            const margem =
              p.custo != null && p.preco != null && p.preco > 0
                ? (p.preco - p.custo) / p.preco
                : null;
            const faltaCusto = p.custo == null;

            return (
              <li
                key={p.slug}
                onClick={() => setEditando(p)}
                className={cn(
                  "flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border bg-card px-4 py-3 shadow-[var(--shadow-soft)] transition-colors hover:border-[var(--terracotta)]",
                  faltaCusto
                    ? "border-[var(--cream-deep)] bg-[var(--cream-soft)]"
                    : "border-[var(--admin-border)]",
                )}
              >
                <div className="min-w-0 flex-1 sm:min-w-[14rem]">
                  <p className="t-item truncate text-foreground">{p.nome}</p>
                  <p className="t-support truncate text-muted-foreground">
                    {[p.colecao, p.categoria].filter(Boolean).join(" · ") || "sem categoria"}
                  </p>
                </div>

                <div className="w-28 text-right">
                  <p className="t-support text-muted-foreground">custo</p>
                  <p className="t-body tabular-nums text-foreground">
                    {p.custo == null ? "—" : formatBRL(p.custo)}
                  </p>
                </div>

                <div className="w-28 text-right">
                  <p className="t-support text-muted-foreground">preço</p>
                  <p className="t-body tabular-nums text-foreground">
                    {p.preco == null ? "—" : formatBRL(p.preco)}
                  </p>
                </div>

                <div className="w-20 text-right">
                  <p className="t-support text-muted-foreground">margem</p>
                  <p className={cn("t-item tabular-nums", corDaMargem(margem))}>
                    {margem == null ? "—" : `${Math.round(margem * 100)}%`}
                  </p>
                </div>

                <span
                  className={cn(
                    "t-support inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 font-semibold",
                    faltaCusto
                      ? "bg-[var(--peach)] text-[var(--coral)]"
                      : "text-muted-foreground",
                  )}
                >
                  <Calculator className="h-3.5 w-3.5" />
                  {faltaCusto ? "Lançar custo" : "Calcular"}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {editando && (
        <DialogoCalculo
          produto={editando}
          insumos={insumos}
          onFechar={() => {
            setEditando(null);
            recarregar();
          }}
        />
      )}
    </section>
  );
}

function DialogoCalculo({
  produto,
  insumos,
  onFechar,
}: {
  produto: MargemProduto;
  insumos: InsumoRow[];
  onFechar: () => void;
}) {
  // O editor salva sozinho e devolve o custo a cada mudança: a conta abaixo
  // acompanha enquanto você digita, sem precisar salvar para ver.
  const [custo, setCusto] = useState(produto.custo ?? 0);
  const [preco, setPreco] = useState(
    produto.preco == null ? "" : produto.preco.toFixed(2).replace(".", ","),
  );
  const [margemAlvo, setMargemAlvo] = useState("60");
  const [salvando, setSalvando] = useState(false);

  const receberCusto = useCallback(
    ({ custoTotal }: { itens: ItemComposicaoProduto[]; custoTotal: number }) => {
      setCusto(custoTotal);
    },
    [],
  );

  const precoNumero = paraNumero(preco);
  const temPreco = Number.isFinite(precoNumero) && precoNumero > 0;
  const margem = temPreco && custo > 0 ? (precoNumero - custo) / precoNumero : null;

  const alvo = paraNumero(margemAlvo);
  const temAlvo = Number.isFinite(alvo) && alvo >= 0 && alvo < 100;
  // Preço para atingir a margem: custo / (1 - margem). Margem é sobre a venda,
  // não sobre o custo — é assim que se lê "70% de margem" no comércio.
  const precoSugerido = temAlvo && custo > 0 ? custo / (1 - alvo / 100) : null;

  async function usarPreco(valor: number) {
    setSalvando(true);
    try {
      await atualizarPrecoProduto({ data: { id: produto.id, preco: Number(valor.toFixed(2)) } });
      setPreco(valor.toFixed(2).replace(".", ","));
      toast.success("Preço atualizado.");
    } catch (e) {
      toast.error(mensagemDeErro(e, "atualizar o preço"));
    } finally {
      setSalvando(false);
    }
  }

  async function salvarPrecoDigitado() {
    if (!temPreco) return;
    await usarPreco(precoNumero);
  }

  return (
    <Dialog open onOpenChange={(estado) => !estado && onFechar()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader className="pr-6 text-left">
          <DialogTitle>{produto.nome}</DialogTitle>
          <DialogDescription>
            Lance os insumos e as quantidades. O custo soma sozinho e a margem acompanha.
          </DialogDescription>
        </DialogHeader>

        <ProdutoInsumosEditor
          produtoId={produto.id}
          insumos={insumos}
          autoSave
          onChange={receberCusto}
        />

        <div className="grid gap-3 rounded-2xl border border-[var(--cream-deep)] bg-[var(--cream-soft)] p-4 sm:grid-cols-3">
          <div>
            <p className="t-support text-muted-foreground">Custo dos insumos</p>
            <p className="t-hero tabular-nums text-[var(--terracotta)]">{moeda(custo)}</p>
          </div>

          <label className="space-y-1.5 text-sm font-medium">
            Preço de venda (R$)
            <div className="flex gap-1.5">
              <Input
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                className="h-11 bg-white"
              />
              <Button
                variant="outline"
                onClick={salvarPrecoDigitado}
                disabled={!temPreco || salvando}
                className="h-11 shrink-0"
                title="Salvar este preço no produto"
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </label>

          <div>
            <p className="t-support text-muted-foreground">Sobra</p>
            <p className={cn("t-hero tabular-nums", corDaMargem(margem))}>
              {margem == null ? "—" : `${Math.round(margem * 100)}%`}
            </p>
            {margem != null && temPreco && (
              <p className="t-support text-muted-foreground">
                {moeda(precoNumero - custo)} por unidade
              </p>
            )}
          </div>
        </div>

        {/* O caminho inverso: a margem é o piso, o preço é a consequência. */}
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--admin-border)] bg-card p-4">
          <Sparkles className="mb-2 h-4 w-4 shrink-0 text-[var(--bronze)]" />
          <label className="space-y-1.5 text-sm font-medium">
            Quero margem de
            <div className="flex items-center gap-1.5">
              <Input
                value={margemAlvo}
                onChange={(e) => setMargemAlvo(e.target.value)}
                inputMode="decimal"
                className="h-10 w-20 bg-white text-center"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </label>

          <div className="min-w-0 flex-1">
            <p className="t-support text-muted-foreground">Preço sugerido</p>
            <p className="t-item tabular-nums text-[var(--wine)]">
              {precoSugerido == null ? "—" : moeda(precoSugerido)}
            </p>
          </div>

          <Button
            variant="outline"
            disabled={precoSugerido == null || salvando}
            onClick={() => precoSugerido != null && usarPreco(precoSugerido)}
            className="h-10"
          >
            Usar este preço
          </Button>
        </div>

        <DialogFooter className="pt-1">
          <Button onClick={onFechar}>Pronto</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
