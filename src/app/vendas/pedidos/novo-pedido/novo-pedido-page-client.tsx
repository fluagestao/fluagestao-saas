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
        body.flua-novo-pedido-page {
          background: var(--admin-bg) !important;
        }

        body.flua-novo-pedido-page [role="dialog"] {
          position: fixed !important;
          inset: 0 !important;
          left: 0 !important;
          right: 0 !important;
          top: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          min-width: 100vw !important;
          max-width: 100vw !important;
          height: 100dvh !important;
          min-height: 100dvh !important;
          max-height: 100dvh !important;
          transform: none !important;
          margin: 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          background: var(--admin-bg) !important;
          padding: 28px max(24px, calc((100vw - 1040px) / 2)) 48px !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          z-index: 100 !important;
        }

        body.flua-novo-pedido-page [role="dialog"] > button.absolute {
          display: none !important;
        }

        body.flua-novo-pedido-page [role="dialog"] > div,
        body.flua-novo-pedido-page [role="dialog"] > form,
        body.flua-novo-pedido-page [role="dialog"] section {
          width: 100% !important;
          max-width: 1040px !important;
          margin-inline: auto !important;
        }

        body.flua-novo-pedido-page [role="dialog"] > div:first-of-type {
          padding-bottom: 18px;
          border-bottom: 1px solid var(--admin-border);
        }

        body.flua-novo-pedido-page [role="dialog"]::before {
          content: "Vendas  ·  Pedidos";
          display: block;
          width: 100%;
          max-width: 1040px;
          margin: 0 auto 8px;
          color: var(--terracotta);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        body.flua-novo-pedido-page [role="dialog"] input,
        body.flua-novo-pedido-page [role="dialog"] select,
        body.flua-novo-pedido-page [role="dialog"] textarea,
        body.flua-novo-pedido-page [role="dialog"] button {
          max-width: 100% !important;
        }

        @media (max-width: 760px) {
          body.flua-novo-pedido-page [role="dialog"] {
            width: 100% !important;
            min-width: 100% !important;
            max-width: 100% !important;
            padding: 18px 14px 32px !important;
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
