import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CircleHelp,
  Headphones,
  Mail,
  MessageCircle,
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

        <div className="contact-shell contact-layout">
          <div className="contact-intro">
            <span className="contact-kicker">FALE COM A FLUA</span>
            <h1 id="contact-title">Entre em contato com a Flua</h1>
            <p>
              Nossa equipe está pronta para ajudar você, seja para tirar dúvidas
              sobre a plataforma, receber suporte ou conhecer melhor como a Flua
              pode organizar seu negócio.
            </p>

            <div className="contact-tags" aria-label="Diferenciais do atendimento">
              <span>Suporte rápido</span>
              <span>Atendimento humano</span>
              <span>Especialistas em cestas e encomendas</span>
            </div>
          </div>

          <div className="contact-service-card">
            <div className="contact-service-grid">
              <article className="contact-service-block">
                <span className="contact-icon" aria-hidden="true">
                  <CircleHelp size={22} />
                </span>
                <h2>Central de Ajuda</h2>
                <p>
                  Precisa de orientação para utilizar a plataforma? Fale com
                  nossa equipe e encontre o caminho certo para resolver sua
                  dúvida.
                </p>
                <a className="contact-button contact-button-soft" href={emailAjuda}>
                  Solicitar ajuda
                  <ArrowRight size={17} aria-hidden="true" />
                </a>
              </article>

              <article className="contact-service-block contact-support-block">
                <span className="contact-icon" aria-hidden="true">
                  <Headphones size={22} />
                </span>
                <h2>Suporte ao Cliente</h2>
                <p>
                  Já utiliza a Flua e precisa de ajuda rápida? Entre em contato
                  pelo WhatsApp ou envie um e-mail para nossa equipe de suporte.
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
                  className="contact-button contact-button-primary"
                  href={whatsappSuporte}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Falar com o suporte
                  <MessageCircle size={17} aria-hidden="true" />
                </a>
              </article>
            </div>

            <div className="contact-commercial">
              <div>
                <span>COMERCIAL</span>
                <h2>Ainda não é cliente?</h2>
                <p>
                  Conheça a Flua e veja como podemos organizar seus pedidos,
                  clientes, produção, pagamentos e entregas em um só lugar.
                </p>
              </div>

              <div className="contact-commercial-actions">
                <Link className="contact-button contact-button-outline" href="/como-funciona">
                  Conhecer a Flua
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
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
