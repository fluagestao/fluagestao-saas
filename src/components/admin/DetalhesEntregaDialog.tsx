"use client";

import { MessageCircle, Printer } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  imprimirFicha,
  type EmpresaFichaPedido,
} from "@/lib/ficha-pedido";
import {
  formatBRL,
  statusCor,
  statusLabel,
  whatsappDoCliente,
  type Pedido,
} from "@/lib/vendas";
import { useDadosDaFicha } from "@/lib/ficha-dados";
import { cn } from "@/lib/utils";

const DIAS = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
] as const;

const classeAcao =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--admin-border)] bg-white px-4 text-sm font-semibold text-[var(--admin-ink-soft)] shadow-sm transition hover:border-[var(--terracotta)] hover:text-[var(--terracotta)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terracotta)]/30 disabled:cursor-not-allowed disabled:opacity-45";

function dataDaEntrega(data: string | null): string {
  if (!data) return "Data a combinar";
  const [ano, mes, dia] = data.split("-").map(Number);
  const diaDaSemana = DIAS[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()];
  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")} · ${diaDaSemana}`;
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[118px_1fr] sm:gap-3">
      <dt className="text-sm font-medium text-[var(--admin-muted)]">{rotulo}</dt>
      <dd className="min-w-0 break-words text-sm text-[var(--admin-ink)]">{valor}</dd>
    </div>
  );
}

function AcaoWhatsapp({
  href,
  children,
  tituloIndisponivel,
}: {
  href: string | null;
  children: ReactNode;
  tituloIndisponivel: string;
}) {
  if (!href) {
    return (
      <button type="button" disabled className={classeAcao} title={tituloIndisponivel}>
        <MessageCircle className="h-4 w-4" />
        {children}
      </button>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={classeAcao}>
      <MessageCircle className="h-4 w-4" />
      {children}
    </a>
  );
}

export function DetalhesEntregaDialog({
  pedido,
  empresa,
  onClose,
}: {
  pedido: Pedido | null;
  empresa: EmpresaFichaPedido;
  onClose: () => void;
}) {
  /* ANTES do return null: hook depois de saída condicional quebra a ordem
     entre renderizações. As composições alimentam a lista de montagem da
     ficha, que precisa estar pronta antes do clique. */
  const { composicoes } = useDadosDaFicha();

  if (!pedido) return null;

  const endereco = [pedido.endereco, pedido.bairro].filter(Boolean).join(", ") || "Não informado";
  const whatsappCliente = whatsappDoCliente(pedido.cliente_whatsapp);
  const whatsappRecebedor = whatsappDoCliente(pedido.destinatario_whatsapp);
  const temCartao = Boolean(
    pedido.cartao_habilitado !== false &&
    (pedido.cartao_de || pedido.cartao_para || pedido.cartao_mensagem),
  );

  const abrirFicha = () => {
    if (!imprimirFicha(pedido, empresa, composicoes)) {
      toast.error("O navegador bloqueou a ficha. Permita pop-ups e tente novamente.");
    }
  };

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent className="max-w-[620px] gap-0 border-[var(--admin-border)] bg-[#fffaf1] p-5 shadow-[0_28px_90px_rgba(44,31,27,0.28)] sm:rounded-[22px] sm:p-6">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="text-2xl font-semibold tracking-[-0.025em] text-[var(--admin-ink)]">
            Pedido #{pedido.numero} · {pedido.cliente_nome || "Cliente"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Dados completos e ações do pedido número {pedido.numero}.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-2.5 py-1 text-xs font-semibold text-white"
            style={{ backgroundColor: statusCor(pedido.status) }}
          >
            {statusLabel(pedido.status)}
          </span>
          <span className="text-sm font-semibold text-[#579163]">{formatBRL(pedido.total)}</span>
          <span className="text-xs text-[var(--admin-muted)]">
            {pedido.recebido_em ? "· pago" : "· pagamento pendente"}
          </span>
        </div>

        <div className="mt-4 rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(75,55,50,0.04)]">
          <div className="space-y-2">
            {pedido.itens.length ? (
              pedido.itens.map((item, index) => (
                <div key={`${item.slug || item.nome}-${index}`} className="flex items-start justify-between gap-4 text-sm">
                  <span className="min-w-0 text-[var(--admin-ink)]">
                    {item.qtd}x {item.nome}{item.variacao ? ` · ${item.variacao}` : ""}
                  </span>
                  <span className="shrink-0 text-[var(--admin-ink-soft)]">
                    {item.preco == null ? "a combinar" : formatBRL(item.preco * item.qtd)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--admin-muted)]">Nenhum item informado.</p>
            )}

            {pedido.tipo !== "retirada" && Boolean(pedido.taxa_entrega) && (
              <div className="flex items-center justify-between gap-4 border-t border-[var(--admin-border)] pt-2 text-sm">
                <span className="text-[var(--admin-ink)]">Frete</span>
                <span className="text-[var(--admin-ink-soft)]">{formatBRL(pedido.taxa_entrega ?? 0)}</span>
              </div>
            )}
          </div>
        </div>

        <dl className="mt-4 space-y-2.5">
          <Campo
            rotulo={pedido.tipo === "retirada" ? "Retirada" : "Entrega"}
            valor={`${dataDaEntrega(pedido.data_entrega)} · ${pedido.janela_entrega || "horário a combinar"}`}
          />
          {pedido.tipo !== "retirada" && <Campo rotulo="Endereço" valor={endereco} />}
          {pedido.tipo !== "retirada" && pedido.referencia && (
            <Campo rotulo="Referência" valor={pedido.referencia} />
          )}
          {pedido.tipo !== "retirada" && (
            <Campo rotulo="Quem recebe" valor={pedido.destinatario_nome || "Não informado"} />
          )}
          {pedido.tipo !== "retirada" && (
            <Campo rotulo="Contato" valor={pedido.destinatario_whatsapp || "Não informado"} />
          )}
          <Campo rotulo="Pagamento" valor={pedido.forma_pagamento || "A combinar"} />
        </dl>

        {temCartao && (
          <div className="mt-4 rounded-2xl border border-[var(--admin-border)] bg-white/70 p-4 text-sm text-[var(--admin-ink-soft)]">
            <p className="font-semibold text-[var(--admin-ink)]">Cartão</p>
            {pedido.cartao_de && <p className="mt-2"><strong>De:</strong> {pedido.cartao_de}</p>}
            {pedido.cartao_para && <p><strong>Para:</strong> {pedido.cartao_para}</p>}
            {pedido.cartao_mensagem && <p className="mt-2 whitespace-pre-wrap">{pedido.cartao_mensagem}</p>}
          </div>
        )}

        {pedido.observacao && (
          <div className="mt-3 rounded-2xl border border-[var(--admin-border)] bg-white/70 p-4 text-sm text-[var(--admin-ink-soft)]">
            <strong className="text-[var(--admin-ink)]">Observação:</strong> {pedido.observacao}
          </div>
        )}

        <DialogFooter className="mt-5 flex-col sm:flex-row sm:justify-start">
          <button type="button" onClick={abrirFicha} className={cn(classeAcao, "text-[var(--admin-ink)]")}>
            <Printer className="h-4 w-4" />
            Ficha
          </button>
          <AcaoWhatsapp href={whatsappCliente} tituloIndisponivel="Cliente sem WhatsApp cadastrado">
            Cliente
          </AcaoWhatsapp>
          <AcaoWhatsapp href={whatsappRecebedor} tituloIndisponivel="Quem recebe está sem WhatsApp cadastrado">
            Quem recebe
          </AcaoWhatsapp>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
