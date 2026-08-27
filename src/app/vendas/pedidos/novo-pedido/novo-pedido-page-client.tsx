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
    document.documentElement.classList.add("flua-novo-pedido-page");
    document.body.classList.add("flua-novo-pedido-page");

    const bodyOverflowAnterior = document.body.style.overflow;
    const htmlOverflowAnterior = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.documentElement.classList.remove("flua-novo-pedido-page");
      document.body.classList.remove("flua-novo-pedido-page");
      document.body.style.overflow = bodyOverflowAnterior;
      document.documentElement.style.overflow = htmlOverflowAnterior;
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
        html.flua-novo-pedido-page,
        body.flua-novo-pedido-page {
          width: 100% !important;
          min-width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          background: var(--admin-bg) !important;
          overflow: hidden !important;
        }

        body.flua-novo-pedido-page
          div:has(> [role="dialog"].max-w-2xl)
          > [data-state="open"].fixed.inset-0:not([role="dialog"]) {
          display: none !important;
        }

        body.flua-novo-pedido-page [role="dialog"].max-w-2xl {
          position: fixed !important;
          inset: 0 auto auto 0 !important;
          left: 0 !important;
          top: 0 !important;
          right: auto !important;
          bottom: auto !important;
          box-sizing: border-box !important;
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
          padding: 28px max(24px, calc((100vw - 1040px) / 2)) 56px !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }

        body.flua-novo-pedido-page [role="dialog"].max-w-2xl > button.absolute {
          display: none !important;
        }

        body.flua-novo-pedido-page [role="dialog"].max-w-2xl > div:first-of-type {
          width: 100%;
          max-width: 1040px;
          margin-inline: auto;
          padding-bottom: 18px;
          border-bottom: 1px solid var(--admin-border);
        }

        body.flua-novo-pedido-page [role="dialog"].max-w-2xl > *:not(button.absolute) {
          width: 100%;
          max-width: 1040px;
          margin-left: auto;
          margin-right: auto;
        }

        body.flua-novo-pedido-page [role="dialog"].max-w-2xl::before {
          content: "Vendas  ·  Pedidos";
          display: block;
          width: 100%;
          max-width: 1040px;
          margin: 0 auto -4px;
          color: var(--terracotta);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        body.flua-novo-pedido-page [role="dialog"].max-w-2xl input,
        body.flua-novo-pedido-page [role="dialog"].max-w-2xl select,
        body.flua-novo-pedido-page [role="dialog"].max-w-2xl textarea,
        body.flua-novo-pedido-page [role="dialog"].max-w-2xl button {
          max-width: 100%;
        }

        @media (max-width: 640px) {
          body.flua-novo-pedido-page [role="dialog"].max-w-2xl {
            width: 100vw !important;
            min-width: 100vw !important;
            max-width: 100vw !important;
            padding: 18px 14px calc(32px + env(safe-area-inset-bottom)) !important;
          }

          body.flua-novo-pedido-page [role="dialog"].max-w-2xl::before,
          body.flua-novo-pedido-page [role="dialog"].max-w-2xl > *:not(button.absolute) {
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
