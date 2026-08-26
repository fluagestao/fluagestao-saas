"use client";

import Link from "next/link";
import { ChartPie, Home, ShoppingBag } from "lucide-react";
import { usePathname } from "next/navigation";

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

const ITENS = [
  { href: "/inicio", label: "Início", icon: Home },
  { href: "/vendas/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/dashboard", label: "Dashboard", icon: ChartPie },
] as const;

export function MobileAdminNav() {
  const pathname = usePathname();
  const painel = ROTAS_PAINEL.some(
    (rota) => pathname === rota || pathname.startsWith(`${rota}/`),
  );

  if (!painel) return null;

  function ativo(href: string) {
    if (href === "/inicio") return pathname === "/inicio" || pathname === "/admin";
    if (href === "/vendas/pedidos") return pathname === "/vendas/pedidos" || pathname === "/pedidos";
    return pathname === href;
  }

  return (
    <nav className="mobile-admin-nav" aria-label="Navegação principal do celular">
      {ITENS.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} data-active={ativo(href) ? "true" : "false"}>
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
