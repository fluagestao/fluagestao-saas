"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Gift,
  Loader2,
  PackageCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { DetalhesEntregaDialog } from "@/components/admin/DetalhesEntregaDialog";
import type { EmpresaFichaPedido } from "@/lib/ficha-pedido";
import {
  proximasDatasComemorativas,
  type ProximaDataComemorativa,
} from "@/lib/datas-comemorativas";
import { carregarAgenda } from "@/lib/pedidos";
import { hojeISO, somarDias } from "@/lib/prazo";
import {
  formatBRL,
  statusLabel,
  type Pedido,
  type StatusPedido,
} from "@/lib/vendas";
import { cn } from "@/lib/utils";

const DIAS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"] as const;

const ESTILO_STATUS: Record<StatusPedido, string> = {
  novo: "border-l-[#8aa0aa] bg-[#f4f7f8]",
  producao: "border-l-[#cfaa67] bg-[#fbf7ee]",
  pronto: "border-l-[#a8998c] bg-[#f7f4f1]",
  entregue: "border-l-[#9fbea2] bg-[#f2f7f1]",
  cancelado: "border-l-[#cf8d89] bg-[#fbf1f0]",
};

function inicioDaSemana(data: string): string {
  const [ano, mes, dia] = data.split("-").map(Number);
  const diaDaSemana = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
  return somarDias(data, -((diaDaSemana + 6) % 7));
}

function diaDoMes(data: string): string {
  return data.slice(-2);
}

function dataCurta(data: string): string {
  const [, mes, dia] = data.split("-");
  return `${dia}/${mes}`;
}

function dataEspecial(data: string): string {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(ano, mes - 1, dia)));
}

function intervaloSemana(inicio: string): string {
  return `${dataCurta(inicio)} a ${dataCurta(somarDias(inicio, 6))}`;
}

function itensDoPedido(pedido: Pedido): string[] {
  if (!pedido.itens.length) return ["Sem itens informados"];
  return pedido.itens
    .slice(0, 2)
    .map((item) => `${item.qtd}x ${item.nome}${item.variacao ? ` · ${item.variacao}` : ""}`);
}

function textoContagem(dias: number): string {
  if (dias === 0) return "É hoje";
  if (dias === 1) return "Falta 1 dia";
  return `Faltam ${dias} dias`;
}

