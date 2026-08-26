"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
    "Sim. A Flua foi pensada justamente para acompanhar o crescimento do negÃ³cio: vocÃª pode comeÃ§ar organizando sua rotina em casa e continuar com o mesmo sistema quando tiver equipe, loja, cozinha, estoque ou uma operaÃ§Ã£o maior.",
  ],
  [
    "Ã‰ especÃ­fica para cestas e tÃ¡buas de frios?",
    "Sim. A comunicaÃ§Ã£o e os fluxos da Flua sÃ£o voltados para quem trabalha com cestas artesanais, cafÃ©s da manhÃ£, presentes, kits, tÃ¡buas de frios e negÃ³cios de encomendas semelhantes.",
  ],
  [
    "Preciso instalar alguma coisa?",
    "NÃ£o. A Flua funciona pelo navegador e pode ser acessada no computador, notebook, tablet ou celular.",
  ],
  [
    "Posso testar antes de assinar?",
    "Sim. VocÃª pode comeÃ§ar pelo teste grÃ¡tis e conhecer a rotina do sistema antes de escolher o plano.",
  ],
];

function BrandLogo() {
  return (
    <Image
      src="/flua-logo.webp"
      alt="Flua GestÃ£o"
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
    short: "Venda sem bagunÃ§a",
    title: "Todos os pedidos em uma Ãºnica operaÃ§Ã£o.",
    text: "Pedidos do site entram automaticamente. Vendas pelo WhatsApp, Instagram, telefone ou balcÃ£o podem ser lanÃ§adas manualmente sem perder o histÃ³rico.",
    icon: ShoppingBag,
  },
  {
    number: "02",
    short: "Produza com seguranÃ§a",
    title: "Sua produÃ§Ã£o sabe exatamente o que fazer.",
    text: "Acompanhe o que precisa ser separado, montado, finalizado e entregue. Cada pedido segue uma etapa clara atÃ© ficar pronto.",
    icon: Boxes,
  },
  {
    number: "03",
    short: "Enxergue o dinheiro",
    title: "Faturamento, entradas e saÃ­das sem adivinhaÃ§Ã£o.",
    text: "Veja o que entrou, o que ainda tem para receber e quanto realmente sobrou no perÃ­odo, com visÃ£o simples para decidir melhor.",
    icon: WalletCards,
  },
  {
    number: "04",
    short: "CresÃ§a sem trocar de sistema",
    title: "Da sua casa atÃ© uma operaÃ§Ã£o completa.",
    text: "Comece organizando seus primeiros pedidos e continue na mesma plataforma quando tiver equipe, estoque, produÃ§Ã£o e uma empresa estruturada.",
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
          <span>Faturamento do mÃªs</span>
          <strong>R$ 24.860,00</strong>
          <small>+12,4% no perÃ­odo</small>
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
        <span>Em produÃ§Ã£o</span>
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
          <span>Hoje Â· 14:00</span>
          <b>R$ 259,90</b>
          <i className="production">Em produÃ§Ã£o</i>
        </div>
        <div>
          <span>#1841</span>
          <strong>Juliana Martins</strong>
          <em className="manual">Manual</em>
          <span>Hoje Â· Retirada</span>
          <b>R$ 189,90</b>
          <i className="new">Novo</i>
        </div>
        <div>
          <span>#1840</span>
          <strong>Camila Ribeiro</strong>
          <em className="site">Site</em>
          <span>AmanhÃ£ Â· 09:00</span>
          <b>R$ 329,90</b>
          <i className="waiting">Aguardando</i>
        </div>
        <div>
          <span>#1839</span>
          <strong>Marina Lopes</strong>
          <em className="manual">Manual</em>
          <span>Ontem Â· Entregue</span>
          <b>R$ 149,90</b>
          <i className="done">Entregue</i>
        </div>
      </div>
    </div>
  );
}

