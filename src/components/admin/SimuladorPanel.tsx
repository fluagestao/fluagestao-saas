"use client";

import {
  AlertTriangle,
  ArrowRight,
  ListChecks,
  Package,
  Plus,
  Sparkles,
  Trash2,
  X,
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
import { carregarCalculoConfig, type SugestaoFixo } from "@/lib/calculo";
import {
  CONFIG_VAZIA,
  calcular,
  precoParaMargem,
  type CalculoConfig,
} from "@/lib/calculo-tipos";
import { mensagemDeErro } from "@/lib/erros";
import { listarInsumos, type InsumoRow } from "@/lib/insumos";
import {
  cadastrarAvulsos,
  carregarSimulacoes,
  removerSimulacao,
  salvarSimulacao,
  virarProduto,
  type Simulacao,
} from "@/lib/simulador";
import { cn } from "@/lib/utils";
import { AjustesCalculo } from "./AjustesCalculo";
import { CascataCusto } from "./CascataCusto";
import { Carregando, EstadoVazio, PageHeader, useConfirmar } from "./shell";

const AVULSO = "__avulso__";

/* Mesma grade no cabecalho e nas linhas — e o que mantem a coluna alinhada.
   As duas constantes guardam a classe INTEIRA, e nao um pedaco montado depois:
   o Tailwind so gera o que encontra literal no arquivo. */
const GRADE_CABECALHO = "grid-cols-[minmax(0,1fr)_72px_92px_96px_36px]";
const GRADE_LINHA = "sm:grid-cols-[minmax(0,1fr)_72px_92px_96px_36px]";

type Linha = {
  chave: string;
  insumoId: string | null;
  descricao: string;
  quantidade: string;
  valor: string;
};

let sequencia = 0;
function linhaVazia(): Linha {
  sequencia += 1;
  return { chave: `s${sequencia}`, insumoId: null, descricao: "", quantidade: "1", valor: "" };
}

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);
}

function paraNumero(texto: string): number {
  const bruto = texto.trim();
  if (!bruto) return Number.NaN;
  return Number(bruto.includes(",") ? bruto.replace(/\./g, "").replace(",", ".") : bruto);
}

function corDaMargem(margem: number | null) {
  if (margem == null) return "text-muted-foreground";
  if (margem >= 0.5) return "text-[var(--green-ink)]";
  if (margem >= 0.25) return "text-[var(--bronze)]";
  return "text-destructive";
}

/**
 * Simulador: rascunho de cesta.
 *
 * Nada aqui existe no sistema até você mandar. Mistura insumo cadastrado (custo
 * do dia) com item avulso digitado (valor congelado), e só vira produto quando
 * todo item já for insumo — composição pela metade produz custo baixo e margem
 * alta sem nada indicando que falta.
 */
