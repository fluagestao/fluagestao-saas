"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const ROTAS_DIRETAS: Record<string, string> = {
  "Início": "/inicio",
  Dashboard: "/dashboard",
  Margem: "/margem",
  Calculadora: "/custo/calculadora",
  Simulador: "/custo/simulador",
  Cozinha: "/custo/cozinha",
  Estoque: "/estoque",
  Tarefas: "/tarefas",
  "Follow-up": "/followup",

  Pedidos: "/vendas/pedidos",
  "A receber": "/vendas/a-receber",
  Realizadas: "/vendas/realizadas",

  Recebimentos: "/financeiro/entradas",
  Pagamentos: "/financeiro/saidas",
  "A pagar": "/financeiro/a-pagar",

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

};

const ESTADO_POR_ROTA: Record<string, { pai?: string; filho: string }> = {
  "/inicio": { filho: "Início" },
  "/admin": { filho: "Início" },

  "/vendas/pedidos": { pai: "Vendas", filho: "Pedidos" },
  "/vendas/a-receber": { pai: "Vendas", filho: "A receber" },
  "/vendas/realizadas": { pai: "Vendas", filho: "Realizadas" },
  "/followup": { pai: "Vendas", filho: "Follow-up" },

  "/dashboard": { filho: "Dashboard" },
  "/margem": { filho: "Margem" },
  "/custo/calculadora": { filho: "Calculadora" },
  "/custo/simulador": { filho: "Simulador" },
  "/custo/cozinha": { filho: "Cozinha" },
  // Rota antiga: continua abrindo a mesma tela para nao quebrar link salvo.
  "/custo": { filho: "Margem" },
  "/estoque": { filho: "Estoque" },

  "/financeiro/entradas": { pai: "Financeiro", filho: "Recebimentos" },
  "/financeiro/saidas": { pai: "Financeiro", filho: "Pagamentos" },
  "/financeiro/a-pagar": { pai: "Financeiro", filho: "A pagar" },

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
};

const ROTAS_PAINEL = new Set(Object.keys(ESTADO_POR_ROTA));

/* Exportada para a barra do celular usar a MESMA lista. Enquanto ela mantinha
   uma cópia à mão, as duas divergiram: este arquivo empurra /margem, /estoque,
   /custo/* e /followup, que não estavam lá — e em cada rota faltante a barra
   sumia levando junto TODO o CSS mobile, que é escrito como
   body:has(.mobile-admin-nav). */
export const ROTAS_DO_PAINEL = Object.keys(ESTADO_POR_ROTA);

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
  /* Este componente vive no layout raiz, entao sobrevive a toda navegacao do
     lado do cliente. Com um ref de "uma vez por montagem", a primeira tela
     abria certa e nenhuma outra: sair de /conta pelo cabecalho — que e <Link>
     de verdade — mudava a URL, o efeito re-rodava e nao fazia nada, porque a
     flag ja era true. A pessoa via o Inicio com o endereco dizendo Pedidos.

     Nao guardo o ultimo pathname aberto: o clique dentro do painel reescreve a
     URL com pushState cru, que o usePathname nao enxerga, entao a memoria
     ficaria velha e o bug voltaria ao sair e retornar para a mesma rota.
     Como o efeito so re-roda em navegacao real do Next — e navegacao real
     remonta o AdminClient no Inicio — abrir sempre e o correto. */

  useEffect(() => {
    if (!ROTAS_PAINEL.has(pathname)) return;

    const timer = window.setTimeout(() => abrirEstadoDaRota(pathname), 100);

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
