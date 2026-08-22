import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatarDataLonga, hojeISO } from "@/lib/prazo";
import { carregarResumoPedidos } from "@/lib/pedidos";
import { carregarTarefas, carregarVersiculo, marcarTarefa, salvarMeuNome } from "@/lib/tarefas";
import type { Tarefa } from "@/lib/tarefas-ops.server";
import {
  formatBRL,
  ordenarPorEntrega,
  resumoVendas,
  statusCor,
  statusLabel,
  urgenciaDoPedido,
  type Pedido,
} from "@/lib/vendas";
import { saudacao, versiculoDoDia } from "@/lib/versiculos";
import { Carregando, Num } from "./shell";
import { LinhaTarefa, situacaoDoPrazo } from "./TarefasPanel";
import { AgendaSemana } from "./AgendaSemana";

function Cartao({
  titulo,
  valor,
  nota,
  destaque,
}: {
  titulo: string;
  valor: string;
  nota?: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl p-4 shadow-[var(--shadow-card)]",
        destaque ? "bg-[var(--terracotta)] text-[var(--cream-soft)]" : "bg-card",
      )}
    >
      <p
        className={cn(
          "text-xs uppercase tracking-[0.14em]",
          destaque ? "text-[var(--cream-soft)]/75" : "text-[var(--bronze)]",
        )}
      >
        {titulo}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        <Num>{valor}</Num>
      </p>
      {nota && (
        <p
          className={cn(
            "mt-0.5 text-xs",
            destaque ? "text-[var(--cream-soft)]/80" : "text-muted-foreground",
          )}
        >
          {nota}
        </p>
      )}
    </div>
  );
}

/**
 * Tela de entrada do painel: quem chegou, o dia, e o que precisa de atenção.
 *
 * Não tem ação de edição aqui de propósito — é para ler em dez segundos e
 * saber para onde ir.
 */
