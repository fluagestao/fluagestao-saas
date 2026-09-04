"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

import "./home-testimonials.css";

const AUTOPLAY_INTERVAL = 7_000;
const SWIPE_THRESHOLD = 48;

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
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [autoplayReset, setAutoplayReset] = useState(0);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const changeSlide = useCallback((index: number) => {
    setActiveIndex((index + testimonials.length) % testimonials.length);
    setAutoplayReset((value) => value + 1);
  }, []);

  const previous = useCallback(() => {
    setActiveIndex((index) => (index - 1 + testimonials.length) % testimonials.length);
    setAutoplayReset((value) => value + 1);
  }, []);

  const next = useCallback(() => {
    setActiveIndex((index) => (index + 1) % testimonials.length);
    setAutoplayReset((value) => value + 1);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReducedMotion(media.matches);
    const updateVisibility = () => setPageVisible(document.visibilityState === "visible");

    updateMotionPreference();
    updateVisibility();
    media.addEventListener("change", updateMotionPreference);
    document.addEventListener("visibilitychange", updateVisibility);

    return () => {
      media.removeEventListener("change", updateMotionPreference);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!autoplayEnabled || interactionPaused || !pageVisible || reducedMotion) return;

    const interval = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % testimonials.length);
    }, AUTOPLAY_INTERVAL);

    return () => window.clearInterval(interval);
  }, [autoplayEnabled, autoplayReset, interactionPaused, pageVisible, reducedMotion]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") return;
    pointerStart.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start || event.pointerType === "mouse") return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    if (deltaX < 0) next();
    else previous();
  };

  return (
    <section className="flua-testimonials" aria-labelledby="testimonials-title">
      <div className="flua2-shell">
        <header className="flua-testimonials-heading">
          <div className="flua-testimonials-heading-copy">
            <span className="flua-testimonials-kicker">HISTÓRIAS REAIS</span>
            <h2 id="testimonials-title">Quem usa a Flua sente a diferença na rotina.</h2>
            <p>
              Mais organização para os pedidos, mais agilidade no atendimento e mais segurança
              para cuidar de cada detalhe do negócio.
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

        <div
          className="flua-testimonials-carousel"
          role="region"
          aria-roledescription="carrossel"
          aria-label="Depoimentos de clientes"
          onMouseEnter={() => setInteractionPaused(true)}
          onMouseLeave={() => setInteractionPaused(false)}
          onFocusCapture={() => setInteractionPaused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setInteractionPaused(false);
          }}
        >
          <div
            className="flua-testimonials-stage"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => {
              pointerStart.current = null;
            }}
          >
            {testimonials.map((testimonial, index) => {
              const active = index === activeIndex;
              return (
                <article
                  className={`flua-testimonial-card${active ? " is-active" : ""}`}
                  key={testimonial.name}
                  aria-hidden={!active}
                  inert={!active}
                >
                  <div className="flua-testimonial-photo">
                    <Image
                      src={testimonial.image}
                      alt={testimonial.alt}
                      fill
                      sizes="(max-width: 760px) calc(100vw - 48px), (max-width: 1100px) 38vw, 400px"
                      className={testimonial.imageClass}
                    />
                  </div>

                  <div className="flua-testimonial-content">
                    <span className="flua-testimonial-quote-mark" aria-hidden="true">“</span>
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
              );
            })}
          </div>

          <p className="flua-testimonials-announcement" aria-live="polite" aria-atomic="true">
            Depoimento {activeIndex + 1} de {testimonials.length}: {testimonials[activeIndex].name}
          </p>

          <div className="flua-testimonials-controls">
            <button type="button" className="flua-testimonials-arrow" onClick={previous} aria-label="Ver depoimento anterior">
              <ChevronLeft aria-hidden="true" />
            </button>

            <div className="flua-testimonials-dots" aria-label="Escolher depoimento">
              {testimonials.map((testimonial, index) => (
                <button
                  type="button"
                  key={testimonial.name}
                  className={index === activeIndex ? "is-active" : ""}
                  onClick={() => changeSlide(index)}
                  aria-label={`Mostrar depoimento de ${testimonial.name}`}
                  aria-current={index === activeIndex ? "true" : undefined}
                />
              ))}
            </div>

            <button type="button" className="flua-testimonials-arrow" onClick={next} aria-label="Ver próximo depoimento">
              <ChevronRight aria-hidden="true" />
            </button>

            <button
              type="button"
              className="flua-testimonials-autoplay"
              onClick={() => setAutoplayEnabled((enabled) => !enabled)}
              aria-label={autoplayEnabled ? "Pausar rotação automática" : "Continuar rotação automática"}
              aria-pressed={!autoplayEnabled}
            >
              {autoplayEnabled ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
              <span>{autoplayEnabled ? "Pausar" : "Continuar"}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
