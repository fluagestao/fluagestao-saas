import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MessageCircle, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { imprimirFicha } from "@/lib/ficha-pedido";

import { cn } from "@/lib/utils";
import { carregarAgenda } from "@/lib/pedidos";
import { formatarDataCurta, hojeISO, somarDias } from "@/lib/prazo";
import {
  formatBRL,
  pedidoConcluido,
  statusCor,
  statusLabel,
  whatsappDoCliente,
  type Pedido,
} from "@/lib/vendas";

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

/** Segunda-feira da semana em que a data cai. */
function segundaDa(iso: string): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay(); // 0 = domingo
  return somarDias(iso, d === 0 ? -6 : 1 - d);
}

/** Segunda = 0 … Domingo = 6. */
function indiceDoDia(iso: string): number {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
  return d === 0 ? 6 : d - 1;
}

/**
 * Minutos do dia para ordenar a coluna.
 *
 * A janela é texto livre — "08:00", "manhã", "máximo até as 10:00". Extrai a
 * hora quando existe; senão encaixa o período no horário em que ele costuma
 * acontecer. Sem nada, vai para o fim.
 */
function minutosDaJanela(janela: string | null): number {
  const t = (janela ?? "").toLowerCase();
  const hora = /(\d{1,2})[:h](\d{2})?/.exec(t);
  if (hora) return Number(hora[1]) * 60 + Number(hora[2] ?? 0);
  if (t.includes("manh")) return 8 * 60;
  if (t.includes("tarde")) return 13 * 60;
  if (t.includes("noite")) return 19 * 60;
  return 24 * 60 + 1;
}

/**
 * Quadro da semana: uma coluna por dia, pedidos em ordem de horário.
 *
 * É a visão de quem produz — "o que sai quinta e a que horas" — que a lista por
 * urgência não dá, porque lá tudo do futuro vira um bloco só.
 */