export function SimuladorPanel() {
  const [simulacoes, setSimulacoes] = useState<Simulacao[]>([]);
  const [insumos, setInsumos] = useState<InsumoRow[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState<Simulacao | "nova" | null>(null);
  const [config, setConfig] = useState<CalculoConfig>(CONFIG_VAZIA);
  const [sugestao, setSugestao] = useState<SugestaoFixo | null>(null);
  const confirmar = useConfirmar();

  async function recarregarConfig() {
    try {
      const r = await carregarCalculoConfig();
      setConfig(r.config);
      setSugestao(r.sugestao);
    } catch {
      // Sem config, a conta cai no modo antigo: só insumos.
    }
  }

  async function carregar() {
    setCarregando(true);
    try {
      setSimulacoes(await carregarSimulacoes());
    } catch (e) {
      toast.error(mensagemDeErro(e, "carregar as simulações"));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    recarregarConfig();
    listarInsumos()
      .then(setInsumos)
      .catch(() => setInsumos([]));
  }, []);

  async function excluir(s: Simulacao) {
    const ok = await confirmar({
      titulo: `Excluir "${s.nome}"?`,
      descricao: s.produto_id
        ? "O produto que ela gerou continua no sistema — só o rascunho some."
        : "O rascunho some. Isso não tem volta.",
      confirmar: "Excluir",
      destrutivo: true,
    });
    if (!ok) return;

    try {
      await removerSimulacao({ data: { id: s.id } });
      toast.success("Simulação excluída.");
      await carregar();
    } catch (e) {
      toast.error(mensagemDeErro(e, "excluir a simulação"));
    }
  }

  return (
    <section data-tela-cheia className="min-w-0">
      <PageHeader
        titulo="Simulador"
        descricao="Monte uma cesta que ainda não existe e veja quanto custaria. Nada daqui vira cadastro até você mandar."
        acoes={
          <>
            {sugestao && (
              <AjustesCalculo config={config} sugestao={sugestao} onSalvo={recarregarConfig} />
            )}
            <Button onClick={() => setEditando("nova")} className="h-11">
              <Plus className="mr-1.5 h-4 w-4" />
              Nova simulação
            </Button>
          </>
        }
      />

      {carregando ? (
        <Carregando texto="carregando simulações…" />
      ) : !simulacoes.length ? (
        <EstadoVazio
          titulo="Nenhuma simulação ainda"
          descricao="Teste uma cesta nova antes de colocar no catálogo — com insumos que você já tem ou itens digitados na hora."
        />
      ) : (
        <ul className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {simulacoes.map((s) => {
            const c = calcular(s.preco, s.custo_total, s.tempo_montagem_min, config);
            const margem = config.incluir_no_calculo ? c.margemReal : c.margemContribuicao;
            return (
              <li
                key={s.id}
                onClick={() => setEditando(s)}
                className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-[var(--admin-border)] bg-card px-4 py-3 shadow-[var(--shadow-soft)] transition-colors hover:border-[var(--terracotta)]"
              >
                <div className="min-w-0 flex-1 sm:min-w-[14rem]">
                  <p className="t-item truncate text-foreground">{s.nome}</p>
                  <p className="t-support truncate text-muted-foreground">
                    {[s.colecao, `${s.itens.length} ${s.itens.length === 1 ? "item" : "itens"}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>

                {s.produto_id ? (
                  <span className="t-support shrink-0 rounded-full bg-[var(--green-soft)] px-2.5 py-1 font-semibold text-[var(--green-ink)]">
                    virou produto
                  </span>
                ) : s.avulsos > 0 ? (
                  <span className="t-support shrink-0 rounded-full bg-[#fdf1e3] px-2.5 py-1 font-semibold text-[#a3651f]">
                    {s.avulsos} avulso{s.avulsos === 1 ? "" : "s"}
                  </span>
                ) : null}

                <div className="w-28 text-right">
                  <p className="t-support text-muted-foreground">custo</p>
                  <p className="t-body tabular-nums text-foreground">{moeda(s.custo_total)}</p>
                </div>

                <div className="w-28 text-right">
                  <p className="t-support text-muted-foreground">preço</p>
                  <p className="t-body tabular-nums text-foreground">
                    {s.preco == null ? "—" : moeda(s.preco)}
                  </p>
                </div>

                <div className="w-20 text-right">
                  <p className="t-support text-muted-foreground">margem</p>
                  <p className={cn("t-item tabular-nums", corDaMargem(margem))}>
                    {margem == null ? "—" : `${Math.round(margem * 100)}%`}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    excluir(s);
                  }}
                  aria-label={`Excluir ${s.nome}`}
                  className="shrink-0"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {editando && (
        <DialogoSimulacao
          simulacao={editando === "nova" ? null : editando}
          insumos={insumos}
          config={config}
          onFechar={() => setEditando(null)}
          onMudou={carregar}
        />
      )}
    </section>
  );
}

function DialogoSimulacao({
  simulacao,
  insumos,
  config,
  onFechar,
  onMudou,
}: {
  simulacao: Simulacao | null;
  insumos: InsumoRow[];
  config: CalculoConfig;
  onFechar: () => void;
  onMudou: () => Promise<void>;
}) {
  const [nome, setNome] = useState(simulacao?.nome ?? "");
  const [colecao, setColecao] = useState(simulacao?.colecao ?? "");
  const [preco, setPreco] = useState(
    simulacao?.preco == null ? "" : simulacao.preco.toFixed(2).replace(".", ","),
  );
  const [margemAlvo, setMargemAlvo] = useState(
    simulacao?.margem_alvo == null ? "60" : String(Math.round(simulacao.margem_alvo * 100)),
  );
  const [linhas, setLinhas] = useState<Linha[]>(() =>
    simulacao && simulacao.itens.length
      ? simulacao.itens.map((i) => ({
          chave: i.id,
          insumoId: i.insumo_id,
          descricao: i.descricao,
          quantidade: String(i.quantidade).replace(".", ","),
          valor: i.valor_unitario.toFixed(2).replace(".", ","),
        }))
      : [linhaVazia()],
  );
  const [tempo, setTempo] = useState(
    simulacao?.tempo_montagem_min == null ? "" : String(simulacao.tempo_montagem_min),
  );
  const [salvando, setSalvando] = useState(false);
  const [id, setId] = useState(simulacao?.id ?? null);
  const [viroouProduto, setVirouProduto] = useState(Boolean(simulacao?.produto_id));

  const ativos = useMemo(() => insumos.filter((i) => i.ativo), [insumos]);

  const custoTotal = linhas.reduce((soma, l) => {
    const q = paraNumero(l.quantidade);
    const v = paraNumero(l.valor);
    if (!Number.isFinite(q) || !Number.isFinite(v)) return soma;
    return soma + q * v;
  }, 0);

  const precoNumero = paraNumero(preco);
  const temPreco = Number.isFinite(precoNumero) && precoNumero > 0;
  const tempoMin = Number.isFinite(paraNumero(tempo)) ? paraNumero(tempo) : null;

  const cascata = calcular(temPreco ? precoNumero : null, custoTotal, tempoMin, config);

  const alvo = paraNumero(margemAlvo);
  const temAlvo = Number.isFinite(alvo) && alvo >= 0 && alvo < 100;
  /* Preco e margem sao duas leituras do MESMO ponto: dado o custo, escolher um
     determina o outro. Por isso cada campo escreve no outro, e nunca em si
     mesmo — reformatar o campo em foco a cada tecla comeria a virgula, que e o
     defeito que fez 1,5 virar 15 no campo Minimo.

     A margem aqui e a LIQUIDA: e a que o precoParaMargem resolve
     (preco x (1 - percentuais - margem) = insumos + mao de obra), e a mesma
     que a cascata mostra como "sobra real". */
  function escreverPreco(texto: string) {
    setPreco(texto);

    const n = paraNumero(texto);
    if (!Number.isFinite(n) || n <= 0) return;

    const nova = calcular(n, custoTotal, tempoMin, config).margemReal;
    // Margem negativa existe (preco abaixo do custo) e a cascata ja mostra o
    // prejuizo; no campo, um alvo negativo nao teria preco correspondente.
    if (nova == null || nova < 0) return;
    setMargemAlvo((nova * 100).toFixed(1).replace(".", ",").replace(",0", ""));
  }

  function escreverMargem(texto: string) {
    setMargemAlvo(texto);

    const n = paraNumero(texto);
    if (!Number.isFinite(n) || n < 0 || n >= 100) return;

    const novo = precoParaMargem(custoTotal, tempoMin, n / 100, config);
    if (novo == null) return;
    setPreco(novo.toFixed(2).replace(".", ","));
  }

  const avulsos = linhas.filter((l) => !l.insumoId && l.descricao.trim());

  function mudar(chave: string, patch: Partial<Linha>) {
    setLinhas((atual) => atual.map((l) => (l.chave === chave ? { ...l, ...patch } : l)));
  }

  function escolherInsumo(chave: string, valor: string) {
    if (valor === AVULSO) {
      mudar(chave, { insumoId: null });
      return;
    }
    const insumo = ativos.find((i) => i.id === valor);
    if (!insumo) return;
    // Traz nome e custo do cadastro: item cadastrado não se digita.
    mudar(chave, {
      insumoId: insumo.id,
      descricao: insumo.nome,
      valor: insumo.custo_referencia.toFixed(2).replace(".", ","),
    });
  }

  function montarItens() {
    const itens: {
      insumo_id: string | null;
      descricao: string;
      quantidade: number;
      valor_unitario: number;
    }[] = [];

    for (const l of linhas) {
      if (!l.descricao.trim() && !l.valor.trim()) continue;
      if (!l.descricao.trim()) return { erro: "Tem um insumo avulso sem nome." };
      const q = paraNumero(l.quantidade);
      const v = paraNumero(l.valor);
      if (!Number.isFinite(q) || q <= 0) return { erro: `Quantidade inválida em "${l.descricao}".` };
      if (!Number.isFinite(v) || v < 0) return { erro: `Valor inválido em "${l.descricao}".` };
      itens.push({
        insumo_id: l.insumoId,
        descricao: l.descricao.trim(),
        quantidade: q,
        valor_unitario: v,
      });
    }
    return { itens };
  }

  async function salvar(): Promise<string | null> {
    if (!nome.trim()) {
      toast.error("Dê um nome à simulação.");
      return null;
    }
    const montado = montarItens();
    if ("erro" in montado) {
      toast.error(montado.erro);
      return null;
    }

    setSalvando(true);
    try {
      const r = await salvarSimulacao({
        data: {
          id: id ?? undefined,
          nome: nome.trim(),
          colecao: colecao.trim() || null,
          preco: temPreco ? precoNumero : null,
          margem_alvo: temAlvo ? alvo / 100 : null,
          tempo_montagem_min: tempoMin == null ? null : Math.round(tempoMin),
          observacao: null,
          itens: montado.itens,
        },
      });
      setId(r.id);
      await onMudou();
      return r.id;
    } catch (e) {
      toast.error(mensagemDeErro(e, "salvar a simulação"));
      return null;
    } finally {
      setSalvando(false);
    }
  }

  async function cadastrarOsAvulsos() {
    const salvo = await salvar();
    if (!salvo) return;

    setSalvando(true);
    try {
      const r = await cadastrarAvulsos({ data: { id: salvo } });
      const partes = [];
      if (r.criados) partes.push(`${r.criados} cadastrado${r.criados === 1 ? "" : "s"}`);
      if (r.reaproveitados) partes.push(`${r.reaproveitados} já existia${r.reaproveitados === 1 ? "" : "m"}`);
      toast.success(partes.length ? partes.join(" · ") : "Nada a cadastrar.");
      // Recarrega para as linhas passarem a apontar para os insumos criados.
      await onMudou();
      onFechar();
    } catch (e) {
      toast.error(mensagemDeErro(e, "cadastrar os itens avulsos"));
    } finally {
      setSalvando(false);
    }
  }

  async function promover() {
    const salvo = await salvar();
    if (!salvo) return;

    setSalvando(true);
    try {
      const r = await virarProduto({ data: { id: salvo, categoriaId: null } });
      toast.success(`Produto criado com ${r.itens} insumo(s). Ajuste a categoria em Produtos.`, {
        duration: 8000,
      });
      setVirouProduto(true);
      await onMudou();
      onFechar();
    } catch (e) {
      toast.error(mensagemDeErro(e, "virar produto"), { duration: 8000 });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(estado) => !estado && onFechar()}>
      <DialogContent className="flex max-h-[calc(100dvh-8rem)] flex-col gap-0 overflow-hidden sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b border-[var(--admin-border)] pb-3 pr-6 text-left">
          <DialogTitle>{simulacao ? "Editar simulação" : "Nova simulação"}</DialogTitle>
          <DialogDescription>
            Use insumos que você já tem ou digite itens na hora. Nada vira cadastro até você mandar.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-1 py-2">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium">
            Nome da cesta
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Cesta Mãe Especial"
              className="h-11"
            />
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            Coleção <span className="font-normal text-muted-foreground">(opcional)</span>
            <Input
              value={colecao}
              onChange={(e) => setColecao(e.target.value)}
              placeholder="Ex.: Dia das Mães"
              className="h-11"
            />
          </label>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--cream-deep)] bg-card">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--cream-deep)] bg-[var(--cream-soft)] px-4 py-2.5">
            <p className="text-sm font-semibold text-foreground">O que vai dentro</p>
            <p className="t-support text-muted-foreground">
              {linhas.filter((l) => l.descricao.trim()).length} insumo(s)
            </p>
          </div>

          {/* Cabecalho de coluna: sem ele, "1" e "R$ un." nao dizem o que sao. */}
          <div className={`hidden ${GRADE_CABECALHO} items-center gap-2 border-b border-[var(--cream-deep)] px-4 py-1.5 sm:grid`}>
            <span className="t-support uppercase tracking-[0.08em] text-muted-foreground">Insumo</span>
            <span className="t-support text-center uppercase tracking-[0.08em] text-muted-foreground">Qtd</span>
            <span className="t-support text-center uppercase tracking-[0.08em] text-muted-foreground">Valor un.</span>
            <span className="t-support text-right uppercase tracking-[0.08em] text-muted-foreground">Total</span>
            <span />
          </div>

          <div className="max-h-[32vh] divide-y divide-[var(--cream-deep)] overflow-y-auto">
            {linhas.map((linha) => {
              const q = paraNumero(linha.quantidade);
              const v = paraNumero(linha.valor);
              const total = Number.isFinite(q) && Number.isFinite(v) ? q * v : null;

              return (
                <div
                  key={linha.chave}
                  className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 py-2 ${GRADE_LINHA}`}
                >
                  {/* O avulso ocupa a MESMA celula do seletor. Antes ele abria
                      uma segunda linha embaixo, solta, e a lista perdia o
                      alinhamento de coluna. */}
                  <div className="col-span-2 min-w-0 sm:col-span-1">
                    {linha.insumoId ? (
                      <Select
                        value={linha.insumoId}
                        onValueChange={(v) => escolherInsumo(linha.chave, v)}
                      >
                        <SelectTrigger className="h-10 w-full rounded-lg border-[var(--cream-deep)] bg-white [&>span]:flex-1 [&>span]:text-left">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={AVULSO}>Digitar um insumo avulso…</SelectItem>
                          {ativos.map((i) => (
                            <SelectItem key={i.id} value={i.id}>
                              {i.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Input
                          value={linha.descricao}
                          onChange={(e) => mudar(linha.chave, { descricao: e.target.value })}
                          placeholder="Nome do insumo avulso"
                          className="h-10 min-w-0 flex-1 rounded-lg bg-white"
                        />
                        <Select value={AVULSO} onValueChange={(v) => escolherInsumo(linha.chave, v)}>
                          <SelectTrigger
                            aria-label="Escolher um insumo cadastrado"
                            title="Escolher um insumo cadastrado"
                            className="h-10 w-10 shrink-0 justify-center rounded-lg border-[var(--cream-deep)] bg-white p-0 [&>span]:hidden"
                          >
                            <ListChecks className="h-4 w-4 text-muted-foreground" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={AVULSO}>Continuar avulso</SelectItem>
                            {ativos.map((i) => (
                              <SelectItem key={i.id} value={i.id}>
                                {i.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <Input
                    value={linha.quantidade}
                    onChange={(e) => mudar(linha.chave, { quantidade: e.target.value })}
                    inputMode="decimal"
                    aria-label="Quantidade"
                    className="h-10 w-16 rounded-lg bg-white text-center sm:w-full"
                  />

                  <Input
                    value={linha.valor}
                    onChange={(e) => mudar(linha.chave, { valor: e.target.value })}
                    inputMode="decimal"
                    aria-label="Valor unitário"
                    disabled={Boolean(linha.insumoId)}
                    title={linha.insumoId ? "Vem do cadastro do insumo" : undefined}
                    className="h-10 w-20 rounded-lg bg-white text-center disabled:bg-[var(--cream-soft)] sm:w-full"
                  />

                  <span className="t-body shrink-0 text-right tabular-nums text-[var(--admin-ink)]">
                    {total == null ? "—" : moeda(total)}
                  </span>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setLinhas((atual) =>
                        atual.length === 1 ? [linhaVazia()] : atual.filter((l) => l.chave !== linha.chave),
                      )
                    }
                    aria-label="Remover insumo"
                    className="h-9 w-8 shrink-0"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--cream-deep)] px-4 py-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setLinhas((atual) => [...atual, linhaVazia()])}
              className="h-9 px-2 text-[var(--terracotta)]"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Adicionar insumo
            </Button>
            <span className="t-body tabular-nums text-[var(--admin-ink)]">
              Total dos insumos{" "}
              <strong className="font-bold text-[var(--terracotta)]">{moeda(custoTotal)}</strong>
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1.5 text-sm font-medium">
            Preço de venda (R$)
            <Input
              value={preco}
              onChange={(e) => escreverPreco(e.target.value)}
              inputMode="decimal"
              placeholder="0,00"
              className="h-11"
            />
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            Tempo de montagem
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
              {moeda(custoTotal)}
            </p>
          </div>
        </div>

        <CascataCusto cascata={cascata} />

        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--admin-border)] bg-card p-4">
          <Sparkles className="mb-2 h-4 w-4 shrink-0 text-[var(--bronze)]" />
          <label className="space-y-1.5 text-sm font-medium">
            Quero margem de
            <div className="flex items-center gap-1.5">
              <Input
                value={margemAlvo}
                onChange={(e) => escreverMargem(e.target.value)}
                inputMode="decimal"
                className="h-10 w-20 text-center"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </label>

          <p className="t-support min-w-0 flex-1 text-muted-foreground">
            Os dois campos andam juntos: mude o preço e a margem acompanha, mude a margem e o preço
            se ajusta{config.incluir_no_calculo ? " — já com montagem e fixos" : ""}.
          </p>
        </div>

        {/* Virar produto exige que todo item já seja insumo. */}
        {viroouProduto ? (
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--green-soft)] bg-[var(--green-soft)] px-4 py-3">
            <Package className="h-5 w-5 shrink-0 text-[var(--green-ink)]" />
            <p className="t-support text-[var(--green-ink)]">
              Esta simulação já virou produto. Ele está em Cadastros → Produtos.
            </p>
          </div>
        ) : avulsos.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#f0dcc0] bg-[#fdf1e3] px-4 py-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-[#a3651f]" />
            <p className="t-support min-w-0 flex-1 text-[#a3651f]">
              {avulsos.length === 1
                ? "1 insumo avulso ainda não está cadastrado"
                : `${avulsos.length} insumos avulsos ainda não estão cadastrados`}
              :{" "}
              {avulsos.map((a) => a.descricao.trim()).join(", ")}. Sem eles, o produto nasceria com
              o custo pela metade.
            </p>
            <Button variant="outline" onClick={cadastrarOsAvulsos} disabled={salvando} className="h-9">
              Cadastrar os que faltam
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--cream-soft)] px-4 py-3">
            <p className="t-support text-[var(--admin-ink-soft)]">
              Todo insumo já está cadastrado — dá para virar produto.
            </p>
            <Button onClick={promover} disabled={salvando || !nome.trim()} className="h-9">
              Virar produto
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        )}
        </div>

        <DialogFooter className="shrink-0 border-t border-[var(--admin-border)] pt-3">
          <Button variant="outline" onClick={onFechar} disabled={salvando}>
            Fechar
          </Button>
          <Button
            onClick={async () => {
              const salvo = await salvar();
              if (salvo) {
                toast.success("Simulação salva.");
                onFechar();
              }
            }}
            disabled={salvando}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
