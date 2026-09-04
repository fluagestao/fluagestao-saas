import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { mensagemDeErro } from "@/lib/erros";
import { formatarDataLonga, hojeISO, somarDias } from "@/lib/prazo";
import {
  carregarTarefas,
  marcarTarefa,
  removerTarefa,
  salvarTarefa,
} from "@/lib/tarefas";
import type { Tarefa } from "@/lib/tarefas-ops.server";
import { Carregando, EstadoVazio, PageHeader, useConfirmar } from "./shell";

const PRIORIDADES = [
  { v: "alta", label: "Alta", cor: "#B5322B" },
  { v: "normal", label: "Normal", cor: "#B8893B" },
  { v: "baixa", label: "Baixa", cor: "#7A6A5E" },
] as const;

export function corPrioridade(p: Tarefa["prioridade"]): string {
  return PRIORIDADES.find((x) => x.v === p)?.cor ?? "#7A6A5E";
}

/** Atrasada, hoje, amanhã ou nada — o que muda a cor do prazo. */
export function situacaoDoPrazo(t: Tarefa): "atrasada" | "hoje" | "amanha" | null {
  if (!t.prazo || t.feita) return null;
  const hoje = hojeISO();
  if (t.prazo < hoje) return "atrasada";
  if (t.prazo === hoje) return "hoje";
  if (t.prazo === somarDias(hoje, 1)) return "amanha";
  return null;
}

export function LinhaTarefa({
  t,
  onAlternar,
  onExcluir,
}: {
  t: Tarefa;
  onAlternar: (t: Tarefa) => void;
  onExcluir?: (t: Tarefa) => void;
}) {
  const sit = situacaoDoPrazo(t);
  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-xl border border-[var(--cream-deep)] bg-card px-3 py-2.5",
        t.feita && "opacity-55",
      )}
    >
      <button
        type="button"
        onClick={() => onAlternar(t)}
        aria-label={t.feita ? "Reabrir tarefa" : "Concluir tarefa"}
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
          t.feita
            ? "border-[var(--whatsapp)] bg-[var(--whatsapp)] text-white"
            : "border-[var(--cream-deep)] hover:border-[var(--terracotta)]",
        )}
      >
        {t.feita && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </button>

      <div className="min-w-0 flex-1">
        <p className={cn("text-sm text-foreground", t.feita && "line-through")}>{t.titulo}</p>
        {t.detalhe && <p className="text-xs text-muted-foreground">{t.detalhe}</p>}
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px]">
          <span
            className="rounded-full px-1.5 py-0.5 text-white"
            style={{ backgroundColor: corPrioridade(t.prioridade) }}
          >
            {PRIORIDADES.find((p) => p.v === t.prioridade)?.label}
          </span>
          {t.prazo && (
            <span
              className={cn(
                sit === "atrasada"
                  ? "font-medium text-destructive"
                  : sit === "hoje"
                    ? "font-medium text-[var(--terracotta)]"
                    : "text-muted-foreground",
              )}
            >
              {sit === "atrasada" && "Atrasada · "}
              {sit === "hoje" && "Hoje · "}
              {sit === "amanha" && "Amanhã · "}
              {formatarDataLonga(t.prazo)}
            </span>
          )}
        </div>
      </div>

      {onExcluir && (
        <button
          type="button"
          aria-label="Excluir tarefa"
          onClick={() => onExcluir(t)}
          className="rounded-full p-1.5 text-foreground/40 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}

export function TarefasPanel() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [prazo, setPrazo] = useState("");
  const [prioridade, setPrioridade] = useState<Tarefa["prioridade"]>("normal");
  const [verFeitas, setVerFeitas] = useState(false);
  const confirmar = useConfirmar();

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const d = await carregarTarefas();
      setTarefas(d.tarefas as Tarefa[]);
    } catch (e) {
      setErro(mensagemDeErro(e, "carregar as tarefas"));
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const pendentes = useMemo(() => tarefas.filter((t) => !t.feita), [tarefas]);
  const feitas = useMemo(() => tarefas.filter((t) => t.feita), [tarefas]);

  async function adicionar() {
    if (!titulo.trim()) return;
    await salvarTarefa({
      data: { titulo: titulo.trim(), detalhe: null, prazo: prazo || null, prioridade },
    });
    toast.success("Tarefa adicionada.");
    setTitulo("");
    setPrazo("");
    setPrioridade("normal");
    recarregar();
  }

  async function alternar(t: Tarefa) {
    // Otimista: o check responde na hora.
    setTarefas((prev) => prev.map((x) => (x.id === t.id ? { ...x, feita: !x.feita } : x)));
    try {
      await marcarTarefa({ data: { id: t.id, feita: !t.feita } });
      if (!t.feita) toast.success("Feito! 🤍");
    } catch {
      recarregar();
    }
  }

  async function excluir(t: Tarefa) {
    const ok = await confirmar({
      titulo: `Excluir "${t.titulo}"?`,
      confirmar: "Excluir",
      destrutivo: true,
    });
    if (!ok) return;
    await removerTarefa({ data: { id: t.id } });
    toast.success("Tarefa excluída.");
    recarregar();
  }

  if (erro) {
    return (
      <section>
        <PageHeader titulo="Tarefas" />
        <p className="rounded-xl bg-[var(--cream)] px-3 py-2 text-sm text-destructive">{erro}</p>
      </section>
    );
  }

  return (
    <section>
      <PageHeader
        titulo="Tarefas"
        descricao="O que precisa ser feito, com prazo. Some da tela inicial assim que você marca."
      />

      {/* nova tarefa */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-dashed border-[var(--cream-deep)] p-3">
        <Input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && adicionar()}
          placeholder="O que precisa ser feito?"
          className="min-w-[12rem] flex-1"
        />
        <Input
          type="date"
          value={prazo}
          onChange={(e) => setPrazo(e.target.value)}
          className="min-w-[10.5rem] flex-1 sm:w-[9.5rem] sm:flex-none"
        />
        <select
          value={prioridade}
          onChange={(e) => setPrioridade(e.target.value as Tarefa["prioridade"])}
          className="h-10 rounded-lg border border-[var(--cream-deep)] bg-background px-3 text-sm"
        >
          {PRIORIDADES.map((p) => (
            <option key={p.v} value={p.v}>
              {p.label}
            </option>
          ))}
        </select>
        <Button onClick={adicionar} disabled={!titulo.trim()}>
          <Plus className="mr-1.5 h-4 w-4" />
          Adicionar
        </Button>
      </div>

      {carregando && <Carregando />}

      {!carregando && pendentes.length === 0 && feitas.length === 0 && (
        <EstadoVazio
          titulo="Nenhuma tarefa por aqui"
          descricao="Anote o que não pode esquecer — comprar embalagem, ligar pro fornecedor, conferir estoque."
        />
      )}

      {pendentes.length > 0 && (
        <ul className="mt-4 space-y-2">
          {pendentes.map((t) => (
            <LinhaTarefa key={t.id} t={t} onAlternar={alternar} onExcluir={excluir} />
          ))}
        </ul>
      )}

      {feitas.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setVerFeitas((v) => !v)}
            className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--bronze)] hover:text-[var(--terracotta)]"
          >
            {verFeitas ? "Ocultar" : "Ver"} concluídas ({feitas.length})
          </button>
          {verFeitas && (
            <ul className="mt-2 space-y-2">
              {feitas.map((t) => (
                <LinhaTarefa key={t.id} t={t} onAlternar={alternar} onExcluir={excluir} />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
