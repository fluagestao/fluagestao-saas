"use client";

import { useEffect } from "react";

const ROTA_NOVO_PEDIDO = "/vendas/pedidos/novo-pedido";

export function NovoPedidoRouteBridge() {
  useEffect(() => {
    function navegar(event: MouseEvent) {
      if (!window.location.pathname.startsWith("/vendas/pedidos")) return;

      const alvo = event.target;
      if (!(alvo instanceof Element)) return;

      const botao = alvo.closest("button");
      if (!botao) return;

      const texto = (botao.textContent ?? "").replace(/\s+/g, " ").trim();
      if (texto !== "Novo pedido" && texto !== "Lançar pedido à mão") return;

      event.preventDefault();
      event.stopPropagation();
      window.location.assign(ROTA_NOVO_PEDIDO);
    }

    document.addEventListener("click", navegar, true);
    return () => document.removeEventListener("click", navegar, true);
  }, []);

  return null;
}
