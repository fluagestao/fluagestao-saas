import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BarChart3,
  Check,
  ClipboardCheck,
  Package2,
  Sparkles,
  Users,
  WalletCards,
  WandSparkles,
} from "lucide-react";
import "./home.css";
import "./hero-refine.css";

const features = [
  {
    icon: ClipboardCheck,
    title: "Pedidos organizados",
    text: "Acompanhe cada pedido do início ao fim, com status, entrega e pagamento em um só fluxo.",
  },
  {
    icon: WalletCards,
    title: "Financeiro claro",
    text: "Entradas, saídas e saldo sempre visíveis para você saber exatamente como o negócio está fluindo.",
  },
  {
    icon: Users,
    title: "Clientes e fornecedores",
    text: "Centralize seus contatos, histórico e informações importantes sem depender de planilhas soltas.",
  },
  {
    icon: Package2,
    title: "Catálogo e produtos",
    text: "Organize produtos, coleções e informações comerciais com uma visão simples e prática.",
  },
  {
    icon: BarChart3,
    title: "Visão do negócio",
    text: "Dashboard com os números que importam para decisões rápidas e rotina mais leve.",
  },
  {
    icon: WandSparkles,
    title: "BIA",
    text: "Apoio inteligente para ajudar na organização e nas tarefas do dia a dia da empresa.",
  },
];

const steps = [
  ["01", "Crie sua conta", "Faça seu cadastro e comece seu teste."],
  ["02", "Configure sua empresa", "Informe os dados básicos do seu negócio."],
  ["03", "Cadastre sua operação", "Clientes, produtos, fornecedores e rotina."],
  ["04", "Comece a fluir", "Venda, acompanhe e controle tudo pela Flua."],
];

const faqs = [
  ["Preciso instalar alguma coisa?", "Não. A Flua funciona pelo navegador e pode ser acessada no computador, tablet ou celular."],
  ["Posso acessar pelo celular?", "Sim. O site e o sistema são responsivos e se adaptam a diferentes tamanhos de tela."],
  ["Existe período de teste?", "Sim. Você pode começar pelo teste grátis antes de escolher um plano."],
  ["Meus dados ficam separados de outras empresas?", "Sim. A estrutura da Flua é multiempresa e os dados de cada empresa ficam isolados por permissões."],
];

function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/flua-logo.webp"
      alt="Flua — gestão simples. negócio fluindo."
      width={1200}
      height={676}
      priority
      className={className}
    />
  );
}

function MiniSidebar() {
  return (
    <aside className="flua-screen-sidebar">
      <strong>flua</strong>
      <i />
      <i />
      <i />
      <i />
      <i />
    </aside>
  );
}

