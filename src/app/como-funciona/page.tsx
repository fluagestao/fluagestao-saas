import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  Check,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  Factory,
  ListChecks,
  MessageCircleMore,
  PackageOpen,
  Search,
  ShoppingBag,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import "./como-funciona.css";

export const metadata: Metadata = {
  title: { absolute: "Como funciona a Flua | Gestão de pedidos, produção e entregas" },
  description:
    "Veja como a Flua organiza pedidos, clientes, produtos, produção, entregas, financeiro e follow-up para negócios de cestas, presentes e tábuas de frios.",
  openGraph: {
    title: "Como funciona a Flua | Gestão de pedidos, produção e entregas",
    description:
      "Conheça o fluxo completo da Flua, do primeiro pedido à entrega e ao relacionamento com o cliente.",
    images: [{ url: "/og-flua.png", width: 1200, height: 630, alt: "Painel da Flua Gestão" }],
  },
};

const fluxo = [
  [ShoppingBag, "Pedido", "Cliente, produtos, valores, entrega e pagamento reunidos."],
  [Factory, "Produção", "Visualize com clareza tudo o que precisa ser preparado."],
  [CalendarCheck, "Entrega", "Organize data, horário, endereço e destinatário."],
  [CircleDollarSign, "Recebimento", "Acompanhe valores e formas de pagamento."],
  [MessageCircleMore, "Avaliação", "Continue o relacionamento depois da entrega."],
] as const;

const secoes = [
  ["#visao-geral", "Visão geral"], ["#pedidos", "Pedidos"], ["#cadastro-rapido", "Cadastro rápido"],
  ["#produtos", "Produtos e insumos"], ["#producao", "Produção e entregas"], ["#clientes", "Clientes"],
  ["#financeiro", "Financeiro"], ["#follow-up", "Follow-up"], ["#tarefas", "Tarefas"], ["#comecar", "Como começar"],
] as const;

const pedidoPassos = [
  "Escolha ou cadastre o cliente.", "Adicione produtos do catálogo.", "Cadastre um produto durante o pedido, se necessário.",
  "Informe entrega ou retirada.", "Preencha cartão e observações.", "Escolha pagamento e status.", "Lance o pedido.",
];

const faqs = [
  ["Preciso instalar alguma coisa?", "Não. A Flua funciona online pelo navegador."],
  ["A Flua funciona no celular?", "Sim. Você pode acessar pelo computador, tablet ou celular."],
  ["Preciso cadastrar tudo antes do primeiro pedido?", "Não. Cliente, produto e categoria podem ser cadastrados durante o próprio pedido."],
  ["Como funciona o teste grátis?", "Você pode experimentar a Flua durante sete dias e conhecer o fluxo real da operação."],
  ["Meus dados ficam protegidos?", "A plataforma utiliza acesso autenticado e mantém as informações separadas por empresa."],
  ["Consigo falar com o suporte?", "Sim. A Flua mantém atendimento humano para ajudar durante o uso do sistema."],
  ["A Flua serve para quem trabalha sozinho?", "Sim. Ela acompanha desde os primeiros pedidos até uma operação com equipe."],
  ["Os cadastros feitos no teste continuam disponíveis?", "Sim. Produtos, clientes e pedidos criados ficam vinculados à sua empresa."],
];

