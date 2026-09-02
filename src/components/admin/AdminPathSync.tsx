"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const ROTAS_DIRETAS: Record<string, string> = {
  "Início": "/inicio",
  Dashboard: "/dashboard",
  Custo: "/custo",
  Tarefas: "/tarefas",
  "Follow-up": "/followup",

  Pedidos: "/vendas/pedidos",
  "A receber": "/vendas/a-receber",
  Realizadas: "/vendas/realizadas",

  Recebimentos: "/financeiro/entradas",
  Pagamentos: "/financeiro/saidas",
  "A pagar": "/financeiro/a-pagar",
  "Previsão de caixa": "/financeiro/previsao",

  Produtos: "/cadastros/produtos",
  Coleções: "/cadastros/colecoes",
  Categorias: "/cadastros/categorias",
  Etiquetas: "/cadastros/etiquetas",
  Insumos: "/cadastros/insumos",
  Clientes: "/cadastros/clientes",
  Fornecedores: "/cadastros/fornecedores",
  "Tipos de receita": "/cadastros/financeiro/receitas",
  "Tipos de despesa": "/cadastros/financeiro/despesas",
  Bairros: "/cadastros/bairros",
  Horários: "/cadastros/horarios",

  Simulador: "/bia/simulador",
  Conversas: "/bia/conversas",
  Ajustes: "/bia/ajustes",
};

const ESTADO_POR_ROTA: Record<string, { pai?: string; filho: string }> = {
  "/inicio": { filho: "Início" },
  "/admin": { filho: "Início" },

  "/vendas/pedidos": { pai: "Vendas", filho: "Pedidos" },
  "/vendas/a-receber": { pai: "Vendas", filho: "A receber" },
  "/vendas/realizadas": { pai: "Vendas", filho: "Realizadas" },
  "/followup": { pai: "Vendas", filho: "Follow-up" },

  "/dashboard": { filho: "Dashboard" },
  "/custo": { filho: "Custo" },

  "/financeiro/entradas": { pai: "Financeiro", filho: "Recebimentos" },
  "/financeiro/saidas": { pai: "Financeiro", filho: "Pagamentos" },
  "/financeiro/a-pagar": { pai: "Financeiro", filho: "A pagar" },
  "/financeiro/previsao": { pai: "Financeiro", filho: "Previsão de caixa" },

  "/cadastros/produtos": { pai: "Cadastros", filho: "Produtos" },
  "/cadastros/colecoes": { pai: "Cadastros", filho: "Coleções" },
  "/cadastros/categorias": { pai: "Cadastros", filho: "Categorias" },
  "/cadastros/etiquetas": { pai: "Cadastros", filho: "Etiquetas" },
  "/cadastros/insumos": { pai: "Cadastros", filho: "Insumos" },
  "/cadastros/clientes": { pai: "Cadastros", filho: "Clientes" },
  "/cadastros/fornecedores": { pai: "Cadastros", filho: "Fornecedores" },
  "/cadastros/financeiro/receitas": { pai: "Cadastros", filho: "Tipos de receita" },
  "/cadastros/financeiro/despesas": { pai: "Cadastros", filho: "Tipos de despesa" },
  "/cadastros/bairros": { pai: "Cadastros", filho: "Bairros" },
  "/cadastros/horarios": { pai: "Cadastros", filho: "Horários" },

  "/tarefas": { filho: "Tarefas" },

  "/bia/simulador": { pai: "BIA", filho: "Simulador" },
  "/bia/conversas": { pai: "BIA", filho: "Conversas" },
  "/bia/ajustes": { pai: "BIA", filho: "Ajustes" },

  "/pedidos": { pai: "Vendas", filho: "Pedidos" },
  "/a-receber": { pai: "Vendas", filho: "A receber" },
  "/realizadas": { pai: "Vendas", filho: "Realizadas" },
  "/entradas": { pai: "Financeiro", filho: "Recebimentos" },
  "/saidas": { pai: "Financeiro", filho: "Pagamentos" },
  "/produtos": { pai: "Cadastros", filho: "Produtos" },
  "/colecoes": { pai: "Cadastros", filho: "Coleções" },
  "/categorias": { pai: "Cadastros", filho: "Categorias" },
  "/etiquetas": { pai: "Cadastros", filho: "Etiquetas" },
  "/insumos": { pai: "Cadastros", filho: "Insumos" },
  "/clientes": { pai: "Cadastros", filho: "Clientes" },
  "/fornecedores": { pai: "Cadastros", filho: "Fornecedores" },
  "/bairros": { pai: "Cadastros", filho: "Bairros" },
  "/horarios": { pai: "Cadastros", filho: "Horários" },
  "/bia": { pai: "BIA", filho: "Simulador" },
};

const ROTAS_PAINEL = new Set(Object.keys(ESTADO_POR_ROTA));

function textoElemento(elemento: Element) {
  return (elemento.textContent ?? "").replace(/\s+/g, " ").trim();
}

function encontrarBotaoNoHeader(texto: string) {
  const header = document.querySelector("header");
  if (!header) return null;

  return (
    Array.from(header.querySelectorAll<HTMLButtonElement>("button")).find(
      (botao) => textoElemento(botao) === texto,
    ) ?? null
  );
}

function abrirEstadoDaRota(pathname: string) {
  const estado = ESTADO_POR_ROTA[pathname];
  if (!estado) return;

  if (!estado.pai) {
    encontrarBotaoNoHeader(estado.filho)?.click();
    return;
  }

  const pai = encontrarBotaoNoHeader(estado.pai);
  if (!pai) return;

  pai.click();
  window.setTimeout(() => {
    encontrarBotaoNoHeader(estado.filho)?.click();
  }, 40);
}

export function AdminPathSync() {
  const pathname = usePathname();
  const inicializado = useRef(false);

  useEffect(() => {
    if (!ROTAS_PAINEL.has(pathname)) return;

    let timer: number | undefined;
    if (!inicializado.current) {
      inicializado.current = true;
      timer = window.setTimeout(() => abrirEstadoDaRota(pathname), 100);
    }

    function aoClicar(evento: MouseEvent) {
      const alvo = evento.target as HTMLElement | null;
      const clicavel = alvo?.closest("button, a");
      if (!clicavel) return;

      const aria = clicavel.getAttribute("aria-label") ?? "";
      if (aria === "Ir para o início") {
        if (window.location.pathname !== "/inicio") {
          window.history.pushState({}, "", "/inicio");
        }
        return;
      }

      if (aria === "Agenda") {
        if (window.location.pathname !== "/tarefas") {
          window.history.pushState({}, "", "/tarefas");
        }
        return;
      }

      const texto = textoElemento(clicavel);
      let destino = ROTAS_DIRETAS[texto];
      const dentroDoHeader = Boolean(clicavel.closest("header"));

      if (!destino) {
        const deveNavegarPai = window.innerWidth < 1024 || !dentroDoHeader;
        if (deveNavegarPai) {
          if (texto === "Vendas") destino = "/vendas/pedidos";
          else if (texto === "Financeiro") destino = "/financeiro/entradas";
          else if (texto === "Cadastros") destino = "/cadastros/produtos";
          else if (texto === "BIA") destino = "/bia/simulador";
        }
      }

      if (!destino || window.location.pathname === destino) return;
      window.history.pushState({}, "", destino);
    }

    function aoVoltar() {
      window.location.reload();
    }

    document.addEventListener("click", aoClicar, true);
    window.addEventListener("popstate", aoVoltar);

    return () => {
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("click", aoClicar, true);
      window.removeEventListener("popstate", aoVoltar);
    };
  }, [pathname]);

  return null;
}