function CardEntrega({
  pedido,
  onClick,
}: {
  pedido: Pedido;
  onClick: () => void;
}) {
  const contexto =
    pedido.tipo === "retirada"
      ? "Retirada"
      : pedido.destinatario_nome
        ? `recebe: ${pedido.destinatario_nome}`
        : pedido.bairro
          ? `Entrega · ${pedido.bairro}`
          : "Entrega";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border border-black/[0.035] border-l-[3px] p-3 text-left shadow-[0_8px_22px_rgba(75,55,50,0.035)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(75,55,50,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terracotta)]/35",
        ESTILO_STATUS[pedido.status],
      )}
      aria-label={`Abrir pedido #${pedido.numero} de ${pedido.cliente_nome || "cliente"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-[var(--admin-ink-soft)]">
          {pedido.janela_entrega || "Horário a combinar"}
        </p>
        <span className="text-[10px] font-medium text-[var(--admin-muted)]">
          #{pedido.numero}
        </span>
      </div>

      <p className="mt-1 truncate text-sm font-semibold text-[var(--admin-ink)]">
        {pedido.cliente_nome || "Cliente"}
      </p>

      <div className="mt-1.5 space-y-0.5">
        {itensDoPedido(pedido).map((item, index) => (
          <p
            key={`${pedido.id}-item-${index}`}
            className="truncate text-[11px] leading-4 text-[var(--admin-muted)]"
          >
            {item}
          </p>
        ))}
      </div>

      <p className="mt-2 truncate text-[10px] text-[var(--admin-muted)]">
        {contexto}
      </p>

      <div className="mt-2 flex items-end justify-between gap-2">
        <span className="text-xs font-semibold text-[#579163]">
          {formatBRL(pedido.total)}
        </span>
        <span className="text-right text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-muted)]">
          {statusLabel(pedido.status)}
        </span>
      </div>
    </button>
  );
}

function LembreteData({
  evento,
  principal = false,
}: {
  evento: ProximaDataComemorativa;
  principal?: boolean;
}) {
  return (
    <article
      className={cn(
        "flex min-w-0 items-start gap-3 rounded-2xl border border-[var(--admin-border)] bg-white p-4",
        principal && "border-l-4 border-l-[var(--terracotta)]",
      )}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#fbebe6] text-[var(--terracotta)]">
        <Gift className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-[var(--admin-ink)]">
          {evento.nome}{principal ? " está chegando" : ""}
        </p>
        <p className="mt-1 text-xs font-semibold text-[var(--terracotta)]">
          {dataEspecial(evento.data)} · {textoContagem(evento.diasRestantes)}
        </p>
        {principal && (
          <p className="mt-1.5 text-sm leading-5 text-[var(--admin-ink-soft)]">
            {evento.mensagem}
          </p>
        )}
      </div>
    </article>
  );
}

export function CalendarioEntregasPanel({
  empresa,
}: {
  empresa: EmpresaFichaPedido;
}) {
  const [inicioSemana, setInicioSemana] = useState(() =>
    inicioDaSemana(hojeISO()),
  );
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarDatas, setMostrarDatas] = useState(false);
  const [pedidoAberto, setPedidoAberto] = useState<Pedido | null>(null);
  // Celular: um dia por vez. Comeca no dia de hoje, que e o que se abre a agenda
  // para ver.
  const [diaFoco, setDiaFoco] = useState(() =>
    Math.max(0, DIAS.findIndex((_, i) => somarDias(inicioDaSemana(hojeISO()), i) === hojeISO())),
  );

  const hoje = hojeISO();
  const datasEspeciais = useMemo(
    () => proximasDatasComemorativas(new Date(), 6),
    [],
  );
  const proximaData = datasEspeciais[0];

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(null);

    carregarAgenda({
      data: {
        de: inicioSemana,
        ate: somarDias(inicioSemana, 6),
      },
    })
      .then((resultado) => {
        if (ativo) setPedidos(resultado.pedidos as Pedido[]);
      })
      .catch((error) => {
        if (!ativo) return;
        setPedidos([]);
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar as entregas desta semana.",
        );
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [inicioSemana]);

  const dias = useMemo(
    () =>
      DIAS.map((nome, index) => {
        const data = somarDias(inicioSemana, index);
        return { nome, data };
      }),
    [inicioSemana],
  );

  /**
   * Troca a semana e reposiciona o dia em foco na mesma acao — sem efeito
   * colateral: derivar isso de um useEffect dispara render em cascata.
   */
  function irParaSemana(nova: string, onde: "hoje" | "inicio" | "fim" = "hoje") {
    setInicioSemana(nova);
    if (onde === "fim") return setDiaFoco(6);
    if (onde === "inicio") return setDiaFoco(0);
    const indiceHoje = DIAS.findIndex((_, i) => somarDias(nova, i) === hoje);
    setDiaFoco(indiceHoje >= 0 ? indiceHoje : 0);
  }

  /** Nas pontas vira a semana e cai no primeiro ou no ultimo dia dela. */
  function passarDia(passo: number) {
    const alvo = diaFoco + passo;
    if (alvo < 0) return irParaSemana(somarDias(inicioSemana, -7), "fim");
    if (alvo > 6) return irParaSemana(somarDias(inicioSemana, 7), "inicio");
    setDiaFoco(alvo);
  }

  /**
   * A coluna de um dia. No celular ela ocupa a largura toda, nao fixa a altura
   * de 520px da grade e dispensa o cabecalho — o navegador acima ja diz o dia.
   */
  function colunaDoDia(
    dia: { nome: string; data: string },
    index: number,
    compacta: boolean,
  ) {
    const pedidosDoDia = pedidosPorDia.get(dia.data) ?? [];
    const ehHoje = dia.data === hoje;

    return (
      <article
        key={dia.data}
        className={cn(
          "rounded-[22px] border bg-[#fffdfa] p-2.5 shadow-[0_8px_28px_rgba(89,62,55,0.025)]",
          compacta ? "min-h-[200px]" : "min-h-[520px]",
          ehHoje
            ? "border-[var(--terracotta)] ring-1 ring-[var(--terracotta)]/10"
            : "border-[var(--admin-border)]",
        )}
      >
        {!compacta && (
          <header className="flex items-center justify-between px-1 pb-2">
            <span
              className={cn(
                "text-[11px] font-bold tracking-[0.08em]",
                ehHoje
                  ? "text-[var(--terracotta)]"
                  : index >= 5
                    ? "text-[#9a6f64]"
                    : "text-[var(--admin-muted)]",
              )}
            >
              {dia.nome}
            </span>
            <span className="text-[11px] font-medium text-[var(--admin-muted)]">
              {diaDoMes(dia.data)}/{dia.data.slice(5, 7)}
            </span>
          </header>
        )}

        <div className="space-y-2">
          {carregando ? (
            <div className="grid min-h-40 place-items-center text-[var(--terracotta)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : pedidosDoDia.length ? (
            pedidosDoDia.map((pedido) => (
              <CardEntrega
                key={pedido.id}
                pedido={pedido}
                onClick={() => setPedidoAberto(pedido)}
              />
            ))
          ) : (
            <div className="grid min-h-20 place-items-center text-[var(--admin-muted)]">
              <span className="text-sm">Nenhuma entrega neste dia.</span>
            </div>
          )}
        </div>
      </article>
    );
  }

  const pedidosPorDia = useMemo(() => {
    const mapa = new Map<string, Pedido[]>();

    for (const pedido of pedidos) {
      if (!pedido.data_entrega) continue;
      const lista = mapa.get(pedido.data_entrega) ?? [];
      lista.push(pedido);
      mapa.set(pedido.data_entrega, lista);
    }

    for (const lista of mapa.values()) {
      lista.sort(
        (a, b) =>
          (a.janela_entrega ?? "99:99").localeCompare(
            b.janela_entrega ?? "99:99",
          ) || a.numero - b.numero,
      );
    }

    return mapa;
  }, [pedidos]);

  return (
    <section className="space-y-5 pb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[var(--admin-ink)]">
          Calendário de entregas
        </h1>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          Veja todas as entregas da semana e antecipe as datas especiais.
        </p>
      </div>


      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h2 className="text-xl font-semibold text-[var(--admin-ink)]">
              Entregas da semana
            </h2>
            <span className="text-sm font-medium text-[var(--terracotta)]">
              {pedidos.length} {pedidos.length === 1 ? "pedido" : "pedidos"}
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--admin-muted)]">
            {intervaloSemana(inicioSemana)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => irParaSemana(somarDias(inicioSemana, -7))}
            className="grid h-9 w-9 place-items-center rounded-full border border-[var(--admin-border)] bg-white text-[var(--admin-ink-soft)] transition hover:border-[var(--terracotta)] hover:text-[var(--terracotta)]"
            aria-label="Ver semana anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => irParaSemana(inicioDaSemana(hoje))}
            className="h-9 rounded-full border border-[var(--admin-border)] bg-white px-3 text-xs font-semibold text-[var(--admin-ink-soft)] transition hover:border-[var(--terracotta)] hover:text-[var(--terracotta)]"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => irParaSemana(somarDias(inicioSemana, 7))}
            className="grid h-9 w-9 place-items-center rounded-full border border-[var(--admin-border)] bg-white text-[var(--admin-ink-soft)] transition hover:border-[var(--terracotta)] hover:text-[var(--terracotta)]"
            aria-label="Ver próxima semana"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      {/* Celular: um dia por vez, com seta. A grade de sete colunas so cabia
          rolando 1120px na horizontal, e as colunas ficavam espremidas. */}
      <div className="md:hidden">
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-[var(--admin-border)] bg-white px-2 py-2">
          <button
            type="button"
            onClick={() => passarDia(-1)}
            aria-label="Dia anterior"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--admin-border)] text-[var(--admin-ink-soft)] transition hover:border-[var(--terracotta)] hover:text-[var(--terracotta)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="min-w-0 text-center">
            <p className="truncate text-sm font-semibold text-[var(--admin-ink)]">
              {dias[diaFoco]?.nome}
              {dias[diaFoco]?.data === hoje ? " · hoje" : ""}
            </p>
            <p className="text-xs text-[var(--admin-muted)]">
              {dias[diaFoco] ? `${diaDoMes(dias[diaFoco].data)}/${dias[diaFoco].data.slice(5, 7)}` : ""}
              {" · "}
              {(pedidosPorDia.get(dias[diaFoco]?.data ?? "") ?? []).length} entrega(s)
            </p>
          </div>

          <button
            type="button"
            onClick={() => passarDia(1)}
            aria-label="Próximo dia"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--admin-border)] text-[var(--admin-ink-soft)] transition hover:border-[var(--terracotta)] hover:text-[var(--terracotta)]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-2">
          {dias[diaFoco] && colunaDoDia(dias[diaFoco], diaFoco, true)}
        </div>
      </div>

      <div className="hidden overflow-x-auto pb-2 md:block [scrollbar-width:thin]">
        <div className="grid min-w-[1120px] grid-cols-7 gap-2">
          {dias.map((dia, index) => colunaDoDia(dia, index, false))}
        </div>
      </div>

      {!carregando && pedidos.length === 0 && !erro && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--admin-border)] bg-white/60 px-4 py-4 text-sm text-[var(--admin-muted)]">
          <PackageCheck className="h-4 w-4" />
          Nenhuma entrega programada para esta semana.
        </div>
      )}

      {/* Vem DEPOIS da grade: a fila do dia é o que ela precisa ver ao abrir
          a tela. A data comemorativa é útil, mas é planejamento — quem abre o
          calendário às sete da manhã quer saber o que sai hoje, não o que
          vender no mês que vem. */}
      {proximaData && (
        <div className="overflow-hidden rounded-2xl shadow-[var(--shadow-soft)]">
          <article className="flex flex-col gap-4 rounded-2xl border border-[var(--admin-border)] border-l-4 border-l-[var(--terracotta)] bg-gradient-to-r from-[#fff8f4] to-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#fbebe6] text-[var(--terracotta)]">
                <Gift className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-[var(--admin-ink)]">
                  {proximaData.nome} está chegando
                </p>
                <p className="mt-1 text-xs font-semibold text-[var(--terracotta)]">
                  {dataEspecial(proximaData.data)} · {textoContagem(proximaData.diasRestantes)}
                </p>
                <p className="mt-1.5 text-sm leading-5 text-[var(--admin-ink-soft)]">
                  {proximaData.mensagem}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMostrarDatas((valor) => !valor)}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-[var(--admin-border)] bg-white px-4 text-sm font-semibold text-[var(--terracotta)] shadow-sm transition hover:bg-[var(--cream)]"
              aria-expanded={mostrarDatas}
            >
              {mostrarDatas ? "Ocultar datas" : "Ver próximas datas"}
            </button>
          </article>

          {mostrarDatas && (
            <div className="grid gap-2 border-x border-b border-[var(--admin-border)] bg-[#fffdfa] p-3 sm:grid-cols-2 xl:grid-cols-5">
              {datasEspeciais.slice(1).map((evento) => (
                <LembreteData key={evento.data + evento.nome} evento={evento} />
              ))}
            </div>
          )}
        </div>
      )}

      <p className="flex items-center gap-2 text-xs text-[var(--admin-muted)]">
        <CalendarDays className="h-3.5 w-3.5" />
        As datas especiais são atualizadas automaticamente a cada ano.
      </p>

      <DetalhesEntregaDialog
        pedido={pedidoAberto}
        empresa={empresa}
        onClose={() => setPedidoAberto(null)}
      />
    </section>
  );
}