export default function ComoFuncionaPage() {
  return (
    <main className="cf-page">
      <section className="cf-hero">
        <div className="cf-shell cf-hero-grid">
          <div className="cf-hero-copy">
            <span className="cf-kicker"><Sparkles size={15} /> COMO FUNCIONA</span>
            <h1>Veja como a Flua organiza seu negócio <em>do pedido à entrega.</em></h1>
            <p>Pedidos, clientes, produtos, produção, entregas e financeiro trabalhando juntos para deixar sua rotina mais simples.</p>
            <div className="cf-actions">
              <Link href="/cadastro" className="cf-btn cf-btn-light">Começar teste grátis <ArrowRight size={18} /></Link>
              <a href="#fluxo" className="cf-btn cf-btn-ghost">Ver o fluxo completo</a>
            </div>
          </div>
          <div className="cf-hero-screen">
            <Image src="/jornada-flua.svg" alt="A Jornada na Flua, da configuração da empresa ao pedido finalizado" fill priority sizes="(max-width: 900px) 94vw, 760px" />
          </div>
        </div>
      </section>

      <section id="fluxo" className="cf-section cf-flow">
        <div className="cf-shell">
          <div className="cf-heading"><span className="cf-kicker">DO COMEÇO AO FIM</span><h2>Uma venda organizada em todas as etapas.</h2></div>
          <div className="cf-flow-grid">{fluxo.map(([Icon, title, text], i) => <article key={title}><span>{String(i + 1).padStart(2, "0")}</span><Icon size={25}/><h3>{title}</h3><p>{text}</p></article>)}</div>
        </div>
      </section>

      <nav className="cf-index" aria-label="Funcionalidades da Flua"><div className="cf-shell">{secoes.map(([href, label]) => <a href={href} key={href}>{label}</a>)}</div></nav>

      <section id="visao-geral" className="cf-section cf-overview">
        <div className="cf-shell cf-split">
          <div><span className="cf-kicker">VISÃO GERAL</span><h2>Tudo o que importa logo na entrada.</h2><p>O painel reúne faturamento, pedidos em aberto, entregas do dia, ticket médio, tarefas e próximos compromissos. Você abre a Flua e já sabe onde precisa agir.</p>
            <ul className="cf-checks"><li><Check/>Faturamento e ticket médio</li><li><Check/>Pedidos e entregas do dia</li><li><Check/>Tarefas e próximos compromissos</li><li><Check/>Resumo financeiro da operação</li></ul>
          </div>
          <div className="cf-dashboard"><Image src="/mockup vendas.png" alt="Dashboard e pedidos organizados na Flua" fill sizes="(max-width: 900px) 94vw, 700px" /></div>
        </div>
      </section>

      <section id="pedidos" className="cf-section cf-orders">
        <div className="cf-shell"><div className="cf-heading"><span className="cf-kicker">VENDAS E PEDIDOS</span><h2>Registre uma venda em poucos minutos.</h2><p>O pedido concentra todas as informações necessárias para vender, produzir, entregar e receber sem depender de conversas espalhadas.</p></div>
          <div className="cf-steps">{pedidoPassos.map((item, i)=><article key={item}><span>{i+1}</span><p>{item}</p></article>)}</div>
          <div className="cf-feature-strip"><span>Lista ou quadro</span><span>Filtros por status</span><span>Pesquisa por cliente</span><span>Ficha do pedido</span><span>Contato por WhatsApp</span><span>Atualização do andamento</span></div>
        </div>
      </section>

      <section id="cadastro-rapido" className="cf-section cf-quick">
        <div className="cf-shell"><div className="cf-heading"><span className="cf-kicker">SEM SAIR DA VENDA</span><h2>Cadastre o necessário sem abandonar o pedido.</h2></div>
          <div className="cf-search-flow"><span><Search/>Pesquisar</span><ArrowRight/><span>Não encontrou?</span><ArrowRight/><strong>+</strong><ArrowRight/><span>Cadastrar</span><ArrowRight/><span>Salvar e continuar</span></div>
          <div className="cf-card-grid"><article><UserRound/><h3>Cliente</h3><p>Nome e WhatsApp cadastrados dentro do pedido.</p></article><article><ShoppingBag/><h3>Produto</h3><p>Nome, categoria, preço e informações principais.</p></article><article><ListChecks/><h3>Categoria</h3><p>Uma nova categoria criada diretamente pelo campo.</p></article><article><PackageOpen/><h3>Insumo</h3><p>Nome, unidade e custo adicionados à ficha técnica.</p></article></div>
          <blockquote>A Flua não obriga você a configurar o sistema inteiro antes de começar a vender.</blockquote>
        </div>
      </section>

      <section id="produtos" className="cf-section cf-products"><div className="cf-shell cf-split">
        <div><span className="cf-kicker">CUSTOS E MARGEM</span><h2>Saiba quanto cada produto realmente custa.</h2><p>Organize produtos, categorias, insumos e ficha técnica. A composição mostra custo, preço de venda, lucro estimado e margem.</p></div>
        <div className="cf-recipe"><div><span>Produto</span><strong>Cesta Café Especial</strong></div><table><thead><tr><th>Insumo</th><th>Un.</th><th>Qtd.</th></tr></thead><tbody><tr><td>Caixa</td><td>un</td><td>1</td></tr><tr><td>Caneca</td><td>un</td><td>1</td></tr><tr><td>Chocolate</td><td>un</td><td>3</td></tr><tr><td>Laço</td><td>metro</td><td>0,50</td></tr></tbody></table><div className="cf-recipe-summary"><span>Preço de venda</span><span>Custo</span><span>Lucro estimado</span><span>Margem</span></div></div>
      </div></section>

      <section id="producao" className="cf-section cf-operation"><div className="cf-shell"><div className="cf-heading"><span className="cf-kicker">ROTINA ORGANIZADA</span><h2>Saiba o que produzir, quando entregar e para quem.</h2></div>
        <div className="cf-operation-grid"><article><ClipboardCheck/><h3>Produção</h3><p>Acompanhe pedidos novos, em produção, prontos, entregues ou cancelados.</p></article><article><CalendarCheck/><h3>Entrega ou retirada</h3><p>Data, horário, endereço, destinatário e ponto de referência no mesmo lugar.</p></article><article><PackageOpen/><h3>Ficha completa</h3><p>Itens, cartão, observações e informações prontas para consulta e impressão.</p></article></div>
      </div></section>

      <section id="clientes" className="cf-section cf-clients"><div className="cf-shell cf-split"><div><span className="cf-kicker">RELACIONAMENTO</span><h2>O histórico de cada cliente em um só lugar.</h2><p>A base de clientes cresce naturalmente conforme os pedidos são registrados. Consulte contatos, compras anteriores e fale pelo WhatsApp.</p></div><div className="cf-profile"><Users/><div><small>CLIENTE</small><h3>Informação pronta para atender bem.</h3><p>Nome e WhatsApp</p><p>Pedidos anteriores</p><p>Produtos comprados</p><p>Histórico do relacionamento</p></div></div></div></section>

      <section id="financeiro" className="cf-section cf-finance"><div className="cf-shell"><div className="cf-heading"><span className="cf-kicker">CLAREZA SOBRE O DINHEIRO</span><h2>Venda sabendo o que entrou e o que falta receber.</h2></div><div className="cf-metrics"><article><CircleDollarSign/><span>Faturamento</span></article><article><BarChart3/><span>Ticket médio</span></article><article><ClipboardCheck/><span>Valores a receber</span></article><article><PackageOpen/><span>Custos dos produtos</span></article></div><p className="cf-note">Acompanhe formas de pagamento, taxas de entrega e o resultado da operação sem depender de contas feitas de cabeça.</p></div></section>

      <section id="follow-up" className="cf-section cf-follow"><div className="cf-shell cf-split"><div><span className="cf-kicker">DEPOIS DA ENTREGA</span><h2>A venda terminou. O relacionamento continua.</h2><p>Veja clientes aguardando contato, pedidos já entregues e convites de avaliação enviados. Pesquise, fale pelo WhatsApp e marque o acompanhamento como concluído.</p></div><div className="cf-follow-card"><MessageCircleMore/><div><small>FOLLOW-UP</small><strong>Pedir avaliação</strong><span>Contato no momento certo, sem esquecer ninguém.</span></div></div></div></section>

      <section id="tarefas" className="cf-section cf-tasks"><div className="cf-shell"><div className="cf-heading"><span className="cf-kicker">NADA DEPENDE DA MEMÓRIA</span><h2>Organize pendências, prazos e compromissos.</h2></div><div className="cf-task-list"><p><Check/>Criação de tarefas</p><p><Check/>Definição de prazos</p><p><Check/>Pendências do dia</p><p><Check/>Entregas futuras</p><p><Check/>Atividades concluídas</p></div></div></section>

      <section id="comecar" className="cf-section cf-start"><div className="cf-shell"><div className="cf-heading"><span className="cf-kicker">PRIMEIROS PASSOS</span><h2>Você não precisa configurar tudo antes de começar.</h2></div><div className="cf-start-grid"><article><span>01</span><h3>Crie sua conta</h3><p>Comece o teste grátis e informe os dados principais.</p></article><article><span>02</span><h3>Faça o primeiro pedido</h3><p>Cadastre cliente e produto durante a própria venda.</p></article><article><span>03</span><h3>Construa sua base</h3><p>A cada pedido, seu histórico fica mais completo.</p></article></div><blockquote>Entre, faça um pedido e deixe a Flua organizar o restante junto com você.</blockquote></div></section>

      <section className="cf-section cf-faq"><div className="cf-shell"><div className="cf-heading"><span className="cf-kicker">DÚVIDAS FREQUENTES</span><h2>Antes de começar, saiba o essencial.</h2></div><div className="cf-faq-list">{faqs.map(([q,a])=><details key={q}><summary>{q}<ChevronDown aria-hidden="true"/></summary><p>{a}</p></details>)}</div></div></section>

      <section className="cf-final"><div className="cf-shell cf-final-box"><div><span className="cf-kicker">SUA PRÓXIMA VENDA</span><h2>Sua próxima venda já pode ser mais organizada.</h2><p>Experimente a Flua durante sete dias e faça seu primeiro pedido sem configurar o sistema inteiro.</p></div><div className="cf-final-actions"><Link href="/cadastro" className="cf-btn cf-btn-light">Começar teste grátis <ArrowRight/></Link><Link href="/login" className="cf-btn cf-btn-ghost">Entrar</Link></div></div></section>

      <footer className="cf-footer"><div className="cf-shell cf-footer-main"><div><Image src="/logotipo-flua-branco-sem-fundo.png" alt="Flua Gestão" width={150} height={50}/><p>Gestão simples para quem transforma cuidado em negócio.</p></div><nav aria-label="Navegação do rodapé"><Link href="/nosso-saas">Nosso SaaS</Link><Link href="/a-flua">A Flua</Link><Link href="/como-funciona">Como Funciona</Link><Link href="/catalogo">Minha Loja</Link><Link href="/documentos">Documentos</Link><Link href="/login">Entrar</Link></nav></div><div className="cf-shell cf-footer-bottom"><span>© 2026 Flua Gestão. Todos os direitos reservados.</span><span>Feito para quem encanta.</span></div></footer>
    </main>
  );
}