function ShowcaseProductionPreview() {
  const items = [
    ["Cesta RomÃ¢ntica", "Ana Paula", 70, "Em produÃ§Ã£o"],
    ["Cesta CafÃ© da ManhÃ£", "Juliana Martins", 100, "Pronto"],
    ["TÃ¡bua Premium", "Camila Ribeiro", 45, "SeparaÃ§Ã£o"],
    ["Presente Especial", "Marina Lopes", 25, "A iniciar"],
  ] as const;

  return (
    <div className="flua-showcase-screen">
      <div className="flua-showcase-screen-top">
        <div>
          <span>PRODUÃ‡ÃƒO</span>
          <h3>ProduÃ§Ã£o de hoje</h3>
        </div>
        <div className="flua-showcase-date">12 pedidos programados</div>
      </div>

      <div className="flua-showcase-production-summary">
        <div><strong>12</strong><span>Programados</span></div>
        <div><strong>7</strong><span>Em produÃ§Ã£o</span></div>
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
          <h3>VisÃ£o do mÃªs</h3>
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
          <span>SaÃ­das</span>
          <strong>R$ 7.250,00</strong>
          <small>39% das entradas</small>
        </div>
        <div>
          <span>Saldo</span>
          <strong>R$ 11.290,00</strong>
          <small>Resultado do perÃ­odo</small>
        </div>
      </div>

      <div className="flua-showcase-chart-card">
        <div>
          <strong>Faturamento</strong>
          <span>Ãšltimos 30 dias</span>
        </div>
        <svg viewBox="0 0 500 150" role="img" aria-label="EvoluÃ§Ã£o do faturamento">
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
    ["AteliÃª", "ProduÃ§Ã£o, estoque e entregas", Boxes],
    ["Equipe", "Processos claros para todos", CheckCircle2],
    ["Empresa", "Dados, relatÃ³rios e escala", TrendingUp],
  ] as const;

  return (
    <div className="flua-showcase-screen flua-showcase-growth-screen">
      <div className="flua-showcase-screen-top">
        <div>
          <span>CRESCIMENTO</span>
          <h3>Uma estrutura que cresce com vocÃª.</h3>
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
        <span>VocÃª nÃ£o precisa trocar de sistema quando seu negÃ³cio crescer.</span>
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
            Seu negÃ³cio continua artesanal. Sua gestÃ£o passa a ser profissional.
          </h2>
        </div>

        <div className="flua-showcase-layout">
          <div
            className="flua-showcase-tabs"
            role="tablist"
            aria-label="BenefÃ­cios da Flua"
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
                {showcaseSlides[active].number} Â· {showcaseSlides[active].short}
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
            <Link href="/" className="flua2-brand" aria-label="Flua GestÃ£o">
              <BrandLogo />
            </Link>

            <nav className="flua2-nav-links marketing-nav-simple-links" aria-label="NavegaÃ§Ã£o principal">
              <Link href="/funcionalidades/controle-de-vendas">NOSSO SAAS</Link>
              <a href="#para-quem">A FLUA</a>
              <a href="#contato">CONTATO</a>
              <Link href="/catalogo">MINHA LOJA</Link>
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
              GestÃ£o simples para
              <span> cestas e tÃ¡buas de frios.</span>
            </h1>

            <p className="flua2-lead">
              Controle seus pedidos, clientes, entregas e produÃ§Ã£o da sua casa atÃ© a sua empresa.
            </p>

            <p className="flua2-supporting">
              A Flua Ã© um sistema especializado para quem vende cestas artesanais,
              cafÃ©s da manhÃ£, presentes e tÃ¡buas de frios. Organize encomendas,
              financeiro, estoque e entregas em um sÃ³ lugar.
            </p>

            <div className="flua2-hero-actions">
              <Link href="/cadastro" className="flua2-btn flua2-btn-light flua2-btn-main">
                ComeÃ§ar teste grÃ¡tis
                <ArrowRight size={18} />
              </Link>
              <a href="#como-funciona" className="flua2-btn flua2-btn-ghost flua2-btn-main">
                Ver como funciona
              </a>
            </div>

            <div className="flua2-trust-row">
              <span><Heart size={17} /> Feito para o seu negÃ³cio</span>
              <span><ShieldCheck size={17} /> SeguranÃ§a e privacidade</span>
              <span><Headphones size={17} /> Suporte humano</span>
            </div>
          </div>

          <div className="flua2-product-preview" aria-label="PrÃ©via do sistema Flua">
            <article className="flua2-app-window">
              <aside className="flua2-app-sidebar">
                <strong>flua</strong>
                <nav>
                  <span className="active">Resumo</span>
                  <span>Pedidos <b>8</b></span>
                  <span>ProduÃ§Ã£o</span>
                  <span>Entregas</span>
                  <span>Clientes</span>
                  <span>Produtos</span>
                  <span>Financeiro</span>
                  <span>RelatÃ³rios</span>
                </nav>
              </aside>

              <div className="flua2-app-main">
                <div className="flua2-app-topline">
                  <div>
                    <small>RESUMO DO DIA</small>
                    <h2>Seu negÃ³cio em movimento.</h2>
                  </div>
                  <span>Hoje, 20 de maio</span>
                </div>

                <div className="flua2-kpi-grid">
                  <div><small>Pedidos do dia</small><strong>12</strong><span>+ 3 novos</span></div>
                  <div><small>Em produÃ§Ã£o</small><strong>7</strong><span>Ver produÃ§Ã£o</span></div>
                  <div><small>Entregas hoje</small><strong>9</strong><span>Ver agenda</span></div>
                  <div><small>Faturamento</small><strong>R$ 2.890</strong><span>Ver financeiro</span></div>
                </div>

                <div className="flua2-orders-card">
                  <div className="flua2-card-heading">
                    <strong>Pedidos do dia</strong>
                    <span>Ver todos os pedidos</span>
                  </div>
                  <div className="flua2-orders-list">
                    <p><span>#1527</span><b>Cesta RomÃ¢ntica</b><em>Ana Paula Souza</em><strong>R$ 259,90</strong><i><StatusDot tone="gold" /> Em produÃ§Ã£o</i></p>
                    <p><span>#1526</span><b>Cesta CafÃ© da ManhÃ£</b><em>Juliana Martins</em><strong>R$ 189,90</strong><i><StatusDot tone="green" /> Confirmado</i></p>
                    <p><span>#1525</span><b>TÃ¡bua Premium</b><em>Rodrigo Almeida</em><strong>R$ 329,90</strong><i><StatusDot tone="gold" /> Em produÃ§Ã£o</i></p>
                    <p><span>#1524</span><b>Presente Especial</b><em>Camila Ribeiro</em><strong>R$ 149,90</strong><i><StatusDot /> SeparaÃ§Ã£o</i></p>
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
                <small>TerÃ§a-feira, 20 de maio</small>
                <div className="flua2-timeline">
                  <p><b>09:00</b><span>Ana Paula Souza<small>Rua das Flores, 123</small></span><em>A caminho</em></p>
                  <p><b>11:00</b><span>Juliana Martins<small>Av. Brasil, 456</small></span><em className="done">Entregue</em></p>
                  <p><b>14:00</b><span>Beatriz Lima<small>Rua do IpÃª, 789</small></span><em>A caminho</em></p>
                </div>
              </article>

              <article className="flua2-mini-card flua2-production-card">
                <div className="flua2-mini-heading">
                  <div><PackageCheck size={16} /><strong>ProduÃ§Ã£o</strong></div>
                  <span>Ver produÃ§Ã£o</span>
                </div>
                <div className="flua2-production-list">
                  <p><span><b>Cesta RomÃ¢ntica</b><small>#1527 Â· Ana Paula</small></span><i><u style={{ width: "70%" }} /></i><em>70%</em></p>
                  <p><span><b>Cesta CafÃ© da ManhÃ£</b><small>#1526 Â· Juliana</small></span><i><u style={{ width: "100%" }} /></i><em>100%</em></p>
                  <p><span><b>TÃ¡bua Premium</b><small>#1525 Â· Rodrigo</small></span><i><u style={{ width: "40%" }} /></i><em>40%</em></p>
                </div>
              </article>

              <article className="flua2-mini-card flua2-finance-card">
                <div className="flua2-mini-heading">
                  <div><WalletCards size={16} /><strong>Financeiro</strong></div>
                  <span>Ver relatÃ³rio</span>
                </div>
                <small>Entradas e saÃ­das Â· mÃªs atual</small>
                <div className="flua2-finance-values">
                  <div><small>Entradas</small><b>R$ 8.540,00</b></div>
                  <div><small>SaÃ­das</small><b>R$ 3.250,00</b></div>
                </div>
                <div className="flua2-balance">
                  <small>Saldo do perÃ­odo</small>
                  <strong>R$ 5.290,00</strong>
                  <svg viewBox="0 0 240 58" role="img" aria-label="GrÃ¡fico de saldo crescente">
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
            <span className="flua2-cesteira-kicker">GESTÃƒO PARA CESTEIRAS</span>

            <h2>
              O Ãºnico sistema desenvolvido especialmente para{" "}
              <em>cesteiras.</em>
            </h2>

            <p>
              Organize pedidos, produÃ§Ã£o, clientes, entregas e financeiro em um
              sÃ³ lugar. Da cozinha de casa Ã  operaÃ§Ã£o profissional, a Flua ajuda
              seu negÃ³cio a crescer com mais controle e menos improviso.
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
                alt="Cesteira organizando pedidos e produÃ§Ã£o com a Flua"
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
                <small>â†— +18% este mÃªs</small>
              </div>
            </div>

            <div className="flua2-floating-stat flua2-floating-production">
              <div className="flua2-floating-icon">
                <Boxes size={21} />
              </div>
              <div>
                <span>ProduÃ§Ã£o</span>
                <strong>132</strong>
                <small>cestas concluÃ­das</small>
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
                <small>â†— +24% este mÃªs</small>
              </div>
            </div>
          </div>
        </div>
      </section>


      <section id="para-quem" className="flua2-section flua2-audience">
        <div className="flua2-shell flua2-two-columns">
          <div className="flua2-section-copy">
            <span className="flua2-kicker">da cozinha de casa Ã  empresa estruturada</span>
            <h2>Feito para quem transforma cuidado em negÃ³cio.</h2>
            <p>
              A Flua nÃ£o Ã© um sistema genÃ©rico tentando se encaixar na sua rotina. Ela foi pensada para quem trabalha com encomendas, datas especiais, produÃ§Ã£o e entrega â€” exatamente como funciona uma operaÃ§Ã£o de cestas e tÃ¡buas.
            </p>
            <Link href="/cadastro" className="flua2-btn flua2-btn-wine">
              Quero organizar meu negÃ³cio <ArrowRight size={17} />
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
                CafÃ© da manhÃ£, romÃ¢nticas, maternidade, aniversÃ¡rio e datas comemorativas.
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
                TÃ¡buas de frios
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
                Combos, caixas, lembranÃ§as e produtos vendidos sob encomenda.
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
                OperaÃ§Ãµes em crescimento
              </strong>
              <p style={{ color: "rgba(255,255,255,.94)", textShadow: "0 2px 10px rgba(0,0,0,.48)" }}>
                Do atendimento individual Ã  equipe, estoque, produÃ§Ã£o e financeiro profissional.
              </p>
            </article>
          </div>
        </div>
      </section>

      <HomeBenefitsShowcase />

      <section id="recursos" className="flua2-section flua2-growth">
        <div className="flua2-shell flua2-growth-card">
          <div>
            <span className="flua2-kicker">um sistema para acompanhar sua evoluÃ§Ã£o</span>
            <h2>Comece pequeno sem pensar pequeno.</h2>
            <p>
              VocÃª pode usar a Flua para organizar os primeiros pedidos em casa e continuar com a mesma estrutura quando chegar a dezenas de pedidos, equipe, estoque e uma operaÃ§Ã£o completa.
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

      <section id="planos" className="flua2-section flua2-pricing">
        <div className="flua2-shell">
          <div className="flua2-centered-heading flua2-investment-heading">
            <span className="flua2-kicker">investimento</span>
            <h2>Três formas de começar.</h2>
            <p>
              Escolha o ponto de entrada que faz sentido para o seu negócio.
              Site, sistema ou os dois trabalhando juntos.
            </p>
          </div>

          <div className="flua2-investment-grid">

            <article className="flua2-investment-card">
              <div className="flua2-investment-option">OPÇÃO 1</div>

              <h3>Site</h3>

              <p className="flua2-investment-description">
                Para quem quer o catálogo online e segue fechando tudo no WhatsApp.
              </p>

              <div className="flua2-investment-price">
                <strong>R$ 1.000,00</strong>
                <span>implantação</span>
              </div>

              <div className="flua2-investment-monthly">
                <div>
                  <b>+ R$ 40,00</b>
                  <span>/ mês</span>
                </div>
                <small>domínio e hospedagem</small>
              </div>

              <div className="flua2-investment-features">
                {[
                  "Catálogo com a identidade da sua marca",
                  "Página de produto com opções e adicionais",
                  "Carrinho com o total somado",
                  "Finalização do pedido no seu WhatsApp",
                  "Site responsivo, feito para o celular",
                  "Publicação, domínio e suporte",
                ].map((item) => (
                  <p key={item}>
                    <Check size={15} />
                    {item}
                  </p>
                ))}
              </div>

              <Link
                href="/cadastro"
                className="flua2-btn flua2-btn-wine flua2-investment-button"
              >
                Quero começar
                <ArrowRight size={17} />
              </Link>
            </article>

            <article className="flua2-investment-card flua2-investment-featured">
              <span className="flua2-investment-badge">MAIS COMPLETO</span>

              <div className="flua2-investment-option">OPÇÃO 2</div>

              <h3>
                Site + Sistema
                <small>integrados</small>
              </h3>

              <p className="flua2-investment-description">
                O catálogo vendendo e o sistema controlando — os dois conversando entre si.
              </p>

              <div className="flua2-investment-price">
                <strong>R$ 1.500,00</strong>
                <span>implantação</span>
              </div>

              <div className="flua2-investment-monthly">
                <div>
                  <b>+ R$ 170,00</b>
                  <span>/ mês</span>
                </div>
                <small>domínio, hospedagem e sistema</small>
              </div>

              <div className="flua2-investment-features">
                {[
                  "Tudo o que está na opção 1",
                  "Pedidos do site entrando sozinhos no sistema",
                  "Controle de produção, entregas e clientes",
                  "Financeiro e relatórios de vendas",
                  "Produtos e preços em um lugar só",
                  "Configuração completa e treinamento",
                ].map((item) => (
                  <p key={item}>
                    <Check size={15} />
                    {item}
                  </p>
                ))}

                <p className="flua2-investment-ai">
                  <Sparkles size={15} />
                  IA Consultora grátis (100 primeiros)
                </p>
              </div>

              <Link
                href="/cadastro"
                className="flua2-btn flua2-btn-wine flua2-investment-button"
              >
                Quero o mais completo
                <ArrowRight size={17} />
              </Link>
            </article>

            <article className="flua2-investment-card">
              <div className="flua2-investment-option">OPÇÃO 3</div>

              <h3>Sistema</h3>

              <p className="flua2-investment-description">
                Para quem já tem site ou vende só pelo WhatsApp e Instagram.
              </p>

              <div className="flua2-investment-price flua2-investment-no-setup">
                <strong>Sem implantação</strong>
              </div>

              <div className="flua2-investment-monthly">
                <div>
                  <b>R$ 170,00</b>
                  <span>/ mês</span>
                </div>
                <small>sistema completo e suporte</small>
              </div>

              <div className="flua2-investment-features">
                {[
                  "Pedidos do primeiro contato à entrega",
                  "Produção e o que montar em cada dia",
                  "Clientes, histórico e datas especiais",
                  "Entregas com agenda e status",
                  "Financeiro, entradas e saídas",
                  "Relatórios do que mais vende",
                ].map((item) => (
                  <p key={item}>
                    <Check size={15} />
                    {item}
                  </p>
                ))}

                <p className="flua2-investment-ai">
                  <Sparkles size={15} />
                  IA Consultora grátis (100 primeiros)
                </p>
              </div>

              <Link
                href="/cadastro"
                className="flua2-btn flua2-btn-wine flua2-investment-button"
              >
                Quero usar a Flua
                <ArrowRight size={17} />
              </Link>
            </article>
          </div>

          <div className="flua2-investment-payment">
            <p>
              <strong>Pagamento da implantação:</strong>
              50% para iniciar o projeto e 50% na entrega.
            </p>

            <p>
              <strong>À vista antecipado:</strong>
              5% de desconto.
            </p>

            <p>
              <strong>Mensalidade:</strong>
              começa quando o site entra no ar.
            </p>
          </div>
        </div>
      </section>
<section id="faq" className="flua2-section flua2-faq">
        <div className="flua2-shell flua2-faq-layout">
          <div className="flua2-section-copy">
            <span className="flua2-kicker">perguntas frequentes</span>
            <h2>Sem complicaÃ§Ã£o desde o comeÃ§o.</h2>
            <p>O objetivo Ã© simples: colocar a organizaÃ§Ã£o no lugar sem transformar seu negÃ³cio em burocracia.</p>
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
              <h2>Seu negÃ³cio merece mais do que improviso.</h2>
            </div>

            <Link
              href="/cadastro"
              className="flua2-footer-cta-button"
            >
              ComeÃ§ar teste grÃ¡tis
              <ArrowRight size={18} />
            </Link>
          </div>

          <div className="flua2-footer-main">
            <div className="flua2-footer-brand-block">
              <Link href="/" className="flua2-brand" aria-label="Flua GestÃ£o">
                <BrandLogo />
              </Link>

              <p>
                GestÃ£o simples para quem transforma cuidado em negÃ³cio.
              </p>

              <small>
                Feito para cestas, tÃ¡buas de frios, presentes e encomendas.
              </small>
            </div>

            <nav className="flua2-footer-nav" aria-label="NavegaÃ§Ã£o do rodapÃ©">
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
                <Link href="/catalogo">Minha Loja</Link>
                <Link href="/cadastro">Teste grÃ¡tis</Link>
                <Link href="/login">Portal</Link>
              </div>

              <div>
                <strong>RECURSOS</strong>
                <a href="#funcionalidades">Pedidos</a>
                <a href="#funcionalidades">ProduÃ§Ã£o</a>
                <a href="#funcionalidades">Financeiro</a>
                <a href="#funcionalidades">Entregas</a>
              </div>

              <div>
                <strong>DOCUMENTOS</strong>
                <Link href="/documentos/termos-de-uso">Termos de Uso</Link>
                <Link href="/documentos/privacidade">Privacidade</Link>
                <Link href="/documentos/cookies">Cookies</Link>
                <Link href="/documentos/seguranca">SeguranÃ§a</Link>
              </div>
            </nav>
          </div>

          <div className="flua2-footer-bottom">
            <p>Â© 2026 Flua GestÃ£o. Todos os direitos reservados.</p>

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