export default function HomePage() {
  return (
    <main className="flua-site">
      <header className="flua-header">
        <div className="flua-shell flua-nav">
          <Link href="/" className="flua-brand" aria-label="Flua Gestão">
            <BrandLogo />
          </Link>

          <nav className="flua-nav-links" aria-label="Navegação principal">
            <a href="#funcionalidades">Funcionalidades</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#planos">Planos</a>
            <a href="#faq">FAQ</a>
          </nav>

          <div className="flua-nav-actions">
            <Link href="/login" className="flua-btn flua-btn-ghost">
              Entrar
            </Link>
            <Link href="/cadastro" className="flua-btn flua-btn-primary">
              Teste grátis
            </Link>
          </div>
        </div>
      </header>

      <section className="flua-hero">
        <div className="flua-shell flua-hero-grid">
          <div className="flua-hero-copy">
            <span className="flua-eyebrow">
              <Sparkles size={16} />
              gestão simples para negócios reais
            </span>

            <h1>
              Gestão simples.
              <br />
              <span>Negócio fluindo.</span>
            </h1>

            <p>
              Organize pedidos, financeiro, clientes, produtos e a rotina da sua
              empresa em um só lugar — sem planilhas espalhadas e sem complicação.
            </p>

            <div className="flua-hero-actions">
              <Link href="/cadastro" className="flua-btn flua-btn-primary flua-btn-lg">
                Começar teste grátis
                <ArrowRight size={18} />
              </Link>
              <Link href="/login" className="flua-btn flua-btn-secondary flua-btn-lg">
                Entrar no sistema
              </Link>
            </div>

            <div className="flua-trust-row">
              <span><Check size={16} /> Acesso pelo navegador</span>
              <span><Check size={16} /> Funciona no celular</span>
              <span><Check size={16} /> Ambiente por empresa</span>
            </div>
          </div>

          <div className="flua-screen-fan" aria-label="Prévia das telas da Flua">
            <article className="flua-screen-card flua-screen-left">
              <div className="flua-screen-topbar">
                <span /><span /><span />
                <small>Vendas</small>
              </div>
              <div className="flua-screen-body">
                <MiniSidebar />
                <div className="flua-screen-content">
                  <div className="flua-screen-title">
                    <div><small>Vendas</small><b>Pedidos em andamento</b></div>
                    <span>Hoje</span>
                  </div>
                  <div className="flua-screen-stats two">
                    <div><small>Em aberto</small><strong>07</strong></div>
                    <div><small>Prontos</small><strong>12</strong></div>
                  </div>
                  <div className="flua-screen-list">
                    <p><span><i /> #128 · Maria</span><b>R$ 289</b></p>
                    <p><span><i /> #129 · Ana</span><b>R$ 420</b></p>
                    <p><span><i /> #130 · Carla</span><b>R$ 198</b></p>
                    <p><span><i /> #131 · Júlia</span><b>R$ 346</b></p>
                  </div>
                </div>
              </div>
            </article>

            <article className="flua-screen-card flua-screen-center">
              <div className="flua-screen-topbar">
                <span /><span /><span />
                <small>Visão geral</small>
              </div>
              <div className="flua-screen-body">
                <MiniSidebar />
                <div className="flua-screen-content">
                  <div className="flua-screen-title">
                    <div><small>Dashboard</small><b>Seu negócio em movimento.</b></div>
                    <span>Hoje</span>
                  </div>
                  <div className="flua-screen-stats three">
                    <div><small>Faturamento</small><strong>R$ 12.480</strong></div>
                    <div><small>Pedidos</small><strong>38</strong></div>
                    <div><small>Saldo</small><strong>R$ 8.940</strong></div>
                  </div>
                  <div className="flua-screen-chart">
                    <small>Pedidos da semana</small>
                    <div className="flua-screen-bars">
                      <i style={{ height: "38%" }} />
                      <i style={{ height: "58%" }} />
                      <i style={{ height: "46%" }} />
                      <i style={{ height: "78%" }} />
                      <i style={{ height: "68%" }} />
                      <i style={{ height: "92%" }} />
                      <i style={{ height: "61%" }} />
                    </div>
                  </div>
                </div>
              </div>
            </article>

            <article className="flua-screen-card flua-screen-right">
              <div className="flua-screen-topbar">
                <span /><span /><span />
                <small>Financeiro</small>
              </div>
              <div className="flua-screen-body">
                <MiniSidebar />
                <div className="flua-screen-content">
                  <div className="flua-screen-title">
                    <div><small>Financeiro</small><b>Entradas e saídas</b></div>
                    <span>Agosto</span>
                  </div>
                  <div className="flua-screen-stats two">
                    <div><small>Entrou</small><strong>R$ 18.920</strong></div>
                    <div><small>Sobrou</small><strong>R$ 11.340</strong></div>
                  </div>
                  <div className="flua-screen-list finance">
                    <p><span><i /> Pedido #128</span><b>+ R$ 289</b></p>
                    <p><span><i /> Pedido #129</span><b>+ R$ 420</b></p>
                    <p><span><i /> Insumos</span><b>- R$ 680</b></p>
                    <p><span><i /> Entrega</span><b>- R$ 95</b></p>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="flua-section flua-value-strip">
        <div className="flua-shell">
          <div className="flua-section-heading">
            <span className="flua-kicker">menos bagunça. mais controle.</span>
            <h2>Uma rotina mais leve para quem precisa fazer o negócio acontecer.</h2>
          </div>

          <div className="flua-value-grid">
            <article>
              <strong>01</strong>
              <h3>Centralize</h3>
              <p>Informações importantes deixam de ficar espalhadas.</p>
            </article>
            <article>
              <strong>02</strong>
              <h3>Acompanhe</h3>
              <p>Saiba o que está vendido, pendente, pago e entregue.</p>
            </article>
            <article>
              <strong>03</strong>
              <h3>Decida</h3>
              <p>Tenha números claros para agir com mais segurança.</p>
            </article>
            <article>
              <strong>04</strong>
              <h3>Flua</h3>
              <p>Ganhe organização sem transformar a gestão em burocracia.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="funcionalidades" className="flua-section flua-features">
        <div className="flua-shell">
          <div className="flua-section-heading flua-heading-center">
            <span className="flua-kicker">tudo no lugar certo</span>
            <h2>O essencial para gerir com mais fluidez.</h2>
            <p>
              Uma base simples, organizada e preparada para acompanhar o crescimento
              da sua operação.
            </p>
          </div>

          <div className="flua-feature-grid">
            {features.map(({ icon: Icon, title, text }) => (
              <article className="flua-feature-card" key={title}>
                <div className="flua-icon-box"><Icon size={21} /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="flua-section flua-how">
        <div className="flua-shell flua-how-grid">
          <div className="flua-section-heading">
            <span className="flua-kicker">comece sem complicação</span>
            <h2>Da conta criada à operação organizada em poucos passos.</h2>
            <p>
              A Flua foi pensada para reduzir atrito desde o primeiro acesso.
            </p>
          </div>

          <div className="flua-steps">
            {steps.map(([number, title, text]) => (
              <article key={number}>
                <strong>{number}</strong>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="planos" className="flua-section flua-pricing">
        <div className="flua-shell">
          <div className="flua-section-heading flua-heading-center">
            <span className="flua-kicker">planos para cada momento</span>
            <h2>Comece simples. Cresça no seu ritmo.</h2>
            <p>Os valores finais podem ser definidos depois sem alterar a estrutura do site.</p>
          </div>

          <div className="flua-pricing-grid">
            <article className="flua-price-card">
              <span>Essencial</span>
              <h3>Para começar</h3>
              <p>Operação organizada com o que você precisa no dia a dia.</p>
              <ul>
                <li><Check size={16} /> Pedidos</li>
                <li><Check size={16} /> Clientes</li>
                <li><Check size={16} /> Catálogo</li>
                <li><Check size={16} /> Financeiro</li>
              </ul>
              <Link href="/cadastro" className="flua-btn flua-btn-secondary">Começar teste</Link>
            </article>

            <article className="flua-price-card flua-price-featured">
              <div className="flua-price-badge">mais completo</div>
              <span>Profissional</span>
              <h3>Para quem está crescendo</h3>
              <p>Mais visão, organização e recursos para a rotina da empresa.</p>
              <ul>
                <li><Check size={16} /> Tudo do Essencial</li>
                <li><Check size={16} /> Dashboard</li>
                <li><Check size={16} /> Tarefas</li>
                <li><Check size={16} /> BIA</li>
              </ul>
              <Link href="/cadastro" className="flua-btn flua-btn-primary">Teste grátis</Link>
            </article>

            <article className="flua-price-card">
              <span>Personalizado</span>
              <h3>Para operações maiores</h3>
              <p>Uma estrutura adaptada à necessidade do seu negócio.</p>
              <ul>
                <li><Check size={16} /> Mais usuários</li>
                <li><Check size={16} /> Implantação</li>
                <li><Check size={16} /> Configuração assistida</li>
                <li><Check size={16} /> Suporte dedicado</li>
              </ul>
              <a href="mailto:contato@fluagestao.com.br" className="flua-btn flua-btn-secondary">
                Falar com a Flua
              </a>
            </article>
          </div>
        </div>
      </section>

      <section id="faq" className="flua-section flua-faq">
        <div className="flua-shell flua-faq-grid">
          <div className="flua-section-heading">
            <span className="flua-kicker">dúvidas frequentes</span>
            <h2>Antes de começar.</h2>
            <p>As principais respostas para quem está conhecendo a Flua.</p>
          </div>

          <div className="flua-faq-list">
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="flua-final-cta">
        <div className="flua-shell">
          <div className="flua-cta-box">
            <div>
              <span className="flua-kicker">gestão simples. negócio fluindo.</span>
              <h2>Pronto para colocar sua operação no fluxo?</h2>
            </div>
            <div className="flua-cta-actions">
              <Link href="/cadastro" className="flua-btn flua-btn-light flua-btn-lg">
                Criar minha conta
              </Link>
              <Link href="/login" className="flua-btn flua-btn-outline-light flua-btn-lg">
                Já sou cliente
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="flua-footer">
        <div className="flua-shell flua-footer-grid">
          <div className="flua-footer-brand">
            <BrandLogo />
            <p>Gestão simples para o negócio continuar fluindo.</p>
          </div>

          <div>
            <strong>Flua</strong>
            <a href="#funcionalidades">Funcionalidades</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#planos">Planos</a>
          </div>

          <div>
            <strong>Acesso</strong>
            <Link href="/login">Entrar</Link>
            <Link href="/cadastro">Teste grátis</Link>
          </div>

          <div>
            <strong>Contato</strong>
            <a href="mailto:contato@fluagestao.com.br">contato@fluagestao.com.br</a>
            <a href="mailto:desenvolvimento@fluagestao.com.br">desenvolvimento@fluagestao.com.br</a>
          </div>
        </div>

        <div className="flua-shell flua-footer-bottom">
          <span>© 2026 Flua Gestão.</span>
          <span>gestão simples. negócio fluindo.</span>
        </div>
      </footer>
    </main>
  );
}
