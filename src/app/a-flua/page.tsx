import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Boxes,
  CalendarDays,
  Check,
  ClipboardCheck,
  HeartHandshake,
  Laptop,
  LockKeyhole,
  MessageCircleMore,
  Sparkles,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import "./a-flua.css";

export const metadata: Metadata = {
  title: { absolute: "A Flua | Nossa história, propósito e visão" },
  description:
    "Conheça a Flua, plataforma de gestão criada para organizar e profissionalizar negócios de cestas artesanais, tábuas de frios, presentes e produtos sob encomenda.",
};

const segmentos = [
  ["01", "Cestas artesanais", "Café da manhã, cestas românticas, maternidade, aniversário e datas comemorativas.", "/cesta-artesanal.png"],
  ["02", "Tábuas de frios", "Produção personalizada, controle de insumos, montagem, retirada e entrega.", "/tabua-de-frios.png"],
  ["03", "Presentes e kits", "Caixas, lembranças, combos, presentes personalizados e produtos sob encomenda.", "/presentes-e-kits.png"],
  ["04", "Negócios em crescimento", "Empreendedoras que começaram em casa e agora precisam organizar equipe, produção, estoque e financeiro.", "/mulher-chef.png"],
] as const;

const diferenciais = [
  [ClipboardCheck, "Especializada", "Processos desenvolvidos para negócios que trabalham por encomenda."],
  [Sparkles, "Simples de usar", "Informações claras e uma rotina que não exige conhecimento técnico."],
  [TrendingUp, "Preparada para crescer", "Serve para quem trabalha sozinho e acompanha a evolução até uma operação com equipe."],
  [HeartHandshake, "Próxima de verdade", "Tecnologia acompanhada por suporte humano e atenção às necessidades do cliente."],
] as const;

const antes = ["Pedidos espalhados no WhatsApp", "Datas anotadas no caderno", "Informações divididas em planilhas", "Risco de esquecer entregas", "Falta de clareza sobre o dinheiro", "Operação dependendo da memória"];
const depois = ["Pedidos centralizados", "Prazos acompanhados", "Clientes organizados", "Produção e entregas planejadas", "Financeiro mais claro", "Dados para tomar decisões"];

