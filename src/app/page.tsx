import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Check,
  ClipboardCheck,
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

const featureStrip = [
  {
    icon: ClipboardCheck,
    title: "Pedidos e encomendas",
    text: "Do pedido à entrega, sem perder nada no caminho.",
  },
  {
    icon: Boxes,
    title: "Produção e estoque",
    text: "Controle ingredientes, kits, embalagens e produção.",
  },
  {
    icon: Users,
    title: "Clientes",
    text: "Histórico, preferências, datas especiais e recorrência.",
  },
  {
    icon: Truck,
    title: "Entregas",
    text: "Agenda, status, rota e comprovantes em um só lugar.",
  },
  {
    icon: WalletCards,
    title: "Financeiro",
    text: "Entradas, saídas, saldo e visão clara do caixa.",
  },
  {
    icon: BarChart3,
    title: "Relatórios",
    text: "Dados simples para entender e fazer o negócio crescer.",
  },
];

const benefits = [
  ["01", "Venda sem bagunça", "Centralize WhatsApp, pedidos, pagamentos e entregas em um fluxo organizado."],
  ["02", "Produza com segurança", "Saiba o que precisa ser separado, montado, finalizado e entregue em cada pedido."],
  ["03", "Enxergue o dinheiro", "Acompanhe o que entrou, o que saiu e quanto realmente sobrou no seu negócio."],
  ["04", "Cresça sem trocar de sistema", "Comece da sua casa e continue usando a Flua quando sua operação virar empresa."],
];

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

        <div id="funcionalidades" className="flua2-feature-ribbon">
          <div className="flua2-shell">
            <p>Tudo que você precisa para encantar e prosperar.</p>
            <div className="flua2-feature-strip">
              {featureStrip.map(({ icon: Icon, title, text }) => (
                <article key={title}>
                  <div className="flua2-feature-icon"><Icon size={20} /></div>
                  <div>
                    <strong>{title}</strong>
                    <span>{text}</span>
                  </div>
                </article>
              ))}
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
            <article><span>01</span><strong>Cestas artesanais</strong><p>Café da manhã, românticas, maternidade, aniversário e datas comemorativas.</p></article>
            <article><span>02</span><strong>Tábuas de frios</strong><p>Pedidos personalizados, montagem, insumos, retirada e entrega.</p></article>
            <article><span>03</span><strong>Presentes e kits</strong><p>Combos, caixas, lembranças e produtos vendidos sob encomenda.</p></article>
            <article><span>04</span><strong>Operações em crescimento</strong><p>Do atendimento individual à equipe, estoque, produção e financeiro profissional.</p></article>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="flua2-section flua2-benefits">
        <div className="flua2-shell">
          <div className="flua2-centered-heading">
            <span className="flua2-kicker">menos improviso. mais controle.</span>
            <h2>Seu negócio continua artesanal. Sua gestão passa a ser profissional.</h2>
          </div>
          <div className="flua2-benefit-grid">
            {benefits.map(([number, title, text]) => (
              <article key={number}>
                <span>{number}</span>
                <strong>{title}</strong>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

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

      <section id="planos" className="flua2-section flua2-pricing">
        <div className="flua2-shell">
          <div className="flua2-centered-heading">
            <span className="flua2-kicker">comece agora</span>
            <h2>Teste a Flua no seu negócio.</h2>
            <p>Conheça o sistema com seus próprios pedidos antes de decidir.</p>
          </div>
          <div className="flua2-pricing-card">
            <div>
              <small>TESTE GRÁTIS</small>
              <strong>Organize sua próxima encomenda na Flua.</strong>
              <span>Cadastre pedidos, clientes e produtos e veja como a rotina fica mais clara.</span>
            </div>
            <Link href="/cadastro" className="flua2-btn flua2-btn-wine flua2-btn-main">
              Começar teste grátis <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

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
        <div className="flua2-shell flua2-footer-row">
          <Link href="/" className="flua2-brand"><BrandLogo /></Link>
          <p>Gestão especializada para cestas, tábuas de frios, presentes e encomendas.</p>
          <div>
            <Link href="/login">Entrar</Link>
            <Link href="/cadastro">Teste grátis</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
