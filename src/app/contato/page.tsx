import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Headphones,
  Mail,
  MessageCircle,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

import { CookieSettingsButton } from "@/app/documentos/CookieSettingsButton";
import "./contato.css";

export const metadata: Metadata = {
  title: "Contato e Suporte",
  description:
    "Entre em contato com a Flua Gestão para tirar dúvidas, solicitar suporte ou conhecer o sistema de gestão para cestas, presentes e encomendas.",
};

const emailAjuda =
  "mailto:suporte@fluagestao.com.br?subject=Ajuda%20com%20a%20plataforma%20Flua&body=Ol%C3%A1%2C%20equipe%20Flua.%20Preciso%20de%20ajuda%20com%3A%0A";
const whatsappSuporte =
  "https://wa.me/5548996349230?text=Sou%20Cliente%20e%20necessito%20de%20ajuda";

export default function ContatoPage() {
  return (
    <main className="contact-page">
      <section className="contact-hero" aria-labelledby="contact-title">
        <div className="contact-decoration contact-decoration-one" aria-hidden="true" />
        <div className="contact-decoration contact-decoration-two" aria-hidden="true" />
        {/* A cesta entra como CAMADA de fundo, não como <img> dentro de um
            card: ela é cenário, não conteúdo. Por isso aria-hidden e sem alt —
            quem usa leitor de tela não ganha nada sendo informado de uma
            textura. O recorte e o esmaecimento ficam no CSS, que sabe a
            largura da tela; aqui só existe o lugar dela. */}
        <div className="contact-basket" aria-hidden="true" />

        <div className="contact-shell contact-layout">
          <div className="contact-intro">
            <span className="contact-kicker">FALE COM A FLUA</span>
            <h1 id="contact-title">
              Estamos
              <br />
              aqui por você
            </h1>
            <p>
              Nossa equipe está pronta para ajudar você, seja para tirar dúvidas
              sobre a plataforma, receber suporte ou descobrir como a Flua pode
              organizar o seu negócio.
            </p>

            {/* Eram três pastilhas, todas do mesmo tamanho e sem hierarquia:
                liam como etiquetas de filtro, não como o que a Flua entrega.
                Ícone + título + uma linha dá peso ao que importa e espaço para
                respirar. */}
            <ul className="contact-highlights">
              <li>
                <span className="contact-highlight-icon" aria-hidden="true">
                  <Zap size={17} />
                </span>
                <div>
                  <strong>Suporte rápido</strong>
                  <span>Atendimento ágil e eficiente</span>
                </div>
              </li>
              <li>
                <span className="contact-highlight-icon" aria-hidden="true">
                  <Users size={17} />
                </span>
                <div>
                  <strong>Atendimento humano</strong>
                  <span>Fale com quem entende do seu dia a dia</span>
                </div>
              </li>
              <li>
                <span className="contact-highlight-icon" aria-hidden="true">
                  <Sparkles size={17} />
                </span>
                <div>
                  <strong>Especialistas em cestas e encomendas</strong>
                  <span>Suporte de quem vive o seu negócio</span>
                </div>
              </li>
            </ul>

            <p className="contact-nota">negócios mais leves acontecem aqui —</p>
          </div>

          <div className="contact-service-card">
            <div className="contact-service-grid">
              <article className="contact-service-block">
                <span className="contact-icon" aria-hidden="true">
                  <BookOpen size={22} />
                </span>
                <h2>Central de Ajuda</h2>
                <p>
                  Precisa de orientação para utilizar a plataforma? Explore
                  nossos artigos, tutoriais e guias e encontre o caminho certo
                  para resolver sua dúvida.
                </p>
                <a className="contact-button contact-button-soft" href={emailAjuda}>
                  Acessar central de ajuda
                  <ArrowRight size={17} aria-hidden="true" />
                </a>
                <p className="contact-nota contact-nota-card">respostas sempre à mão</p>
              </article>

              <article className="contact-service-block contact-support-block">
                <span className="contact-icon" aria-hidden="true">
                  <Headphones size={22} />
                </span>
                <h2>Fale com o Suporte</h2>
                <p>
                  Não encontrou o que precisava? Entre em contato com a nossa
                  equipe pelo WhatsApp ou envie um e-mail. Vamos te ajudar o
                  quanto antes!
                </p>

                <address className="contact-details">
                  <a
                    href={whatsappSuporte}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle size={17} aria-hidden="true" />
                    (48) 99634-9230
                  </a>
                  <a href="mailto:suporte@fluagestao.com.br">
                    <Mail size={17} aria-hidden="true" />
                    suporte@fluagestao.com.br
                  </a>
                </address>

                <a
                  className="contact-button contact-button-whats"
                  href={whatsappSuporte}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Conversar no WhatsApp
                  <ArrowRight size={17} aria-hidden="true" />
                </a>

                <p className="contact-status">
                  <span aria-hidden="true" />
                  Atendimento em horário comercial
                </p>
              </article>
            </div>

            <div className="contact-commercial">
              {/* O título vem primeiro: era o ícone que ocupava o topo, e a
                  pergunta — que é o que faz alguém parar e ler — aparecia
                  abaixo dele. O ícone fecha o bloco como enfeite, que é o
                  papel que ele tem aqui. */}
              <div>
                <h2>Ainda não é cliente?</h2>
                <p>
                  Conheça a Flua e veja como podemos organizar seus pedidos,
                  clientes, produção, pagamentos e entregas em um só lugar.
                </p>
                <span className="contact-comercial-icone" aria-hidden="true">
                  <Sparkles size={20} />
                </span>
              </div>

              <div className="contact-commercial-actions">
                <Link className="contact-trial-link" href="/cadastro">
                  Começar teste grátis
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="contact-footer">
        <div className="contact-shell contact-footer-inner">
          <p>© 2026 Flua Gestão. Todos os direitos reservados.</p>
          <nav aria-label="Links legais e de atendimento">
            <Link href="/documentos/termos-de-uso">Termos de Uso</Link>
            <Link href="/documentos/termos-de-uso/privacidade">Privacidade</Link>
            <Link href="/documentos/termos-de-uso/cookies">Cookies</Link>
            <Link href="/documentos/termos-de-uso/seguranca">Segurança</Link>
            <Link href="/contato">Contato</Link>
            <CookieSettingsButton />
          </nav>
        </div>
      </footer>
    </main>
  );
}
