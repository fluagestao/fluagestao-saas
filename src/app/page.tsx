"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import PricingSection from "@/components/PricingSection";
import {
  ArrowRight,
  TrendingUp,
  ShoppingBag,
  Home,
  CheckCircle2,
  BarChart3,
  Boxes,
  Check,
  Headphones,
  Heart,
  PackageCheck,
  Route,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  WalletCards,
} from "lucide-react";
import "./landing-v2.css";
import "./marketing-nav.css";
import "./home-benefits-showcase.css";


const faqs = [
  [
    "A Flua serve para quem trabalha de casa?",
    "Sim. A Flua foi pensada justamente para acompanhar o crescimento do negócio: você pode começar organizando sua rotina em casa e continuar com o mesmo sistema quando tiver equipe, loja, cozinha, estoque ou uma operação maior.",
  ],
  [
    "É específica para cestas e tábuas de frios?",
    "Sim. A comunicação e os fluxos da Flua são voltados para quem trabalha com cestas artesanais, cafés da manhã, presentes, kits, tábuas de frios e negócios de encomendas semelhantes.",
  ],
  [
    "Preciso instalar alguma coisa?",
    "Não. A Flua funciona pelo navegador e pode ser acessada no computador, notebook, tablet ou celular.",
  ],
  [
    "Posso testar antes de assinar?",
    "Sim. Você pode começar pelo teste grátis e conhecer a rotina do sistema antes de escolher o plano.",
  ],
];

function BrandLogo() {
  return (
    <Image
      src="/flua-logo.webp"
      alt="Flua Gestão"
      width={1200}
      height={676}
      priority
      className="flua2-logo"
    />
  );
}

function StatusDot({ tone = "wine" }: { tone?: "wine" | "green" | "gold" }) {
  return <span className={`flua2-status-dot flua2-status-${tone}`} />;
}


const showcaseSlides = [
  {
    number: "01",
    short: "Venda sem bagunça",
    title: "Todos os pedidos em uma única operação.",
    text: "Pedidos do site entram automaticamente. Vendas pelo WhatsApp, Instagram, telefone ou balcão podem ser lançadas manualmente sem perder o histórico.",
    icon: ShoppingBag,
  },
  {
    number: "02",
    short: "Produza com segurança",
    title: "Sua produção sabe exatamente o que fazer.",
    text: "Acompanhe o que precisa ser separado, montado, finalizado e entregue. Cada pedido segue uma etapa clara até ficar pronto.",
    icon: Boxes,
  },
  {
    number: "03",
    short: "Enxergue o dinheiro",
    title: "Faturamento, entradas e saídas sem adivinhação.",
    text: "Veja o que entrou, o que ainda tem para receber e quanto realmente sobrou no período, com visão simples para decidir melhor.",
    icon: WalletCards,
  },
  {
    number: "04",
    short: "Cresça sem trocar de sistema",
    title: "Da sua casa até uma operação completa.",
    text: "Comece organizando seus primeiros pedidos e continue na mesma plataforma quando tiver equipe, estoque, produção e uma empresa estruturada.",
    icon: TrendingUp,
  },
];

function ShowcaseSalesPreview() {
  return (
    <div className="flua-showcase-screen">
      <div className="flua-showcase-screen-top">
        <div>
          <span>VENDAS</span>
          <h3>Pedidos</h3>
        </div>
        <button type="button">
          Novo pedido <ArrowRight size={14} />
        </button>
      </div>

      <div className="flua-showcase-kpis">
        <div>
          <span>Faturamento do mês</span>
          <strong>R$ 24.860,00</strong>
          <small>+12,4% no período</small>
        </div>
        <div>
          <span>A receber</span>
          <strong>R$ 6.420,00</strong>
          <small>9 vendas pendentes</small>
        </div>
        <div>
          <span>Pedidos</span>
          <strong>86</strong>
          <small>18 em andamento</small>
        </div>
      </div>

      <div className="flua-showcase-chips">
        <b>Todos</b>
        <span>Novo</span>
        <span>Em produção</span>
        <span>Aguardando retirada</span>
        <span>Entregue</span>
      </div>

      <div className="flua-showcase-orders">
        <div className="head">
          <span>Pedido</span>
          <span>Cliente</span>
          <span>Origem</span>
          <span>Entrega</span>
          <span>Valor</span>
          <span>Status</span>
        </div>
        <div>
          <span>#1842</span>
          <strong>Ana Paula</strong>
          <em className="site">Site</em>
          <span>Hoje · 14:00</span>
          <b>R$ 259,90</b>
          <i className="production">Em produção</i>
        </div>
        <div>
          <span>#1841</span>
          <strong>Juliana Martins</strong>
          <em className="manual">Manual</em>
          <span>Hoje · Retirada</span>
          <b>R$ 189,90</b>
          <i className="new">Novo</i>
        </div>
        <div>
          <span>#1840</span>
          <strong>Camila Ribeiro</strong>
          <em className="site">Site</em>
          <span>Amanhã · 09:00</span>
          <b>R$ 329,90</b>
          <i className="waiting">Aguardando</i>
        </div>
        <div>
          <span>#1839</span>
          <strong>Marina Lopes</strong>
          <em className="manual">Manual</em>
          <span>Ontem · Entregue</span>
          <b>R$ 149,90</b>
          <i className="done">Entregue</i>
        </div>
      </div>
    </div>
  );
}

