import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarRange,
  Check,
  CircleDollarSign,
  ClipboardList,
  MousePointerClick,
  ReceiptText,
  ShoppingBag,
  Smartphone,
  Store,
  WalletCards,
} from "lucide-react";
import "../../marketing-nav.css";
import "./controle-vendas.css";
import "./sales-preview-demo.css";
import SalesPreviewDemo from "./SalesPreviewDemo";

export const metadata: Metadata = {
  title: "Controle de Vendas",
  description:
    "Centralize pedidos do site e vendas manuais, acompanhe vendas por período e saiba exatamente o que ainda tem para receber com a Flua Gestão.",
};

const resources = [
  {
    icon: MousePointerClick,
    title: "Pedidos do site entram sozinhos",
    text: "Quando o cliente compra pelo seu catálogo ou site, o pedido aparece na sua tela de vendas sem precisar copiar mensagem, nome, produto ou valor.",
  },
  {
    icon: Store,
    title: "Venda física? Lance na hora",
    text: "Fechou uma venda no balcão, telefone, Instagram ou WhatsApp? Crie um novo pedido manual e mantenha tudo no mesmo histórico.",
  },
  {
    icon: CalendarRange,
    title: "Veja o que vendeu em cada período",
    text: "Consulte suas vendas por data, acompanhe faturamento e enxergue com clareza como o negócio está performando.",
  },
  {
    icon: CircleDollarSign,
    title: "Saiba o que ainda tem para receber",
    text: "Acompanhe pagamentos, valores pendentes e pedidos que ainda precisam ser recebidos sem depender de planilha paralela.",
  },
];

const flow = [
  ["01", "O pedido chega", "Do site ou lançado manualmente pela sua equipe."],
  ["02", "A Flua organiza", "Cliente, itens, valor, entrega, pagamento e status ficam juntos."],
  ["03", "Sua operação acompanha", "Produção, retirada e entrega seguem o pedido sem retrabalho."],
  ["04", "Você enxerga o resultado", "Vendas realizadas, faturamento e valores a receber ficam claros."],
];

function Logo() {
  return (
    <Image
      src="/flua-logo.webp"
      alt="Flua Gestão"
      width={1200}
      height={676}
      priority
      className="cv-logo"
    />
  );
}

