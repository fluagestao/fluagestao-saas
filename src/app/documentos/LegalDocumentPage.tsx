import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

type LegalDocumentPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  updatedAt: string;
  sections: LegalSection[];
};

export default function LegalDocumentPage({
  eyebrow,
  title,
  description,
  updatedAt,
  sections,
}: LegalDocumentPageProps) {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <div className="legal-shell legal-header-inner">
          <Link href="/" className="legal-brand" aria-label="Voltar para a Flua">
            <Image
              src="/logotipo-flua-branco-sem-fundo.png"
              alt="Flua Gestão"
              width={150}
              height={64}
              priority
            />
          </Link>

          <nav className="legal-header-nav" aria-label="Documentos">
            <Link href="/documentos">Documentos</Link>
            <Link href="/cadastro" className="legal-header-cta">
              Teste grátis
            </Link>
          </nav>
        </div>
      </header>

      <section className="legal-hero">
        <div className="legal-shell legal-hero-grid">
          <div>
            <Link href="/documentos" className="legal-back">
              <ArrowLeft size={15} />
              Todos os documentos
            </Link>

            <span className="legal-eyebrow">{eyebrow}</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>

          <aside className="legal-meta-card">
            <span>ÚLTIMA ATUALIZAÇÃO</span>
            <strong>{updatedAt}</strong>
            <p>
              Este documento integra as regras e compromissos aplicáveis ao uso
              da plataforma Flua Gestão.
            </p>
          </aside>
        </div>
      </section>

      <section className="legal-content-section">
        <div className="legal-shell legal-content-grid">
          <aside className="legal-index">
            <span>NESTE DOCUMENTO</span>
            <nav>
              {sections.map((section, index) => (
                <a key={section.title} href={`#secao-${index + 1}`}>
                  <b>{String(index + 1).padStart(2, "0")}</b>
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>

          <article className="legal-article">
            {sections.map((section, index) => (
              <section key={section.title} id={`secao-${index + 1}`}>
                <div className="legal-section-number">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <h2>{section.title}</h2>

                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}

                {section.bullets && (
                  <ul>
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            <div className="legal-contact-box">
              <div>
                <span>FICOU COM ALGUMA DÚVIDA?</span>
                <strong>Fale com a equipe da Flua.</strong>
                <p>
                  Para solicitações relacionadas a estes documentos, privacidade
                  ou segurança, utilize nossos canais oficiais de atendimento.
                </p>
              </div>

              <Link href="/#contato">
                Entrar em contato
                <ArrowRight size={16} />
              </Link>
            </div>
          </article>
        </div>
      </section>

      <footer className="legal-footer">
        <div className="legal-shell legal-footer-inner">
          <p>© 2026 Flua Gestão. Todos os direitos reservados.</p>

          <nav>
            <Link href="/documentos/termos-de-uso">Termos</Link>
            <Link href="/documentos/privacidade">Privacidade</Link>
            <Link href="/documentos/cookies">Cookies</Link>
            <Link href="/documentos/seguranca">Segurança</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
