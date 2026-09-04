"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Headphones,
  LayoutDashboard,
  MessageCircle,
  Package,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  Users,
  WalletCards,
} from "lucide-react";

const modules = [
  {
    icon: ShoppingBag,
    title: "Gestão de pedidos",
    text: "Acompanhe cada venda da entrada até a entrega ou retirada, com status, cliente, produto, valor e prazo.",
  },
  {
    icon: Users,
    title: "Clientes",
    text: "Centralize contatos, histórico de compras, preferências, observações e informações importantes.",
  },
  {
    icon: Package,
    title: "Produtos e cadastros",
    text: "Organize produtos, categorias, valores, referências e informações usadas no dia a dia da venda.",
  },
  {
    icon: Boxes,
    title: "Produção e estoque",
    text: "Saiba o que precisa ser separado, montado e finalizado, com mais controle sobre materiais e insumos.",
  },
  {
    icon: Truck,
    title: "Entregas e retiradas",
    text: "Visualize datas, horários, endereços, retiradas e o que precisa sair em cada período.",
  },
  {
    icon: WalletCards,
    title: "Financeiro",
    text: "Acompanhe entradas, despesas, faturamento e movimentações do negócio em um único lugar.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    text: "Abra o sistema e enxergue rapidamente os principais números e pendências da operação.",
  },
  {
    icon: BarChart3,
    title: "Relatórios",
    text: "Transforme sua rotina em dados para decidir melhor, identificar gargalos e acompanhar crescimento.",
  },
];

const segments = [
  {
    number: "01",
    title: "Cestas artesanais",
    description:
      "Café da manhã, românticas, maternidade, aniversário e datas comemorativas.",
    image: "/cesta-artesanal.png",
  },
  {
    number: "02",
    title: "Tábuas de frios",
    description:
      "Pedidos personalizados, montagem, insumos, retirada e entrega.",
    image: "/tabua-de-frios.png",
  },
  {
    number: "03",
    title: "Presentes e kits",
    description:
      "Combos, caixas, lembranças e produtos vendidos sob encomenda.",
    image: "/presentes-e-kits.png",
  },
  {
    number: "04",
    title: "Operações em crescimento",
    description:
      "Do atendimento individual à equipe, estoque, produção e financeiro profissional.",
    image: "/mulher-chef.png",
  },
];

const flow = [
  {
    label: "Pedido",
    title: "Tudo começa organizado.",
    text: "Registre ou receba o pedido com cliente, produto, valor, origem, data e forma de entrega. A informação nasce certa e segue com você.",
    icon: ClipboardList,
  },
  {
    label: "Produção",
    title: "A equipe sabe o que precisa fazer.",
    text: "Visualize o que precisa ser separado, montado e finalizado. Menos mensagem perdida, menos improviso e mais previsibilidade.",
    icon: Boxes,
  },
  {
    label: "Entrega",
    title: "Cada encomenda chega no horário certo.",
    text: "Organize retiradas, entregas, horários e endereços para evitar esquecimento e correria no fim do dia.",
    icon: Truck,
  },
  {
    label: "Financeiro",
    title: "Você finalmente enxerga o dinheiro.",
    text: "Acompanhe o que entrou, o que saiu e o faturamento do período sem depender de anotações espalhadas.",
    icon: WalletCards,
  },
  {
    label: "Resultado",
    title: "Gestão vira decisão.",
    text: "Use dashboards e relatórios para entender o negócio, corrigir gargalos e crescer com mais segurança.",
    icon: BarChart3,
  },
];

const faqs = [
  [
    "A Flua serve para quem trabalha de casa?",
    "Sim. A plataforma foi pensada para acompanhar desde uma operação pequena até um negócio com equipe, estoque, produção e entregas.",
  ],
  [
    "A Flua é específica para cestas e tábuas de frios?",
    "A comunicação e os fluxos foram desenhados para cestas artesanais, cafés da manhã, presentes, kits, tábuas de frios e negócios de encomendas semelhantes.",
  ],
  [
    "Preciso instalar alguma coisa?",
    "Não. A Flua funciona pelo navegador e pode ser acessada no computador, notebook, tablet ou celular.",
  ],
  [
    "Posso testar antes de assinar?",
    "Sim. Você pode começar pelo teste grátis e conhecer a rotina do sistema antes de escolher um plano.",
  ],
];

