import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  Check,
  CircleDollarSign,
  Package,
  Pencil,
  ShoppingBag,
  Sparkles,
  Truck,
  Users,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatarDataLonga, hojeISO } from "@/lib/prazo";
import { carregarResumoPedidos } from "@/lib/pedidos";
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
  statusLabel,
  type Pedido,
} from "@/lib/vendas";
import { saudacao, versiculoDoDia } from "@/lib/versiculos";
import { Carregando, Num } from "./shell";
import { situacaoDoPrazo } from "./TarefasPanel";

type DestinoInicio = "vendas" | "tarefas" | "cadastros" | "financeiro" | "bia" | "produtos";

function Sparkline({ tone = "terracotta" }: { tone?: "terracotta" | "wine" | "olive" }) {
  const stroke =
    tone === "olive"
      ? "#74745B"
      : tone === "wine"
        ? "#703D3A"
        : "#A94F45";

  return (
    <svg viewBox="0 0 90 30" className="h-8 w-24 overflow-visible" aria-hidden="true">
      <path
        d="M2 22 C12 22 13 9 24 9 C35 9 37 24 49 22 C60 21 61 12 70 14 C78 15 82 20 88 17"
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CartaoKpi({
  titulo,
  valor,
  nota,
  icon: Icon,
  tone,
}: {
  titulo: string;
  valor: string;
  nota: string;
  icon: typeof CircleDollarSign;
  tone: "terracotta" | "wine" | "olive";
}) {
  const cores = {
    terracotta: "bg-[#A94F45] text-white",
    wine: "bg-[#703D3A] text-white",
    olive: "bg-[#74745B] text-white",
  };

  return (
    <article className="flex min-h-28 items-center gap-4 rounded-2xl border border-[var(--admin-border)] bg-white p-4 shadow-[var(--shadow-soft)]">
      <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-full", cores[tone])}>
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--admin-muted)]">
          {titulo}
        </p>
        <p className="mt-1 truncate text-xl font-semibold tracking-[-0.02em] text-[var(--admin-ink)]">
          <Num>{valor}</Num>
        </p>
        <p className="mt-0.5 truncate text-[11px] text-[var(--admin-muted)]">{nota}</p>
      </div>
      <div className="hidden shrink-0 2xl:block">
        <Sparkline tone={tone} />
      </div>
    </article>
  );
}

function Atalho({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof ShoppingBag;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-16 items-center gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--cream-soft)] px-3 text-left transition hover:-translate-y-0.5 hover:border-[var(--rose)] hover:bg-[var(--cream)] hover:shadow-sm"
    >
      <Icon className="h-4 w-4 shrink-0 text-[var(--terracotta)]" strokeWidth={1.8} />
      <span className="text-xs font-medium text-[var(--admin-ink-soft)]">{label}</span>
    </button>
  );
}

