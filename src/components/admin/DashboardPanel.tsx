import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ChevronRight, MessageCircle, Target } from "lucide-react";
import { rotuloOcasiao } from "@/lib/datas-comemorativas";
import { mensagemDeErro } from "@/lib/erros";
import { carregarMetasDoAno, salvarMetasDoAno, type Meta } from "@/lib/metas";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { hojeISO } from "@/lib/prazo";
import { carregarDashboard } from "@/lib/pedidos";
import type {
  ClienteDoPeriodo,
  DashboardVendas,
  MesDaSerie,
  VendaAgrupada,
} from "@/lib/pedidos-ops.server";
import { formatBRL, whatsappDoCliente } from "@/lib/vendas";
import { Carregando, EstadoVazio, Num, PageHeader } from "./shell";

/** Paleta da casa — mesma dos destaques de coleção. */
const CORES = [
  "#A12820",
  "#B8893B",
  "#3d5a66",
  "#4A6B4A",
  "#C25B7C",
  "#7A6A5E",
  "#B5322B",
  "#8C6A4A",
];

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function anoDe(ano: string) {
  return { de: `${ano}-01-01`, ate: `${ano}-12-31` };
}

function mesDe(iso: string) {
  const [ano, mes] = iso.split("-").map(Number);
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const mm = String(mes).padStart(2, "0");
  return { de: `${ano}-${mm}-01`, ate: `${ano}-${mm}-${ultimo}` };
}

/* A variacao so aparece quando ha periodo anterior com venda. Comparar com um
   mes vazio devolveria "+100%", que nao diz nada sobre o negocio. */
function Variacao({ atual, anterior, rotulo }: { atual: number; anterior: number; rotulo: string }) {
  if (!anterior) return null;
  const pct = Math.round(((atual - anterior) / anterior) * 100);
  const cor =
    pct > 0 ? "text-[var(--green-ink)]" : pct < 0 ? "text-[var(--terracotta)]" : "text-muted-foreground";
  return (
    <span className={cn("font-medium tabular-nums", cor)}>
      {pct > 0 ? "+" : ""}
      {pct}% vs. {rotulo}
    </span>
  );
}

function Cartao({
  titulo,
  valor,
  nota,
  variacao,
  onAbrir,
}: {
  titulo: string;
  valor: string;
  nota?: React.ReactNode;
  variacao?: React.ReactNode;
  /** Quando existe, o cartão vira botão e mostra que há algo atrás do número. */
  onAbrir?: () => void;
}) {
  const conteudo = (
    <>
      <p className="text-xs uppercase tracking-[0.14em] text-[var(--bronze)]">{titulo}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{valor}</p>
      {(nota || variacao) && (
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
          {nota}
          {variacao}
        </p>
      )}
    </>
  );

  if (!onAbrir) {
    return (
      <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">{conteudo}</div>
    );
  }

  /* "Ver quem" fica escrito. Um cartão que abre e não avisa é uma porta sem
     maçaneta: quem nunca clicou por acaso nunca descobre que existe lista. */
  return (
    <button
      type="button"
      onClick={onAbrir}
      className="rounded-2xl bg-card p-4 text-left shadow-[var(--shadow-card)] transition-colors hover:bg-[var(--cream-soft)]"
    >
      {conteudo}
      <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[var(--terracotta)]">
        Ver quem
        <ChevronRight className="h-3 w-3" />
      </span>
    </button>
  );
}

/**
 * Quem está atrás do número do cartão.
 *
 * Ordenada por faturamento: a lista existe para agir, e quem gastou mais é por
 * onde se começa. O WhatsApp vem junto porque, sem ele, saber o nome ainda
 * deixa a pessoa procurando o contato em outra tela.
 */
