import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CircleCheck,
  CircleDollarSign,
  Loader2,
  Package,
  Pencil,
  Plus,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatarDataLonga, hojeISO } from "@/lib/prazo";
import { carregarFaturamentoDoMes, carregarResumoPedidos } from "@/lib/pedidos";
import {
  carregarTarefas,
  carregarVersiculo,
  marcarTarefa,
  salvarMeuNome,
} from "@/lib/tarefas";
import type { Tarefa } from "@/lib/tarefas-ops.server";
import {
  dataLocalISO,
  formatBRL,
  resumoVendas,
  type Pedido,
} from "@/lib/vendas";
import { saudacao, versiculoDoDia } from "@/lib/versiculos";
import { Num } from "./shell";

type FaturamentoMes = Awaited<ReturnType<typeof carregarFaturamentoDoMes>>;

type DestinoInicio =
  | "vendas"
  | "calendario"
  | "tarefas"
  | "cadastros"
  | "financeiro"
  | "produtos";

function dataParaDate(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d);
}

function dataCurta(iso: string) {
  return dataParaDate(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function diaSemanaCurto(iso: string) {
  return dataParaDate(iso)
    .toLocaleDateString("pt-BR", { weekday: "short" })
    .replace(".", "")
    .toUpperCase();
}

function itensResumo(pedido: Pedido) {
  if (!pedido.itens?.length) return "Sem itens informados";
  return pedido.itens
    .slice(0, 2)
    .map((item) => `${item.qtd}x ${item.nome}`)
    .join(" · ");
}

function Kpi({
  titulo,
  valor,
  nota,
  icon: Icon,
  detalheClass = "text-[var(--admin-muted)]",
}: {
  titulo: string;
  valor: string;
  nota: string;
  icon: typeof CircleDollarSign;
  detalheClass?: string;
}) {
  return (
    <article className="flex min-h-[104px] min-w-0 items-center gap-3 card-panel p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--peach)] text-[var(--coral)]">
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <p className="t-support truncate text-[var(--admin-ink-soft)]">{titulo}</p>
        <p className="t-hero mt-1 truncate text-[var(--admin-ink)]">
          <Num>{valor}</Num>
        </p>
        {nota && <p className={`t-support mt-1.5 truncate ${detalheClass}`}>{nota}</p>}
      </div>
    </article>
  );
}

function CabecalhoCard({
  titulo,
  acao,
  onClick,
  children,
}: {
  titulo: string;
  acao?: string;
  onClick?: () => void;
  /** Slot à direita, para controles como o alternador de mês. */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-12 shrink-0 items-center justify-between gap-3 border-b border-[var(--admin-border)] px-4">
      <h3 className="t-title text-[var(--admin-ink)]">{titulo}</h3>
      {children}
      {acao && onClick && (
        <button
          type="button"
          onClick={onClick}
          className="t-support inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-[var(--coral)] transition-colors hover:bg-[var(--peach)]"
        >
          {acao} <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/** Vazio no padrão do painel: ícone + frase curta + explicação. */
function Vazio({
  titulo,
  descricao,
  icon: Icon = CircleCheck,
  destaque = false,
}: {
  titulo: string;
  descricao: string;
  icon?: typeof CircleCheck;
  destaque?: boolean;
}) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center px-5 py-4 text-center">
      <span className={`grid place-items-center rounded-full bg-[var(--peach)] text-[var(--coral)] ring-8 ring-[var(--peach-soft)] ${destaque ? "h-12 w-12" : "h-10 w-10"}`}>
        <Icon className={destaque ? "h-6 w-6" : "h-5 w-5"} strokeWidth={1.5} />
      </span>
      <p className={`t-item text-[var(--admin-ink)] ${destaque ? "mt-4" : "mt-3"}`}>{titulo}</p>
      <p className="t-support mt-1 max-w-sm text-[var(--admin-muted)]">{descricao}</p>
    </div>
  );
}

/** 12345 → "12k"; 1500 → "1,5k"; 900 → "900". */
function rotuloEixo(valor: number) {
  if (valor >= 10000) return `${Math.round(valor / 1000)}k`;
  if (valor >= 1000) return `${(valor / 1000).toFixed(1).replace(".", ",")}k`;
  return String(Math.round(valor));
}

export function InicioPanel({ onIrPara }: { onIrPara: (aba: DestinoInicio) => void }) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [nome, setNome] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [editandoNome, setEditandoNome] = useState(false);
  const [nomeRascunho, setNomeRascunho] = useState("");

  const [periodo, setPeriodo] = useState<"atual" | "anterior">("atual");
  const [mesPassado, setMesPassado] = useState<FaturamentoMes | null>(null);
  const [carregandoMes, setCarregandoMes] = useState(false);

  const hoje = hojeISO();
  const [versiculo, setVersiculo] = useState(() => versiculoDoDia(hoje));

  useEffect(() => {
    carregarVersiculo({ data: { data: hoje } })
      .then((v) => v && setVersiculo(v))
      .catch(() => {});
  }, [hoje]);

  const carregar = useCallback(async () => {
    const [ped, tar] = await Promise.allSettled([
      carregarResumoPedidos(),
      carregarTarefas(),
    ]);

    if (ped.status === "fulfilled") setPedidos(ped.value as Pedido[]);
    if (tar.status === "fulfilled") {
      setTarefas(tar.value.tarefas as Tarefa[]);
      setNome(tar.value.nome);
      setEmail(tar.value.email);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const resumo = useMemo(() => resumoVendas(pedidos), [pedidos]);
  const primeiroCru = (nome ?? email.split("@")[0] ?? "").trim().split(/\s+/)[0] ?? "";
  // So a exibicao: "lucas" digitado em minusculo vira "Lucas" no titulo.
  const primeiro = primeiroCru ? primeiroCru[0].toUpperCase() + primeiroCru.slice(1) : "";

  const abertos = useMemo(
    () =>
      [...pedidos]
        .filter((p) => !["entregue", "cancelado"].includes(p.status))
        .sort((a, b) => (a.data_entrega ?? "9999").localeCompare(b.data_entrega ?? "9999")),
    [pedidos],
  );

  const entregasHoje = useMemo(
    () => abertos.filter((p) => p.data_entrega === hoje),
    [abertos, hoje],
  );

  const proximosSete = useMemo(() => {
    const inicio = dataParaDate(hoje);
    const limite = new Date(inicio);
    limite.setDate(limite.getDate() + 7);
    return abertos
      .filter((p) => {
        if (!p.data_entrega || p.data_entrega === hoje) return false;
        const d = dataParaDate(p.data_entrega);
        return d > inicio && d <= limite;
      })
      .slice(0, 8);
  }, [abertos, hoje]);

  const tarefasPendentes = useMemo(
    () => tarefas.filter((t) => !t.feita).slice(0, 5),
    [tarefas],
  );

  const mesAtual = hoje.slice(0, 7);
  const mesAnterior = useMemo(() => {
    const [ano, mes] = mesAtual.split("-").map(Number);
    return mes === 1 ? `${ano - 1}-12` : `${ano}-${String(mes - 1).padStart(2, "0")}`;
  }, [mesAtual]);

  // O mês corrente sai dos pedidos que já vieram; o anterior exige consulta.
  const faturamentoAtual = useMemo(() => {
    const [ano, mes] = mesAtual.split("-").map(Number);
    const diasNoMes = new Date(ano, mes, 0).getDate();
    const dias = Array.from({ length: diasNoMes }, (_, index) => ({ dia: index + 1, valor: 0 }));

    for (const pedido of pedidos) {
      if (pedido.status === "cancelado" || !pedido.created_at) continue;
      const data = dataLocalISO(pedido.created_at);
      if (!data.startsWith(mesAtual)) continue;
      const dia = Number(data.slice(-2));
      if (dias[dia - 1]) dias[dia - 1].valor += pedido.total || 0;
    }

    return {
      mes: mesAtual,
      dias,
      total: resumo.faturamentoMes,
      pedidos: resumo.numMes,
      ticket: resumo.ticketMedio,
    };
  }, [mesAtual, pedidos, resumo]);

  // O cache do mês passado é conferido contra mesAnterior: se o mês virar com a
  // tela aberta, o dado guardado passa a ser de outro mês e não serve mais.
  const mesPassadoValido = mesPassado?.mes === mesAnterior ? mesPassado : null;
  const faturamento = periodo === "atual" ? faturamentoAtual : mesPassadoValido;

  const grafico = useMemo(() => {
    const dias = faturamento?.dias ?? [];
    const max = Math.max(...dias.map((d) => d.valor), 1);
    return { max, exibidos: dias };
  }, [faturamento]);

  const pontosLinha = useMemo(() => {
    const divisor = Math.max(grafico.exibidos.length - 1, 1);
    return grafico.exibidos
      .map((p, index) => {
        const x = (index / divisor) * 100;
        const y = 36 - (p.valor / grafico.max) * 32;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }, [grafico]);

  async function trocarPeriodo(novo: "atual" | "anterior") {
    if (carregandoMes) return; // trava clique repetido enquanto a busca corre

    if (novo === "atual" || mesPassadoValido) {
      setPeriodo(novo);
      return;
    }

    // Só troca o período depois que o dado chega. Trocar antes deixava o
    // cabeçalho anunciando "R$ 0,00 · 0 pedidos" como se fosse resultado real.
    setCarregandoMes(true);
    try {
      setMesPassado(await carregarFaturamentoDoMes({ data: { mes: mesAnterior } }));
      setPeriodo("anterior");
    } catch {
      toast.error("Não foi possível carregar o mês passado.");
    } finally {
      setCarregandoMes(false);
    }
  }

  async function salvarNome() {
    const n = nomeRascunho.trim();
    if (!n) return;
    setNome(n);
    setEditandoNome(false);
    try {
      await salvarMeuNome({ data: { nome: n } });
      toast.success(`Prazer, ${n.split(/\s+/)[0]}!`);
    } catch {
      carregar();
    }
  }

  async function alternarTarefa(t: Tarefa) {
    setTarefas((prev) => prev.map((x) => (x.id === t.id ? { ...x, feita: !x.feita } : x)));
    try {
      await marcarTarefa({ data: { id: t.id, feita: !t.feita } });
    } catch {
      carregar();
    }
  }

  function novoPedido() {
    window.location.assign("/vendas/pedidos/novo-pedido");
  }

  return (
    <section className="space-y-3 pb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {editandoNome ? (
            <div className="flex items-center gap-2">
              <Input
                autoFocus
                value={nomeRascunho}
                onChange={(e) => setNomeRascunho(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && salvarNome()}
                className="h-9 w-52 bg-white"
              />
              <Button size="sm" onClick={salvarNome}>Salvar</Button>
            </div>
          ) : (
            <h1 className="t-greeting flex items-center gap-2 text-[var(--admin-ink)]">
              {saudacao()}{primeiro && `, ${primeiro}`}!
              <button
                type="button"
                aria-label="Mudar meu nome"
                onClick={() => {
                  setNomeRascunho(nome ?? "");
                  setEditandoNome(true);
                }}
                className="text-[var(--admin-muted)] hover:text-[var(--terracotta)]"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </h1>
          )}
          <span className="t-support mt-1.5 flex items-center gap-2 text-[var(--admin-muted)]"><CalendarDays className="h-4 w-4" />{formatarDataLonga(hoje)}</span>
        </div>

        <Button onClick={novoPedido} className="t-item h-11 w-full shrink-0 rounded-xl bg-[var(--coral)] px-6 shadow-[var(--shadow-cta)] hover:bg-[var(--coral-hover)] sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Novo pedido
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          titulo="Faturamento do mês"
          valor={formatBRL(resumo.faturamentoMes)}
          nota=""
          icon={CircleDollarSign}
        />
        <Kpi
          titulo="Pedidos em aberto"
          valor={String(abertos.length)}
          nota={abertos.length ? "aguardando saída" : "nenhuma pendência"}
          icon={Package}
        />
        <Kpi
          titulo="Entregas hoje"
          valor={String(entregasHoje.length)}
          nota={entregasHoje.length ? "precisam sair hoje" : "nada pra hoje"}
          icon={Truck}
          detalheClass="text-[var(--blue-ink)]"
        />
        <Kpi
          titulo="Ticket médio"
          valor={formatBRL(resumo.ticketMedio)}
          nota={`${resumo.numMes} pedido(s) no mês`}
          icon={CircleDollarSign}
        />
      </div>

      <div className="grid items-stretch gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_.95fr]">
        <article className="flex min-h-[260px] flex-col card-panel">
          <CabecalhoCard titulo="Entregas de hoje" acao="ver agenda" onClick={() => onIrPara("calendario")} />
          <div className={`min-h-0 flex-1 divide-y divide-[var(--admin-border)] overflow-y-auto px-4 ${entregasHoje.length === 0 ? "flex" : ""}`}>
            {entregasHoje.length === 0 ? (
              <Vazio titulo="Sem entregas hoje" descricao="Nenhuma entrega programada." icon={CalendarDays} destaque />
            ) : (
              entregasHoje.slice(0, 6).map((p) => (
                <div key={p.id} className="grid grid-cols-[52px_minmax(0,1fr)_auto] gap-3 py-4">
                  <span className="t-body text-[var(--admin-ink)]">{p.janela_entrega || "—"}</span>
                  <div className="min-w-0">
                    <p className="t-item truncate text-[var(--admin-ink)]">#{p.numero} {p.cliente_nome || "Cliente"}</p>
                    <p className="t-body mt-0.5 truncate text-[var(--admin-muted)]">{itensResumo(p)}</p>
                    <p className="t-support mt-0.5 text-[var(--admin-muted)]">{p.tipo === "retirada" ? "Retirada" : "Entrega"}</p>
                  </div>
                  <div className="text-right">
                    <p className="t-item text-[var(--admin-ink-soft)]">{formatBRL(p.total)}</p>
                    {p.recebido_em && <span className="t-support mt-1 inline-flex rounded-full bg-[var(--green-soft)] px-2 py-0.5 text-[var(--green-ink)]">Pago</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="flex min-h-[190px] flex-col card-panel">
          <CabecalhoCard titulo="Próximos 7 dias" />
          <div className={`min-h-0 flex-1 divide-y divide-[var(--admin-border)] overflow-y-auto px-4 ${proximosSete.length === 0 ? "flex" : ""}`}>
            {proximosSete.length === 0 ? (
              <Vazio titulo="Nada nos próximos 7 dias" descricao="Nenhum pedido programado." icon={CalendarDays} destaque />
            ) : (
              proximosSete.map((p) => (
                <div key={p.id} className="grid grid-cols-[54px_70px_minmax(0,1fr)_auto] items-start gap-3 py-4">
                  <div>
                    <p className="t-support font-bold uppercase tracking-[0.08em] text-[var(--coral)]">{diaSemanaCurto(p.data_entrega!)}</p>
                    <p className="t-hero text-[var(--admin-ink)]">{dataCurta(p.data_entrega!).slice(0, 2)}</p>
                  </div>
                  <span className="t-body flex items-center gap-2 text-[var(--admin-muted)]">
                    <span className="h-1 w-1 shrink-0 rounded-full bg-[var(--admin-muted)]" />
                    {p.janela_entrega || "—"}
                  </span>
                  <div className="min-w-0">
                    <p className="t-item truncate text-[var(--admin-ink)]">#{p.numero} {p.cliente_nome || "Cliente"}</p>
                    <p className="t-body mt-0.5 truncate text-[var(--admin-muted)]">{itensResumo(p)}</p>
                  </div>
                  <span className="t-item text-[var(--admin-ink-soft)]">{formatBRL(p.total)}</span>
                </div>
              ))
            )}
          </div>
        </article>

        <div className="grid content-stretch gap-3 md:col-span-2 xl:col-span-1">
          <article className="flex min-h-0 flex-col card-panel">
            <CabecalhoCard titulo="Tarefas pendentes" acao="ver todas" onClick={() => onIrPara("tarefas")} />
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-1">
              {tarefasPendentes.length === 0 ? (
                <Vazio titulo="Nenhuma tarefa pendente" descricao="As tarefas adicionadas aparecem aqui." />
              ) : (
                <div className="divide-y divide-[var(--admin-border)]">
                  {tarefasPendentes.map((t) => (
                    <button key={t.id} type="button" onClick={() => alternarTarefa(t)} className="flex w-full items-start gap-3 py-2.5 text-left">
                      <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-[var(--terracotta)]" />
                      <div className="min-w-0">
                        <p className="t-body truncate">{t.titulo}</p>
                        {t.detalhe && <p className="t-support truncate text-[var(--admin-muted)]">{t.detalhe}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </article>

          <article className="flex min-h-0 flex-col card-panel">
            <CabecalhoCard titulo="Pedidos em aberto" acao="ver todos" onClick={() => onIrPara("vendas")} />
            <div className="min-h-0 flex-1 divide-y divide-[var(--admin-border)] overflow-y-auto px-4">
              {abertos.length === 0 ? (
                <Vazio titulo="Nenhum pedido em aberto" descricao="Tudo entregue por aqui." />
              ) : (
                abertos.slice(0, 5).map((p) => (
                  <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_72px_auto] items-center gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="t-item truncate text-[var(--admin-ink)]">#{p.numero} {p.cliente_nome || "Cliente"}</p>
                      <p className="t-body truncate text-[var(--admin-muted)]">{itensResumo(p)}</p>
                    </div>
                    <span className="t-support rounded-full bg-[var(--teal)] px-2 py-0.5 text-center font-semibold text-white">Novo</span>
                    <span className="t-item text-[var(--admin-ink-soft)]">{formatBRL(p.total)}</span>
                  </div>
                ))
              )}
            </div>
          </article>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[2.08fr_.95fr]">
        <article className="flex min-h-[260px] flex-col card-panel">
          <CabecalhoCard titulo="Resumo do faturamento">
            <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-[var(--cream-soft)] p-0.5">
              {(
                [
                  ["atual", "Este mês"],
                  ["anterior", "Mês passado"],
                ] as const
              ).map(([id, rotulo]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => trocarPeriodo(id)}
                  aria-pressed={periodo === id}
                  disabled={carregandoMes}
                  className={`t-support inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors disabled:opacity-60 ${
                    periodo === id
                      ? "bg-white text-[var(--admin-ink)] shadow-[var(--shadow-soft)]"
                      : "text-[var(--admin-muted)] hover:text-[var(--wine)]"
                  }`}
                >
                  {carregandoMes && id === "anterior" && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  {rotulo}
                </button>
              ))}
            </div>
          </CabecalhoCard>

          <div className="grid min-h-0 flex-1 gap-4 p-4 md:grid-cols-[minmax(190px,.72fr)_minmax(0,1.4fr)]">
            <div className="min-w-0">
              <p className="t-hero text-[var(--admin-ink)]">
                {formatBRL(faturamento?.total ?? 0)}
              </p>
              <p className="t-support mt-1 text-[var(--admin-muted)]">
                {faturamento?.pedidos ?? 0} pedidos · ticket {formatBRL(faturamento?.ticket ?? 0)}
              </p>
              {grafico.exibidos.every((p) => p.valor === 0) && (
                <p className="t-support mt-5 text-[var(--admin-muted)]">
                  Sem faturamento registrado neste mês.
                </p>
              )}
            </div>

            <div className="grid min-h-[105px] grid-cols-[38px_minmax(0,1fr)] gap-2">
              <div className="t-support flex flex-col justify-between pb-5 text-right text-[var(--admin-muted)]">
                <span>{rotuloEixo(grafico.max)}</span>
                <span>{rotuloEixo(grafico.max / 2)}</span>
                <span>0</span>
              </div>
              <div className="flex min-w-0 flex-col">
                <div className="relative min-h-[82px] flex-1">
                  <div className="absolute inset-0 flex flex-col justify-between pb-1">
                    <span className="border-t border-dashed border-[var(--admin-border-soft)]" />
                    <span className="border-t border-dashed border-[var(--admin-border-soft)]" />
                    <span className="border-t border-[var(--admin-border)]" />
                  </div>
                  <svg
                    viewBox="0 0 100 40"
                    preserveAspectRatio="none"
                    role="img"
                    aria-label="Faturamento diário do período selecionado"
                    className="absolute inset-0 h-full w-full overflow-visible"
                  >
                    <polygon
                      points={`0,36 ${pontosLinha} 100,36`}
                      fill="var(--coral)"
                      fillOpacity="0.07"
                      stroke="none"
                    />
                    <polyline
                      points={pontosLinha}
                      fill="none"
                      stroke="var(--coral)"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                    {grafico.exibidos.map((p, index) => {
                      const divisor = Math.max(grafico.exibidos.length - 1, 1);
                      const x = (index / divisor) * 100;
                      const y = 36 - (p.valor / grafico.max) * 32;
                      return (
                        <circle
                          key={p.dia}
                          cx={x}
                          cy={y}
                          r="0.65"
                          fill="var(--cream-soft)"
                          stroke="var(--coral)"
                          strokeWidth="0.9"
                          vectorEffect="non-scaling-stroke"
                        >
                          <title>{String(p.dia).padStart(2, "0")}: {formatBRL(p.valor)}</title>
                        </circle>
                      );
                    })}
                  </svg>
                </div>
                <div className="t-support mt-1 flex justify-between text-[var(--admin-muted)]">
                  {[0, 7, 14, 21, grafico.exibidos.length - 1]
                    .filter((dia, index, lista) => dia >= 0 && dia < grafico.exibidos.length && lista.indexOf(dia) === index)
                    .map((index) => (
                      <span key={index}>
                        {String(grafico.exibidos[index].dia).padStart(2, "0")}/
                        {(faturamento?.mes ?? mesAtual).slice(5)}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </article>

        <figure className="card-panel relative flex min-h-[150px] flex-col justify-center bg-[var(--cream)] p-6">
          {/* Ramo decorativo: so respiro visual, sem peso. aria-hidden porque nao
              acrescenta nada a leitura do versiculo. */}
          <svg
            aria-hidden="true"
            viewBox="0 0 120 120"
            className="pointer-events-none absolute -right-4 -top-3 h-28 w-28 text-[var(--coral)] opacity-[0.07]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M96 8C74 30 58 58 50 96" />
            <path d="M84 26c-12 1-20 7-24 17 11 2 19-3 24-17Z" />
            <path d="M72 50c-12 1-20 7-24 17 11 2 19-3 24-17Z" />
            <path d="M62 76c-11 1-18 7-22 16 10 2 18-3 22-16Z" />
            <path d="M88 40c11-2 19 2 23 12-11 3-19-1-23-12Z" />
            <path d="M78 66c11-2 19 2 23 12-11 3-19-1-23-12Z" />
          </svg>
          <blockquote className="t-body text-[var(--admin-ink-soft)]">“{versiculo.texto}”</blockquote>
          <figcaption className="t-support mt-3 font-semibold uppercase tracking-[0.12em] text-[var(--coral)]">{versiculo.referencia}</figcaption>
        </figure>
      </div>
    </section>
  );
}
