import {
  BadgeDollarSign,
  ChevronRight,
  MessageCircle,
  Pencil,
  Trash2,
  Undo2,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatarDataLonga } from "@/lib/prazo";
import { toast } from "sonner";

import {
  aReceber,
  abrirWhatsappCom,
  formatBRL,
  proximoStatus,
  statusCor,
  statusLabel,
  urgenciaDoPedido,
  whatsappDoCliente,
  type Pedido,
} from "@/lib/vendas";

export type AcoesPedido = {
  avancar: (p: Pedido) => void;
  receber?: (p: Pedido) => void;
  cancelar: (p: Pedido) => void;
  excluir: (p: Pedido) => void;
  editar: (p: Pedido) => void;
};

/**
 * Card do pedido, usado na lista e no kanban.
 *
 * `compacto` é a versão do kanban: menos informação, porque a coluna é
 * estreita. As ações continuam existindo, escondidas até o clique — no quadro
 * o arrasto move o status, mas "Recebi" nao tem gesto equivalente, e sem elas
 * a pessoa precisava sair do quadro para registrar um pagamento.
 */
export function PedidoCard({
  pedido: p,
  acoes,
  compacto = false,
  className,
  empresaNome = "Sua empresa",
}: {
  pedido: Pedido;
  acoes: AcoesPedido;
  compacto?: boolean;
  className?: string;
  empresaNome?: string;
}) {
  const prox = proximoStatus(p.status);
  const wa = whatsappDoCliente(p.cliente_whatsapp);
  const temWhats = Boolean(whatsappDoCliente(p.cliente_whatsapp));
  function enviar(mensagem: string) {
    if (!abrirWhatsappCom(p.cliente_whatsapp, mensagem)) {
      toast.error("Esse pedido não tem um WhatsApp válido.");
    }
  }

  const atrasado = urgenciaDoPedido(p) === "atrasado";
  const naoPago = aReceber(p);
  // O normal é pagar antes de receber a cesta; entregue sem pagamento é a
  // exceção que precisa saltar aos olhos.
  const entregueSemPagar = naoPago && p.status === "entregue";
  const resumoItens = p.itens.map((i) => `${i.qtd}x ${i.nome}`).join(" · ");
  // Fechado por padrão: a lista existe pra varrer, não pra agir em todos.
  const [aberto, setAberto] = useState(false);

  return (
    <article
      className={cn(
        "rounded-2xl shadow-[var(--shadow-card)]",
        compacto ? "p-3" : "p-4",
        "bg-card",
        // Atrasado ganha um filete na lateral — some junto com o problema.
        atrasado && "border-l-4 border-l-destructive",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-start justify-between gap-2",
          "cursor-pointer",
        )}
        onClick={() => setAberto((v) => !v)}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {!compacto && (
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 shrink-0 text-[var(--bronze)] transition-transform",
                  aberto && "rotate-90",
                )}
              />
            )}
            <span
              className={cn(
                "font-medium text-foreground",
                compacto ? "text-[0.95rem]" : "text-base",
              )}
            >
              #{p.numero} {p.cliente_nome ?? "Sem nome"}
            </span>
            {!compacto && (
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                style={{ backgroundColor: statusCor(p.status) }}
              >
                {statusLabel(p.status)}
              </span>
            )}
            {p.recebido_em ? (
              <span className="rounded-full bg-[var(--whatsapp)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                pago
              </span>
            ) : (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  entregueSemPagar
                    ? "bg-destructive text-white"
                    : "bg-[var(--cream-deep)] text-muted-foreground",
                )}
              >
                {entregueSemPagar ? "entregue sem pagar" : "a receber"}
              </span>
            )}
          </div>
          <p
            className={cn(
              "mt-1 text-sm text-muted-foreground",
              compacto ? "line-clamp-2" : "truncate",
            )}
          >
            {resumoItens}
          </p>
          {p.data_entrega && (
            <p
              className={cn(
                "mt-0.5 text-xs",
                atrasado ? "font-medium text-destructive" : "text-[var(--bronze)]",
              )}
            >
              {atrasado ? "Atrasado — " : "Entrega: "}
              {formatarDataLonga(p.data_entrega)}
              {p.janela_entrega ? ` · ${p.janela_entrega}` : ""}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span
            className={cn(
              "font-semibold tabular-nums text-foreground",
              compacto ? "text-sm" : "text-base",
            )}
          >
            {formatBRL(p.total)}
          </span>
          {/* Nada no card avisa que ele abre. Sem esse aviso, as ações (avançar
              status, recebi, WhatsApp) ficam escondidas de quem nunca clicou
              por acaso. */}
          {(
            <span className="text-xs text-muted-foreground">
              {aberto ? "Clique para recolher" : "Clique para expandir"}
            </span>
          )}
        </div>
      </div>

      {aberto && (
        /* stopPropagation porque no quadro este bloco vive dentro de um
           draggable: sem ele o clique no botao seria engolido pelo gesto. */
        <div
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="mt-3 flex flex-wrap gap-2 border-t border-[var(--cream-deep)] pt-3"
        >
          {prox && (
            <Button size="sm" onClick={() => acoes.avancar(p)}>
              Marcar como {statusLabel(prox)}
            </Button>
          )}

          {/* Pagamento é independente do status: a maioria paga na encomenda. */}
          {acoes.receber && (
            <Button
              size="sm"
              variant={entregueSemPagar ? "default" : "outline"}
              onClick={() => acoes.receber!(p)}
            >
              {p.recebido_em ? (
                <>
                  <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                  Desfazer recebimento
                </>
              ) : (
                <>
                  <BadgeDollarSign className="mr-1.5 h-3.5 w-3.5" />
                  Recebi
                </>
              )}
            </Button>
          )}

          {wa && p.status !== "entregue" && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--cream-deep)] px-3 text-xs font-medium text-foreground"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </a>
          )}

          <button
            type="button"
            onClick={() => acoes.editar(p)}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--cream-deep)] px-3 text-xs font-medium text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
            Detalhes
          </button>

          {p.status !== "cancelado" ? (
            <button
              type="button"
              onClick={() => acoes.cancelar(p)}
              className="inline-flex h-8 items-center rounded-full px-3 text-xs text-muted-foreground hover:text-[var(--terracotta)]"
            >
              Cancelar
            </button>
          ) : (
            // Excluir só depois de cancelado, pra não apagar histórico sem querer.
            <button
              type="button"
              onClick={() => acoes.excluir(p)}
              className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir
            </button>
          )}
        </div>
      )}
    </article>
  );
}
