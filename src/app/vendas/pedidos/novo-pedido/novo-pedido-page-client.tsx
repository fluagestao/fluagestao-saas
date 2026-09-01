"use client";

import { useRouter } from "next/navigation";
import { Toaster } from "sonner";

import {
  PedidoDialog,
  type ProdutoOpcao,
} from "@/components/admin/PedidoDialog";
import type { ClienteComHistorico } from "@/lib/pedidos-ops.server";

export function NovoPedidoPageClient({
  produtos,
  clientes,
}: {
  produtos: ProdutoOpcao[];
  clientes: ClienteComHistorico[];
}) {
  const router = useRouter();

  function voltar() {
    router.replace("/vendas/pedidos");
    router.refresh();
  }

  return (
    <>
      <div className="flua-novo-pedido-route" aria-hidden="true" />
      <Toaster position="bottom-right" richColors />

      <style jsx global>{`
        html:has(.flua-novo-pedido-route),
        body:has(.flua-novo-pedido-route) {
          height: 100dvh !important;
          max-height: 100dvh !important;
          background: var(--admin-bg) !important;
          overflow: hidden !important;
          overscroll-behavior: none !important;
        }

        body:has(.flua-novo-pedido-route)
          [data-state="open"].fixed.inset-0:not([role="dialog"]) {
          display: none !important;
        }

        body:has(.flua-novo-pedido-route) [role="dialog"] {
          position: fixed !important;
          top: 82px !important;
          left: 50% !important;
          right: auto !important;
          bottom: auto !important;

          width: min(1760px, calc(100vw - 32px)) !important;
          min-width: 0 !important;
          max-width: 1760px !important;
          height: calc(100dvh - 98px) !important;
          min-height: 0 !important;
          max-height: calc(100dvh - 98px) !important;

          margin: 0 !important;
          transform: translateX(-50%) !important;
          box-sizing: border-box !important;
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: 0 0 60px rgba(70, 37, 34, 0.08) !important;
          background: var(--admin-bg) !important;
          padding: 18px 28px 16px !important;
          overflow-x: hidden !important;
          overflow-y: hidden !important;
          overscroll-behavior: none !important;
          z-index: 100 !important;
        }

        body:has(.flua-novo-pedido-route) [role="dialog"] > button.absolute {
          display: none !important;
        }

        body:has(.flua-novo-pedido-route) [role="dialog"]::before {
          content: "Vendas  ·  Pedidos";
          display: block;
          width: 100%;
          margin: 0 0 8px;
          color: var(--terracotta);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        body:has(.flua-novo-pedido-route) [role="dialog"] > *:not(button) {
          box-sizing: border-box !important;
          width: 100% !important;
          max-width: 100% !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
        }

        body:has(.flua-novo-pedido-route) [role="dialog"] input,
        body:has(.flua-novo-pedido-route) [role="dialog"] select,
        body:has(.flua-novo-pedido-route) [role="dialog"] textarea {
          max-width: 100% !important;
        }

        @media (min-width: 761px) {
          body:has(.flua-novo-pedido-route) [role="dialog"] {
            padding: 10px 22px 10px !important;
          }

          body:has(.flua-novo-pedido-route) [role="dialog"]::before {
            margin-bottom: 3px !important;
          }

          body:has(.flua-novo-pedido-route) [role="dialog"] .pedido-dialog-scroll {
            display: grid !important;
            grid-template-columns: repeat(12, minmax(0, 1fr)) !important;
            align-content: start !important;
            gap: 6px 10px !important;
            width: 100% !important;
            max-width: 1440px !important;
            margin-inline: auto !important;
            overflow: hidden !important;
            padding-right: 0 !important;
          }

          body:has(.flua-novo-pedido-route)
            [role="dialog"]
            .pedido-dialog-scroll.pedido-dialog-scroll-habilitado {
            overflow-y: auto !important;
            overscroll-behavior: contain !important;
          }

          body:has(.flua-novo-pedido-route) [role="dialog"] .pedido-dialog-scroll > :nth-child(1) {
            grid-column: span 4;
          }

          body:has(.flua-novo-pedido-route) [role="dialog"] .pedido-dialog-scroll > :nth-child(2) {
            grid-column: span 8;
          }

          body:has(.flua-novo-pedido-route) [role="dialog"] .pedido-dialog-scroll > :nth-child(3),
          body:has(.flua-novo-pedido-route) [role="dialog"] .pedido-dialog-scroll > :nth-child(4) {
            grid-column: 1 / -1;
          }

          body:has(.flua-novo-pedido-route) [role="dialog"] .pedido-dialog-scroll > :nth-child(5) {
            grid-column: span 9;
          }

          body:has(.flua-novo-pedido-route) [role="dialog"] .pedido-dialog-scroll > :nth-child(6) {
            grid-column: span 3;
          }

          body:has(.flua-novo-pedido-route) [role="dialog"] .pedido-dialog-scroll > :nth-child(n + 7) {
            grid-column: 1 / -1;
          }

          body:has(.flua-novo-pedido-route) [role="dialog"] .pedido-dialog-scroll input,
          body:has(.flua-novo-pedido-route) [role="dialog"] .pedido-dialog-scroll select {
            height: 36px !important;
          }

          body:has(.flua-novo-pedido-route) [role="dialog"] .pedido-dialog-scroll textarea {
            min-height: 52px !important;
            height: 52px !important;
          }

          body:has(.flua-novo-pedido-route) [role="dialog"] .pedido-itens-lista {
            max-height: 76px !important;
            overflow-y: hidden !important;
          }
        }

        @media (max-width: 760px) {
          body:has(.flua-novo-pedido-route) [role="dialog"] {
            top: 74px !important;
            width: calc(100vw - 12px) !important;
            max-width: calc(100vw - 12px) !important;
            height: calc(100dvh - 80px) !important;
            max-height: calc(100dvh - 80px) !important;
            padding: 18px 14px 32px !important;
            overflow-y: auto !important;
          }

          body:has(.flua-novo-pedido-route) [role="dialog"] .grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>

      <PedidoDialog
        pedido={null}
        produtos={produtos}
        clientes={clientes}
        onClose={voltar}
        onSaved={voltar}
      />
    </>
  );
}
