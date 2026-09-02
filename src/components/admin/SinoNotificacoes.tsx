"use client";

import { Bell, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { carregarNotificacoes } from "@/lib/notificacoes";
import type { Aviso } from "@/lib/notificacoes-tipos";
import { cn } from "@/lib/utils";

const FAMILIA_ROTULO: Record<Aviso["familia"], string> = {
  operacao: "Operação",
  dinheiro: "Dinheiro",
  relacionamento: "Relacionamento",
  tarefas: "Tarefas",
};

const ORDEM_FAMILIA: Aviso["familia"][] = [
  "operacao",
  "dinheiro",
  "relacionamento",
  "tarefas",
];

/**
 * Barra de avisos do sino.
 *
 * Tudo é derivado na hora: o aviso do boleto some no instante em que ele é
 * pago. Por isso não existe "lido" nem histórico — o painel mostra o que está
 * acontecendo agora, e recarrega toda vez que abre.
 */
export function SinoNotificacoes({ onIrPara }: { onIrPara: (destino: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [total, setTotal] = useState(0);
  const [urgentes, setUrgentes] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const buscar = useCallback(async () => {
    setCarregando(true);
    try {
      const d = await carregarNotificacoes();
      setAvisos(d.avisos);
      setTotal(d.total);
      setUrgentes(d.urgentes);
    } catch {
      setAvisos([]);
      setTotal(0);
      setUrgentes(0);
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    buscar();
  }, [buscar]);

  useEffect(() => {
    function fecharAoClicarFora(evento: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(evento.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", fecharAoClicarFora);
    return () => document.removeEventListener("mousedown", fecharAoClicarFora);
  }, []);

  const familias = ORDEM_FAMILIA.map(
    (f) => [f, avisos.filter((a) => a.familia === f)] as const,
  ).filter(([, lista]) => lista.length > 0);

  return (
    <div ref={containerRef} className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => {
              const proximo = !aberto;
              setAberto(proximo);
              // Recarrega ao abrir: o painel mostra o agora, não o de quando a
              // página carregou.
              if (proximo) buscar();
            }}
            aria-expanded={aberto}
            aria-label={total ? `${total} aviso(s)` : "Nenhum aviso"}
            className="relative grid h-10 w-10 place-items-center rounded-xl text-[var(--admin-ink-soft)] transition hover:bg-[var(--cream)] hover:text-[var(--terracotta)]"
          >
            <Bell className="h-[18px] w-[18px]" />
            {total > 0 && (
              <span
                className={cn(
                  "absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold text-white ring-2 ring-white",
                  urgentes > 0 ? "bg-destructive" : "bg-[var(--terracotta)]",
                )}
              >
                {total > 9 ? "9+" : total}
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          {total ? `${total} aviso(s) agora` : "Nenhum aviso agora"}
        </TooltipContent>
      </Tooltip>

      {aberto && (
        <div className="absolute right-0 top-full z-[110] mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-white shadow-[var(--shadow-lift)]">
          <div className="flex items-center justify-between border-b border-[var(--admin-border)] px-4 py-2.5">
            <p className="t-title text-foreground">Avisos</p>
            {carregando && <Loader2 className="h-4 w-4 animate-spin text-[var(--terracotta)]" />}
          </div>

          <div className="max-h-[70dvh] overflow-y-auto p-2">
            {!carregando && avisos.length === 0 && (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                Nada pedindo atenção agora.
              </p>
            )}

            {familias.map(([familia, lista]) => (
              <div key={familia} className="mb-2 last:mb-0">
                <p className="px-2 py-1 t-support uppercase tracking-[0.1em] text-[var(--bronze)]">
                  {FAMILIA_ROTULO[familia]}
                </p>
                {lista.map((aviso) => (
                  <button
                    key={aviso.tipo}
                    type="button"
                    onClick={() => {
                      setAberto(false);
                      onIrPara(aviso.destino);
                    }}
                    className="flex w-full items-start gap-2 rounded-xl px-2 py-2 text-left transition-colors hover:bg-[var(--cream-soft)]"
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        aviso.urgente ? "bg-destructive" : "bg-[var(--terracotta)]",
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block t-item text-foreground">{aviso.titulo}</span>
                      <span className="block t-support text-muted-foreground">
                        {aviso.detalhe}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div className="border-t border-[var(--admin-border)] px-4 py-2">
            <button
              type="button"
              onClick={() => {
                setAberto(false);
                onIrPara("/conta/configuracoes");
              }}
              className="t-support text-[var(--coral)] transition-colors hover:underline"
            >
              Escolher quais avisos aparecem
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