export function InicioPanel({
  onIrPara,
}: {
  onIrPara: (aba: DestinoInicio) => void;
}) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [nome, setNome] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [editandoNome, setEditandoNome] = useState(false);
  const [nomeRascunho, setNomeRascunho] = useState("");

  const hoje = hojeISO();
  const [versiculo, setVersiculo] = useState(() => versiculoDoDia(hoje));

  useEffect(() => {
    carregarVersiculo({ data: { data: hoje } })
      .then((v) => v && setVersiculo(v))
      .catch(() => {});
  }, [hoje]);

  const carregar = useCallback(async () => {
    setCarregando(true);
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
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const resumo = useMemo(() => resumoVendas(pedidos), [pedidos]);

  const recentes = useMemo(
    () =>
      [...pedidos]
        .filter((p) => p.status !== "cancelado")
        .sort((a, b) => b.numero - a.numero)
        .slice(0, 5),
    [pedidos],
  );

  const tarefasDoDia = useMemo(
    () =>
      tarefas
        .filter((t) => !t.feita && situacaoDoPrazo(t) !== null)
        .slice(0, 3),
    [tarefas],
  );

  const primeiro =
    (nome ?? email.split("@")[0] ?? "").trim().split(/\s+/)[0] ?? "";

  const grafico = useMemo(() => {
    const prefixo = hoje.slice(0, 8);
    const [ano, mes] = hoje.split("-").map(Number);
    const diasNoMes = new Date(ano, mes, 0).getDate();
    const pontos = Array.from({ length: diasNoMes }, (_, index) => ({
      dia: index + 1,
      valor: 0,
      pedidos: 0,
    }));

    for (const pedido of pedidos) {
      if (pedido.status === "cancelado" || !pedido.created_at) continue;
      const data = dataLocalISO(pedido.created_at);
      if (!data.startsWith(prefixo)) continue;
      const dia = Number(data.slice(-2));
      const alvo = pontos[dia - 1];
      if (!alvo) continue;
      alvo.valor += pedido.total || 0;
      alvo.pedidos += 1;
    }

    const max = Math.max(...pontos.map((p) => p.valor), 1);
    const maior = pontos.reduce(
      (best, atual) => (atual.valor > best.valor ? atual : best),
      pontos[0] ?? { dia: 1, valor: 0, pedidos: 0 },
    );

    const pontosLinha = pontos
      .map((p, index) => {
        const x = pontos.length <= 1 ? 0 : (index / (pontos.length - 1)) * 100;
        const y = 31 - (p.valor / max) * 24;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");

    return { pontos, max, maior, pontosLinha };
  }, [hoje, pedidos]);

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
    setTarefas((prev) =>
      prev.map((x) => (x.id === t.id ? { ...x, feita: !x.feita } : x)),
    );
    try {
      await marcarTarefa({ data: { id: t.id, feita: !t.feita } });
      if (!t.feita) toast.success("Tarefa concluída.");
    } catch {
      carregar();
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-[#ead7ca] bg-gradient-to-r from-[#fbf2ec] to-[#fffaf6] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--terracotta)] text-white">
            <CalendarDays className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--wine)]">
              Resumo do dia, {formatarDataLonga(hoje)}
            </p>
            <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
              {resumo.entregasHoje > 0
                ? `${resumo.entregasHoje} entrega(s) precisa(m) da sua atenção hoje.`
                : "Você ainda não possui entregas programadas para hoje."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onIrPara("vendas")}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#ead7ca] bg-white px-4 py-2 text-xs font-semibold text-[var(--terracotta)] transition hover:bg-[var(--cream)]"
        >
          Ver agenda do dia <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(320px,.72fr)]">
        <div className="relative overflow-hidden rounded-3xl border border-[var(--admin-border)] bg-gradient-to-br from-white via-[#fffdfb] to-[#f8efe7] p-6 shadow-[var(--shadow-soft)] sm:p-8">
          <div className="pointer-events-none absolute -bottom-24 right-12 h-56 w-56 rounded-full border-[28px] border-[#f2e5d8]/70" />
          <div className="pointer-events-none absolute bottom-4 right-12 grid h-20 w-20 place-items-center rounded-full bg-[#fff7f2] text-3xl text-[var(--terracotta)]">
            ✣
          </div>

          {editandoNome ? (
            <div className="relative z-10 flex flex-wrap items-center gap-2">
              <Input
                autoFocus
                value={nomeRascunho}
                onChange={(e) => setNomeRascunho(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && salvarNome()}
                placeholder="Como quer ser chamado?"
                className="max-w-xs bg-white"
              />
              <Button size="sm" onClick={salvarNome}>
                Salvar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditandoNome(false)}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <h2 className="relative z-10 flex flex-wrap items-center gap-2 text-3xl font-semibold tracking-[-0.03em] text-[var(--admin-ink)] sm:text-4xl">
              {saudacao()}
              {primeiro && `, ${primeiro}`}! 👋
              <button
                type="button"
                aria-label="Mudar meu nome"
                onClick={() => {
                  setNomeRascunho(nome ?? "");
                  setEditandoNome(true);
                }}
                className="text-[var(--rose-strong)] transition hover:text-[var(--terracotta)]"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </h2>
          )}

          <figure className="relative z-10 mt-5 max-w-2xl">
            <blockquote className="max-w-xl text-base leading-relaxed text-[var(--admin-ink-soft)] sm:text-lg">
              “{versiculo.texto}”
            </blockquote>
            <figcaption className="mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--terracotta)]">
              {versiculo.referencia}
            </figcaption>
          </figure>
        </div>

        <aside className="rounded-3xl border border-[var(--admin-border)] bg-white p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold tracking-[-0.02em] text-[var(--admin-ink)]">
              Lembretes
            </h3>
            <button
              type="button"
              onClick={() => onIrPara("tarefas")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--terracotta)]"
            >
              Ver todas <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="mt-4 divide-y divide-[var(--admin-border)]">
            {tarefasDoDia.length === 0 ? (
              <p className="py-5 text-sm text-[var(--admin-muted)]">
                Nada com prazo para hoje ou amanhã.
              </p>
            ) : (
              tarefasDoDia.map((t, index) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => alternarTarefa(t)}
                  className="flex w-full items-center gap-3 py-3 text-left"
                >
                  <span
                    className={cn(
                      "grid h-4 w-4 shrink-0 place-items-center rounded-full border",
                      index === 1
                        ? "border-[var(--olive)] bg-[var(--olive)] text-white"
                        : "border-[var(--rose-strong)] text-transparent",
                    )}
                  >
                    <Check className="h-2.5 w-2.5" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--admin-ink-soft)]">
                    {t.titulo}
                  </span>
                  <span className="shrink-0 text-[10px] text-[var(--admin-muted)]">
                    {situacaoDoPrazo(t) === "amanha" ? "Amanhã" : situacaoDoPrazo(t) === "hoje" ? "Hoje" : situacaoDoPrazo(t) === "atrasada" ? "Atrasada" : ""}
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>
      </div>

      {carregando && <Carregando />}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoKpi
          titulo="Faturamento do mês"
          valor={formatBRL(resumo.faturamentoMes)}
          nota={`${resumo.numMes} pedido(s) no mês`}
          icon={CircleDollarSign}
          tone="terracotta"
        />
        <CartaoKpi
          titulo="Pedidos em aberto"
          valor={String(resumo.pendentes)}
          nota={resumo.pendentes ? "pedidos em andamento" : "nenhuma pendência"}
          icon={ShoppingBag}
          tone="wine"
        />
        <CartaoKpi
          titulo="Ticket médio"
          valor={formatBRL(resumo.ticketMedio)}
          nota="média do mês atual"
          icon={WalletCards}
          tone="olive"
        />
        <CartaoKpi
          titulo="Entregas hoje"
          valor={String(resumo.entregasHoje)}
          nota={resumo.entregasHoje ? "programadas para hoje" : "nenhuma entrega"}
          icon={Truck}
          tone="terracotta"
        />
      </div>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.35fr)_minmax(0,.95fr)_minmax(290px,.72fr)]">
        <article className="rounded-3xl border border-[var(--admin-border)] bg-white p-5 shadow-[var(--shadow-soft)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold tracking-[-0.02em] text-[var(--admin-ink)]">
                Faturamento
              </h3>
              <div className="mt-2 flex items-center gap-4 text-[10px] font-medium text-[var(--admin-muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <i className="h-2 w-2 rounded-full bg-[var(--terracotta)]" />
                  Faturamento (R$)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <i className="h-2 w-2 rounded-sm bg-[#dccdbd]" />
                  Pedidos
                </span>
              </div>
            </div>
            <span className="rounded-xl border border-[var(--admin-border)] bg-[var(--cream-soft)] px-3 py-2 text-xs font-medium text-[var(--admin-ink-soft)]">
              Mês atual
            </span>
          </div>

          <div className="relative mt-5 h-56 overflow-hidden rounded-2xl bg-gradient-to-b from-white to-[#fffaf6] px-2 pb-2 pt-4">
            <div className="pointer-events-none absolute inset-x-2 bottom-8 top-4 flex flex-col justify-between">
              {[0, 1, 2, 3].map((linha) => (
                <span key={linha} className="border-t border-dashed border-[#eee4dc]" />
              ))}
            </div>

            <div className="absolute inset-x-3 bottom-8 top-6 flex items-end gap-[2px]">
              {grafico.pontos.map((p) => (
                <span
                  key={p.dia}
                  className="min-w-[2px] flex-1 rounded-t-sm bg-[#ded2c5]/80"
                  style={{
                    height: `${Math.max(3, (p.valor / grafico.max) * 80)}%`,
                  }}
                  title={`${p.dia}: ${formatBRL(p.valor)}`}
                />
              ))}
            </div>

            <svg
              viewBox="0 0 100 36"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-x-3 bottom-7 top-5 h-[calc(100%-3rem)] w-[calc(100%-1.5rem)]"
              aria-hidden="true"
            >
              <polyline
                points={grafico.pontosLinha}
                fill="none"
                stroke="#A94F45"
                strokeWidth="0.8"
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <div className="absolute inset-x-3 bottom-1 flex justify-between text-[9px] text-[var(--admin-muted)]">
              {[1, 5, 10, 15, 20, 25, grafico.pontos.length].map((dia) => (
                <span key={dia}>{String(dia).padStart(2, "0")}</span>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {[
              ["Faturamento total", formatBRL(resumo.faturamentoMes)],
              [
                "Média diária",
                formatBRL(
                  grafico.pontos.length
                    ? resumo.faturamentoMes / grafico.pontos.length
                    : 0,
                ),
              ],
              [
                "Maior dia",
                `${formatBRL(grafico.maior.valor)} · ${String(grafico.maior.dia).padStart(2, "0")}/${hoje.slice(5, 7)}`,
              ],
              ["Pedidos totais", String(resumo.numMes)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl bg-[var(--cream-soft)] px-3 py-3"
              >
                <p className="text-[10px] text-[var(--admin-muted)]">{label}</p>
                <p className="mt-1 truncate text-sm font-semibold text-[var(--admin-ink)]">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-[var(--admin-border)] bg-white p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold tracking-[-0.02em] text-[var(--admin-ink)]">
              Pedidos recentes
            </h3>
            <button
              type="button"
              onClick={() => onIrPara("vendas")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--terracotta)]"
            >
              Ver todos <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {recentes.length === 0 ? (
            <p className="mt-6 text-sm text-[var(--admin-muted)]">
              Nenhum pedido registrado ainda.
            </p>
          ) : (
            <div className="mt-4 overflow-hidden">
              <div className="grid grid-cols-[74px_minmax(0,1fr)_88px] gap-2 border-b border-[var(--admin-border)] pb-2 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-muted)]">
                <span>Pedido</span>
                <span>Cliente</span>
                <span className="text-right">Valor</span>
              </div>
              <div className="divide-y divide-[var(--admin-border)]">
                {recentes.map((pedido) => (
                  <div
                    key={pedido.id}
                    className="grid grid-cols-[74px_minmax(0,1fr)_88px] items-center gap-2 py-3"
                  >
                    <div>
                      <p className="text-xs font-semibold text-[var(--admin-ink)]">
                        #{pedido.numero}
                      </p>
                      <span className="mt-1 inline-flex rounded-full bg-[#f7e9df] px-2 py-0.5 text-[9px] font-semibold text-[var(--terracotta)]">
                        {statusLabel(pedido.status)}
                      </span>
                    </div>
                    <p className="truncate text-xs text-[var(--admin-ink-soft)]">
                      {pedido.cliente_nome || "Cliente não informado"}
                    </p>
                    <p className="text-right text-xs font-semibold text-[var(--wine)]">
                      {formatBRL(pedido.total)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>

        <div className="grid gap-4">
          <article className="rounded-3xl border border-[var(--admin-border)] bg-white p-5 shadow-[var(--shadow-soft)]">
            <h3 className="text-lg font-semibold tracking-[-0.02em] text-[var(--admin-ink)]">
              Atalhos rápidos
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Atalho
                icon={ShoppingBag}
                label="Novo pedido"
                onClick={() => onIrPara("vendas")}
              />
              <Atalho
                icon={CircleDollarSign}
                label="Financeiro"
                onClick={() => onIrPara("financeiro")}
              />
              <Atalho
                icon={Users}
                label="Clientes"
                onClick={() => onIrPara("cadastros")}
              />
              <Atalho
                icon={Package}
                label="Produtos"
                onClick={() => onIrPara("produtos")}
              />
            </div>
          </article>

          <article className="rounded-3xl border border-[var(--admin-border)] bg-white p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--terracotta)]" />
              <h3 className="text-lg font-semibold tracking-[-0.02em] text-[var(--admin-ink)]">
                Insights com BIA
              </h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[var(--admin-muted)]">
              Pergunte sobre pedidos, clientes, produtos e o desempenho do seu negócio.
            </p>
            <button
              type="button"
              onClick={() => onIrPara("bia")}
              className="mt-4 flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--cream-soft)] px-3 py-3 text-left"
            >
              <span className="truncate text-xs text-[var(--admin-muted)]">
                Ex.: quais clientes mais compraram?
              </span>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--terracotta)] text-white">
                <Bot className="h-4 w-4" />
              </span>
            </button>
          </article>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-[#ead8ca] bg-gradient-to-r from-[#fbf1e9] via-[#fff9f4] to-[#a94f45] shadow-[var(--shadow-soft)]">
        <div className="grid min-h-20 items-center gap-4 px-5 py-4 md:grid-cols-[1fr_auto_250px]">
          <div>
            <p className="text-sm font-semibold text-[var(--terracotta)]">Dica Flua</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--admin-ink-soft)]">
              Mantenha seus cadastros atualizados para tomar decisões com dados mais confiáveis.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onIrPara("cadastros")}
            className="inline-flex items-center gap-1.5 justify-self-start rounded-xl border border-[#e5cfc0] bg-white/85 px-4 py-2 text-xs font-semibold text-[var(--wine)]"
          >
            Ver cadastros <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <div className="hidden justify-self-end md:block">
            <img
              src="/flua-header-logo.svg"
              alt="Flua"
              className="h-11 w-32 object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
