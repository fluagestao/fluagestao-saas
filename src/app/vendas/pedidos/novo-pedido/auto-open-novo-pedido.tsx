"use client";

import { useEffect } from "react";

export default function AutoOpenNovoPedido() {
  useEffect(() => {
    let tentativas = 0;

    const abrir = () => {
      const botoes = Array.from(document.querySelectorAll("button"));
      const botao = botoes.find((el) =>
        (el.textContent ?? "").trim().toLowerCase().includes("novo pedido"),
      ) as HTMLButtonElement | undefined;

      if (botao) {
        botao.click();
        return;
      }

      tentativas += 1;
      if (tentativas < 40) window.setTimeout(abrir, 150);
    };

    abrir();
  }, []);

  return null;
}
