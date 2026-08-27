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
          top: 0 !important;
          left: 50% !important;
          right: auto !important;
          bottom: auto !important;

          width: min(1040px, calc(100vw - 64px)) !important;
          min-width: 0 !important;
          max-width: 1040px !important;
          height: 100dvh !important;
          min-height: 100dvh !important;
          max-height: 100dvh !important;

          margin: 0 !important;
          transform: translateX(-50%) !important;
          box-sizing: border-box !important;
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: 0 0 60px rgba(70, 37, 34, 0.08) !important;
          background: var(--admin-bg) !important;
          padding: 30px 38px 56px !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
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

        @media (max-width: 760px) {
          body:has(.flua-novo-pedido-route) [role="dialog"] {
            width: calc(100vw - 20px) !important;
            max-width: calc(100vw - 20px) !important;
            padding: 18px 14px 32px !important;
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
