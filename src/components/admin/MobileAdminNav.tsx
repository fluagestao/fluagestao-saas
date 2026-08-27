"use client";

import { ChartPie, Home, ShoppingBag } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const ROTAS_PAINEL = [
  "/admin",
  "/inicio",
  "/dashboard",
  "/vendas",
  "/financeiro",
  "/cadastros",
  "/tarefas",
  "/bia",
  "/conta",
];

type ItemId = "inicio" | "pedidos" | "dashboard";

const ITENS = [
  { id: "inicio" as const, label: "Início", alvoHeader: "Início", icon: Home },
  { id: "pedidos" as const, label: "Pedidos", alvoHeader: "Vendas", icon: ShoppingBag },
  { id: "dashboard" as const, label: "Dashboard", alvoHeader: "Dashboard", icon: ChartPie },
];

function idPeloPath(pathname: string): ItemId {
  if (pathname === "/dashboard") return "dashboard";
  if (pathname.startsWith("/vendas") || pathname === "/pedidos") return "pedidos";
  return "inicio";
}

function textoElemento(elemento: Element) {
  return (elemento.textContent ?? "").replace(/\s+/g, " ").trim();
}

function clicarVisivelNoHeader(label: string) {
  const header = document.querySelector("header");
  if (!header) return false;

  const alvo = Array.from(header.querySelectorAll<HTMLElement>("button, a")).find(
    (elemento) => elemento.offsetParent !== null && textoElemento(elemento) === label,
  );

  if (!alvo) return false;
  alvo.click();
  return true;
}

function clicarPedidoVisivel() {
  const alvo = Array.from(document.querySelectorAll<HTMLElement>("button, a")).find(
    (elemento) =>
      elemento.offsetParent !== null &&
      !elemento.closest(".mobile-admin-nav") &&
      textoElemento(elemento) === "Pedidos",
  );

  alvo?.click();
}

export function MobileAdminNav() {
  const pathname = usePathname();
  const [ativo, setAtivo] = useState<ItemId>(() => idPeloPath(pathname));
  const painel = ROTAS_PAINEL.some(
    (rota) => pathname === rota || pathname.startsWith(`${rota}/`),
  );

  useEffect(() => {
    setAtivo(idPeloPath(pathname));
  }, [pathname]);

  if (!painel) return null;

  function navegar(id: ItemId, alvoHeader: string) {
    setAtivo(id);

    const clicou = clicarVisivelNoHeader(alvoHeader);
    if (!clicou) {
      window.location.assign(id === "dashboard" ? "/dashboard" : id === "pedidos" ? "/vendas/pedidos" : "/inicio");
      return;
    }

    if (id === "pedidos") {
      window.setTimeout(clicarPedidoVisivel, 60);
    }
  }

  return (
    <nav className="mobile-admin-nav" aria-label="Navegação principal do celular">
      {ITENS.map(({ id, label, alvoHeader, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => navegar(id, alvoHeader)}
          data-active={ativo === id ? "true" : "false"}
          aria-current={ativo === id ? "page" : undefined}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