function ShowcaseProductionPreview() {
  const items = [
    ["Cesta Romântica", "Ana Paula", 70, "Em produção"],
    ["Cesta Café da Manhã", "Juliana Martins", 100, "Pronto"],
    ["Tábua Premium", "Camila Ribeiro", 45, "Separação"],
    ["Presente Especial", "Marina Lopes", 25, "A iniciar"],
  ] as const;

  return (
    <div className="flua-showcase-screen">
      <div className="flua-showcase-screen-top">
        <div>
          <span>PRODUÇÃO</span>
          <h3>Produção de hoje</h3>
        </div>
        <div className="flua-showcase-date">12 pedidos programados</div>
      </div>

      <div className="flua-showcase-production-summary">
        <div><strong>12</strong><span>Programados</span></div>
        <div><strong>7</strong><span>Em produção</span></div>
        <div><strong>3</strong><span>Prontos</span></div>
      </div>

      <div className="flua-showcase-production-list">
        {items.map(([name, client, progress, status]) => (
          <div key={name}>
            <div className="flua-showcase-product-icon">
              <Boxes size={18} />
            </div>
            <div>
              <strong>{name}</strong>
              <small>{client}</small>
            </div>
            <div className="flua-showcase-progress-bar">
              <i style={{ width: `${progress}%` }} />
            </div>
            <b>{progress}%</b>
            <span>{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShowcaseFinancePreview() {
  return (
    <div className="flua-showcase-screen">
      <div className="flua-showcase-screen-top">
        <div>
          <span>FINANCEIRO</span>
          <h3>Visão do mês</h3>
        </div>
        <div className="flua-showcase-date">Agosto</div>
      </div>

      <div className="flua-showcase-finance-kpis">
        <div>
          <span>Entradas</span>
          <strong>R$ 18.540,00</strong>
          <small>+18,2%</small>
        </div>
        <div>
          <span>Saídas</span>
          <strong>R$ 7.250,00</strong>
          <small>39% das entradas</small>
        </div>
        <div>
          <span>Saldo</span>
          <strong>R$ 11.290,00</strong>
          <small>Resultado do período</small>
        </div>
      </div>

      <div className="flua-showcase-chart-card">
        <div>
          <strong>Faturamento</strong>
          <span>Últimos 30 dias</span>
        </div>
        <svg viewBox="0 0 500 150" role="img" aria-label="Evolução do faturamento">
          <defs>
            <linearGradient id="showcaseFinanceArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a65349" stopOpacity=".22" />
              <stop offset="100%" stopColor="#a65349" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            fill="url(#showcaseFinanceArea)"
            d="M10 125 C55 120 70 95 105 103 S165 72 205 80 S265 42 310 65 S370 35 410 45 S455 18 490 25 L490 145 L10 145 Z"
          />
          <path
            className="line"
            d="M10 125 C55 120 70 95 105 103 S165 72 205 80 S265 42 310 65 S370 35 410 45 S455 18 490 25"
          />
        </svg>
      </div>
    </div>
  );
}

function ShowcaseGrowthPreview() {
  const steps = [
    ["Casa", "Pedidos e clientes organizados", Home],
    ["Ateliê", "Produção, estoque e entregas", Boxes],
    ["Equipe", "Processos claros para todos", CheckCircle2],
    ["Empresa", "Dados, relatórios e escala", TrendingUp],
  ] as const;

  return (
    <div className="flua-showcase-screen flua-showcase-growth-screen">
      <div className="flua-showcase-screen-top">
        <div>
          <span>CRESCIMENTO</span>
          <h3>Uma estrutura que cresce com você.</h3>
        </div>
      </div>

      <div className="flua-showcase-growth-path">
        {steps.map(([title, description, Icon], index) => (
          <div className="flua-showcase-growth-step" key={title}>
            <div className="growth-icon"><Icon size={22} /></div>
            <span>0{index + 1}</span>
            <strong>{title}</strong>
            <p>{description}</p>
          </div>
        ))}
        <div className="flua-showcase-growth-line" />
      </div>

      <div className="flua-showcase-growth-note">
        <CheckCircle2 size={18} />
        <span>Você não precisa trocar de sistema quando seu negócio crescer.</span>
      </div>
    </div>
  );
}

const showcasePreviews = [
  ShowcaseSalesPreview,
  ShowcaseProductionPreview,
  ShowcaseFinancePreview,
  ShowcaseGrowthPreview,
];

function HomeBenefitsShowcase() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % showcaseSlides.length);
    }, 5200);

    return () => window.clearInterval(timer);
  }, []);

  const ActivePreview = showcasePreviews[active];

  return (
    <section id="como-funciona" className="flua-showcase-section">
      <div className="flua2-shell">
        <div className="flua-showcase-heading">
          <span>MENOS IMPROVISO. MAIS CONTROLE.</span>
          <h2>
            Seu negócio continua artesanal. Sua gestão passa a ser profissional.
          </h2>
        </div>

        <div className="flua-showcase-layout">
          <div
            className="flua-showcase-tabs"
            role="tablist"
            aria-label="Benefícios da Flua"
          >
            {showcaseSlides.map((slide, index) => {
              const Icon = slide.icon;
              const isActive = index === active;

              return (
                <button
                  key={slide.number}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={isActive ? "active" : ""}
                  onClick={() => setActive(index)}
                >
                  <div className="flua-showcase-tab-icon">
                    <Icon size={19} />
                  </div>
                  <div className="flua-showcase-tab-copy">
                    <span>{slide.number}</span>
                    <strong>{slide.short}</strong>
                    <p>{slide.title}</p>
                  </div>
                  {isActive && (
                    <i
                      key={`progress-${active}`}
                      className="flua-showcase-progress"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flua-showcase-stage">
            <div className="flua-showcase-copy" key={`copy-${active}`}>
              <span>
                {showcaseSlides[active].number} · {showcaseSlides[active].short}
              </span>
              <h3>{showcaseSlides[active].title}</h3>
              <p>{showcaseSlides[active].text}</p>
            </div>

            <div className="flua-showcase-preview" key={`preview-${active}`}>
              <ActivePreview />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


export default function HomePage() {
  return (
    <main className="flua2-site">
      <section className="flua2-hero">
        <header className="flua2-header">
          <div className="flua2-shell flua2-nav marketing-nav-simple">
            <Link href="/" className="flua2-brand" aria-label="Flua Gestão">
              <BrandLogo />
            </Link>

            <nav className="flua2-nav-links marketing-nav-simple-links" aria-label="Navegação principal">
              <Link href="/funcionalidades/controle-de-vendas">NOSSO SAAS</Link>
              <a href="#para-quem">A FLUA</a>
              <a href="#contato">CONTATO</a>
              <a href="#documentos">DOCUMENTOS</a>
              <Link href="/login">PORTAL</Link>
            </nav>
          </div>
        </header>

        <div className="flua2-decor flua2-decor-gift" aria-hidden="true">
          <Image src="/flua-decor-gift.jpg" alt="" fill sizes="290px" priority />
        </div>
        <div className="flua2-decor flua2-decor-board" aria-hidden="true">
          <Image src="/flua-decor-board.jpg" alt="" fill sizes="290px" priority />
        </div>
        <div className="flua2-decor flua2-decor-box" aria-hidden="true">
          <Image src="/flua-decor-box.jpg" alt="" fill sizes="330px" priority />
        </div>

        <div className="flua2-shell flua2-hero-layout">
          <div className="flua2-hero-copy">
            <div className="flua2-eyebrow">
              <Sparkles size={16} />
              <span>o sistema feito para quem encanta</span>
            </div>

            <h1>
              Gestão simples para
              <span> cestas e tábuas de frios.</span>
            </h1>

            <p className="flua2-lead">
              Controle seus pedidos, clientes, entregas e produção da sua casa até a sua empresa.
            </p>

            <p className="flua2-supporting">
              A Flua é um sistema especializado para quem vende cestas artesanais,
              cafés da manhã, presentes e tábuas de frios. Organize encomendas,
              financeiro, estoque e entregas em um só lugar.
            </p>

            <div className="flua2-hero-actions">
              <Link href="/cadastro" className="flua2-btn flua2-btn-light flua2-btn-main">
                Começar teste grátis
                <ArrowRight size={18} />
              </Link>
              <a href="#como-funciona" className="flua2-btn flua2-btn-ghost flua2-btn-main">
                Ver como funciona
              </a>
            </div>

            <div className="flua2-trust-row">
              <span><Heart size={17} /> Feito para o seu negócio</span>
              <span><ShieldCheck size={17} /> Segurança e privacidade</span>
              <span><Headphones size={17} /> Suporte humano</span>
            </div>
          </div>

          <div className="flua2-product-preview" aria-label="Prévia do sistema Flua">
            <article className="flua2-app-window">
              <aside className="flua2-app-sidebar">
                <strong>flua</strong>
                <nav>
                  <span className="active">Resumo</span>
                  <span>Pedidos <b>8</b></span>
                  <span>Produção</span>
                  <span>Entregas</span>
                  <span>Clientes</span>
                  <span>Produtos</span>
                  <span>Financeiro</span>
                  <span>Relatórios</span>
                </nav>
              </aside>

              <div className="flua2-app-main">
                <div className="flua2-app-topline">
                  <div>
                    <small>RESUMO DO DIA</small>
                    <h2>Seu negócio em movimento.</h2>
                  </div>
                  <span>Hoje, 20 de maio</span>
                </div>

                <div className="flua2-kpi-grid">
                  <div><small>Pedidos do dia</small><strong>12</strong><span>+ 3 novos</span></div>
                  <div><small>Em produção</small><strong>7</strong><span>Ver produção</span></div>
                  <div><small>Entregas hoje</small><strong>9</strong><span>Ver agenda</span></div>
                  <div><small>Faturamento</small><strong>R$ 2.890</strong><span>Ver financeiro</span></div>
                </div>

                <div className="flua2-orders-card">
                  <div className="flua2-card-heading">
                    <strong>Pedidos do dia</strong>
                    <span>Ver todos os pedidos</span>
                  </div>
                  <div className="flua2-orders-list">
                    <p><span>#1527</span><b>Cesta Romântica</b><em>Ana Paula Souza</em><strong>R$ 259,90</strong><i><StatusDot tone="gold" /> Em produção</i></p>
                    <p><span>#1526</span><b>Cesta Café da Manhã</b><em>Juliana Martins</em><strong>R$ 189,90</strong><i><StatusDot tone="green" /> Confirmado</i></p>
                    <p><span>#1525</span><b>Tábua Premium</b><em>Rodrigo Almeida</em><strong>R$ 329,90</strong><i><StatusDot tone="gold" /> Em produção</i></p>
                    <p><span>#1524</span><b>Presente Especial</b><em>Camila Ribeiro</em><strong>R$ 149,90</strong><i><StatusDot /> Separação</i></p>
                  </div>
                </div>
              </div>
            </article>

            <div className="flua2-mini-grid">
              <article className="flua2-mini-card flua2-agenda-card">
                <div className="flua2-mini-heading">
                  <div><Route size={16} /><strong>Agenda de entregas</strong></div>
                  <span>Ver rota</span>
                </div>
                <small>Terça-feira, 20 de maio</small>
                <div className="flua2-timeline">
                  <p><b>09:00</b><span>Ana Paula Souza<small>Rua das Flores, 123</small></span><em>A caminho</em></p>
                  <p><b>11:00</b><span>Juliana Martins<small>Av. Brasil, 456</small></span><em className="done">Entregue</em></p>
                  <p><b>14:00</b><span>Beatriz Lima<small>Rua do Ipê, 789</small></span><em>A caminho</em></p>
                </div>
              </article>

              <article className="flua2-mini-card flua2-production-card">
                <div className="flua2-mini-heading">
                  <div><PackageCheck size={16} /><strong>Produção</strong></div>
                  <span>Ver produção</span>
                </div>
                <div className="flua2-production-list">
                  <p><span><b>Cesta Romântica</b><small>#1527 · Ana Paula</small></span><i><u style={{ width: "70%" }} /></i><em>70%</em></p>
                  <p><span><b>Cesta Café da Manhã</b><small>#1526 · Juliana</small></span><i><u style={{ width: "100%" }} /></i><em>100%</em></p>
                  <p><span><b>Tábua Premium</b><small>#1525 · Rodrigo</small></span><i><u style={{ width: "40%" }} /></i><em>40%</em></p>
                </div>
              </article>

              <article className="flua2-mini-card flua2-finance-card">
                <div className="flua2-mini-heading">
                  <div><WalletCards size={16} /><strong>Financeiro</strong></div>
                  <span>Ver relatório</span>
                </div>
                <small>Entradas e saídas · mês atual</small>
                <div className="flua2-finance-values">
                  <div><small>Entradas</small><b>R$ 8.540,00</b></div>
                  <div><small>Saídas</small><b>R$ 3.250,00</b></div>
                </div>
                <div className="flua2-balance">
                  <small>Saldo do período</small>
                  <strong>R$ 5.290,00</strong>
                  <svg viewBox="0 0 240 58" role="img" aria-label="Gráfico de saldo crescente">
                    <path d="M3 49 C25 45, 34 47, 53 38 S86 34, 98 27 S126 19, 145 29 S177 22, 193 16 S220 15, 237 8" />
                  </svg>
                </div>
              </article>
            </div>
          </div>
        </div>

      </section>

      <section id="funcionalidades" className="flua2-cesteira-callout">
        <div className="flua2-shell flua2-cesteira-grid">
          <div className="flua2-cesteira-copy">
            <span className="flua2-cesteira-kicker">GESTÃO PARA CESTEIRAS</span>

            <h2>
              O único sistema desenvolvido especialmente para{" "}
              <em>cesteiras.</em>
            </h2>

            <p>
              Organize pedidos, produção, clientes, entregas e financeiro em um
              só lugar. Da cozinha de casa à operação profissional, a Flua ajuda
              seu negócio a crescer com mais controle e menos improviso.
            </p>

            <div className="flua2-cesteira-actions">
              <Link href="/cadastro" className="flua2-btn flua2-btn-wine flua2-btn-main">
                Quero conhecer a Flua
                <ArrowRight size={18} />
              </Link>

              <a href="#como-funciona" className="flua2-cesteira-demo-link">
                Ver como funciona
                <ArrowRight size={17} />
              </a>
            </div>
          </div>

          <div className="flua2-cesteira-visual">
            <div className="flua2-cesteira-photo">
              <Image
                src="/mulher-chef-macbook.png"
                alt="Cesteira organizando pedidos e produção com a Flua"
                fill
                sizes="(max-width: 1080px) 92vw, 760px"
              />
            </div>

            <div className="flua2-floating-stat flua2-floating-orders">
              <div className="flua2-floating-icon">
                <ShoppingBag size={21} />
              </div>
              <div>
                <span>Pedidos</span>
                <strong>248</strong>
                <small>↗ +18% este mês</small>
              </div>
            </div>

            <div className="flua2-floating-stat flua2-floating-production">
              <div className="flua2-floating-icon">
                <Boxes size={21} />
              </div>
              <div>
                <span>Produção</span>
                <strong>132</strong>
                <small>cestas concluídas</small>
                <div className="flua2-floating-progress">
                  <i />
                  <b>87%</b>
                </div>
              </div>
            </div>

            <div className="flua2-floating-stat flua2-floating-revenue">
              <div className="flua2-floating-icon">
                <WalletCards size={21} />
              </div>
              <div>
                <span>Faturamento</span>
                <strong>R$ 28.540</strong>
                <small>↗ +24% este mês</small>
              </div>
            </div>
          </div>
        </div>
      </section>


      <section id="para-quem" className="flua2-section flua2-audience">
        <div className="flua2-shell flua2-two-columns">
          <div className="flua2-section-copy">
            <span className="flua2-kicker">da cozinha de casa à empresa estruturada</span>
            <h2>Feito para quem transforma cuidado em negócio.</h2>
            <p>
              A Flua não é um sistema genérico tentando se encaixar na sua rotina. Ela foi pensada para quem trabalha com encomendas, datas especiais, produção e entrega — exatamente como funciona uma operação de cestas e tábuas.
            </p>
            <Link href="/cadastro" className="flua2-btn flua2-btn-wine">
              Quero organizar meu negócio <ArrowRight size={17} />
            </Link>
          </div>

          <div className="flua2-audience-cards">
            <article
              style={{
                backgroundImage:
                  'linear-gradient(180deg, rgba(35,15,12,.08) 0%, rgba(35,15,12,.28) 45%, rgba(35,15,12,.82) 100%), url("/cesta-artesanal.png")',
                backgroundSize: "cover",
                backgroundPosition: "center 50%",
                backgroundRepeat: "no-repeat",
                color: "#fff",
                border: "1px solid rgba(255,255,255,.24)",
                boxShadow: "0 18px 42px rgba(62,31,26,.16)",
              }}
            >
              <span style={{ color: "rgba(255,255,255,.92)", textShadow: "0 2px 10px rgba(0,0,0,.35)" }}>
                01
              </span>
              <strong style={{ color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,.48)" }}>
                Cestas artesanais
              </strong>
              <p style={{ color: "rgba(255,255,255,.94)", textShadow: "0 2px 10px rgba(0,0,0,.48)" }}>
                Café da manhã, românticas, maternidade, aniversário e datas comemorativas.
              </p>
            </article>

            <article
              style={{
                backgroundImage:
                  'linear-gradient(180deg, rgba(35,15,12,.08) 0%, rgba(35,15,12,.28) 45%, rgba(35,15,12,.82) 100%), url("/tabua-de-frios.png")',
                backgroundSize: "cover",
                backgroundPosition: "center 52%",
                backgroundRepeat: "no-repeat",
                color: "#fff",
                border: "1px solid rgba(255,255,255,.24)",
                boxShadow: "0 18px 42px rgba(62,31,26,.16)",
              }}
            >
              <span style={{ color: "rgba(255,255,255,.92)", textShadow: "0 2px 10px rgba(0,0,0,.35)" }}>
                02
              </span>
              <strong style={{ color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,.48)" }}>
                Tábuas de frios
              </strong>
              <p style={{ color: "rgba(255,255,255,.94)", textShadow: "0 2px 10px rgba(0,0,0,.48)" }}>
                Pedidos personalizados, montagem, insumos, retirada e entrega.
              </p>
            </article>

            <article
              style={{
                backgroundImage:
                  'linear-gradient(180deg, rgba(35,15,12,.08) 0%, rgba(35,15,12,.28) 45%, rgba(35,15,12,.82) 100%), url("/presentes-e-kits.png")',
                backgroundSize: "cover",
                backgroundPosition: "center 50%",
                backgroundRepeat: "no-repeat",
                color: "#fff",
                border: "1px solid rgba(255,255,255,.24)",
                boxShadow: "0 18px 42px rgba(62,31,26,.16)",
              }}
            >
              <span style={{ color: "rgba(255,255,255,.92)", textShadow: "0 2px 10px rgba(0,0,0,.35)" }}>
                03
              </span>
              <strong style={{ color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,.48)" }}>
                Presentes e kits
              </strong>
              <p style={{ color: "rgba(255,255,255,.94)", textShadow: "0 2px 10px rgba(0,0,0,.48)" }}>
                Combos, caixas, lembranças e produtos vendidos sob encomenda.
              </p>
            </article>

            <article
              style={{
                backgroundImage:
                  'linear-gradient(180deg, rgba(35,15,12,.08) 0%, rgba(35,15,12,.30) 42%, rgba(35,15,12,.84) 100%), url("/mulher-chef.png")',
                backgroundSize: "cover",
                backgroundPosition: "center 36%",
                backgroundRepeat: "no-repeat",
                color: "#fff",
                border: "1px solid rgba(255,255,255,.24)",
                boxShadow: "0 18px 42px rgba(62,31,26,.16)",
              }}
            >
              <span style={{ color: "rgba(255,255,255,.92)", textShadow: "0 2px 10px rgba(0,0,0,.35)" }}>
                04
              </span>
              <strong style={{ color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,.48)" }}>
                Operações em crescimento
              </strong>
              <p style={{ color: "rgba(255,255,255,.94)", textShadow: "0 2px 10px rgba(0,0,0,.48)" }}>
                Do atendimento individual à equipe, estoque, produção e financeiro profissional.
              </p>
            </article>
          </div>
        </div>
      </section>

      <HomeBenefitsShowcase />

      <section id="recursos" className="flua2-section flua2-growth">
        <div className="flua2-shell flua2-growth-card">
          <div>
            <span className="flua2-kicker">um sistema para acompanhar sua evolução</span>
            <h2>Comece pequeno sem pensar pequeno.</h2>
            <p>
              Você pode usar a Flua para organizar os primeiros pedidos em casa e continuar com a mesma estrutura quando chegar a dezenas de pedidos, equipe, estoque e uma operação completa.
            </p>
          </div>
          <div className="flua2-growth-points">
            <p><Check size={17} /> Funciona no computador e no celular</p>
            <p><Check size={17} /> Ambiente separado para cada empresa</p>
            <p><Check size={17} /> Pedidos, clientes, produtos e financeiro integrados</p>
            <p><Check size={17} /> Estrutura preparada para crescer com sua rotina</p>
          </div>
        </div>
      </section>

      <PricingSection />

      <section id="faq" className="flua2-section flua2-faq">
        <div className="flua2-shell flua2-faq-layout">
          <div className="flua2-section-copy">
            <span className="flua2-kicker">perguntas frequentes</span>
            <h2>Sem complicação desde o começo.</h2>
            <p>O objetivo é simples: colocar a organização no lugar sem transformar seu negócio em burocracia.</p>
          </div>
          <div className="flua2-faq-list">
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}<span>+</span></summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer id="contato" className="flua2-footer">
        <span id="documentos" aria-hidden="true" />

        <div className="flua2-shell">
          <div className="flua2-footer-cta">
            <div>
              <span>PRONTO PARA ORGANIZAR?</span>
              <h2>Seu negócio merece mais do que improviso.</h2>
            </div>

            <Link
              href="/cadastro"
              className="flua2-footer-cta-button"
            >
              Começar teste grátis
              <ArrowRight size={18} />
            </Link>
          </div>

          <div className="flua2-footer-main">
            <div className="flua2-footer-brand-block">
              <Link href="/" className="flua2-brand" aria-label="Flua Gestão">
                <BrandLogo />
              </Link>

              <p>
                Gestão simples para quem transforma cuidado em negócio.
              </p>

              <small>
                Feito para cestas, tábuas de frios, presentes e encomendas.
              </small>
            </div>

            <nav className="flua2-footer-nav" aria-label="Navegação do rodapé">
              <div>
                <strong>FLUA</strong>
                <a href="#para-quem">A Flua</a>
                <a href="#como-funciona">Como funciona</a>
                <a href="#faq">FAQ</a>
                <a href="#contato">Contato</a>
              </div>

              <div>
                <strong>PRODUTO</strong>
                <Link href="/funcionalidades/controle-de-vendas">
                  Nosso SaaS
                </Link>
                
                <Link href="/cadastro">Teste grátis</Link>
                <Link href="/login">Portal</Link>
              </div>

              <div>
                <strong>RECURSOS</strong>
                <a href="#funcionalidades">Pedidos</a>
                <a href="#funcionalidades">Produção</a>
                <a href="#funcionalidades">Financeiro</a>
                <a href="#funcionalidades">Entregas</a>
              </div>

              <div>
                <strong>DOCUMENTOS</strong>
                <Link href="/documentos/termos-de-uso">Termos de Uso</Link>
                <Link href="/documentos/privacidade">Privacidade</Link>
                <Link href="/documentos/cookies">Cookies</Link>
                <Link href="/documentos/seguranca">Segurança</Link>
              </div>
            </nav>
          </div>

          <div className="flua2-footer-bottom">
            <p>© 2026 Flua Gestão. Todos os direitos reservados.</p>

            <p className="flua2-footer-signature">
              <Heart size={15} />
              Feito para quem encanta.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}