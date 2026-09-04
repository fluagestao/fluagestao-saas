"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const ROTAS_DIRETAS: Record<string, string> = {
  "Início": "/inicio",
  Dashboard: "/dashboard",
  Margem: "/margem",
  "Custo e preços": "/custo/calculadora",
  Simulador: "/custo/simulador",
  Cozinha: "/custo/cozinha",
  Estoque: "/estoque",
  Tarefas: "/tarefas",
  "Follow-up": "/followup",
  Relacionamento: "/relacionamento",

  Pedidos: "/vendas/pedidos",
  Realizadas: "/vendas/realizadas",

  Entradas: "/financeiro/entradas",
  "Saídas": "/financeiro/saidas",

  Produtos: "/cadastros/produtos",
  Coleções: "/cadastros/colecoes",
  Categorias: "/cadastros/categorias",
  Insumos: "/cadastros/insumos",
  Clientes: "/cadastros/clientes",
  Fornecedores: "/cadastros/fornecedores",
  "Tipos de receita": "/cadastros/financeiro/receitas",
  "Tipos de despesa": "/cadastros/financeiro/despesas",

};

const ESTADO_POR_ROTA: Record<string, { pai?: string; filho: string }> = {
  "/inicio": { filho: "Início" },
  "/admin": { filho: "Início" },

  "/vendas/pedidos": { pai: "Vendas", filho: "Pedidos" },
  /* Rota antiga: "A receber" mudou de Vendas para Financeiro > Entradas.
     Continua abrindo, para nao quebrar link salvo nem atalho do guia. */
  "/vendas/a-receber": { pai: "Financeiro", filho: "Entradas" },
  "/vendas/realizadas": { pai: "Vendas", filho: "Realizadas" },
  "/followup": { pai: "Vendas", filho: "Follow-up" },
  "/relacionamento": { pai: "Vendas", filho: "Relacionamento" },

  "/dashboard": { filho: "Dashboard" },
  /* No celular estas quatro vivem sob o chip "Custo", entao a rota precisa
     abrir o pai antes de achar a filha. No desktop o pai e o item de menu. */
  "/margem": { pai: "Custo", filho: "Margem" },
  "/custo/calculadora": { pai: "Custo", filho: "Custo e preços" },
  "/custo/simulador": { pai: "Custo", filho: "Simulador" },
  "/custo/cozinha": { pai: "Custo", filho: "Cozinha" },
  // Rota antiga: continua abrindo a mesma tela para nao quebrar link salvo.
  "/custo": { pai: "Custo", filho: "Margem" },
  "/estoque": { filho: "Estoque" },

  "/financeiro/entradas": { pai: "Financeiro", filho: "Entradas" },
  "/financeiro/saidas": { pai: "Financeiro", filho: "Saídas" },
  // "A pagar" virou um estado dentro de Saidas, nao mais uma aba propria.
  "/financeiro/a-pagar": { pai: "Financeiro", filho: "Saídas" },

  "/cadastros/produtos": { pai: "Cadastros", filho: "Produtos" },
  "/cadastros/colecoes": { pai: "Cadastros", filho: "Coleções" },
  "/cadastros/categorias": { pai: "Cadastros", filho: "Categorias" },
  "/cadastros/insumos": { pai: "Cadastros", filho: "Insumos" },
  "/cadastros/clientes": { pai: "Cadastros", filho: "Clientes" },
  "/cadastros/fornecedores": { pai: "Cadastros", filho: "Fornecedores" },
  "/cadastros/financeiro/receitas": { pai: "Cadastros", filho: "Tipos de receita" },
  "/cadastros/financeiro/despesas": { pai: "Cadastros", filho: "Tipos de despesa" },

  "/tarefas": { filho: "Tarefas" },


  "/pedidos": { pai: "Vendas", filho: "Pedidos" },
  "/a-receber": { pai: "Financeiro", filho: "Entradas" },
  "/realizadas": { pai: "Vendas", filho: "Realizadas" },
  "/entradas": { pai: "Financeiro", filho: "Entradas" },
  "/saidas": { pai: "Financeiro", filho: "Saídas" },
  "/produtos": { pai: "Cadastros", filho: "Produtos" },
  "/colecoes": { pai: "Cadastros", filho: "Coleções" },
  "/categorias": { pai: "Cadastros", filho: "Categorias" },
  "/insumos": { pai: "Cadastros", filho: "Insumos" },
  "/clientes": { pai: "Cadastros", filho: "Clientes" },
  "/fornecedores": { pai: "Cadastros", filho: "Fornecedores" },
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

  /* Direto primeiro, pai depois. As duas telas montam o cabecalho de um jeito:
     no celular a fileira tem o botao de toda tela — as cortadas continuam la,
     so escondidas — entao o filho e achado sem abrir pai nenhum. No desktop os
     filhos vivem dentro do menu fechado, nao estao no DOM, e ai o pai e o
     caminho. Tentar o pai primeiro quebrava o celular, onde "Custo" nao existe
     mais como botao. */
  const direto = encontrarBotaoNoHeader(estado.filho);
  if (direto) {
    direto.click();
    return;
  }

  if (!estado.pai) return;

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
        /* O atalho de menu PAI só vale para clique na própria navegação.
           A condição era `innerWidth < 1024 || !dentroDoHeader`, e o segundo
           termo pega a página INTEIRA: qualquer botão com o texto "Custo",
           "Vendas", "Financeiro" ou "Cadastros" trocava a barra de endereços.
           A aba "Custo" da tela Custo e preços, que vive no <main>, empurrava
           a URL para /margem — e dali um F5 levava a pessoa para outra tela,
           com uma entrada fantasma no histórico de brinde.

           O `!dentroDoHeader` existia para o celular, onde os chips ficam fora
           do <header>, na .mobile-admin-nav. Agora isso está dito com
           precisão, em vez de "qualquer lugar que não seja o cabeçalho". */
        const naNavegacao =
          dentroDoHeader || Boolean(clicavel.closest(".mobile-admin-nav"));
        if (naNavegacao) {
          if (texto === "Custo") destino = "/margem";
          else if (texto === "Vendas") destino = "/vendas/pedidos";
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