export function AgendaSemana() {
  const [semana, setSemana] = useState(() => segundaDa(hojeISO()));
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const hoje = hojeISO();
  // No celular cabe um dia por vez. Começa no dia de hoje, que é o que
  // interessa ao abrir o sistema de manhã.
  const [foco, setFoco] = useState(() => indiceDoDia(hojeISO()));
  // Clicar no card abre o pedido inteiro: o quadro mostra o essencial, e o
  // resto (endereço, cartão, contato) fica a um toque.
  const [aberto, setAberto] = useState<Pedido | null>(null);

  // Busca a semana que está na tela: o resumo do Início cobre só o mês, e ao
  // voltar uma semana faltaria o que já foi entregue.
  const buscar = useCallback(async () => {
    try {
      const r = await carregarAgenda({ data: { de: semana, ate: somarDias(semana, 6) } });
      setPedidos(r.pedidos as Pedido[]);
    } catch {
      // A agenda é complementar: se falhar, o resto do Início continua de pé.
      setPedidos([]);
    }
  }, [semana]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  // Trocou de semana pelas setas do topo (desktop): o celular volta pro
  // primeiro dia dela, senão ficaria num dia solto no meio.
  useEffect(() => {
    setFoco(semana === segundaDa(hojeISO()) ? indiceDoDia(hojeISO()) : 0);
  }, [semana]);

  const dias = useMemo(() => {
    return DIAS.map((nome, i) => {
      const data = somarDias(semana, i);
      const doDia = pedidos
        .filter((p) => p.data_entrega === data && p.status !== "cancelado")
        .sort(
          (a, b) =>
            minutosDaJanela(a.janela_entrega) - minutosDaJanela(b.janela_entrega) ||
            a.numero - b.numero,
        );
      return { nome, data, pedidos: doDia };
    });
  }, [pedidos, semana]);

  const total = dias.reduce((t, d) => t + d.pedidos.length, 0);
  const ehSemanaAtual = semana === segundaDa(hoje);
  const diaAberto = dias[foco] ?? dias[0];

  /** Passar do domingo entra na semana seguinte, como quem vira a página. */
  function andarDia(passo: 1 | -1) {
    const alvo = foco + passo;
    if (alvo > 6) {
      setSemana((s) => somarDias(s, 7));
      setFoco(0);
    } else if (alvo < 0) {
      setSemana((s) => somarDias(s, -7));
      setFoco(6);
    } else {
      setFoco(alvo);
    }
  }

  return (
    <div className="mt-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold text-foreground">Entregas da semana</h2>
        <span className="text-sm text-muted-foreground">
          {total} pedido{total === 1 ? "" : "s"}
        </span>

        <div className="ml-auto hidden items-center gap-1 md:flex">
          <button
            type="button"
            aria-label="Semana anterior"
            onClick={() => setSemana((s) => somarDias(s, -7))}
            className="rounded-full border border-[var(--cream-deep)] p-1.5 text-foreground/60 hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {!ehSemanaAtual && (
            <button
              type="button"
              onClick={() => setSemana(segundaDa(hoje))}
              className="rounded-full border border-[var(--cream-deep)] px-3 py-1 text-xs font-medium text-foreground/70 hover:text-foreground"
            >
              esta semana
            </button>
          )}
          <button
            type="button"
            aria-label="Próxima semana"
            onClick={() => setSemana((s) => somarDias(s, 7))}
            className="rounded-full border border-[var(--cream-deep)] p-1.5 text-foreground/60 hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Celular: um dia por vez, com setas. Sete colunas espremidas ficariam
          ilegíveis, e rolar de lado é fácil de não perceber. */}
      <div className="md:hidden">
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            aria-label="Dia anterior"
            onClick={() => andarDia(-1)}
            className="rounded-full border border-[var(--cream-deep)] p-2 text-foreground/60"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex-1 text-center">
            <p
              className={cn(
                "font-medium",
                diaAberto.data === hoje ? "text-[var(--terracotta)]" : "text-foreground",
              )}
            >
              {diaAberto.data === hoje ? "Hoje" : diaAberto.nome}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatarDataCurta(diaAberto.data)} ·{" "}
              {diaAberto.pedidos.length === 0
                ? "sem entregas"
                : `${diaAberto.pedidos.length} entrega${diaAberto.pedidos.length === 1 ? "" : "s"}`}
            </p>
          </div>

          <button
            type="button"
            aria-label="Próximo dia"
            onClick={() => andarDia(1)}
            className="rounded-full border border-[var(--cream-deep)] p-2 text-foreground/60"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Bolinhas: mostram onde tem entrega no resto da semana e pulam direto. */}
        <div className="mb-3 flex justify-center gap-1.5">
          {dias.map((d, i) => (
            <button
              key={d.data}
              type="button"
              aria-label={d.nome}
              onClick={() => setFoco(i)}
              className={cn(
                "h-2 rounded-full transition-all",
                i === foco
                  ? "w-6 bg-[var(--terracotta)]"
                  : d.pedidos.length > 0
                    ? "w-2 bg-[var(--bronze)]"
                    : "w-2 bg-[var(--cream-deep)]",
              )}
            />
          ))}
        </div>

        {diaAberto.pedidos.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--cream-deep)] py-6 text-center text-sm text-muted-foreground">
            Nada para entregar neste dia.
          </p>
        ) : (
          <ul className="space-y-2">
            {diaAberto.pedidos.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setAberto(p)}
                  className={cn(
                    "w-full rounded-xl px-3 py-2.5 text-left shadow-[var(--shadow-soft)]",
                    pedidoConcluido(p) ? "bg-[#EAF1EA] opacity-70" : "bg-card",
                  )}
                  style={{ borderLeft: `3px solid ${statusCor(p.status)}` }}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {p.janela_entrega || "sem horário"}
                    </span>
                    <span className="text-xs text-muted-foreground">#{p.numero}</span>
                  </div>
                  <p className="font-medium text-foreground">{p.cliente_nome ?? "Sem nome"}</p>
                  <ul className="text-sm leading-tight text-muted-foreground">
                    {p.itens.map((i, n) => (
                      <li key={n}>
                        {i.qtd}x {i.nome}
                      </li>
                    ))}
                    {p.itens.length === 0 && <li>sem itens</li>}
                  </ul>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.tipo === "retirada" ? "Retirada" : (p.bairro ?? "Entrega")}
                    {p.destinatario_nome && ` · recebe: ${p.destinatario_nome}`}
                  </p>
                  <p className="mt-0.5 text-xs font-medium">
                    {p.recebido_em ? (
                      <span className="text-[var(--whatsapp)]">
                        {formatBRL(p.total)} {pedidoConcluido(p) ? "✓ entregue" : "pago"}
                      </span>
                    ) : (
                      <span className="text-[var(--terracotta)]">
                        {formatBRL(p.total)} a receber
                      </span>
                    )}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Computador: a semana inteira de uma vez. */}
      <div className="hidden md:block">
        <div className="grid grid-cols-7 gap-2">
          {dias.map((d) => {
            const ehHoje = d.data === hoje;
            const passou = d.data < hoje;
            return (
              <div
                key={d.data}
                className={cn(
                  "rounded-2xl border p-2",
                  ehHoje
                    ? "border-[var(--terracotta)] bg-[var(--cream)]"
                    : "border-[var(--cream-deep)] bg-card",
                  passou && !ehHoje && "opacity-60",
                )}
              >
                <div className="mb-2 flex items-baseline justify-between gap-1 px-0.5">
                  <span
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wide",
                      ehHoje ? "text-[var(--terracotta)]" : "text-[var(--bronze)]",
                    )}
                  >
                    {d.nome.slice(0, 3)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatarDataCurta(d.data)}
                  </span>
                </div>

                {d.pedidos.length === 0 ? (
                  <p className="px-0.5 py-3 text-center text-[11px] text-muted-foreground">—</p>
                ) : (
                  <ul className="space-y-1.5">
                    {d.pedidos.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => setAberto(p)}
                          className={cn(
                            "w-full rounded-xl px-2 py-1.5 text-left transition-colors",
                            // Entregue E pago não dá mais trabalho: fica em verde
                            // apagado, para o que falta fazer saltar na coluna.
                            pedidoConcluido(p)
                              ? "bg-[#EAF1EA] opacity-70 hover:opacity-100"
                              : "bg-[var(--cream-soft)] hover:bg-[var(--cream)]",
                          )}
                          style={{ borderLeft: `3px solid ${statusCor(p.status)}` }}
                        >
                          {/* Horário e número: é por eles que a produção e o
                              entregador se referem ao pedido. */}
                          <div className="flex items-baseline justify-between gap-1">
                            <span className="text-[11px] font-semibold text-foreground">
                              {p.janela_entrega || "sem horário"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">#{p.numero}</span>
                          </div>

                          {/* Nada truncado: nome pela metade não serve. */}
                          <p className="text-xs font-medium leading-tight text-foreground">
                            {p.cliente_nome ?? "Sem nome"}
                          </p>

                          <ul className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                            {p.itens.map((i, n) => (
                              <li key={n}>
                                {i.qtd}x {i.nome}
                              </li>
                            ))}
                            {p.itens.length === 0 && <li>sem itens</li>}
                          </ul>

                          <p className="mt-1 text-[10px] leading-tight text-muted-foreground">
                            {p.tipo === "retirada" ? "Retirada" : (p.bairro ?? "Entrega")}
                          </p>
                          {p.destinatario_nome && (
                            <p className="text-[10px] leading-tight text-muted-foreground">
                              recebe: {p.destinatario_nome}
                            </p>
                          )}

                          <p className="mt-1 text-[11px] font-medium">
                            {p.recebido_em ? (
                              <span className="text-[var(--whatsapp)]">
                                {formatBRL(p.total)} {pedidoConcluido(p) ? "✓ entregue" : "pago"}
                              </span>
                            ) : (
                              <span className="text-[var(--terracotta)]">
                                {formatBRL(p.total)} a receber
                              </span>
                            )}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {aberto && <DetalhePedido pedido={aberto} onClose={() => setAberto(null)} />}
    </div>
  );
}

/** Pedido inteiro, só leitura, com os dois botões que a entrega precisa. */
function DetalhePedido({ pedido: p, onClose }: { pedido: Pedido; onClose: () => void }) {
  const wa = whatsappDoCliente(p.cliente_whatsapp);
  const waRecebe = whatsappDoCliente(p.destinatario_whatsapp);
  const linha = (rotulo: string, valor: React.ReactNode) =>
    valor ? (
      <p className="text-sm">
        <span className="text-muted-foreground">{rotulo}: </span>
        <span className="text-foreground">{valor}</span>
      </p>
    ) : null;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold tracking-tight">
            #{p.numero} · {p.cliente_nome ?? "Sem nome"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className="rounded-full px-2 py-0.5 text-white"
            style={{ backgroundColor: statusCor(p.status) }}
          >
            {statusLabel(p.status)}
          </span>
          <span className={p.recebido_em ? "text-[var(--whatsapp)]" : "text-[var(--terracotta)]"}>
            {formatBRL(p.total)} {p.recebido_em ? "pago" : "a receber"}
          </span>
        </div>

        <ul className="rounded-xl bg-[var(--cream-soft)] p-3 text-sm">
          {p.itens.map((i, n) => (
            <li key={n} className="flex justify-between gap-3">
              <span className="text-foreground">
                {i.qtd}x {i.nome}
                {i.variacao ? ` (${i.variacao})` : ""}
              </span>
              <span className="shrink-0 text-muted-foreground">
                {i.preco != null ? formatBRL(i.preco * i.qtd) : "a combinar"}
              </span>
            </li>
          ))}
        </ul>

        <div className="space-y-1">
          {linha(p.tipo === "retirada" ? "Retirada" : "Entrega", p.janela_entrega)}
          {p.tipo !== "retirada" &&
            linha("Endereço", [p.endereco, p.bairro].filter(Boolean).join(", "))}
          {linha("Referência", p.referencia)}
          {linha("Quem recebe", p.destinatario_nome)}
          {linha("Contato de quem recebe", p.destinatario_whatsapp)}
          {linha("Pagamento", p.forma_pagamento)}
          {linha("Cartão", p.cartao_mensagem)}
          {linha("Observação", p.observacao)}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => imprimirFicha(p)}>
            <Printer className="mr-1.5 h-4 w-4" />
            Ficha
          </Button>
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">
                <MessageCircle className="mr-1.5 h-4 w-4" />
                Cliente
              </Button>
            </a>
          )}
          {waRecebe && (
            <a href={waRecebe} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">
                <MessageCircle className="mr-1.5 h-4 w-4" />
                Quem recebe
              </Button>
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