export default function AFluaPage() {
  return (
    <main className="af-page">
      <section className="af-hero">
        <div className="af-orb af-orb-one" /><div className="af-orb af-orb-two" />
        <div className="af-shell af-hero-grid">
          <div className="af-hero-copy">
            <span className="af-kicker"><Sparkles size={15} /> CONHEÇA A FLUA</span>
            <h1>Por trás de uma empresa organizada, <em>existe uma história que aprendeu a fluir.</em></h1>
            <p>A Flua é uma plataforma de gestão criada para transformar negócios feitos com talento, cuidado e dedicação em empresas organizadas, profissionais e preparadas para crescer.</p>
            <div className="af-actions">
              <a href="#por-que-nascemos" className="af-btn af-btn-primary">Conhecer nossa história <ArrowDown size={18} /></a>
              <Link href="/cadastro" className="af-btn af-btn-ghost">Começar teste grátis <ArrowRight size={18} /></Link>
            </div>
            <div className="af-trust"><span><Check size={15} /> Feita para pequenos negócios</span><span><Check size={15} /> Criada para acompanhar seu crescimento</span><span><Check size={15} /> Tecnologia com suporte humano</span></div>
          </div>
          <div className="af-hero-visual" aria-label="Empreendedora organizando um negócio artesanal com a Flua">
            <div className="af-photo"><Image src="/mulher-chef-macbook.png" alt="Empreendedora preparando produtos artesanais e organizando pedidos" fill priority sizes="(max-width: 900px) 92vw, 650px" /></div>
            <div className="af-float af-float-one"><ClipboardCheck size={20} /><span><small>Venda</small><strong>Pedido organizado</strong></span></div>
            <div className="af-float af-float-two"><CalendarDays size={20} /><span><small>Agenda</small><strong>Entrega programada</strong></span></div>
            <div className="af-float af-float-three"><TrendingUp size={20} /><span><small>Evolução</small><strong>Negócio crescendo</strong></span></div>
          </div>
        </div>
      </section>

      <section className="af-section af-manifesto">
        <div className="af-shell">
          <span className="af-section-kicker">O QUE É A FLUA</span>
          <h2>Mais do que um sistema. Uma estrutura para o seu negócio crescer.</h2>
          <div className="af-two-text"><p>A Flua é uma plataforma de gestão desenvolvida para quem trabalha com cestas artesanais, cafés da manhã, tábuas de frios, presentes, kits e produtos sob encomenda.</p><p>Ela reúne pedidos, clientes, produção, estoque, entregas e financeiro em um único lugar, substituindo o improviso por uma rotina organizada e profissional.</p></div>
          <blockquote>“Seu talento criou o negócio. A Flua ajuda você a transformá-lo em empresa.”</blockquote>
        </div>
      </section>

      <section id="por-que-nascemos" className="af-section af-origin">
        <div className="af-shell af-origin-grid">
          <div><span className="af-section-kicker">POR QUE NASCEMOS</span><h2>Porque crescer sem organização transforma um sonho em sobrecarga.</h2><p>Muitos negócios começam dentro de casa, com talento, coragem e os primeiros pedidos chegando pelo WhatsApp. Mas, conforme as vendas aumentam, também aumentam as mensagens, os prazos, as entregas, os materiais e as contas para controlar.</p><p>A Flua nasceu para colocar ordem nessa rotina sem tirar a essência artesanal do negócio. Para que a empreendedora possa produzir com carinho, atender bem e crescer com segurança, sem depender apenas da memória, de cadernos ou de várias planilhas.</p></div>
          <div className="af-problem-map">
            <div><MessageCircleMore size={19} /> Pedidos perdidos em conversas</div><div><CalendarDays size={19} /> Datas em diferentes lugares</div><div><WalletCards size={19} /> Financeiro controlado de cabeça</div><div><Boxes size={19} /> Produção dependendo da memória</div>
            <strong><Sparkles size={20} /> Tudo organizado na Flua.</strong>
          </div>
        </div>
      </section>

      <section className="af-section af-audience">
        <div className="af-shell"><div className="af-heading"><span className="af-section-kicker">FEITA PARA QUEM ENCANTA</span><h2>Para negócios que transformam cuidado em produto.</h2></div>
          <div className="af-segment-grid">{segmentos.map(([n,t,d,img]) => <article key={n} style={{backgroundImage:`linear-gradient(180deg,rgba(35,15,12,.02),rgba(35,15,12,.84)),url("${img}")`}}><span>{n}</span><h3>{t}</h3><p>{d}</p></article>)}</div>
        </div>
      </section>

      <section className="af-section af-purpose">
        <div className="af-shell"><div className="af-purpose-intro"><span className="af-section-kicker">NOSSO PROPÓSITO</span><h2>Uma marca com os pés na rotina e os olhos no futuro.</h2></div>
          <div className="af-purpose-list">
            <article><span>01</span><div><small>NOSSA MISSÃO</small><h3>Dar estrutura de empresa para quem começou com talento, dedicação e coragem.</h3><p>Simplificar a gestão para que pequenos negócios possam crescer com organização, segurança e liberdade.</p></div></article>
            <article><span>02</span><div><small>NOSSA VISÃO</small><h3>Ser o principal ecossistema de gestão e vendas para negócios de cestas, presentes, tábuas e produtos sob encomenda no Brasil.</h3><p>Construir uma plataforma que acompanhe toda a jornada, desde o primeiro pedido feito em casa até uma empresa com equipe, produção e operação profissional.</p></div></article>
            <article><span>03</span><div><small>NOSSA ESSÊNCIA</small><h3>Tecnologia simples, próxima e feita para a realidade de quem empreende.</h3><p>A Flua deve tornar a rotina mais leve, sem complicar aquilo que nasceu para facilitar.</p></div></article>
          </div>
        </div>
      </section>

      <section className="af-section af-change">
        <div className="af-shell"><div className="af-heading"><span className="af-section-kicker">UMA NOVA ROTINA</span><h2>Do improviso para uma empresa preparada para crescer.</h2></div>
          <div className="af-change-grid"><article className="af-before"><small>ANTES DA FLUA</small><h3>Seu negócio espalhado.</h3>{antes.map(x=><p key={x}><span>—</span>{x}</p>)}</article><div className="af-bridge"><ArrowRight size={25}/></div><article className="af-after"><small>COM A FLUA</small><h3>Uma rotina que flui.</h3>{depois.map(x=><p key={x}><Check size={17}/>{x}</p>)}</article></div>
        </div>
      </section>

      <section className="af-section af-difference">
        <div className="af-shell"><div className="af-heading af-heading-light"><span className="af-section-kicker">NOSSO JEITO DE FAZER</span><h2>Não é um sistema genérico tentando entender sua rotina.</h2><p>A Flua foi pensada a partir da realidade de quem vende produtos personalizados e trabalha com encomendas, produção, datas especiais, retiradas e entregas.</p></div>
          <div className="af-difference-grid">{diferenciais.map(([Icon,t,d],i)=><article key={t}><span>0{i+1}</span><Icon size={24}/><h3>{t}</h3><p>{d}</p></article>)}</div>
        </div>
      </section>

      <section className="af-section af-journey">
        <div className="af-shell"><div className="af-heading"><span className="af-section-kicker">CRESCEMOS COM VOCÊ</span><h2>A mesma Flua em todas as fases do seu negócio.</h2></div>
          <div className="af-journey-line"><article><span>01</span><small>COMEÇANDO EM CASA</small><h3>Os primeiros pedidos sob controle.</h3><p>Organize os primeiros pedidos, clientes, datas, produtos e recebimentos.</p></article><article><span>02</span><small>GANHANDO MOVIMENTO</small><h3>A rotina ganha ritmo.</h3><p>Controle um volume maior de pedidos, produção, estoque, retiradas e entregas.</p></article><article><span>03</span><small>EMPRESA ESTRUTURADA</small><h3>Crescimento com base sólida.</h3><p>Gerencie equipe, processos, resultados e uma operação profissional sem trocar de sistema.</p></article></div>
        </div>
      </section>

      <section className="af-section af-trust-section">
        <div className="af-shell af-trust-grid"><div className="af-trust-photo"><Image src="/mulher-chef.png" alt="Empreendedora utilizando tecnologia para organizar seu negócio" fill sizes="(max-width: 900px) 92vw, 560px" /></div><div><span className="af-section-kicker">TECNOLOGIA COM CONFIANÇA</span><h2>Seu negócio organizado, seus dados protegidos e você acompanhada.</h2><div className="af-pillars"><article><LockKeyhole/><div><h3>Segurança e privacidade</h3><p>Informações armazenadas com proteção e acesso controlado.</p></div></article><article><Laptop/><div><h3>Acesso de onde estiver</h3><p>Utilize a Flua no computador, notebook, tablet ou celular.</p></div></article><article><Users/><div><h3>Suporte humano</h3><p>Atendimento próximo para ajudar durante a utilização do sistema.</p></div></article></div></div></div>
      </section>

      <section className="af-section af-future"><div className="af-orb af-orb-three"/><div className="af-shell af-future-copy"><span className="af-section-kicker">O FUTURO QUE QUEREMOS CONSTRUIR</span><h2>Pequenos negócios mais fortes, organizados e valorizados.</h2><p>A Flua acredita que um negócio não precisa perder sua essência artesanal para se tornar profissional. Nosso futuro é construir um ecossistema capaz de apoiar cada etapa dessa evolução: da organização da rotina às vendas, do atendimento à tomada de decisões.</p><strong>O cuidado continua artesanal. A gestão passa a estar preparada para o futuro.</strong></div></section>

      <section className="af-final"><div className="af-shell af-final-box"><div><span className="af-section-kicker">SUA PRÓXIMA FASE COMEÇA ORGANIZADA</span><h2>Seu talento já criou o negócio. Agora deixe a Flua ajudar você a construir a empresa.</h2><p>Centralize sua rotina, organize seus processos e prepare seu negócio para crescer.</p></div><div className="af-final-actions"><Link href="/cadastro" className="af-btn af-btn-primary">Começar teste grátis <ArrowRight size={18}/></Link><Link href="/nosso-saas" className="af-btn af-btn-outline">Conhecer o sistema</Link></div></div></section>

      <footer className="af-footer"><div className="af-shell af-footer-grid"><div><Image src="/logotipo-flua-branco-sem-fundo.png" alt="Flua Gestão" width={150} height={50}/><p>Gestão simples para quem transforma cuidado em negócio.</p></div><nav aria-label="Navegação do rodapé"><Link href="/nosso-saas">Nosso SaaS</Link><Link href="/a-flua">A Flua</Link><Link href="/catalogo">Minha Loja</Link><Link href="/documentos">Documentos</Link><Link href="/login">Portal</Link></nav></div><div className="af-shell af-footer-bottom"><span>© 2026 Flua Gestão. Todos os direitos reservados.</span><span>Feito para quem encanta.</span></div></footer>
    </main>
  );
}