function DemoScreen() {
  return (
    <div
      className="saas-demo-stage"
      aria-label="Prévia da tela de pedidos da Flua"
    >
      <div className="saas-demo-back" />
      <div className="saas-demo-shadow" />

      <div className="saas-demo-window">
        <div className="saas-demo-topbar">
          <strong>flua</strong>

          <div className="saas-demo-nav">
            <span>Início</span>
            <span className="active">Vendas</span>
            <span>Dashboard</span>
            <span>Financeiro</span>
            <span>Custo</span>
            <span>Estoque</span>
            <span>Cadastros</span>
          </div>
        </div>

        <div className="saas-demo-body">
          <div className="saas-demo-heading">
            <div>
              <small>PEDIDOS</small>
              <h3>Seu negócio em movimento.</h3>
            </div>

            <button>Novo pedido</button>
          </div>

          <div className="saas-demo-kpis">
            <div>
              <span>Faturamento do mês</span>
              <strong>R$ 3.243,30</strong>
            </div>

            <div>
              <span>Pedidos no mês</span>
              <strong>12</strong>
            </div>

            <div>
              <span>Em aberto</span>
              <strong>5</strong>
            </div>
          </div>

          <div className="saas-demo-filters">
            <b>Novo</b>
            <span>Em produção</span>
            <span>Aguardando retirada</span>
            <span>Entregue</span>
          </div>

          <div className="saas-demo-table">
            <div className="head">
              <span>Pedido</span>
              <span>Cliente</span>
              <span>Produto</span>
              <span>Origem</span>
              <span>Total</span>
              <span>Status</span>
            </div>

            <div>
              <span>
                <b>#9281</b>
                <small>24/05 · 10:32</small>
              </span>

              <span>
                Ana Paula Souza
                <small>WhatsApp</small>
              </span>

              <span>
                Cesta Romântica
                <small>CR-001</small>
              </span>

              <span>
                <i className="whats">WhatsApp</i>
              </span>

              <span>R$ 259,90</span>

              <span>
                <i className="novo">Novo</i>
              </span>
            </div>

            <div>
              <span>
                <b>#9280</b>
                <small>24/05 · 09:15</small>
              </span>

              <span>
                Juliana Martins
                <small>WhatsApp</small>
              </span>

              <span>
                Cesta Café da Manhã
                <small>CCM-002</small>
              </span>

              <span>
                <i className="insta">Instagram</i>
              </span>

              <span>R$ 149,90</span>

              <span>
                <i className="producao">Em produção</i>
              </span>
            </div>

            <div>
              <span>
                <b>#9279</b>
                <small>23/05 · 16:45</small>
              </span>

              <span>
                Camila Ribeiro
                <small>WhatsApp</small>
              </span>

              <span>
                Tábua Premium
                <small>TP-003</small>
              </span>

              <span>
                <i className="manual">Manual</i>
              </span>

              <span>R$ 329,90</span>

              <span>
                <i className="retirada">Aguardando</i>
              </span>
            </div>

            <div>
              <span>
                <b>#9278</b>
                <small>23/05 · 14:20</small>
              </span>

              <span>
                Marina Lopes
                <small>WhatsApp</small>
              </span>

              <span>
                Presente Especial
                <small>PE-004</small>
              </span>

              <span>
                <i className="whats">WhatsApp</i>
              </span>

              <span>R$ 414,90</span>

              <span>
                <i className="entregue">Entregue</i>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NossoSaasClient() {
  const [activeFlow, setActiveFlow] = useState(0);
  const ActiveIcon = flow[activeFlow].icon;

  return (
    <main className="saas-page">

      {/* HERO */}

      <section className="saas-hero">
        <div className="saas-orb saas-orb-one" />
        <div className="saas-orb saas-orb-two" />

        <div className="saas-shell saas-hero-grid">
          <div className="saas-hero-copy">
            <div className="saas-kicker">
              <Sparkles size={15} />
              NOSSO SAAS
            </div>

            <h1>
              Seu negócio continua artesanal.
              <span>
                Sua gestão passa a ser profissional.
              </span>
            </h1>

            <p className="saas-hero-lead">
              A Flua organiza pedidos, clientes, produção,
              entregas, estoque e financeiro em um único
              sistema — da sua casa até a sua empresa.
            </p>

            <div className="saas-hero-actions">
              <Link
                href="/cadastro"
                className="saas-btn saas-btn-primary"
              >
                Começar teste grátis
                <ArrowRight size={18} />
              </Link>

              <a
                href="#como-funciona"
                className="saas-btn saas-btn-ghost"
              >
                Ver como funciona
              </a>
            </div>

            <div className="saas-hero-proof">
              <span>
                <CheckCircle2 size={16} />
                Feito para encomendas
              </span>

              <span>
                <ShieldCheck size={16} />
                Gestão centralizada
              </span>

              <span>
                <Headphones size={16} />
                Suporte humano
              </span>
            </div>
          </div>

          <DemoScreen />
        </div>
      </section>


      {/* FAIXA RÁPIDA */}

      <section className="saas-quick-band">
        <div className="saas-shell saas-quick-grid">
          <div>
            <strong>1 sistema</strong>
            <span>para centralizar sua operação</span>
          </div>

          <div>
            <strong>Pedido → entrega</strong>
            <span>um fluxo claro do começo ao fim</span>
          </div>

          <div>
            <strong>Casa → empresa</strong>
            <span>cresce com a sua operação</span>
          </div>

          <div>
            <strong>Menos improviso</strong>
            <span>mais controle para decidir</span>
          </div>
        </div>
      </section>


      {/* INTRODUÇÃO */}

      <section className="saas-section saas-intro">
        <div className="saas-shell saas-intro-grid">
          <div>
            <span className="saas-section-kicker">
              Por que a Flua existe
            </span>

            <h2>
              Chega de administrar o negócio em cinco lugares
              diferentes.
            </h2>
          </div>

          <div className="saas-intro-text">
            <p>
              A Flua é uma plataforma de gestão desenvolvida
              para quem trabalha com cestas artesanais, cafés
              da manhã, tábuas de frios, presentes, kits e
              produtos sob encomenda.
            </p>

            <p>
              Em vez de controlar pedidos no WhatsApp, datas
              no caderno, clientes em planilhas e dinheiro de
              cabeça, você centraliza a operação em um único
              lugar.
            </p>
          </div>
        </div>
      </section>


      {/* PARA QUEM É */}

      <section className="saas-audience">
        <div className="saas-shell saas-audience-grid">

          <div className="saas-audience-copy">
            <span className="saas-section-kicker">
              DA COZINHA DE CASA À EMPRESA ESTRUTURADA
            </span>

            <h2>
              Feito para quem transforma cuidado em negócio.
            </h2>

            <p>
              A Flua não é um sistema genérico tentando se
              encaixar na sua rotina. Ela foi pensada para
              quem trabalha com encomendas, datas especiais,
              produção e entrega — exatamente como funciona
              uma operação de cestas e tábuas.
            </p>

            <Link
              href="/cadastro"
              className="saas-btn saas-btn-primary"
            >
              Quero organizar meu negócio
              <ArrowRight size={17} />
            </Link>
          </div>


          <div className="saas-segment-grid">
            {segments.map((item) => (
              <article
                key={item.number}
                className="saas-segment-card"
                style={{
                  backgroundImage: `url("${item.image}")`,
                }}
              >
                <span className="saas-segment-number">
                  {item.number}
                </span>

                <h3>
                  {item.title}
                </h3>

                <p>
                  {item.description}
                </p>
              </article>
            ))}
          </div>

        </div>
      </section>


      {/* MÓDULOS */}

      <section
        className="saas-section saas-modules"
        id="modulos"
      >
        <div className="saas-shell">

          <div className="saas-section-heading centered">
            <span className="saas-section-kicker">
              Tudo em um só lugar
            </span>

            <h2>
              As ferramentas que fazem sua rotina fluir.
            </h2>

            <p>
              Não é um ERP genérico adaptado. É uma gestão
              pensada para a rotina de quem vende por
              encomenda.
            </p>
          </div>


          <div className="saas-module-grid">
            {modules.map(
              ({ icon: Icon, title, text }, index) => (
                <article
                  className="saas-module-card"
                  key={title}
                >
                  <div className="saas-module-number">
                    0{index + 1}
                  </div>

                  <div className="saas-module-icon">
                    <Icon size={22} />
                  </div>

                  <h3>
                    {title}
                  </h3>

                  <p>
                    {text}
                  </p>

                  <span>
                    Explorar módulo
                    <ArrowRight size={15} />
                  </span>
                </article>
              )
            )}
          </div>

        </div>
      </section>


      {/* COMO FUNCIONA */}

      <section
        className="saas-section saas-flow"
        id="como-funciona"
      >
        <div className="saas-shell">

          <div className="saas-section-heading">
            <span className="saas-section-kicker">
              Como funciona
            </span>

            <h2>
              Uma única informação acompanha todo o pedido.
            </h2>

            <p>
              Sem retrabalho, sem copiar dado de um lugar para
              outro e sem depender da memória.
            </p>
          </div>


          <div
            className="saas-flow-tabs"
            role="tablist"
            aria-label="Etapas do fluxo da Flua"
          >
            {flow.map((item, index) => (
              <button
                key={item.label}
                className={
                  index === activeFlow
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveFlow(index)
                }
              >
                <span>
                  0{index + 1}
                </span>

                {item.label}
              </button>
            ))}
          </div>


          <div className="saas-flow-panel">

            <div className="saas-flow-copy">
              <div className="saas-flow-icon">
                <ActiveIcon size={28} />
              </div>

              <span>
                ETAPA 0{activeFlow + 1}
              </span>

              <h3>
                {flow[activeFlow].title}
              </h3>

              <p>
                {flow[activeFlow].text}
              </p>

              <Link href="/cadastro">
                Testar este fluxo
                <ArrowRight size={16} />
              </Link>
            </div>


            <div className="saas-flow-visual">
              {flow.map((item, index) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.label}
                    className={
                      index === activeFlow
                        ? "active"
                        : index < activeFlow
                          ? "done"
                          : ""
                    }
                    onClick={() =>
                      setActiveFlow(index)
                    }
                    aria-label={`Abrir etapa ${item.label}`}
                  >
                    <Icon size={20} />

                    <span>
                      {item.label}
                    </span>
                  </button>
                );
              })}

              <div className="saas-flow-line">
                <i
                  style={{
                    width: `${
                      (activeFlow /
                        (flow.length - 1)) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* ANTES / DEPOIS */}

      <section className="saas-section saas-before-after">
        <div className="saas-shell saas-before-after-grid">

          <div className="saas-chaos-card">
            <span className="saas-section-kicker">
              Antes
            </span>

            <h3>
              Seu negócio espalhado.
            </h3>

            <div>
              <MessageCircle size={18} />
              <span>
                Pedido perdido em conversa antiga
              </span>
            </div>

            <div>
              <CalendarDays size={18} />
              <span>
                Entrega anotada em outro lugar
              </span>
            </div>

            <div>
              <WalletCards size={18} />
              <span>
                Financeiro sem visão clara
              </span>
            </div>

            <div>
              <Store size={18} />
              <span>
                Operação dependendo da memória
              </span>
            </div>
          </div>


          <div className="saas-arrow-bridge">
            <ArrowRight size={28} />
          </div>


          <div className="saas-order-card">
            <span className="saas-section-kicker">
              Com a Flua
            </span>

            <h3>
              Uma operação profissional.
            </h3>

            <div>
              <CheckCircle2 size={18} />
              <span>
                Pedidos centralizados e rastreáveis
              </span>
            </div>

            <div>
              <CheckCircle2 size={18} />
              <span>
                Produção e entregas organizadas
              </span>
            </div>

            <div>
              <CheckCircle2 size={18} />
              <span>
                Clientes e financeiro no mesmo sistema
              </span>
            </div>

            <div>
              <CheckCircle2 size={18} />
              <span>
                Dados para tomar decisão
              </span>
            </div>
          </div>

        </div>
      </section>


      {/* CRESCIMENTO */}

      <section className="saas-section saas-growth">
        <div className="saas-shell">

          <div className="saas-section-heading centered light">
            <span className="saas-section-kicker">
              Da sua casa até a sua empresa
            </span>

            <h2>
              A Flua cresce sem obrigar você a trocar de
              sistema.
            </h2>

            <p>
              Comece simples. Estruture a rotina. Cresça
              mantendo a mesma base de gestão.
            </p>
          </div>


          <div className="saas-growth-grid">

            <article>
              <span>01</span>

              <h3>
                Começando em casa
              </h3>

              <p>
                Organize pedidos, clientes, datas e
                recebimentos que hoje ficam no WhatsApp e no
                caderno.
              </p>
            </article>


            <article>
              <span>02</span>

              <h3>
                Operação ganhando volume
              </h3>

              <p>
                Adicione produção, estoque, agenda de
                entregas e visão financeira sem perder o
                controle.
              </p>
            </article>


            <article>
              <span>03</span>

              <h3>
                Empresa estruturada
              </h3>

              <p>
                Tenha equipe, processos, relatórios e uma
                operação profissional usando a mesma
                plataforma.
              </p>
            </article>

          </div>
        </div>
      </section>


      {/* FAQ */}

      <section className="saas-section saas-faq">
        <div className="saas-shell saas-faq-grid">

          <div className="saas-section-heading">
            <span className="saas-section-kicker">
              Dúvidas frequentes
            </span>

            <h2>
              Simples de entender. Simples de começar.
            </h2>
          </div>


          <div className="saas-faq-list">
            {faqs.map(([q, a], index) => (
              <details
                key={q}
                open={index === 0}
              >
                <summary>
                  {q}
                  <span>+</span>
                </summary>

                <p>
                  {a}
                </p>
              </details>
            ))}
          </div>

        </div>
      </section>


      {/* CTA FINAL */}

      <section className="saas-final-cta">
        <div className="saas-shell saas-final-box">

          <div>
            <span className="saas-section-kicker">
              Sua próxima fase começa organizada
            </span>

            <h2>
              Organize hoje o negócio que você quer ver
              crescer amanhã.
            </h2>

            <p>
              Pedidos, clientes, produção, entregas e
              financeiro em um só lugar.
            </p>
          </div>


          <div className="saas-final-actions">

            <Link
              href="/cadastro"
              className="saas-btn saas-btn-primary"
            >
              Começar teste grátis
              <ArrowRight size={18} />
            </Link>

            <Link
              href="/login"
              className="saas-btn saas-btn-dark"
            >
              Já tenho uma conta
            </Link>

          </div>
        </div>
      </section>

    </main>
  );
}