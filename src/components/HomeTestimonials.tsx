import Image from "next/image";

import "./home-testimonials.css";

const testimonials = [
  {
    name: "Alice",
    role: "Operação e Gestão",
    image: "/depoimento-alice-ab.jpeg",
    alt: "Alice, da AB Sabor na Caixa",
    imageClass: "flua-testimonial-photo-alice",
    quote:
      "Como fico mais envolvida com a parte operacional da AB, o sistema facilitou muito a minha rotina. Antes, precisávamos controlar pedidos, informações dos clientes e entregas em planilhas e anotações separadas. Agora, está tudo organizado em um só lugar, o que diminuiu os erros e deixou a produção muito mais rápida. Consigo visualizar cada pedido com clareza, saber o que precisa ser produzido e acompanhar tudo com muito mais segurança.",
  },
  {
    name: "Adriana",
    role: "Atendimento e Produção",
    image: "/depoimento-adriana-ab.jpg",
    alt: "Adriana, da AB Sabor na Caixa",
    imageClass: "flua-testimonial-photo-adriana",
    quote:
      "O catálogo online melhorou muito o nosso atendimento. Hoje, as clientes conseguem visualizar os produtos, conhecer as opções e escolher com mais facilidade, deixando o pedido muito mais rápido e objetivo. Isso reduziu bastante o tempo que gastávamos enviando fotos e explicando cada produto pelo WhatsApp.",
  },
] as const;

export default function HomeTestimonials() {
  return (
    <section className="flua-testimonials" aria-labelledby="testimonials-title">
      <div className="flua2-shell">
        <header className="flua-testimonials-heading">
          <div className="flua-testimonials-heading-copy">
            <span className="flua-testimonials-kicker">HISTÓRIAS REAIS</span>
            <h2 id="testimonials-title">
              Quem usa a Flua sente a diferença na rotina.
            </h2>
            <p>
              Mais organização para os pedidos, mais agilidade no atendimento e
              mais segurança para cuidar de cada detalhe do negócio.
            </p>
          </div>

          <div className="flua-testimonials-company">
            <span>Cliente Flua</span>
            <Image
              src="/logo-ab-sabor-na-caixa.png"
              alt="AB Sabor na Caixa"
              width={776}
              height={454}
              sizes="180px"
            />
          </div>
        </header>

        <div className="flua-testimonials-grid">
          {testimonials.map((testimonial) => (
            <article className="flua-testimonial-card" key={testimonial.name}>
              <div className="flua-testimonial-photo">
                <Image
                  src={testimonial.image}
                  alt={testimonial.alt}
                  fill
                  sizes="(max-width: 760px) calc(100vw - 48px), (max-width: 1100px) 42vw, 310px"
                  className={testimonial.imageClass}
                />
              </div>

              <div className="flua-testimonial-content">
                <span className="flua-testimonial-quote-mark" aria-hidden="true">
                  “
                </span>
                <blockquote>
                  <p>{testimonial.quote}</p>
                  <footer>
                    <cite>{testimonial.name}</cite>
                    <span>{testimonial.role}</span>
                    <small>AB Sabor na Caixa</small>
                  </footer>
                </blockquote>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
