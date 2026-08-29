import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
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
import { situacaoDoPrazo } from "./TarefasPanel";

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
    <article className="flex min-h-[92px] min-w-0 items-start gap-3 rounded-2xl border border-[var(--admin-border)] bg-white p-4 shadow-[var(--shadow-soft)]">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#fbefec] text-[var(--terracotta)]">
        <Icon className="h-4 w-4" strokeWidth={1.9} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs text-[var(--admin-muted)]">{titulo}</p>
        <p className="mt-0.5 truncate text-2xl font-semibold tracking-[-0.03em] text-[var(--admin-ink)]">
          <Num>{valor}</Num>
        </p>
        {nota && <p className={`mt-0.5 truncate text-[11px] ${detalheClass}`}>{nota}</p>}
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
    <div className="flex min-h-10 shrink-0 items-center justify-between gap-3 border-b border-[var(--admin-border)] px-4">
      <h3 className="text-sm font-semibold text-[var(--admin-ink)]">{titulo}</h3>
      {children}
      {acao && onClick && (
        <button
          type="button"
          onClick={onClick}
          className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-[var(--terracotta)]"
        >
          {acao} <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

/** Vazio no padrão do painel: ícone + frase curta + explicação. */
function Vazio({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--admin-muted)]" strokeWidth={1.8} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--admin-ink)]">{titulo}</p>
        <p className="mt-0.5 text-[11px] text-[var(--admin-muted)]">{descricao}</p>
      </div>
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
  const primeiro = (nome ?? email.split("@")[0] ?? "").trim().split(/\s+/)[0] ?? "";

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
    () => tarefas.filter((t) => !t.feita && situacaoDoPrazo(t) !== null).slice(0, 5),
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
    const comValor = dias.filter((d) => d.valor > 0);
    const exibidos = comValor.length > 12 ? comValor.slice(-12) : comValor;
    const max = Math.max(...exibidos.map((d) => d.valor), 1);
    return { max, exibidos };
  }, [faturamento]);

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
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
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
            <h1 className="flex items-center gap-2 text-2xl font-medium tracking-[-0.025em] text-[var(--admin-ink)]">
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
          <span className="text-xs text-[var(--admin-muted)]">{formatarDataLonga(hoje)}</span>
        </div>

        <Button onClick={novoPedido} className="h-10 shrink-0 rounded-xl px-5">
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
          detalheClass="text-[#2d7296]"
        />
        <Kpi
          titulo="Ticket médio"
          valor={formatBRL(resumo.ticketMedio)}
          nota={`${resumo.numMes} pedido(s) no mês`}
          icon={CircleDollarSign}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[1fr_1fr_.95fr]">
        <article className="flex min-h-[350px] flex-col overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-white shadow-[var(--shadow-soft)]">
          <CabecalhoCard titulo="Entregas de hoje" acao="ver agenda" onClick={() => onIrPara("calendario")} />
          <div className="min-h-0 flex-1 divide-y divide-[var(--admin-border)] overflow-y-auto px-4">
            {entregasHoje.length === 0 ? (
              <Vazio titulo="Sem entregas hoje" descricao="Nenhuma entrega programada." />
            ) : (
              entregasHoje.slice(0, 6).map((p) => (
                <div key={p.id} className="grid grid-cols-[52px_minmax(0,1fr)_auto] gap-3 py-4">
                  <span className="text-sm font-semibold text-[var(--admin-ink)]">{p.janela_entrega || "—"}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--admin-ink)]">#{p.numero} {p.cliente_nome || "Cliente"}</p>
                    <p className="mt-0.5 truncate text-[11px] text-[var(--admin-muted)]">{itensResumo(p)}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--admin-muted)]">{p.tipo === "retirada" ? "Retirada" : "Entrega"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatBRL(p.total)}</p>
                    {p.recebido_em && <span className="mt-1 inline-flex rounded-full bg-[#eaf7ea] px-2 py-0.5 text-[10px] text-[#397348]">Pago</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="flex min-h-[350px] flex-col overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-white shadow-[var(--shadow-soft)]">
          <CabecalhoCard titulo="Próximos 7 dias" />
          <div className="min-h-0 flex-1 divide-y divide-[var(--admin-border)] overflow-y-auto px-4">
            {proximosSete.length === 0 ? (
              <Vazio titulo="Nada nos próximos 7 dias" descricao="Nenhum pedido programado." />
            ) : (
              proximosSete.map((p) => (
                <div key={p.id} className="grid grid-cols-[46px_50px_minmax(0,1fr)_auto] items-start gap-2 py-3">
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--terracotta)]">{diaSemanaCurto(p.data_entrega!)}</p>
                    <p className="text-lg font-semibold leading-none">{dataCurta(p.data_entrega!).slice(0, 2)}</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-[11px] text-[var(--admin-muted)]">
                    <span className="h-1 w-1 shrink-0 rounded-full bg-[var(--admin-muted)]" />
                    {p.janela_entrega || "—"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-[var(--admin-ink)]">#{p.numero} {p.cliente_nome || "Cliente"}</p>
                    <p className="truncate text-[11px] text-[var(--admin-muted)]">{itensResumo(p)}</p>
                  </div>
                  <span className="text-xs text-[var(--admin-muted)]">{formatBRL(p.total)}</span>
                </div>
              ))
            )}
          </div>
        </article>

        <div className="grid gap-3">
          <article className="flex flex-col overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-white shadow-[var(--shadow-soft)]">
            <CabecalhoCard titulo="Tarefas pendentes" acao="ver todas" onClick={() => onIrPara("tarefas")} />
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-1">
              {tarefasPendentes.length === 0 ? (
                <Vazio titulo="Nenhuma tarefa pendente" descricao="Sem tarefas com prazo para hoje ou amanhã." />
              ) : (
                <div className="divide-y divide-[var(--admin-border)]">
                  {tarefasPendentes.map((t) => (
                    <button key={t.id} type="button" onClick={() => alternarTarefa(t)} className="flex w-full items-start gap-3 py-2.5 text-left">
                      <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-[var(--terracotta)]" />
                      <div className="min-w-0">
                        <p className="truncate text-sm">{t.titulo}</p>
                        {t.detalhe && <p className="truncate text-[11px] text-[var(--admin-muted)]">{t.detalhe}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </article>

          <article className="flex min-h-[230px] flex-col overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-white shadow-[var(--shadow-soft)]">
            <CabecalhoCard titulo="Pedidos em aberto" acao="ver todos" onClick={() => onIrPara("vendas")} />
            <div className="min-h-0 flex-1 divide-y divide-[var(--admin-border)] overflow-y-auto px-4">
              {abertos.length === 0 ? (
                <Vazio titulo="Nenhum pedido em aberto" descricao="Tudo entregue por aqui." />
              ) : (
                abertos.slice(0, 5).map((p) => (
                  <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_72px_auto] items-center gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">#{p.numero} {p.cliente_nome || "Cliente"}</p>
                      <p className="truncate text-[10px] text-[var(--admin-muted)]">{itensResumo(p)}</p>
                    </div>
                    <span className="rounded-full bg-[#3d6671] px-2 py-1 text-center text-[9px] font-semibold text-white">Novo</span>
                    <span className="text-xs font-medium">{formatBRL(p.total)}</span>
                  </div>
                ))
              )}
            </div>
          </article>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[2.08fr_.95fr]">
        <article className="flex flex-col overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-white shadow-[var(--shadow-soft)]">
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
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-60 ${
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

          <div className="flex min-h-0 flex-1 flex-col p-4">
            <div className="mb-3 flex flex-wrap items-baseline gap-x-5 gap-y-1">
              <p className="text-xl font-semibold">{formatBRL(faturamento?.total ?? 0)}</p>
              <p className="text-xs text-[var(--admin-muted)]">
                {faturamento?.pedidos ?? 0} pedidos · ticket {formatBRL(faturamento?.ticket ?? 0)}
              </p>
            </div>

            {grafico.exibidos.length === 0 ? (
              <div className="flex min-h-0 flex-1 items-center text-sm text-[var(--admin-muted)]">
                Sem faturamento registrado neste mês.
              </div>
            ) : (
              // O piso abaixo de 1280px é obrigatório: fora do home-compact.css
              // nada dá altura a esta linha, e ela colapsava para ~28px. O
              // guard max-xl importa — sem ele o piso também valeria no desktop
              // e estouraria a linha fixa do grid.
              <div className="flex min-h-0 flex-1 items-stretch gap-2 max-xl:min-h-[150px]">
                <div className="flex h-full w-8 shrink-0 flex-col justify-between pb-3.5 text-right text-[9px] leading-none text-[var(--admin-muted)]">
                  <span>{rotuloEixo(grafico.max)}</span>
                  <span>{rotuloEixo(grafico.max / 2)}</span>
                  <span>0</span>
                </div>

                <div className="flex h-full min-w-0 flex-1 flex-col">
                  {/*
                    As barras têm altura em %, então acompanham qualquer altura
                    que o CSS der a este bloco. Antes eram px fixos calculados no
                    JS (86px) enquanto o home-compact.css encolhia a área para
                    72px — a diferença vazava para cima, por cima do valor.
                  */}
                  <div className="relative min-h-0 flex-1">
                    <div className="absolute inset-0 flex flex-col justify-between">
                      <span className="border-t border-dashed border-[var(--admin-border)]" />
                      <span className="border-t border-dashed border-[var(--admin-border)]" />
                      <span className="border-t border-[var(--admin-border)]" />
                    </div>

                    <div className="absolute inset-0 flex items-end justify-center gap-2">
                      {grafico.exibidos.map((p) => (
                        <div
                          key={p.dia}
                          // max-w: com poucos dias no mês o flex-1 esticava uma
                          // única barra pela largura inteira do card.
                          className="min-w-0 max-w-[46px] flex-1 rounded-t-sm bg-[var(--terracotta)]"
                          style={{ height: `${Math.max(2, (p.valor / grafico.max) * 100)}%` }}
                          title={`${String(p.dia).padStart(2, "0")}: ${formatBRL(p.valor)}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-1 flex shrink-0 justify-center gap-2">
                    {grafico.exibidos.map((p) => (
                      <span
                        key={p.dia}
                        className="min-w-0 max-w-[46px] flex-1 truncate text-center text-[9px] leading-none text-[var(--admin-muted)]"
                      >
                        {String(p.dia).padStart(2, "0")}/{(faturamento?.mes ?? mesAtual).slice(5)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </article>

        <figure className="rounded-2xl border border-[var(--admin-border)] bg-white p-4 shadow-[var(--shadow-soft)]">
          <blockquote className="text-xs leading-relaxed text-[var(--admin-ink-soft)]">“{versiculo.texto}”</blockquote>
          <figcaption className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--terracotta)]">{versiculo.referencia}</figcaption>
        </figure>
      </div>
    </section>
  );
}
