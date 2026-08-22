"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const ROTAS_DIRETAS: Record<string, string> = {
  "Início": "/admin",
  "Dashboard": "/dashboard",
  "Tarefas": "/tarefas",
  "Pedidos": "/pedidos",
  "A receber": "/a-receber",
  "Realizadas": "/realizadas",
  "Entradas": "/entradas",
  "Saídas": "/saidas",
  "Produtos": "/produtos",
  "Coleções": "/colecoes",
  "Categorias": "/categorias",
  "Etiquetas": "/etiquetas",
  "Insumos": "/insumos",
  "Clientes": "/clientes",
  "Fornecedores": "/fornecedores",
  "Bairros": "/bairros",
  "Horários": "/horarios",
  "Simulador": "/bia",
  "Conversas": "/bia/conversas",
  "Ajustes": "/bia/ajustes",
};

const ROTAS_PAINEL = new Set([
  "/admin",
  "/pedidos",
  "/a-receber",
  "/realizadas",
  "/dashboard",
  "/entradas",
  "/saidas",
  "/produtos",
  "/colecoes",
  "/categorias",
  "/etiquetas",
  "/insumos",
  "/clientes",
  "/fornecedores",
  "/bairros",
  "/horarios",
  "/tarefas",
  "/bia",
  "/bia/conversas",
  "/bia/ajustes",
]);

const ESTADO_POR_ROTA: Record<string, { pai?: string; filho: string }> = {
  "/admin": { filho: "Início" },
  "/pedidos": { pai: "Vendas", filho: "Pedidos" },
  "/a-receber": { pai: "Vendas", filho: "A receber" },
  "/realizadas": { pai: "Vendas", filho: "Realizadas" },
  "/dashboard": { filho: "Dashboard" },
  "/entradas": { pai: "Financeiro", filho: "Entradas" },
  "/saidas": { pai: "Financeiro", filho: "Saídas" },
  "/produtos": { pai: "Cadastros", filho: "Produtos" },
  "/colecoes": { pai: "Cadastros", filho: "Coleções" },
  "/categorias": { pai: "Cadastros", filho: "Categorias" },
  "/etiquetas": { pai: "Cadastros", filho: "Etiquetas" },
  "/insumos": { pai: "Cadastros", filho: "Insumos" },
  "/clientes": { pai: "Cadastros", filho: "Clientes" },
  "/fornecedores": { pai: "Cadastros", filho: "Fornecedores" },
  "/bairros": { pai: "Cadastros", filho: "Bairros" },
  "/horarios": { pai: "Cadastros", filho: "Horários" },
  "/tarefas": { filho: "Tarefas" },
  "/bia": { pai: "BIA", filho: "Simulador" },
  "/bia/conversas": { pai: "BIA", filho: "Conversas" },
  "/bia/ajustes": { pai: "BIA", filho: "Ajustes" },
};

function textoElemento(elemento: Element) {
  return (elemento.textContent ?? "").replace(/\s+/g, " ").trim();
}

function encontrarBotaoNoHeader(texto: string) {
  const header = document.querySelector("header");
  if (!header) return null;

  return Array.from(header.querySelectorAll<HTMLButtonElement>("button")).find(
    (botao) => textoElemento(botao) === texto,
  ) ?? null;
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
  }, 30);
}

export function AdminPathSync() {
  const pathname = usePathname();

  useEffect(() => {
    if (!ROTAS_PAINEL.has(pathname)) return;

    const timer = window.setTimeout(() => abrirEstadoDaRota(pathname), 80);

    function aoClicar(evento: MouseEvent) {
      const alvo = evento.target as HTMLElement | null;
      const clicavel = alvo?.closest("button, a");
      if (!clicavel) return;

      const texto = textoElemento(clicavel);
      let destino = ROTAS_DIRETAS[texto];

      if (!destino) {
        if (texto === "Vendas" && window.innerWidth < 1024) destino = "/pedidos";
        else if (texto === "Financeiro" && window.innerWidth < 1024) destino = "/entradas";
        else if (texto === "Cadastros" && window.innerWidth < 1024) destino = "/clientes";
        else if (texto === "BIA" && window.innerWidth < 1024) destino = "/bia";
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
      window.clearTimeout(timer);
      document.removeEventListener("click", aoClicar, true);
      window.removeEventListener("popstate", aoVoltar);
    };
  }, [pathname]);

  return null;
}
