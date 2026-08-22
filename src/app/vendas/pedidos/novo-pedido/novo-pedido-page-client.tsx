"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    document.body.classList.add("flua-novo-pedido-page");
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.classList.remove("flua-novo-pedido-page");
      document.body.style.overflow = overflowAnterior;
    };
  }, []);

  function voltar() {
    router.replace("/vendas/pedidos");
    router.refresh();
  }

  return (
    <>
      <Toaster position="bottom-right" richColors />

      <style jsx global>{`
        body.flua-novo-pedido-page
          div:has(> [role="dialog"].max-w-2xl)
          > [data-state="open"].fixed.inset-0:not([role="dialog"]) {
          display: none !important;
        }

        body.flua-novo-pedido-page [role="dialog"].max-w-2xl {
          position: fixed !important;
          inset: 0 !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          height: 100dvh !important;
          max-width: none !important;
          max-height: none !important;
          transform: none !important;
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          background: var(--admin-bg) !important;
          padding: 28px max(20px, calc((100vw - 980px) / 2)) 44px !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
        }

        body.flua-novo-pedido-page [role="dialog"].max-w-2xl > button.absolute {
          display: none !important;
        }

        body.flua-novo-pedido-page [role="dialog"].max-w-2xl > div:first-of-type {
          padding-bottom: 18px;
          border-bottom: 1px solid var(--admin-border);
        }

        body.flua-novo-pedido-page [role="dialog"].max-w-2xl::before {
          content: "Vendas  ·  Pedidos";
          display: block;
          margin-bottom: -4px;
          color: var(--terracotta);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        @media (max-width: 640px) {
          body.flua-novo-pedido-page [role="dialog"].max-w-2xl {
            padding: 20px 14px 32px !important;
          }
        }
      `}</style>

      <PedidoDialog
        pedido={null}
        produtos={produtos}
        clientes={clientes}
        onClose={voltar}
        onSaved={() => undefined}
      />
    </>
  );
}
