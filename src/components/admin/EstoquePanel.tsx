"use client";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  ClipboardCheck,
  History,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  carregarEstoque,
  excluirMovimento,
  historicoEstoque,
  registrarContagem,
  registrarMovimento,
  salvarControleEstoque,
  type InsumoParaControle,
  type LinhaEstoque,
  type MovimentoEstoque,
  type SituacaoEstoque,
} from "@/lib/estoque";
import { mensagemDeErro } from "@/lib/erros";
import { PageHeader, useConfirmar } from "./shell";

type Acao = "entrada" | "saida" | "contagem";

const ROTULO_ACAO: Record<Acao, string> = {
  entrada: "Entrada",
  saida: "Baixa",
  contagem: "Contagem",
};

const SITUACAO: Record<SituacaoEstoque, { texto: string; classe: string }> = {
  ok: { texto: "Ok", classe: "bg-[var(--green-soft)] text-[var(--green-ink)]" },
  baixo: { texto: "No mínimo", classe: "bg-[#fdf1e3] text-[#a3651f]" },
  zerado: { texto: "Acabou", classe: "bg-[var(--peach)] text-[var(--coral)]" },
  sem_minimo: { texto: "Sem mínimo", classe: "bg-[var(--cream)] text-[var(--admin-muted)]" },
};

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);
}

function numeroBr(valor: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(valor || 0);
}

function paraNumero(texto: string): number {
  const bruto = texto.trim();
  if (!bruto) return Number.NaN;
  return Number(bruto.includes(",") ? bruto.replace(/\./g, "").replace(",", ".") : bruto);
}