export default function ControleDeVendasPage() {
  return (
    <main className="cv-page">
      <section className="cv-hero">
        <header className="cv-header">
          <div className="cv-shell cv-nav marketing-nav-simple">
            <Link href="/" className="cv-brand" aria-label="Flua Gestão">
              <Logo />
            </Link>

            <nav className="cv-nav-links marketing-nav-simple-links" aria-label="Navegação principal">
              <Link href="/funcionalidades/controle-de-vendas">NOSSO SAAS</Link>
              <Link href="/#para-quem">A FLUA</Link>
              <Link href="/contato">CONTATO</Link>
              <Link href="/login">PORTAL</Link>
            </nav>
          </div>
        </header>

        <div className="cv-shell cv-hero-grid">
          <div className="cv-hero-copy">
            <span className="cv-kicker">CONTROLE DE VENDAS</span>
            <h1>Todos os seus pedidos. Uma única tela.</h1>
            <p className="cv-hero-lead">
              O cliente compra no site e o pedido já aparece na Flua. Vendeu no balcão, telefone, Instagram ou WhatsApp? Lance manualmente e mantenha tudo no mesmo lugar.
            </p>
            <div className="cv-hero-actions">
              <Link href="/cadastro" className="cv-btn cv-btn-light cv-btn-main">
                Testar controle de vendas <ArrowRight size={18} />
              </Link>
              <Link href="/" className="cv-text-link">Voltar para o início</Link>
            </div>
            <div className="cv-hero-points">
              <span><Check size={15} /> Pedidos automáticos do site</span>
              <span><Check size={15} /> Lançamento manual</span>
              <span><Check size={15} /> Vendas e recebimentos</span>
            </div>
          </div>

          <SalesPreviewDemo />
        </div>
      </section>

      <section className="cv-section cv-resources">
        <div className="cv-shell">
          <div className="cv-section-heading">
            <span className="cv-kicker cv-kicker-dark">MENOS LANÇAMENTO. MAIS CONTROLE.</span>
            <h2>A venda acontece onde o cliente estiver. O controle fica na Flua.</h2>
            <p>Seu negócio não vende por um canal só. A Flua organiza o que vem do site e o que você fecha pessoalmente sem separar sua operação em vários lugares.</p>
          </div>
          <div className="cv-resource-grid">
            {resources.map(({ icon: Icon, title, text }) => (
              <article key={title}>
                <div className="cv-resource-icon"><Icon size={22} /></div>
                <strong>{title}</strong>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cv-section cv-flow-section">
        <div className="cv-shell cv-flow-layout">
          <div className="cv-flow-copy">
            <span className="cv-kicker cv-kicker-dark">DO PEDIDO AO RESULTADO</span>
            <h2>Você não precisa lançar a mesma venda duas vezes.</h2>
            <p>
              O pedido entra no controle de vendas e passa a alimentar o restante da rotina. É daí que você acompanha produção, entrega e financeiro sem perder o histórico do cliente.
            </p>
            <div className="cv-integration-points">
              <span><ShoppingBag size={17} /> Pedido</span>
              <span><ClipboardList size={17} /> Produção</span>
              <span><Smartphone size={17} /> Cliente</span>
              <span><WalletCards size={17} /> Financeiro</span>
            </div>
          </div>
          <div className="cv-flow-list">
            {flow.map(([number, title, text]) => (
              <article key={number}>
                <span>{number}</span>
                <div><strong>{title}</strong><p>{text}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cv-section cv-money-section">
        <div className="cv-shell cv-money-card">
          <div className="cv-money-copy">
            <span className="cv-kicker">VENDAS E RECEBIMENTOS</span>
            <h2>Vendeu não é a mesma coisa que recebeu.</h2>
            <p>
              Acompanhe o que foi vendido no período e enxergue separadamente os valores que ainda estão pendentes. Assim você não confunde faturamento com dinheiro disponível.
            </p>
            <ul>
              <li><Check size={16} /> vendas realizadas por período</li>
              <li><Check size={16} /> valores já recebidos</li>
              <li><Check size={16} /> pagamentos ainda pendentes</li>
              <li><Check size={16} /> histórico centralizado por cliente</li>
            </ul>
          </div>

          <div className="cv-finance-preview">
            <div className="cv-finance-head"><span><BarChart3 size={18} /> Resumo de vendas</span><small>Agosto</small></div>
            <div className="cv-finance-values">
              <article><small>Vendas realizadas</small><strong>R$ 24.860,00</strong></article>
              <article><small>Recebido</small><strong>R$ 18.440,00</strong></article>
              <article className="pending"><small>A receber</small><strong>R$ 6.420,00</strong></article>
            </div>
            <div className="cv-chart">
              <div className="cv-chart-label"><span>01</span><span>05</span><span>10</span><span>15</span><span>20</span><span>25</span><span>30</span></div>
              <svg viewBox="0 0 520 130" role="img" aria-label="Evolução das vendas no mês">
                <path d="M6 109 C48 99,62 100,92 83 S139 85,168 67 S217 74,251 50 S305 70,342 43 S401 51,440 29 S487 32,514 14" />
              </svg>
            </div>
            <div className="cv-receivable"><ReceiptText size={18} /><div><strong>9 vendas aguardando recebimento</strong><span>Você sabe exatamente o que cobrar e de quem.</span></div></div>
          </div>
        </div>
      </section>

      <section className="cv-cta">
        <div className="cv-shell cv-cta-card">
          <div><span>FLUA GESTÃO</span><h2>Venda por qualquer canal. Controle tudo no mesmo lugar.</h2></div>
          <Link href="/cadastro" className="cv-btn cv-btn-light cv-btn-main">Começar teste grátis <ArrowRight size={18} /></Link>
        </div>
      </section>

      <footer className="cv-footer">
        <div className="cv-shell cv-footer-row">
          <Link href="/" className="cv-brand"><Logo /></Link>
          <p>Gestão simples para quem transforma cuidado em negócio.</p>
          <div><Link href="/login">Entrar</Link><Link href="/cadastro">Teste grátis</Link></div>
        </div>
      </footer>
    </main>
  );
}
