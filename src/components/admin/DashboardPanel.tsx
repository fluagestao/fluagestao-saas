import { useCallback, useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { hojeISO } from "@/lib/prazo";
import { carregarDashboard } from "@/lib/pedidos";
import type { DashboardVendas, VendaAgrupada } from "@/lib/pedidos-ops.server";
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

function mesDe(iso: string) {
  const [ano, mes] = iso.split("-").map(Number);
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const mm = String(mes).padStart(2, "0");
  return { de: `${ano}-${mm}-01`, ate: `${ano}-${mm}-${ultimo}` };
}

function Cartao({ titulo, valor, nota }: { titulo: string; valor: string; nota?: string }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
      <p className="text-xs uppercase tracking-[0.14em] text-[var(--bronze)]">{titulo}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{valor}</p>
      {nota && <p className="mt-0.5 text-xs text-muted-foreground">{nota}</p>}
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
        // Empilhado: com três cartões lado a lado não há largura pra gráfico e
        // legenda na mesma linha, e o nome da categoria acabava espremido.
        <div className="mt-2 flex flex-col items-center gap-3">
          <div className="h-40 w-40 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dados}
                  dataKey="valor"
                  nameKey="nome"
                  innerRadius={38}
                  outerRadius={70}
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
                      // A fatia escolhida fica sólida; as outras recuam.
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

          <ul className="w-full min-w-0 space-y-1">
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
  const [colecaoId, setColecaoId] = useState<string | null>(null);
  const [dados, setDados] = useState<DashboardVendas | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [aba, setAba] = useState<"produtos" | "adicionais">("produtos");
  const [categoriaSel, setCategoriaSel] = useState<string | null>(null);
  const [formaSel, setFormaSel] = useState<string | null>(null);

  const periodo = useMemo(() => mesDe(`${mes}-01`), [mes]);

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
    <section>
      <PageHeader
        titulo="Dashboard"
        descricao="O que vendeu no período, separado por coleção, categoria e tipo de item. Conta todo pedido do período, menos os cancelados."
        acoes={
          <>
            <Input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="h-9 w-[10rem]"
            />
          </>
        }
      />

      {/* filtro por coleção */}
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
          descricao="Só entram pedidos entregues. Se vendeu e ainda não marcou como entregue, ele não aparece aqui."
        />
      )}

      {!carregando && dados && dados.totalPedidos > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Cartao titulo="Vendido no mês" valor={formatBRL(dados.totalVendido)} />
            <Cartao titulo="Pedidos" valor={String(dados.totalPedidos)} />
            <Cartao titulo="Ticket médio" valor={formatBRL(dados.ticketMedio)} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
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

          {/* mais vendidos, separando cesta de adicional */}
          <div className="mt-4 rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center gap-2">
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
          </div>
        </>
      )}
    </section>
  );
}