function hojeIso() {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

function dataCurta(iso: string | null) {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano.slice(2)}`;
}

export function EstoquePanel() {
  const [linhas, setLinhas] = useState<LinhaEstoque[]>([]);
  const [insumos, setInsumos] = useState<InsumoParaControle[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [soAlerta, setSoAlerta] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [movAberto, setMovAberto] = useState(false);
  const [acao, setAcao] = useState<Acao>("entrada");
  const [movInsumo, setMovInsumo] = useState("");
  const [movQtd, setMovQtd] = useState("");
  const [movData, setMovData] = useState(hojeIso());
  const [movMotivo, setMovMotivo] = useState("");

  const [controleAberto, setControleAberto] = useState(false);
  const [rascunho, setRascunho] = useState<InsumoParaControle[]>([]);
  const [buscaControle, setBuscaControle] = useState("");

  const [historicoDe, setHistoricoDe] = useState<LinhaEstoque | null>(null);
  const [historico, setHistorico] = useState<MovimentoEstoque[]>([]);

  const confirmar = useConfirmar();

  async function carregar() {
    setCarregando(true);
    try {
      const dados = await carregarEstoque();
      setLinhas(dados.linhas);
      setInsumos(dados.insumos);
    } catch (e) {
      toast.error(mensagemDeErro(e, "carregar estoque"));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (window.location.pathname !== "/estoque") {
      window.history.replaceState(window.history.state, "", "/estoque");
    }
    carregar();
  }, []);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return linhas.filter((linha) => {
      if (soAlerta && linha.situacao !== "baixo" && linha.situacao !== "zerado") return false;
      if (!termo) return true;
      return `${linha.nome} ${linha.categoria ?? ""}`
        .toLocaleLowerCase("pt-BR")
        .includes(termo);
    });
  }, [busca, linhas, soAlerta]);

  const indicadores = useMemo(() => {
    const alerta = linhas.filter((l) => l.situacao === "baixo" || l.situacao === "zerado").length;
    // Saldo negativo não vira valor: seria dinheiro que não existe.
    const valor = linhas.reduce((soma, l) => soma + Math.max(0, l.saldo) * l.custo_atual, 0);
    return { total: linhas.length, alerta, valor };
  }, [linhas]);

  const insumoAtual = insumos.find((i) => i.id === movInsumo) ?? null;
  const saldoAtual = linhas.find((l) => l.insumo_id === movInsumo)?.saldo ?? 0;

  function abrirMovimento(acaoInicial: Acao, insumoId?: string) {
    setAcao(acaoInicial);
    setMovInsumo(insumoId ?? "");
    setMovQtd("");
    setMovData(hojeIso());
    setMovMotivo("");
    setMovAberto(true);
  }

  async function salvarMovimento() {
    const quantidade = paraNumero(movQtd);

    if (!movInsumo) {
      toast.error("Escolha o insumo.");
      return;
    }
    if (!Number.isFinite(quantidade) || (acao === "contagem" ? quantidade < 0 : quantidade <= 0)) {
      toast.error(
        acao === "contagem"
          ? "Informe quanto você contou."
          : "Informe uma quantidade maior que zero.",
      );
      return;
    }

    setSalvando(true);
    try {
      if (acao === "contagem") {
        const r = await registrarContagem({
          data: { insumoId: movInsumo, contado: quantidade, ocorridoEm: movData },
        });
        if (r.semMudanca) {
          toast.info("A contagem bateu com o saldo. Nada a corrigir.");
        } else {
          const sinal = r.diferenca > 0 ? "+" : "";
          toast.success(`Contagem registrada. Ajuste de ${sinal}${numeroBr(r.diferenca)}.`);
        }
      } else {
        await registrarMovimento({
          data: {
            insumoId: movInsumo,
            tipo: acao,
            quantidade,
            motivo: movMotivo.trim() || null,
            ocorridoEm: movData,
          },
        });
        toast.success(acao === "entrada" ? "Entrada registrada." : "Baixa registrada.");
      }
      setMovAberto(false);
      await carregar();
    } catch (e) {
      toast.error(mensagemDeErro(e, "registrar movimento"));
    } finally {
      setSalvando(false);
    }
  }

  function abrirControle() {
    setRascunho(insumos.map((i) => ({ ...i })));
    setBuscaControle("");
    setControleAberto(true);
  }

  async function salvarControle() {
    setSalvando(true);
    try {
      await salvarControleEstoque({
        data: {
          itens: rascunho.map((i) => ({
            id: i.id,
            controlar: i.controlar_estoque,
            minimo: i.estoque_minimo,
          })),
        },
      });
      toast.success("Controle de estoque atualizado.");
      setControleAberto(false);
      await carregar();
    } catch (e) {
      toast.error(mensagemDeErro(e, "salvar controle de estoque"));
    } finally {
      setSalvando(false);
    }
  }

  async function abrirHistorico(linha: LinhaEstoque) {
    setHistoricoDe(linha);
    setHistorico([]);
    try {
      setHistorico(await historicoEstoque({ data: { id: linha.insumo_id } }));
    } catch (e) {
      toast.error(mensagemDeErro(e, "carregar histórico"));
    }
  }

  async function apagarMovimento(mov: MovimentoEstoque) {
    const ok = await confirmar({
      titulo: "Apagar este movimento?",
      descricao: "O saldo é recalculado na hora. Use quando o lançamento foi um engano.",
      confirmar: "Apagar",
      destrutivo: true,
    });
    if (!ok) return;

    try {
      await excluirMovimento({ data: { id: mov.id } });
      toast.success("Movimento apagado.");
      setHistorico((atual) => atual.filter((m) => m.id !== mov.id));
      await carregar();
    } catch (e) {
      toast.error(mensagemDeErro(e, "apagar movimento"));
    }
  }

  const rascunhoFiltrado = useMemo(() => {
    const termo = buscaControle.trim().toLocaleLowerCase("pt-BR");
    if (!termo) return rascunho;
    return rascunho.filter((i) =>
      `${i.nome} ${i.categoria ?? ""}`.toLocaleLowerCase("pt-BR").includes(termo),
    );
  }, [buscaControle, rascunho]);

  const colunas =
    "grid-cols-[minmax(200px,1.6fr)_120px_110px_130px_120px_110px_96px]";

  return (
    <section data-tela-cheia className="xl:h-[calc(100dvh-122px)] xl:overflow-hidden">
      <PageHeader
        titulo="Estoque"
        descricao="Cada entrada, baixa e contagem vira uma linha no histórico. O saldo é a soma delas — sempre dá para ver de onde veio."
        acoes={
          <>
            <Button variant="outline" onClick={abrirControle} className="h-11">
              <SlidersHorizontal className="mr-1.5 h-4 w-4" />
              Escolher insumos
            </Button>
            <Button onClick={() => abrirMovimento("entrada")} className="h-11">
              <Boxes className="mr-1.5 h-4 w-4" />
              Registrar movimento
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card-panel px-4 py-3">
          <p className="t-support text-[var(--admin-muted)]">No controle</p>
          <p className="t-hero mt-1 text-[var(--admin-ink)]">{indicadores.total}</p>
        </div>
        <div className="card-panel px-4 py-3">
          <p className="t-support text-[var(--admin-muted)]">Precisam de compra</p>
          <p
            className={`t-hero mt-1 ${
              indicadores.alerta > 0 ? "text-[var(--coral)]" : "text-[var(--admin-ink)]"
            }`}
          >
            {indicadores.alerta}
          </p>
        </div>
        <div className="card-panel px-4 py-3">
          <p className="t-support text-[var(--admin-muted)]">Parado em estoque</p>
          <p className="t-hero mt-1 text-[var(--admin-ink)]">{moeda(indicadores.valor)}</p>
          <p className="t-support text-[var(--admin-muted)]">a preço de hoje</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="flex h-11 min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-[var(--cream-deep)] bg-white px-3.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar insumo"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setSoAlerta((v) => !v)}
          className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors ${
            soAlerta
              ? "border-[var(--coral)] bg-[var(--peach)] text-[var(--coral)]"
              : "border-[var(--cream-deep)] bg-white text-[var(--admin-ink-soft)]"
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          Só o que falta
        </button>
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--cream-deep)] bg-card">
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="min-w-[900px]">
            <div
              className={`sticky top-0 z-10 grid ${colunas} gap-3 border-b border-[var(--cream-deep)] bg-[var(--cream-soft)] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground`}
            >
              <span>Insumo</span>
              <span>Saldo</span>
              <span>Mínimo</span>
              <span>Situação</span>
              <span>Parado</span>
              <span>Última mov.</span>
              <span>Ações</span>
            </div>

            {carregando ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Carregando estoque...
              </div>
            ) : filtradas.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-10 text-center">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--peach-soft)]">
                  <Boxes className="h-5 w-5 text-[var(--coral)]" />
                </div>
                <p className="max-w-sm text-sm text-muted-foreground">
                  {linhas.length === 0
                    ? "Nenhum insumo está no controle de estoque. Escolha quais você quer acompanhar — os outros continuam funcionando normalmente no custo dos produtos."
                    : "Nenhum insumo encontrado com esse filtro."}
                </p>
                {linhas.length === 0 && (
                  <Button variant="outline" onClick={abrirControle}>
                    <SlidersHorizontal className="mr-1.5 h-4 w-4" />
                    Escolher insumos
                  </Button>
                )}
              </div>
            ) : (
              filtradas.map((linha) => (
                <div
                  key={linha.insumo_id}
                  className={`grid min-h-[58px] ${colunas} items-center gap-3 border-b border-[var(--cream-deep)] px-4 py-2.5 last:border-b-0`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{linha.nome}</p>
                    {linha.categoria && (
                      <p className="truncate text-xs text-muted-foreground">{linha.categoria}</p>
                    )}
                  </div>

                  <span
                    className={`text-sm font-bold tabular-nums ${
                      linha.saldo <= 0 ? "text-[var(--coral)]" : "text-[var(--wine)]"
                    }`}
                  >
                    {numeroBr(linha.saldo)} {linha.unidade}
                  </span>

                  <span className="text-sm tabular-nums text-[var(--admin-ink-soft)]">
                    {linha.estoque_minimo === null ? "—" : numeroBr(linha.estoque_minimo)}
                  </span>

                  <span
                    className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${SITUACAO[linha.situacao].classe}`}
                  >
                    {SITUACAO[linha.situacao].texto}
                  </span>

                  <span className="text-sm tabular-nums text-[var(--admin-ink-soft)]">
                    {moeda(Math.max(0, linha.saldo) * linha.custo_atual)}
                  </span>

                  <span className="text-sm tabular-nums text-muted-foreground">
                    {dataCurta(linha.ultimo_movimento)}
                  </span>

                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => abrirMovimento("entrada", linha.insumo_id)}
                      aria-label={`Entrada de ${linha.nome}`}
                      title="Entrada"
                    >
                      <ArrowUpRight className="h-4 w-4 text-[var(--green-ink)]" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => abrirMovimento("saida", linha.insumo_id)}
                      aria-label={`Baixa de ${linha.nome}`}
                      title="Baixa"
                    >
                      <ArrowDownRight className="h-4 w-4 text-[var(--coral)]" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => abrirHistorico(linha)}
                      aria-label={`Histórico de ${linha.nome}`}
                      title="Histórico"
                    >
                      <History className="h-4 w-4 text-[var(--admin-muted)]" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ---------- Movimento ---------- */}
      <Dialog open={movAberto} onOpenChange={(estado) => !estado && setMovAberto(false)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
          <DialogHeader className="pr-6 text-left">
            <DialogTitle>Registrar movimento</DialogTitle>
            <DialogDescription>
              Entrada é o que chegou. Baixa é o que saiu. Contagem é quando você conta na
              prateleira e o sistema corrige a diferença.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-2">
            {(["entrada", "saida", "contagem"] as Acao[]).map((opcao) => (
              <button
                key={opcao}
                type="button"
                onClick={() => setAcao(opcao)}
                className={`h-11 rounded-xl border text-sm font-semibold transition-colors ${
                  acao === opcao
                    ? "border-[var(--coral)] bg-[var(--coral)] text-white"
                    : "border-[var(--cream-deep)] bg-white text-[var(--admin-ink-soft)]"
                }`}
              >
                {ROTULO_ACAO[opcao]}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
              Insumo
              <Select value={movInsumo} onValueChange={setMovInsumo}>
                <SelectTrigger className="h-11 w-full rounded-xl">
                  <SelectValue placeholder="Escolha o insumo" />
                </SelectTrigger>
                <SelectContent>
                  {insumos
                    .filter((i) => i.controlar_estoque)
                    .map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </label>

            <label className="space-y-1.5 text-sm font-medium">
              {acao === "contagem" ? "Quanto você contou" : "Quantidade"}
              {insumoAtual && (
                <span className="ml-1 font-normal text-muted-foreground">
                  ({insumoAtual.unidade})
                </span>
              )}
              <Input
                value={movQtd}
                onChange={(e) => setMovQtd(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                className="h-11"
              />
            </label>

            <label className="space-y-1.5 text-sm font-medium">
              Data
              <Input
                type="date"
                value={movData}
                onChange={(e) => setMovData(e.target.value)}
                className="h-11"
              />
            </label>

            {acao !== "contagem" && (
              <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
                Motivo <span className="font-normal text-muted-foreground">(opcional)</span>
                <Input
                  value={movMotivo}
                  onChange={(e) => setMovMotivo(e.target.value)}
                  placeholder={
                    acao === "entrada" ? "Compra no atacado" : "Produção do pedido #12"
                  }
                  className="h-11"
                />
              </label>
            )}
          </div>

          {movInsumo && (
            <div className="rounded-xl bg-[var(--cream-soft)] px-3.5 py-2.5 text-sm text-[var(--admin-ink-soft)]">
              {acao === "contagem" ? (
                <>
                  O sistema tem{" "}
                  <strong className="font-bold">
                    {numeroBr(saldoAtual)} {insumoAtual?.unidade}
                  </strong>
                  . A diferença entra como ajuste, com a data de hoje no histórico.
                </>
              ) : (
                <>
                  Saldo atual:{" "}
                  <strong className="font-bold">
                    {numeroBr(saldoAtual)} {insumoAtual?.unidade}
                  </strong>
                  {Number.isFinite(paraNumero(movQtd)) && movQtd.trim() && (
                    <>
                      {" → fica "}
                      <strong className="font-bold text-[var(--wine)]">
                        {numeroBr(
                          acao === "entrada"
                            ? saldoAtual + paraNumero(movQtd)
                            : saldoAtual - paraNumero(movQtd),
                        )}{" "}
                        {insumoAtual?.unidade}
                      </strong>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          <DialogFooter className="pt-1">
            <Button variant="outline" onClick={() => setMovAberto(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={salvarMovimento} disabled={salvando}>
              {acao === "contagem" ? (
                <>
                  <ClipboardCheck className="mr-1.5 h-4 w-4" />
                  Registrar contagem
                </>
              ) : (
                `Registrar ${ROTULO_ACAO[acao].toLocaleLowerCase("pt-BR")}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Escolher insumos ---------- */}
      <Dialog open={controleAberto} onOpenChange={(estado) => !estado && setControleAberto(false)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-hidden sm:max-w-2xl">
          <DialogHeader className="pr-6 text-left">
            <DialogTitle>Insumos no controle de estoque</DialogTitle>
            <DialogDescription>
              Ligue só o que vale acompanhar. Quem fica de fora não some — continua contando no
              custo dos produtos, apenas não aparece nesta tela.
            </DialogDescription>
          </DialogHeader>

          <div className="flex h-11 items-center gap-2 rounded-xl border border-[var(--cream-deep)] bg-white px-3.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={buscaControle}
              onChange={(e) => setBuscaControle(e.target.value)}
              placeholder="Buscar insumo"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>

          <div className="max-h-[46vh] overflow-y-auto rounded-xl border border-[var(--cream-deep)]">
            {rascunhoFiltrado.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Nenhum insumo encontrado.
              </p>
            ) : (
              rascunhoFiltrado.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 border-b border-[var(--cream-deep)] px-3.5 py-2.5 last:border-b-0"
                >
                  <Switch
                    checked={item.controlar_estoque}
                    onCheckedChange={(valor) =>
                      setRascunho((atual) =>
                        atual.map((i) =>
                          i.id === item.id ? { ...i, controlar_estoque: valor } : i,
                        ),
                      )
                    }
                    aria-label={`Controlar estoque de ${item.nome}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{item.nome}</p>
                    {item.categoria && (
                      <p className="truncate text-xs text-muted-foreground">{item.categoria}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="t-support text-[var(--admin-muted)]">Mínimo</span>
                    <Input
                      value={item.estoque_minimo === null ? "" : String(item.estoque_minimo).replace(".", ",")}
                      onChange={(e) => {
                        const bruto = e.target.value;
                        const numero = paraNumero(bruto);
                        setRascunho((atual) =>
                          atual.map((i) =>
                            i.id === item.id
                              ? {
                                  ...i,
                                  estoque_minimo:
                                    bruto.trim() === "" || !Number.isFinite(numero)
                                      ? null
                                      : numero,
                                }
                              : i,
                          ),
                        );
                      }}
                      disabled={!item.controlar_estoque}
                      inputMode="decimal"
                      placeholder="—"
                      className="h-9 w-20 text-center"
                    />
                    <span className="t-support w-8 text-[var(--admin-muted)]">{item.unidade}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="pt-1">
            <Button variant="outline" onClick={() => setControleAberto(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={salvarControle} disabled={salvando}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Histórico ---------- */}
      <Dialog open={historicoDe !== null} onOpenChange={(estado) => !estado && setHistoricoDe(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-hidden sm:max-w-xl">
          <DialogHeader className="pr-6 text-left">
            <DialogTitle>{historicoDe?.nome}</DialogTitle>
            <DialogDescription>
              Saldo de {numeroBr(historicoDe?.saldo ?? 0)} {historicoDe?.unidade} — a soma de tudo
              que está aqui embaixo.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[54vh] overflow-y-auto rounded-xl border border-[var(--cream-deep)]">
            {historico.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Nenhum movimento registrado ainda.
              </p>
            ) : (
              historico.map((mov) => (
                <div
                  key={mov.id}
                  className="flex items-center gap-3 border-b border-[var(--cream-deep)] px-3.5 py-2.5 last:border-b-0"
                >
                  <span className="w-14 shrink-0 text-xs text-muted-foreground">
                    {dataCurta(mov.ocorrido_em)}
                  </span>
                  <span
                    className={`w-24 shrink-0 text-sm font-bold tabular-nums ${
                      mov.quantidade > 0 ? "text-[var(--green-ink)]" : "text-[var(--coral)]"
                    }`}
                  >
                    {mov.quantidade > 0 ? "+" : ""}
                    {numeroBr(mov.quantidade)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-[var(--admin-ink-soft)]">
                    {mov.motivo ?? ROTULO_ACAO[mov.tipo === "ajuste" ? "contagem" : mov.tipo]}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => apagarMovimento(mov)}
                    aria-label="Apagar movimento"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="pt-1">
            <Button variant="outline" onClick={() => setHistoricoDe(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