export function InicioPanel({ onIrPara }: { onIrPara: (aba: "vendas" | "tarefas") => void }) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [nome, setNome] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [editandoNome, setEditandoNome] = useState(false);
  const [nomeRascunho, setNomeRascunho] = useState("");

  const hoje = hojeISO();
  // Cai na lista do código enquanto o banco não responde (ou se estiver vazio).
  const [versiculo, setVersiculo] = useState(() => versiculoDoDia(hoje));
  useEffect(() => {
    carregarVersiculo({ data: { data: hoje } })
      .then((v) => v && setVersiculo(v))
      .catch(() => {});
  }, [hoje]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [ped, tar] = await Promise.allSettled([carregarResumoPedidos(), carregarTarefas()]);
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

  /** Fila de produção: o que ainda não saiu, do mais urgente ao menos. */
  const fila = useMemo(
    () =>
      ordenarPorEntrega(
        pedidos.filter(
          (p) => p.status === "novo" || p.status === "producao" || p.status === "pronto",
        ),
      ).slice(0, 6),
    [pedidos],
  );

  const tarefasDoDia = useMemo(
    () => tarefas.filter((t) => !t.feita && situacaoDoPrazo(t) !== null).slice(0, 5),
    [tarefas],
  );

  // Primeiro nome só; o resto do cadastro não interessa na saudação.
  const primeiro = (nome ?? email.split("@")[0] ?? "").trim().split(/\s+/)[0] ?? "";

  async function salvarNome() {
    const n = nomeRascunho.trim();
    if (!n) return;
    setNome(n);
    setEditandoNome(false);
    try {
      await salvarMeuNome({ data: { nome: n } });
      toast.success(`Prazer, ${n.split(/\s+/)[0]}! 🤍`);
    } catch {
      carregar();
    }
  }

  async function alternarTarefa(t: Tarefa) {
    setTarefas((prev) => prev.map((x) => (x.id === t.id ? { ...x, feita: !x.feita } : x)));
    try {
      await marcarTarefa({ data: { id: t.id, feita: !t.feita } });
      if (!t.feita) toast.success("Feito! 🤍");
    } catch {
      carregar();
    }
  }

  return (
    <section>
      {/* Saudação e lembretes lado a lado: o que precisa ser lembrado tem que
          estar na primeira tela, não no fim da página. */}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-3xl bg-gradient-to-br from-[var(--cream)] to-[var(--cream-soft)] p-6 shadow-[var(--shadow-card)] sm:p-8">
          {editandoNome ? (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                autoFocus
                value={nomeRascunho}
                onChange={(e) => setNomeRascunho(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && salvarNome()}
                placeholder="Como quer ser chamada?"
                className="max-w-xs"
              />
              <Button size="sm" onClick={salvarNome}>
                Salvar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditandoNome(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <h2 className="flex flex-wrap items-center gap-2 text-3xl font-semibold text-foreground sm:text-4xl">
              {saudacao()}
              {primeiro && `, ${primeiro}`}! 🤍
              <button
                type="button"
                aria-label="Mudar meu nome"
                onClick={() => {
                  setNomeRascunho(nome ?? "");
                  setEditandoNome(true);
                }}
                className="text-[var(--bronze)] transition-colors hover:text-[var(--terracotta)]"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </h2>
          )}

          <p className="mt-1 text-sm capitalize text-muted-foreground">{formatarDataLonga(hoje)}</p>

          <figure className="mt-5 border-l-2 border-[var(--terracotta)] pl-4">
            <blockquote className="text-lg leading-relaxed text-foreground/90">
              “{versiculo.texto}”
            </blockquote>
            <figcaption className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--bronze)]">
              {versiculo.referencia}
            </figcaption>
          </figure>
        </div>

        <div className="rounded-3xl bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xl font-semibold text-foreground">Lembretes</h3>
            <button
              type="button"
              onClick={() => onIrPara("tarefas")}
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--terracotta)]"
            >
              ver tarefas <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {tarefasDoDia.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Nada com prazo pra hoje ou amanhã 🤍
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {tarefasDoDia.map((t) => (
                <LinhaTarefa key={t.id} t={t} onAlternar={alternarTarefa} />
              ))}
            </ul>
          )}
        </div>
      </div>

      {carregando && <Carregando />}

      {/* números do dia */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cartao
          titulo="Entregas hoje"
          valor={String(resumo.entregasHoje)}
          nota={resumo.entregasHoje ? "precisam sair hoje" : "nada pra hoje"}
          destaque={resumo.entregasHoje > 0}
        />
        <Cartao titulo="Pedidos em aberto" valor={String(resumo.pendentes)} />
        <Cartao titulo="Faturamento do mês" valor={formatBRL(resumo.faturamentoMes)} />
        <Cartao
          titulo="Ticket médio"
          valor={formatBRL(resumo.ticketMedio)}
          nota={`${resumo.numMes} pedido(s) no mês`}
        />
      </div>

      {/* Quadro da semana logo abaixo dos números: é o que responde "o que sai
          quinta e a que horas", que a lista por urgência não mostra. */}
      <AgendaSemana />

      <div className="mt-5">
        {/* mais vendidos do mês */}
        <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-foreground">Mais vendidos no mês</h3>
            <button
              type="button"
              onClick={() => onIrPara("vendas")}
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--terracotta)]"
            >
              ver vendas <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {resumo.maisVendidos.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhuma venda registrada neste mês ainda.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {resumo.maisVendidos.map((m, i) => {
                // Barra proporcional ao campeão, pra comparar de relance.
                const topo = resumo.maisVendidos[0].qtd || 1;
                return (
                  <li key={m.nome} className="flex items-center gap-2 text-sm">
                    <span className="w-4 shrink-0 text-xs tabular-nums text-[var(--bronze)]">
                      {i + 1}º
                    </span>
                    <span className="min-w-0 flex-1 truncate text-foreground">{m.nome}</span>
                    <span className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-[var(--cream-deep)] sm:block">
                      <span
                        className="block h-full rounded-full bg-[var(--terracotta)]"
                        style={{ width: `${Math.max(8, (m.qtd / topo) * 100)}%` }}
                      />
                    </span>
                    <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">
                      <Num>{m.qtd}</Num> venda{m.qtd > 1 ? "s" : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
