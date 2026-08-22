// Peças compartilhadas do painel: cabeçalho de seção, tabela responsiva,
// estados vazio/carregando e confirmação. Antes cada painel montava o seu do
// próprio jeito (e usava confirm() do navegador) — aqui fica uma versão só.
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Cabeçalho de seção: título, explicação e a ação primária à direita. */
export function PageHeader({
  titulo,
  descricao,
  acoes,
}: {
  titulo: string;
  descricao?: ReactNode;
  acoes?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 pb-4">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{titulo}</h2>
        {descricao && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{descricao}</p>
        )}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </header>
  );
}

/** Envelope da tabela: borda, cantos e rolagem horizontal própria. */
export function TabelaEnvelope({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--cream-deep)] bg-card">
      {children}
    </div>
  );
}

/** Números de dinheiro: mesma largura por dígito e alinhados à direita. */
export function Num({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("tabular-nums", className)}>{children}</span>;
}

export function EstadoVazio({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-5 py-14 text-center">
      <p className="text-lg font-semibold text-foreground">{titulo}</p>
      {descricao && <p className="max-w-sm text-sm text-muted-foreground">{descricao}</p>}
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  );
}

/** Esqueleto no formato da tabela — menos salto de layout que "carregando…". */
export function TabelaSkeleton({ linhas = 5, colunas = 4 }: { linhas?: number; colunas?: number }) {
  return (
    <div className="divide-y divide-[var(--cream-deep)]">
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          {Array.from({ length: colunas }).map((_, j) => (
            <Skeleton key={j} className={j === 0 ? "h-4 flex-1" : "h-4 w-20"} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Carregando({ texto = "carregando…" }: { texto?: string }) {
  return (
    <p className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {texto}
    </p>
  );
}

// ---------- confirmação ----------

type PedidoConfirmacao = {
  titulo: string;
  descricao?: string;
  confirmar?: string;
  destrutivo?: boolean;
};

type ConfirmarFn = (p: PedidoConfirmacao) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmarFn | null>(null);

/**
 * Substitui window.confirm por um diálogo do próprio sistema.
 * Uso: `if (!(await confirmar({ titulo: "Excluir?" }))) return;`
 */
export function useConfirmar(): ConfirmarFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirmar precisa do <ConfirmProvider>");
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<PedidoConfirmacao | null>(null);
  // A promise fica pendurada aqui até o usuário escolher.
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirmar = useCallback<ConfirmarFn>((p) => {
    setPedido(p);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function responder(v: boolean) {
    resolver.current?.(v);
    resolver.current = null;
    setPedido(null);
  }

  return (
    <ConfirmContext.Provider value={confirmar}>
      {children}
      <AlertDialog
        open={pedido != null}
        onOpenChange={(aberto) => {
          // Fechar pelo Esc ou clicando fora conta como cancelar.
          if (!aberto) responder(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold tracking-tight">{pedido?.titulo}</AlertDialogTitle>
            {pedido?.descricao && (
              <AlertDialogDescription>{pedido.descricao}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => responder(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => responder(true)}
              className={
                pedido?.destrutivo
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined
              }
            >
              {pedido?.confirmar ?? "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}