function DialogoClientes({
  titulo,
  descricao,
  lista,
  onFechar,
}: {
  titulo: string;
  descricao: string;
  lista: ClienteDoPeriodo[];
  onFechar: () => void;
}) {
  return (
    <Dialog open onOpenChange={(estado) => !estado && onFechar()}>
      <DialogContent className="flex max-h-[calc(100dvh-8rem)] flex-col gap-0 overflow-hidden sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b border-[var(--admin-border)] pb-3 pr-6 text-left">
          <DialogTitle>
            {titulo} ({lista.length})
          </DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto py-2">
          {!lista.length ? (
            <p className="px-1 py-6 text-center text-sm text-muted-foreground">
              Ninguém neste grupo no período escolhido.
            </p>
          ) : (
            <ul className="space-y-2">
              {lista.map((c) => {
                const wa = whatsappDoCliente(c.whatsapp);
                return (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-[var(--admin-border)] bg-card px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{c.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.pedidos} pedido(s) no período
                        {c.primeiraCompra ? ` · 1ª compra em ${diaCurto(c.primeiraCompra)}` : ""}
                      </p>
                    </div>

                    <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                      {formatBRL(c.total)}
                    </p>

                    {wa && (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-[var(--cream-deep)] px-3 text-xs font-medium text-foreground"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
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

/** 05/09 — a lista não precisa do ano, o período já está no título. */
function diaCurto(iso: string) {
  const [, mes, dia] = iso.split("-");
  return mes && dia ? `${dia}/${mes}` : iso;
}

/* Quantas unidades sairam por mes no ano. E o grafico que permite estipular
   meta: sem ver a sazonalidade, qualquer numero de meta e chute. */
function EvolucaoAno({
  serie,
  ano,
  mesAtivo,
  onEscolherMes,
  metas,
}: {
  serie: MesDaSerie[];
  ano: string;
  /** 1 a 12, ou null quando o periodo e o ano inteiro. */
  mesAtivo: number | null;
  onEscolherMes: (mes: number) => void;
  /** Meta de cada mes, por numero do mes. Mes sem meta nao desenha marcador. */
  metas: Map<number, number>;
}) {
  const totalAno = serie.reduce((t, m) => t + m.principais, 0);
  const meses = serie.filter((m) => m.pedidos > 0).length;
  const media = meses ? totalAno / meses : 0;
  const dados = serie.map((m) => ({
    ...m,
    rotulo: MESES_CURTOS[m.mes - 1],
    meta: metas.get(m.mes) ?? null,
  }));

  return (
    <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-lg font-semibold text-foreground">Cestas por mês em {ano}</h3>
        <p className="t-support text-muted-foreground">
          <Num className="font-semibold text-foreground">{totalAno}</Num> no ano
          {meses > 0 && (
            <>
              {" · média de "}
              <Num className="font-semibold text-foreground">
                {media.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
              </Num>
              {" por mês com venda"}
            </>
          )}
        </p>
      </div>

      {totalAno === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nenhuma unidade vendida em {ano}.</p>
      ) : (
        <div className="mt-3 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="rotulo"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--admin-muted)" }}
              />
              <Tooltip
                cursor={{ fill: "var(--cream-soft)" }}
                formatter={(
                  v: number,
                  nome: string,
                  item: { payload?: MesDaSerie & { meta?: number | null } },
                ) => {
                  if (nome === "meta") return [`meta de ${v} cesta(s)`, ""];
                  const meta = item?.payload?.meta ?? null;
                  const falta = meta != null ? meta - v : null;
                  return [
                    `${v} ${v === 1 ? "unidade" : "unidades"} · ${item?.payload?.pedidos ?? 0} pedido(s) · ${formatBRL(item?.payload?.valor ?? 0)}` +
                      (falta != null
                        ? falta > 0
                          ? ` · faltam ${falta} para a meta`
                          : ` · meta batida com ${-falta} a mais`
                        : ""),
                    "",
                  ];
                }}
                labelFormatter={(r: string) => String(r).toUpperCase()}
                contentStyle={{
                  background: "var(--cream-soft)",
                  border: "1px solid var(--cream-deep)",
                  borderRadius: "0.75rem",
                  fontSize: "0.8rem",
                }}
              />
              {/* A meta e uma barra CLARA atras da realizada. Linha de
                  referencia unica nao serviria: a meta muda de mes para mes, e
                  uma linha reta atravessando o ano diria uma coisa falsa. */}
              <Bar dataKey="meta" radius={[6, 6, 0, 0]} fill="var(--cream)" />
              <Bar
                dataKey="principais"
                radius={[6, 6, 0, 0]}
                onClick={(d: { payload?: MesDaSerie }) => d?.payload && onEscolherMes(d.payload.mes)}
              >
                {dados.map((m) => (
                  <Cell
                    key={m.mes}
                    fill={mesAtivo === m.mes ? "var(--terracotta)" : "var(--cream-deep)"}
                    style={{ outline: "none" }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/** Pizza clicável: escolher uma fatia filtra a lista ao lado. */
/** As linhas da legenda. Extraída para o cartão e o card cheio nunca divergirem. */
function LinhasPizza({ dados, total }: { dados: VendaAgrupada[]; total: number }) {
  return (
    <>
      {dados.map((d, i) => (
        <li key={d.chave}>
          <div className="flex w-full flex-wrap items-center gap-x-2 gap-y-0.5 px-2 py-1.5 text-left text-sm sm:flex-nowrap sm:py-1">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: CORES[i % CORES.length] }}
            />
            <span className="min-w-0 flex-1 basis-[calc(100%-1.375rem)] sm:basis-auto">
              <span className="block leading-tight text-foreground">{d.nome}</span>
              {d.sub && (
                <span className="block text-[11px] leading-tight text-muted-foreground">
                  {d.sub}
                </span>
              )}
            </span>
            <span className="ml-[1.375rem] flex shrink-0 items-baseline gap-2 sm:ml-0">
              <Num className="text-xs text-muted-foreground">{formatBRL(d.valor)}</Num>
              <span className="w-8 text-right text-xs text-muted-foreground/70">
                {total > 0 ? `${Math.round((d.valor / total) * 100)}%` : ""}
              </span>
            </span>
          </div>
        </li>
      ))}
    </>
  );
}

function Pizza({
  titulo,
  dados,
  vazio,
}: {
  titulo: string;
  dados: VendaAgrupada[];
  vazio: string;
}) {
  const total = dados.reduce((t, d) => t + d.valor, 0);
  const [aberto, setAberto] = useState(false);

  /* O cartao mostra o suficiente para comparar as fatias principais; o resto
     ficava atras de um scroll de 128px que ninguem percebe que existe. O botao
     so aparece quando ha o que revelar. */
  const CABEM = 4;
  const sobram = Math.max(0, dados.length - CABEM);

  return (
    <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold text-foreground">{titulo}</h3>
        {sobram > 0 && (
          <button
            type="button"
            onClick={() => setAberto(true)}
            className="shrink-0 text-xs font-semibold text-[var(--terracotta)] hover:text-[var(--wine)]"
          >
            ver {dados.length}
          </button>
        )}
      </div>

      {dados.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{vazio}</p>
      ) : (
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="h-32 w-32 shrink-0 self-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dados}
                  dataKey="valor"
                  nameKey="nome"
                  innerRadius={30}
                  outerRadius={58}
                  paddingAngle={2}
                >
                  {dados.map((d, i) => (
                    <Cell
                      key={d.chave}
                      fill={CORES[i % CORES.length]}
                      style={{ outline: "none" }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number, nome: string, item: { payload?: VendaAgrupada }) => [
                    formatBRL(v),
                    item?.payload?.sub ? `${nome} · ${item.payload.sub}` : nome,
                  ]}
                  contentStyle={{
                    background: "var(--cream-soft)",
                    border: "1px solid var(--cream-deep)",
                    borderRadius: "0.75rem",
                    fontSize: "0.8rem",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="min-w-0 space-y-1 pr-1 sm:flex-1">
            <LinhasPizza dados={dados.slice(0, CABEM)} total={total} />
          </ul>
        </div>
      )}

      {sobram > 0 && (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="mt-2 w-full rounded-lg bg-[var(--cream)] px-3 py-2 text-xs font-semibold text-[var(--wine)] transition-colors hover:bg-[var(--cream-deep)]"
        >
          + {sobram} {sobram === 1 ? "outro" : "outros"}
        </button>
      )}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="text-left">
            <DialogTitle>{titulo}</DialogTitle>
            <DialogDescription>
              {dados.length} {dados.length === 1 ? "item" : "itens"} · {formatBRL(total)} no
              período
            </DialogDescription>
          </DialogHeader>

          <ul className="max-h-[60dvh] space-y-1 overflow-y-auto pr-1">
            <LinhasPizza dados={dados} total={total} />
          </ul>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* Barra de progresso de uma meta. Recebe o formatador porque cestas e reais
   nao se escrevem igual, e um numero cru de faturamento no meio de unidades
   confundiria mais do que informa. */
function Barra({
  rotulo,
  realizado,
  meta,
  formatar,
  sufixo,
}: {
  rotulo: string;
  realizado: number;
  meta: number;
  formatar: (v: number) => string;
  sufixo?: string;
}) {
  const bateu = realizado >= meta;
  const falta = Math.abs(meta - realizado);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="t-support text-muted-foreground">{rotulo}</span>
        <span className="t-body tabular-nums text-foreground">
          {formatar(realizado)}
          <span className="text-muted-foreground"> de {formatar(meta)}</span>
        </span>
      </div>
      {/* Barra em vez de so porcentagem: "78%" exige converter de cabeca
          quanto falta; a barra mostra. */}
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--cream)]">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            bateu ? "bg-[var(--green-ink)]" : "bg-[var(--terracotta)]",
          )}
          style={{ width: `${Math.min(100, Math.round((realizado / meta) * 100))}%` }}
        />
      </div>
      <p className="t-support mt-1 text-muted-foreground">
        {bateu ? "meta batida com " : "faltam "}
        {formatar(falta)}
        {sufixo ? ` ${sufixo}` : ""}
        {bateu ? " a mais" : ""}
      </p>
    </div>
  );
}

function Ranking({ itens }: { itens: VendaAgrupada[] }) {
  if (itens.length === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">Nada vendido no período.</p>;
  }
  const topo = itens[0]?.qtd || 1;
  return (
    <ul className="mt-3 space-y-2">
      {itens.map((i, idx) => (
        <li key={i.chave} className="flex items-center gap-2 text-sm">
          <span className="w-5 shrink-0 text-xs tabular-nums text-[var(--bronze)]">{idx + 1}º</span>
          <span className="min-w-0 flex-1 truncate text-foreground">{i.nome}</span>
          <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-[var(--cream-deep)] sm:block">
            <span
              className="block h-full rounded-full bg-[var(--terracotta)]"
              style={{ width: `${Math.max(6, (i.qtd / topo) * 100)}%` }}
            />
          </span>
          <Num className="w-20 shrink-0 text-right font-medium text-foreground">
            {i.qtd} vend{i.qtd > 1 ? "as" : "a"}
          </Num>
          <Num className="hidden w-24 shrink-0 text-right text-muted-foreground sm:block">
            {formatBRL(i.valor)}
          </Num>
        </li>
      ))}
    </ul>
  );
}

export function DashboardPanel() {
  const [mes, setMes] = useState(() => hojeISO().slice(0, 7));
  const [modo, setModo] = useState<"mes" | "ano">("mes");
  const [colecaoId, setColecaoId] = useState<string | null>(null);
  const [ocasiao, setOcasiao] = useState<string | null>(null);
  const [dados, setDados] = useState<DashboardVendas | null>(null);
  /** Qual das duas listas de cliente está aberta. null = nenhuma. */
  const [listaAberta, setListaAberta] = useState<"novos" | "recorrentes" | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [aba, setAba] = useState<"produtos" | "adicionais">("produtos");
  const [metas, setMetas] = useState<Meta[]>([]);
  const [metaAberta, setMetaAberta] = useState(false);
  /* Rascunho dos doze meses, indexado por mês. Texto e não número: o campo
     controlado precisa aceitar o estado intermediário de quem está apagando. */
  const [rascunhoMetas, setRascunhoMetas] = useState<
    Record<number, { cestas: string; dinheiro: string }>
  >({});
  const [salvandoMeta, setSalvandoMeta] = useState(false);

  const [anoSelecionado, mesSelecionado] = mes.split("-");
  const anoAtual = Number(hojeISO().slice(0, 4));
  const mesAtual = Number(hojeISO().slice(5, 7));
  const periodo = useMemo(
    () => (modo === "ano" ? anoDe(anoSelecionado) : mesDe(`${mes}-01`)),
    [modo, anoSelecionado, mes],
  );
  const anos = useMemo(() => {
    const atual = Number(hojeISO().slice(0, 4));
    return Array.from({ length: 6 }, (_, indice) => String(atual - indice));
  }, []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      setDados(
        (await carregarDashboard({ data: { ...periodo, colecaoId, ocasiao } })) as DashboardVendas,
      );
    } catch {
      setDados(null);
    }
    setCarregando(false);
  }, [periodo, colecaoId, ocasiao]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const carregarMetas = useCallback(async () => {
    try {
      const r = await carregarMetasDoAno({ data: { ano: Number(anoSelecionado) } });
      setMetas(r.metas);
    } catch {
      // Sem meta a tela funciona igual: o gráfico só não desenha o marcador.
      setMetas([]);
    }
  }, [anoSelecionado]);

  useEffect(() => {
    carregarMetas();
  }, [carregarMetas]);

  const metasPorMes = useMemo(
    () =>
      new Map(
        metas.filter((m) => m.metaCestas != null).map((m) => [m.mes, m.metaCestas as number]),
      ),
    [metas],
  );

  const metasDinheiroPorMes = useMemo(
    () =>
      new Map(
        metas
          .filter((m) => m.metaFaturamento != null)
          .map((m) => [m.mes, m.metaFaturamento as number]),
      ),
    [metas],
  );

  /* A meta é do MÊS, então só faz sentido no modo mês. No ano inteiro o
     gráfico mostra as doze e não há um número único a comparar. */
  const mesDaMeta = Number(mesSelecionado);
  const metaDoMes = metasPorMes.get(mesDaMeta) ?? null;
  const realizadoDoMes = dados?.unidades.principais ?? 0;
  const metaDinheiroDoMes = metasDinheiroPorMes.get(mesDaMeta) ?? null;
  const realizadoDinheiro = dados?.totalVendido ?? 0;

  async function gravarMetas() {
    setSalvandoMeta(true);
    try {
      const r = await salvarMetasDoAno({
        data: {
          ano: Number(anoSelecionado),
          metas: Array.from({ length: 12 }, (_, i) => ({
            mes: i + 1,
            metaCestas: Number(rascunhoMetas[i + 1]?.cestas ?? "") || null,
            metaFaturamento: Number(rascunhoMetas[i + 1]?.dinheiro ?? "") || null,
          })),
        },
      });
      if (r?.erro) {
        toast.error(r.erro);
        return;
      }
      toast.success("Metas salvas.");
      setMetaAberta(false);
      await carregarMetas();
    } catch (e) {
      toast.error(mensagemDeErro(e, "salvar as metas"));
    } finally {
      setSalvandoMeta(false);
    }
  }

  const lista = aba === "produtos" ? (dados?.produtos ?? []) : (dados?.adicionais ?? []);

  return (
    <section>
      <PageHeader
        titulo="Dashboard"
        descricao="Dinheiro conta quando entra: faturamento e ticket usam a data do pagamento. Cestas contam quando saem: a data de entrega. Cancelados ficam fora."
        acoes={
          <div className="grid w-full grid-cols-2 items-end gap-2 sm:flex sm:w-auto sm:flex-wrap">
            <Button
              variant="outline"
              className="col-span-2 h-11 sm:h-9"
              onClick={() => {
                setRascunhoMetas(
                  Object.fromEntries(
                    Array.from({ length: 12 }, (_, i) => [
                      i + 1,
                      {
                        cestas: metasPorMes.get(i + 1) ? String(metasPorMes.get(i + 1)) : "",
                        dinheiro: metasDinheiroPorMes.get(i + 1)
                          ? String(metasDinheiroPorMes.get(i + 1))
                          : "",
                      },
                    ]),
                  ),
                );
                setMetaAberta(true);
              }}
            >
              <Target className="mr-1.5 h-4 w-4" />
              Metas de {anoSelecionado}
            </Button>

            <label className="grid gap-1 text-xs text-muted-foreground">
              Período
              <div className="flex h-11 gap-1 rounded-lg border border-[var(--cream-deep)] p-0.5 sm:h-9">
                {(
                  [
                    { v: "mes", label: "Mês" },
                    { v: "ano", label: "Ano" },
                  ] as const
                ).map(({ v, label }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setModo(v)}
                    className={cn(
                      "rounded-md px-3 text-sm font-medium transition-colors",
                      modo === v
                        ? "bg-[var(--terracotta)] text-[var(--cream-soft)]"
                        : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </label>

            {modo === "mes" && (
              <label className="grid gap-1 text-xs text-muted-foreground">
                Mês
                <select
                  value={mesSelecionado}
                  onChange={(e) => setMes(`${anoSelecionado}-${e.target.value}`)}
                  className="h-11 min-w-0 rounded-lg border border-[var(--cream-deep)] bg-background px-3 text-base text-foreground outline-none focus:border-[var(--terracotta)] sm:h-9 sm:min-w-36 sm:text-sm"
                >
                  {MESES.map((nome, indice) => (
                    <option key={nome} value={String(indice + 1).padStart(2, "0")}>
                      {nome}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="grid gap-1 text-xs text-muted-foreground">
              Ano
              <select
                value={anoSelecionado}
                onChange={(e) => setMes(`${e.target.value}-${mesSelecionado}`)}
                className="h-11 min-w-0 rounded-lg border border-[var(--cream-deep)] bg-background px-3 text-base text-foreground outline-none focus:border-[var(--terracotta)] sm:h-9 sm:min-w-28 sm:text-sm"
              >
                {anos.map((ano) => (
                  <option key={ano} value={ano}>
                    {ano}
                  </option>
                ))}
              </select>
            </label>
          </div>
        }
      />

      {/* Seletores, e nao chips: eram quatro colecoes e ja ocupavam uma
          fileira inteira; com ocasiao entrando ao lado, viraria um mural. E o
          seletor diz o que esta filtrado mesmo quando a lista e longa. */}
      {dados && (dados.colecoes.length > 0 || dados.ocasioes.length > 0) && (
        <div className="mb-4 flex flex-wrap items-end gap-3">
          {dados.colecoes.length > 0 && (
            <label className="min-w-0 flex-1 space-y-1.5 text-sm font-medium sm:max-w-56">
              <span className="block">Coleção</span>
              <select
                value={colecaoId ?? ""}
                onChange={(e) => setColecaoId(e.target.value || null)}
                className="h-10 w-full rounded-xl border border-[var(--admin-border)] bg-white px-3 text-sm"
              >
                <option value="">Todas as coleções</option>
                {dados.colecoes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
          )}

          {dados.ocasioes.length > 0 && (
            <label className="min-w-0 flex-1 space-y-1.5 text-sm font-medium sm:max-w-56">
              <span className="block">Ocasião</span>
              <select
                value={ocasiao ?? ""}
                onChange={(e) => setOcasiao(e.target.value || null)}
                className="h-10 w-full rounded-xl border border-[var(--admin-border)] bg-white px-3 text-sm"
              >
                <option value="">Todas as ocasiões</option>
                {dados.ocasioes.map((slug) => (
                  <option key={slug} value={slug}>
                    {rotuloOcasiao(slug) ?? slug}
                  </option>
                ))}
              </select>
            </label>
          )}

          {(colecaoId || ocasiao) && (
            <Button
              variant="outline"
              className="h-10"
              onClick={() => {
                setColecaoId(null);
                setOcasiao(null);
              }}
            >
              Limpar
            </Button>
          )}
        </div>
      )}

      <Dialog open={metaAberta} onOpenChange={setMetaAberta}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="text-left">
            <DialogTitle>Metas de {anoSelecionado}</DialogTitle>
            <DialogDescription>
              As duas são independentes: dá para definir só cestas, só faturamento, ou as
              duas. Cestas conta o mesmo que o cartão “Cestas entregues” — adicionais não
              entram. Mês com os dois em branco fica sem meta.
            </DialogDescription>
          </DialogHeader>

          {/* Os doze de uma vez: é olhando a sazonalidade do ano que se decide
              o número de cada mês. Um a um, a pessoa fecharia e reabriria doze
              vezes sem nunca ver o conjunto. */}
          {/* Cabecalho das colunas: sem ele, dois campos numericos lado a lado
              nao dizem qual e qual. */}
          <div className="flex items-center gap-3 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="w-10 shrink-0" />
            <span className="w-20 shrink-0 text-center">Cestas</span>
            <span className="w-28 shrink-0 text-center">Faturamento</span>
            <span className="min-w-0 flex-1">Realizado</span>
          </div>

          {/* Os doze de uma vez: é olhando a sazonalidade do ano que se decide
              o número de cada mês. Um a um, a pessoa fecharia e reabriria doze
              vezes sem nunca ver o conjunto. */}
          <ul className="max-h-[55dvh] space-y-1 overflow-y-auto pr-1">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
              const serie = dados?.serieMensal.find((x) => x.mes === m);
              const realizado = serie?.principais ?? 0;
              const faturado = serie?.valor ?? 0;
              const alvo = Number(rascunhoMetas[m]?.cestas ?? "") || null;
              const alvoDinheiro = Number(rascunhoMetas[m]?.dinheiro ?? "") || null;
              const passou =
                Number(anoSelecionado) < anoAtual ||
                (Number(anoSelecionado) === anoAtual && m < mesAtual);

              return (
                <li
                  key={m}
                  className="flex items-center gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--cream-soft)] px-3 py-2"
                >
                  <span className="w-10 shrink-0 text-sm font-semibold uppercase text-foreground">
                    {MESES_CURTOS[m - 1]}
                  </span>

                  <Input
                    value={rascunhoMetas[m]?.cestas ?? ""}
                    onChange={(e) =>
                      setRascunhoMetas((v) => ({
                        ...v,
                        [m]: {
                          cestas: e.target.value.replace(/\D/g, ""),
                          dinheiro: v[m]?.dinheiro ?? "",
                        },
                      }))
                    }
                    inputMode="numeric"
                    placeholder="—"
                    className="h-9 w-20 shrink-0 bg-white text-center"
                    aria-label={`Meta de cestas de ${MESES_CURTOS[m - 1]}`}
                  />

                  <Input
                    value={rascunhoMetas[m]?.dinheiro ?? ""}
                    onChange={(e) =>
                      setRascunhoMetas((v) => ({
                        ...v,
                        [m]: {
                          cestas: v[m]?.cestas ?? "",
                          dinheiro: e.target.value.replace(/\D/g, ""),
                        },
                      }))
                    }
                    inputMode="numeric"
                    placeholder="—"
                    className="h-9 w-28 shrink-0 bg-white text-center"
                    aria-label={`Meta de faturamento de ${MESES_CURTOS[m - 1]}`}
                  />

                  {/* Só mês que já passou compara: em mês corrente ou futuro o
                      realizado ainda vai mudar, e dizer "faltam 30" no dia 2
                      seria alarme falso. */}
                  <span className="t-support min-w-0 flex-1 leading-tight text-muted-foreground">
                    {passou ? (
                      <>
                        <span className="block">
                          {alvo ? (
                            <>
                              <b
                                className={
                                  realizado >= alvo
                                    ? "text-[var(--green-ink)]"
                                    : "text-[var(--terracotta)]"
                                }
                              >
                                {realizado}
                              </b>{" "}
                              de {alvo} cestas
                            </>
                          ) : (
                            `${realizado} cestas`
                          )}
                        </span>
                        <span className="block">
                          {alvoDinheiro ? (
                            <b
                              className={
                                faturado >= alvoDinheiro
                                  ? "text-[var(--green-ink)]"
                                  : "text-[var(--terracotta)]"
                              }
                            >
                              {formatBRL(faturado)}
                            </b>
                          ) : (
                            formatBRL(faturado)
                          )}
                        </span>
                      </>
                    ) : realizado > 0 || faturado > 0 ? (
                      `${realizado} cestas · ${formatBRL(faturado)} até agora`
                    ) : (
                      ""
                    )}
                  </span>
                </li>
              );
            })}
          </ul>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMetaAberta(false)} disabled={salvandoMeta}>
              Cancelar
            </Button>
            <Button onClick={gravarMetas} disabled={salvandoMeta}>
              {salvandoMeta ? "Salvando…" : "Salvar o ano"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {carregando && <Carregando texto="somando as vendas…" />}

      {!carregando && dados && dados.totalPedidos === 0 && (
        <EstadoVazio
          titulo="Nenhuma venda no período"
          descricao="Nada recebido nem entregue neste período. Pedido em aberto só aparece aqui quando o dinheiro entra ou a cesta sai."
        />
      )}

      {!carregando && dados && dados.totalPedidos > 0 && (
        // Rola a pagina inteira, nao o miolo. Com o ranking preso a uma altura
        // fixa, os ultimos colocados ficavam escondidos atras de uma barra de
        // rolagem interna que ninguem via.
        <div className="flex flex-col">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Cartao
              titulo={modo === "ano" ? "Recebido no ano" : "Recebido no mês"}
              valor={formatBRL(dados.totalVendido)}
              variacao={
                dados.anterior ? (
                  <Variacao
                    atual={dados.totalVendido}
                    anterior={dados.anterior.valor}
                    rotulo={dados.rotuloAnterior}
                  />
                ) : null
              }
            />
            <Cartao
              titulo="Pedidos pagos"
              valor={String(dados.totalPedidos)}
              variacao={
                dados.anterior ? (
                  <Variacao
                    atual={dados.totalPedidos}
                    anterior={dados.anterior.pedidos}
                    rotulo={dados.rotuloAnterior}
                  />
                ) : null
              }
            />
            {/* O numero sobre o qual se estipula meta: unidades, nao reais. */}
            <Cartao
              titulo="Cestas entregues"
              valor={String(dados.unidades.principais)}
              nota={
                dados.unidades.adicionais > 0
                  ? `+ ${dados.unidades.adicionais} adicionais`
                  : undefined
              }
              variacao={
                dados.anterior ? (
                  <Variacao
                    atual={dados.unidades.principais}
                    anterior={dados.anterior.principais}
                    rotulo={dados.rotuloAnterior}
                  />
                ) : null
              }
            />
            <Cartao
              titulo="Ticket médio"
              valor={formatBRL(dados.ticketMedio)}
              nota={
                dados.totalPedidos
                  ? `${(dados.unidades.principais / dados.totalPedidos).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} cesta(s) por pedido`
                  : undefined
              }
            />
            {/* "Nova" e quem comprou pela PRIMEIRA vez no periodo — nao quem foi
                cadastrada nele. O numero grande e a aquisicao, porque e sobre
                ela que se decide investir; a recompra vem na nota, junto com a
                fatia, que e o que diz se a base esta girando ou sendo trocada. */}
            {modo === "mes" && (
              <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="t-support uppercase tracking-wide text-muted-foreground">
                    Meta do mês
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setRascunhoMetas(
                  Object.fromEntries(
                    Array.from({ length: 12 }, (_, i) => [
                      i + 1,
                      {
                        cestas: metasPorMes.get(i + 1) ? String(metasPorMes.get(i + 1)) : "",
                        dinheiro: metasDinheiroPorMes.get(i + 1)
                          ? String(metasDinheiroPorMes.get(i + 1))
                          : "",
                      },
                    ]),
                  ),
                );
                      setMetaAberta(true);
                    }}
                    className="shrink-0 text-xs font-semibold text-[var(--terracotta)] hover:text-[var(--wine)]"
                  >
                    {metaDoMes ? "alterar" : "definir"}
                  </button>
                </div>

                {metaDoMes == null && metaDinheiroDoMes == null ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Sem meta. O gráfico do ano ao lado mostra a sazonalidade — é dele que sai um
                    número que não é chute.
                  </p>
                ) : (
                  <div className="mt-1 space-y-3">
                    {/* Uma barra por meta, cada uma com a sua unidade. Somar as
                        duas num numero so esconderia o caso que interessa:
                        bater o dinheiro vendendo menos cesta mais cara. */}
                    {metaDoMes != null && (
                      <Barra
                        rotulo="Cestas"
                        realizado={realizadoDoMes}
                        meta={metaDoMes}
                        formatar={(v) => String(v)}
                        sufixo="cesta(s)"
                      />
                    )}
                    {metaDinheiroDoMes != null && (
                      <Barra
                        rotulo="Faturamento"
                        realizado={realizadoDinheiro}
                        meta={metaDinheiroDoMes}
                        formatar={formatBRL}
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Dois cartões, não um com o outro número na nota. Eram duas
                perguntas diferentes disputando o mesmo lugar: quantas cheguei
                a conquistar, e quantas voltaram. A segunda vivia como rodapé
                da primeira, em letra pequena, e é a que sustenta o negócio. */}
            <Cartao
              titulo="Clientes novas"
              valor={String(dados.clientes.novos)}
              nota={
                dados.clientes.total
                  ? `${Math.round((dados.clientes.novos / dados.clientes.total) * 100)}% de quem comprou`
                  : "ninguém comprou no período"
              }
              onAbrir={
                dados.clientes.novos ? () => setListaAberta("novos") : undefined
              }
            />

            <Cartao
              titulo="Clientes recorrentes"
              valor={String(dados.clientes.recorrentes)}
              nota={
                dados.clientes.total
                  ? `${Math.round((dados.clientes.recorrentes / dados.clientes.total) * 100)}% de quem comprou`
                  : "ninguém comprou no período"
              }
              onAbrir={
                dados.clientes.recorrentes ? () => setListaAberta("recorrentes") : undefined
              }
            />
          </div>

          {listaAberta && (
            <DialogoClientes
              titulo={listaAberta === "novos" ? "Clientes novas" : "Clientes recorrentes"}
              descricao={
                listaAberta === "novos"
                  ? "Quem fez a primeira compra dentro do período. Ordenadas pelo quanto compraram."
                  : "Quem já tinha comprado antes e voltou no período. Ordenadas pelo quanto compraram."
              }
              lista={
                listaAberta === "novos"
                  ? dados.clientes.listaNovos
                  : dados.clientes.listaRecorrentes
              }
              onFechar={() => setListaAberta(null)}
            />
          )}

          <div className="mt-3">
            <EvolucaoAno
              serie={dados.serieMensal}
              ano={anoSelecionado}
              mesAtivo={modo === "ano" ? null : Number(mesSelecionado)}
              metas={metasPorMes}
              onEscolherMes={(m) => {
                setModo("mes");
                setMes(`${anoSelecionado}-${String(m).padStart(2, "0")}`);
              }}
            />
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <Pizza
              titulo="Por categoria"
              dados={dados.porCategoria}
              vazio="Sem vendas categorizadas."
            />
            <Pizza
              titulo="Por coleção"
              dados={dados.porColecao}
              vazio="Sem vendas por coleção."
            />
            <Pizza
              titulo="Por forma de pagamento"
              dados={dados.porPagamento}
              vazio="Nenhuma forma registrada."
            />
          </div>

          <div className="mt-3 flex flex-col rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground">Mais vendidos</h3>
              <div className="ml-auto flex gap-1 rounded-full border border-[var(--cream-deep)] p-0.5">
                {(
                  [
                    { v: "produtos", label: `Cestas e presentes (${dados.produtos.length})` },
                    { v: "adicionais", label: `Adicionais (${dados.adicionais.length})` },
                  ] as const
                ).map(({ v, label }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAba(v)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      aba === v
                        ? "bg-[var(--terracotta)] text-[var(--cream-soft)]"
                        : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <Ranking itens={lista} />

            {/* Taxa de anexo: o numero que diz se vale empurrar adicional.
                Fica sob a aba de Adicionais porque so faz sentido junto dela. */}
            {aba === "adicionais" && (
              <div className="mt-4 grid shrink-0 gap-3 border-t border-[var(--cream-deep)] pt-4 sm:grid-cols-3">
                <div>
                  <p className="t-support text-muted-foreground">Levaram adicional</p>
                  <p className="t-hero text-foreground">
                    {(dados.anexo.taxa * 100).toFixed(0)}%
                  </p>
                  <p className="t-support text-muted-foreground">
                    {dados.anexo.comAdicional} de{" "}
                    {dados.anexo.comAdicional + dados.anexo.semAdicional} pedidos com cesta
                  </p>
                </div>

                <div>
                  <p className="t-support text-muted-foreground">O adicional soma</p>
                  <p className="t-hero text-foreground">
                    {formatBRL(
                      Math.max(
                        0,
                        dados.anexo.ticketComAdicional - dados.anexo.ticketSemAdicional,
                      ),
                    )}
                  </p>
                  <p className="t-support text-muted-foreground">
                    a mais por pedido, no ticket médio
                  </p>
                </div>

                <div>
                  <p className="t-support text-muted-foreground">Vendidos sozinhos</p>
                  <p className="t-hero text-foreground">{dados.anexo.soAdicional}</p>
                  <p className="t-support text-muted-foreground">
                    pedidos só de adicional, sem cesta
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
