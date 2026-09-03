"use client";

import { Calculator, Search, Sparkles } from "lucide-react";
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
import {
  atualizarTempoMontagem,
  carregarCalculoConfig,
  type SugestaoFixo,
} from "@/lib/calculo";
import {
  CONFIG_VAZIA,
  calcular,
  precoParaMargem,
  type CalculoConfig,
} from "@/lib/calculo-tipos";
import { AjustesCalculo } from "./AjustesCalculo";
import { CascataCusto } from "./CascataCusto";
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
 * Precificacao: onde o custo e montado e o preco e decidido.
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
  const [config, setConfig] = useState<CalculoConfig>(CONFIG_VAZIA);
  const [sugestao, setSugestao] = useState<SugestaoFixo | null>(null);

  const recarregarConfig = useCallback(async () => {
    try {
      const r = await carregarCalculoConfig();
      setConfig(r.config);
      setSugestao(r.sugestao);
    } catch {
      // Sem config a tela funciona igual: cai no cálculo só de insumos.
    }
  }, []);

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

  useEffect(() => {
    recarregarConfig();
  }, [recarregarConfig]);

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
        titulo="Precificação"
        descricao="Monte o custo de cada produto e descubra por quanto precisa vender. É aqui que os insumos de cada produto são lançados."
        acoes={
          sugestao && (
            <AjustesCalculo config={config} sugestao={sugestao} onSalvo={recarregarConfig} />
          )
        }
      />

      {erro && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex h-11 w-full items-center gap-2 rounded-xl border border-[var(--cream-deep)] bg-white px-3.5 sm:w-auto sm:min-w-[220px] sm:flex-1">
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
                <div className="w-full min-w-0 sm:w-auto sm:flex-1 sm:min-w-[14rem]">
                  <p className="t-item truncate text-foreground">{p.nome}</p>
                  <p className="t-support truncate text-muted-foreground">
                    {[p.colecao, p.categoria].filter(Boolean).join(" · ") || "sem categoria"}
                  </p>
                </div>

                <div className="grid w-full grid-cols-3 gap-x-4 sm:contents">
                  <div className="w-full text-right sm:w-28">
                    <p className="t-support text-muted-foreground">custo</p>
                    <p className="t-body tabular-nums text-foreground">
                      {p.custo == null ? "—" : formatBRL(p.custo)}
                    </p>
                  </div>

                  <div className="w-full text-right sm:w-28">
                    <p className="t-support text-muted-foreground">preço</p>
                    <p className="t-body tabular-nums text-foreground">
                      {p.preco == null ? "—" : formatBRL(p.preco)}
                    </p>
                  </div>

                  <div className="w-full text-right sm:w-20">
                    <p className="t-support text-muted-foreground">margem</p>
                    <p className={cn("t-item tabular-nums", corDaMargem(margem))}>
                      {margem == null ? "—" : `${Math.round(margem * 100)}%`}
                    </p>
                  </div>
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
          config={config}
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
  config,
  onFechar,
}: {
  produto: MargemProduto;
  insumos: InsumoRow[];
  config: CalculoConfig;
  onFechar: () => void;
}) {
  // O editor salva sozinho e devolve o custo a cada mudança: a conta abaixo
  // acompanha enquanto você digita, sem precisar salvar para ver.
  const [custo, setCusto] = useState(produto.custo ?? 0);
  const [preco, setPreco] = useState(
    produto.preco == null ? "" : produto.preco.toFixed(2).replace(".", ","),
  );
  /* A margem NAO e estado proprio: ela e o preco lido de outro angulo. Guardar
     as duas separadas era o que fazia a tela abrir dizendo "60%" com um preco
     que dava 77% — dois numeros na tela discordando um do outro.

     O unico estado aqui e o texto cru enquanto o campo esta em foco. Sem ele o
     input controlado reescreveria o valor formatado a cada tecla e comeria a
     virgula (foi o que fez 1,5 virar 15 no campo Minimo). Ao sair do campo
     volta a ser derivado, e a formatacao se acerta sozinha. */
  const [margemDigitada, setMargemDigitada] = useState<string | null>(null);
  const [tempo, setTempo] = useState(
    produto.tempo_montagem_min == null ? "" : String(produto.tempo_montagem_min),
  );
  const [salvando, setSalvando] = useState(false);

  const receberCusto = useCallback(
    ({ custoTotal }: { itens: ItemComposicaoProduto[]; custoTotal: number }) => {
      setCusto(custoTotal);
    },
    [],
  );

  const precoNumero = paraNumero(preco);
  const temPreco = Number.isFinite(precoNumero) && precoNumero > 0;
  const tempoMin = Number.isFinite(paraNumero(tempo)) ? paraNumero(tempo) : null;

  const cascata = calcular(temPreco ? precoNumero : null, custo, tempoMin, config);

  /* Enquanto digita, manda o texto cru. Fora do foco, mostra a margem que o
     preco atual realmente da — inclusive na abertura, sem precisar de effect. */
  const margemMostrada =
    margemDigitada ??
    (cascata.margemReal == null
      ? ""
      : (cascata.margemReal * 100).toFixed(1).replace(".", ",").replace(",0", ""));

  /* Escrever a margem escreve o preco. O contrario nao existe: a margem ja e
     derivada do preco, entao o campo se atualiza sozinho quando o preco muda. */
  function escreverMargem(texto: string) {
    setMargemDigitada(texto);
    const n = paraNumero(texto);
    if (n == null || n < 0 || n >= 100) return;
    const novo = precoParaMargem(custo, tempoMin, n / 100, config);
    if (novo == null) return;
    setPreco(novo.toFixed(2).replace(".", ","));
  }

  /* Uma gravacao so. Antes eram dois tiques identicos pendurados nos campos,
     cada um salvando uma coisa diferente, sem dizer o que salvava — e dava para
     sair da tela achando que o preco tinha ido junto com o tempo. */
  async function salvarPrecoETempo() {
    if (!temPreco) return;

    const minutos = paraNumero(tempo);
    const tempoValor = tempo.trim() === "" ? null : Math.round(minutos ?? NaN);
    if (tempoValor != null && !Number.isFinite(tempoValor)) {
      toast.error("Informe o tempo em minutos.");
      return;
    }
    if (tempoValor != null && tempoValor < 0) {
      toast.error("O tempo não pode ser negativo.");
      return;
    }

    setSalvando(true);
    try {
      await atualizarPrecoProduto({
        data: { id: produto.id, preco: Number(precoNumero.toFixed(2)) },
      });
      await atualizarTempoMontagem({ data: { id: produto.id, minutos: tempoValor } });
      toast.success("Preço e tempo salvos.");
    } catch (e) {
      toast.error(mensagemDeErro(e, "salvar o produto"));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(estado) => !estado && onFechar()}>
      <DialogContent className="flex max-h-[calc(100dvh-8rem)] flex-col gap-0 overflow-hidden sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b border-[var(--admin-border)] pb-3 pr-6 text-left">
          <DialogTitle>{produto.nome}</DialogTitle>
          <DialogDescription>
            Lance os insumos e as quantidades. O custo soma sozinho e a margem acompanha.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-1 py-2">
        <ProdutoInsumosEditor
          produtoId={produto.id}
          insumos={insumos}
          autoSave
          onChange={receberCusto}
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="space-y-1.5 text-sm font-medium">
            <span className="block">Preço de venda</span>
            <div className="relative">
              <Input
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                className="h-11 pl-9"
              />
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                R$
              </span>
            </div>
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            <span className="block">Margem líquida</span>
            <div className="relative">
              <Input
                value={margemMostrada}
                onChange={(e) => escreverMargem(e.target.value)}
                onBlur={() => setMargemDigitada(null)}
                inputMode="decimal"
                placeholder="60"
                className="h-11 pr-9"
              />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                %
              </span>
            </div>
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            <span className="block">Tempo de montagem</span>
            <div className="relative">
              <Input
                value={tempo}
                onChange={(e) => setTempo(e.target.value)}
                inputMode="numeric"
                placeholder="40"
                className="h-11 pr-12"
              />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                min
              </span>
            </div>
          </label>

          <div className="space-y-1.5 text-sm font-medium">
            <span className="block">Insumos</span>
            <p className="flex h-11 items-center rounded-xl bg-[var(--cream-soft)] px-3.5 t-item tabular-nums text-[var(--terracotta)]">
              {moeda(custo)}
            </p>
          </div>
        </div>

        <CascataCusto cascata={cascata} />

        {/* Nada acima grava. Os dois ✓ que ficavam pendurados nos campos
            viraram uma acao so, com nome — antes ninguem sabia o que aquele
            tique salvava, nem que eram duas gravacoes diferentes. */}
        <div className="flex flex-col items-stretch gap-3 rounded-2xl border border-[var(--admin-border)] bg-card p-4 sm:flex-row sm:items-center">
          <Sparkles className="hidden h-4 w-4 shrink-0 text-[var(--bronze)] sm:block" />
          <p className="t-support min-w-0 flex-1 text-muted-foreground">
            Preço e margem andam juntos: mude um e o outro acompanha
            {config.incluir_no_calculo ? " — já com montagem e fixos" : ""}. Nada é salvo até você
            mandar.
          </p>
          <Button
            disabled={!temPreco || salvando}
            onClick={salvarPrecoETempo}
            className="h-11 shrink-0"
          >
            Salvar no produto
          </Button>
        </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-[var(--admin-border)] pt-3">
          <Button variant="outline" onClick={onFechar}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
