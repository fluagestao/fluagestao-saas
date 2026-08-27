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
        body:has(.flua-novo-pedido-route) {
          background: var(--admin-bg) !important;
          overflow: hidden !important;
        }

        body:has(.flua-novo-pedido-route)
          [data-state="open"].fixed.inset-0:not([role="dialog"]) {
          display: none !important;
        }

        body:has(.flua-novo-pedido-route) [role="dialog"] {
          position: fixed !important;
          inset: 0 !important;
          left: 0 !important;
          top: 0 !important;
          width: 100vw !important;
          min-width: 100vw !important;
          max-width: 100vw !important;
          height: 100dvh !important;
          min-height: 100dvh !important;
          max-height: 100dvh !important;
          margin: 0 !important;
          transform: none !important;
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          background: var(--admin-bg) !important;
          padding: 28px 24px 48px !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          z-index: 100 !important;

          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          gap: 16px !important;
        }

        body:has(.flua-novo-pedido-route) [role="dialog"] > button.absolute {
          display: none !important;
        }

        body:has(.flua-novo-pedido-route) [role="dialog"] > *:not(button) {
          box-sizing: border-box !important;
          width: min(1040px, calc(100vw - 48px)) !important;
          max-width: 1040px !important;
          margin-left: auto !important;
          margin-right: auto !important;
          flex: 0 0 auto !important;
        }

        body:has(.flua-novo-pedido-route) [role="dialog"] > div:first-of-type {
          padding-bottom: 18px;
          border-bottom: 1px solid var(--admin-border);
        }

        body:has(.flua-novo-pedido-route) [role="dialog"]::before {
          content: "Vendas  ·  Pedidos";
          display: block;
          box-sizing: border-box;
          width: min(1040px, calc(100vw - 48px));
          max-width: 1040px;
          margin: 0 auto -4px;
          color: var(--terracotta);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          flex: 0 0 auto;
        }

        body:has(.flua-novo-pedido-route) [role="dialog"] input,
        body:has(.flua-novo-pedido-route) [role="dialog"] select,
        body:has(.flua-novo-pedido-route) [role="dialog"] textarea,
        body:has(.flua-novo-pedido-route) [role="dialog"] button {
          max-width: 100% !important;
        }

        @media (max-width: 760px) {
          body:has(.flua-novo-pedido-route) [role="dialog"] {
            padding: 18px 14px 32px !important;
          }

          body:has(.flua-novo-pedido-route) [role="dialog"] > *:not(button),
          body:has(.flua-novo-pedido-route) [role="dialog"]::before {
            width: calc(100vw - 28px) !important;
            max-width: calc(100vw - 28px) !important;
          }

          body:has(.flua-novo-pedido-route) [role="dialog"] .grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }

          body:has(.flua-novo-pedido-route) [role="dialog"] .flex {
            max-width: 100%;
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
