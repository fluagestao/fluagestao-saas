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
    <header className="flex w-full min-w-0 flex-wrap items-start justify-between gap-3 pb-4">
      <div className="min-w-0 flex-1">
        <h2 className="break-words text-xl font-semibold tracking-tight text-foreground">{titulo}</h2>
        {descricao && (
          <p className="mt-1 max-w-2xl break-words text-sm text-muted-foreground">{descricao}</p>
        )}
      </div>
      {acoes && (
        <div className="flex max-w-full min-w-0 flex-wrap items-center gap-2">{acoes}</div>
      )}
    </header>
  );
}

/** Envelope da tabela: borda, cantos e rolagem horizontal própria. */
export function TabelaEnvelope({ children }: { children: ReactNode }) {
  return (
    <div className="w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-2xl border border-[var(--cream-deep)] bg-card">
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
    <div className="flex min-w-0 flex-col items-center justify-center gap-2 px-5 py-14 text-center">
      <p className="break-words text-lg font-semibold text-foreground">{titulo}</p>
      {descricao && <p className="max-w-sm break-words text-sm text-muted-foreground">{descricao}</p>}
      {acao && <div className="mt-2 max-w-full">{acao}</div>}
    </div>
  );
}

/** Esqueleto no formato da tabela — menos salto de layout que "carregando…". */
export function TabelaSkeleton({ linhas = 5, colunas = 4 }: { linhas?: number; colunas?: number }) {
  return (
    <div className="min-w-0 divide-y divide-[var(--cream-deep)]">
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className="flex min-w-0 items-center gap-4 px-4 py-3">
          {Array.from({ length: colunas }).map((_, j) => (
            <Skeleton key={j} className={j === 0 ? "h-4 min-w-0 flex-1" : "h-4 w-20 shrink-0"} />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Barra cinza no lugar do número enquanto ele não chegou.
 *
 * Mostrar zero durante o carregamento é pior que não mostrar nada: o usuário
 * lê "R$ 0,00" como resposta e só depois vê o valor pular. Aqui a tela diz
 * "ainda não sei" em vez de dizer um número errado.
 */
export function ValorCarregando({ largura = "w-28" }: { largura?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`mt-1 block h-7 ${largura} animate-pulse rounded-md bg-[var(--cream-deep)]`}
    />
  );
}

export function Carregando({ texto = "carregando…" }: { texto?: string }) {
  return (
    <p className="flex min-w-0 items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
      <span className="min-w-0 break-words">{texto}</span>
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
            <AlertDialogTitle className="break-words text-xl font-semibold tracking-tight">
              {pedido?.titulo}
            </AlertDialogTitle>
            {pedido?.descricao && (
              <AlertDialogDescription className="break-words">{pedido.descricao}</AlertDialogDescription>
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
