import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

import { cn } from "@/lib/utils";
import { hojeISO } from "@/lib/prazo";
import { carregarDashboard } from "@/lib/pedidos";
import type { DashboardVendas, MesDaSerie, VendaAgrupada } from "@/lib/pedidos-ops.server";
import { formatBRL } from "@/lib/vendas";
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
}: {
  titulo: string;
  valor: string;
  nota?: React.ReactNode;
  variacao?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
      <p className="text-xs uppercase tracking-[0.14em] text-[var(--bronze)]">{titulo}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{valor}</p>
      {(nota || variacao) && (
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
          {nota}
          {variacao}
        </p>
      )}
    </div>
  );
}

/* Quantas unidades sairam por mes no ano. E o grafico que permite estipular
   meta: sem ver a sazonalidade, qualquer numero de meta e chute. */
function EvolucaoAno({
  serie,
  ano,
  mesAtivo,
  onEscolherMes,
}: {
  serie: MesDaSerie[];
  ano: string;
  /** 1 a 12, ou null quando o periodo e o ano inteiro. */
  mesAtivo: number | null;
  onEscolherMes: (mes: number) => void;
}) {
  const totalAno = serie.reduce((t, m) => t + m.principais, 0);
  const meses = serie.filter((m) => m.pedidos > 0).length;
  const media = meses ? totalAno / meses : 0;
  const dados = serie.map((m) => ({ ...m, rotulo: MESES_CURTOS[m.mes - 1] }));

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
                formatter={(v: number, _n, item: { payload?: MesDaSerie }) => [
                  `${v} ${v === 1 ? "unidade" : "unidades"} · ${item?.payload?.pedidos ?? 0} pedido(s) · ${formatBRL(item?.payload?.valor ?? 0)}`,
                  "",
                ]}
                labelFormatter={(r: string) => String(r).toUpperCase()}
                contentStyle={{
                  background: "var(--cream-soft)",
                  border: "1px solid var(--cream-deep)",
                  borderRadius: "0.75rem",
                  fontSize: "0.8rem",
                }}
              />
              <Bar
                dataKey="principais"
                radius={[6, 6, 0, 0]}
                onClick={(d: { payload?: MesDaSerie }) => d?.payload && onEscolherMes(d.payload.mes)}
              >
                {dados.map((m) => (
                  <Cell
                    key={m.mes}
                    fill={mesAtivo === m.mes ? "var(--terracotta)" : "var(--cream-deep)"}
                    style={{ cursor: "pointer", outline: "none" }}
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
function Pizza({
  titulo,
  dados,
  selecionado,
  onSelecionar,
  vazio,
}: {
  titulo: string;
  dados: VendaAgrupada[];
  selecionado: string | null;
  onSelecionar: (chave: string | null) => void;
  vazio: string;
}) {
  const total = dados.reduce((t, d) => t + d.valor, 0);

  return (
    <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
      <h3 className="text-lg font-semibold text-foreground">{titulo}</h3>

      {dados.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{vazio}</p>
      ) : (
        <div className="mt-2 flex items-center gap-3">
          <div className="h-32 w-32 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dados}
                  dataKey="valor"
                  nameKey="nome"
                  innerRadius={30}
                  outerRadius={58}
                  paddingAngle={2}
                  onClick={(d: { payload?: VendaAgrupada }) => {
                    const chave = d?.payload?.chave ?? null;
                    onSelecionar(selecionado === chave ? null : chave);
                  }}
                >
                  {dados.map((d, i) => (
                    <Cell
                      key={d.chave}
                      fill={CORES[i % CORES.length]}
                      opacity={selecionado && selecionado !== d.chave ? 0.35 : 1}
                      style={{ cursor: "pointer", outline: "none" }}
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

          <ul className="max-h-32 min-w-0 flex-1 space-y-1 overflow-y-auto pr-1">
            {dados.map((d, i) => (
              <li key={d.chave}>
                <button
                  type="button"
                  onClick={() => onSelecionar(selecionado === d.chave ? null : d.chave)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-sm transition-colors hover:bg-[var(--cream-soft)]",
                    selecionado === d.chave && "bg-[var(--cream-deep)]",
                  )}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: CORES[i % CORES.length] }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block leading-tight text-foreground">{d.nome}</span>
                    {d.sub && (
                      <span className="block text-[11px] leading-tight text-muted-foreground">
                        {d.sub}
                      </span>
                    )}
                  </span>
                  <Num className="shrink-0 text-xs text-muted-foreground">{formatBRL(d.valor)}</Num>
                  <span className="w-8 shrink-0 text-right text-xs text-muted-foreground/70">
                    {total > 0 ? `${Math.round((d.valor / total) * 100)}%` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
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
      {itens.slice(0, 12).map((i, idx) => (
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
  const [dados, setDados] = useState<DashboardVendas | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [aba, setAba] = useState<"produtos" | "adicionais">("produtos");
  const [categoriaSel, setCategoriaSel] = useState<string | null>(null);
  const [formaSel, setFormaSel] = useState<string | null>(null);

  const [anoSelecionado, mesSelecionado] = mes.split("-");
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
      setDados((await carregarDashboard({ data: { ...periodo, colecaoId } })) as DashboardVendas);
    } catch {
      setDados(null);
    }
    setCarregando(false);
  }, [periodo, colecaoId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const lista = aba === "produtos" ? (dados?.produtos ?? []) : (dados?.adicionais ?? []);

  return (
    <section data-tela-cheia>
      <PageHeader
        titulo="Dashboard"
        descricao="O que vendeu no período, separado por coleção, categoria e tipo de item. Conta pelo dia em que o pedido entrou, e ignora os cancelados."
        acoes={
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-xs text-muted-foreground">
              Período
              <div className="flex h-9 gap-1 rounded-lg border border-[var(--cream-deep)] p-0.5">
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
                  className="h-9 min-w-36 rounded-lg border border-[var(--cream-deep)] bg-background px-3 text-sm text-foreground outline-none focus:border-[var(--terracotta)]"
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
                className="h-9 min-w-28 rounded-lg border border-[var(--cream-deep)] bg-background px-3 text-sm text-foreground outline-none focus:border-[var(--terracotta)]"
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

      {dados && dados.colecoes.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setColecaoId(null)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              !colecaoId
                ? "bg-[var(--terracotta)] text-[var(--cream-soft)]"
                : "border border-[var(--cream-deep)] bg-card text-foreground",
            )}
          >
            Todas as coleções
          </button>
          {dados.colecoes.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setColecaoId(c.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                colecaoId === c.id
                  ? "bg-[var(--terracotta)] text-[var(--cream-soft)]"
                  : "border border-[var(--cream-deep)] bg-card text-foreground",
              )}
            >
              {c.nome}
            </button>
          ))}
        </div>
      )}

      {carregando && <Carregando texto="somando as vendas…" />}

      {!carregando && dados && dados.totalPedidos === 0 && (
        <EstadoVazio
          titulo="Nenhuma venda no período"
          descricao="Entram todos os pedidos que entraram no período, entregues ou não — só os cancelados ficam de fora."
        />
      )}

      {!carregando && dados && dados.totalPedidos > 0 && (
        // Nada aqui rola: quem rola e a lista dentro do card de Mais vendidos.
        // Rolar o miolo inteiro cortava o card de KPI na metade.
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Cartao
              titulo={modo === "ano" ? "Vendido no ano" : "Vendido no mês"}
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
              titulo="Pedidos"
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
              titulo="Cestas vendidas"
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
          </div>

          <div className="mt-3">
            <EvolucaoAno
              serie={dados.serieMensal}
              ano={anoSelecionado}
              mesAtivo={modo === "ano" ? null : Number(mesSelecionado)}
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
              selecionado={categoriaSel}
              onSelecionar={setCategoriaSel}
              vazio="Sem vendas categorizadas."
            />
            <Pizza
              titulo="Por coleção"
              dados={dados.porColecao}
              selecionado={colecaoId}
              onSelecionar={setColecaoId}
              vazio="Sem vendas por coleção."
            />
            <Pizza
              titulo="Por forma de pagamento"
              dados={dados.porPagamento}
              selecionado={formaSel}
              onSelecionar={setFormaSel}
              vazio="Nenhuma forma registrada."
            />
          </div>

          <div className="mt-3 flex min-h-0 flex-1 flex-col rounded-2xl bg-card p-4 shadow-[var(--shadow-card)] lg:min-h-[232px]">
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
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <Ranking itens={lista} />
            </div>

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
