"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Instagram, MapPin, Menu, ArrowUpRight, ChevronRight } from "lucide-react";
import {
  INSTAGRAM,
  INSTAGRAM_URL,
  CIDADE,
  ENDERECO,
  MAPS_URL,
  mensagemGenerica,
} from "@/lib/config";
import { fetchCategorias, fetchHorarios } from "@/lib/catalog";
import { statusAtendimento } from "@/lib/horarios";
import { CartButton } from "@/components/CartButton";
import { WhatsappButton } from "@/components/WhatsappButton";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
// Lockup vertical (monograma com laço + "SABOR NA CAIXA"), servido de public/.
const LOGO_TERRACOTA = "/logo-ab-terracota.png";
const LOGO_CREME = "/logo-ab-creme.png";

const NAV_LINKS: { label: string; href: string; accent?: boolean }[] = [
  { label: "Catálogo", href: "/#catalogo", accent: true },
  { label: "Quem somos", href: "/#sobre" },
  { label: "Como funciona", href: "/informacoes" },
];

const menuItem =
  "flex items-center justify-between rounded-xl px-4 py-3 text-base text-foreground/80 transition-colors hover:bg-[var(--cream-deep)]/60 hover:text-[var(--terracotta)]";
const sectionLabel =
  "mt-4 px-4 pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--bronze)]";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const { data: categorias = [] } = useQuery({
    queryKey: ["categorias"],
    queryFn: fetchCategorias,
    staleTime: 5 * 60 * 1000,
  });

  const { data: horarios } = useQuery({
    queryKey: ["horarios"],
    queryFn: fetchHorarios,
    staleTime: 5 * 60 * 1000,
  });
  // Recalcula o status a cada minuto (abre/fecha em tempo real).
  const [agora, setAgora] = useState<Date | null>(null);
  useEffect(() => {
    setAgora(new Date());
    const t = setInterval(() => setAgora(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const status =
    horarios && agora
      ? statusAtendimento(horarios, agora)
      : { aberto: true, texto: "Atendimento aberto" };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const renderNavLink = (link: (typeof NAV_LINKS)[number]) => {
    const base = "rounded-full px-4 py-2 text-sm font-medium transition-colors";
    const accent = link.accent
      ? "text-[var(--terracotta)] hover:bg-[var(--terracotta)]/10"
      : "text-foreground/75 hover:text-[var(--terracotta)] hover:bg-[var(--cream-deep)]/60";
    if (link.href.startsWith("/#") || link.href.startsWith("#")) {
      return (
        <a key={link.label} href={link.href} className={`${base} ${accent}`}>
          {link.label}
        </a>
      );
    }
    return (
      <Link key={link.label} href={link.href} className={`${base} ${accent}`}>
        {link.label}
      </Link>
    );
  };

  const chevron = <ChevronRight className="h-4 w-4 shrink-0 opacity-40" />;

  return (
    <header
      className={`sticky top-0 z-40 border-b border-[var(--cream-deep)] bg-[var(--cream)]/90 backdrop-blur transition-shadow ${
        scrolled ? "shadow-sm" : ""
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:py-4">
        <Link href="/" className="flex shrink-0 items-center" aria-label="AB Sabor na Caixa — início">
          <img
            src={LOGO_TERRACOTA}
            alt="AB Sabor na Caixa"
            className="h-12 w-auto sm:h-14"
            width={776}
            height={454}
          />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-2 md:flex">
          {NAV_LINKS.map(renderNavLink)}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <CartButton />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Abrir menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--bronze)]/30 bg-[var(--cream-deep)] text-[var(--terracotta)] transition-all hover:scale-105 hover:bg-[var(--bronze)]/20"
              >
                <Menu className="h-5 w-5" strokeWidth={1.8} />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-80 flex-col bg-[var(--cream)] p-0 sm:w-96">
              <SheetHeader className="border-b border-[var(--cream-deep)] px-5 py-4 text-left">
                <SheetTitle className="font-display text-2xl text-[var(--terracotta)]">
                  Menu
                </SheetTitle>
              </SheetHeader>

              <nav className="flex-1 overflow-y-auto px-3 py-3">
                <Link href="/" onClick={close} className={menuItem}>
                  Início {chevron}
                </Link>
                <Link href="/#catalogo" onClick={close} className={menuItem}>
                  Catálogo {chevron}
                </Link>

                {categorias.length > 0 && (
                  <>
                    <p className={sectionLabel}>Nossas coleções</p>
                    {categorias.map((c) => (
                      <Link
                        key={c.slug}
                        href={`/?categoria=${encodeURIComponent(c.slug)}#catalogo`}
                        onClick={close}
                        className={menuItem}
                      >
                        {c.nome} {chevron}
                      </Link>
                    ))}
                  </>
                )}

                <p className={sectionLabel}>A AB</p>
                <Link href="/#sobre" onClick={close} className={menuItem}>
                  Quem somos {chevron}
                </Link>
                <Link href="/informacoes" onClick={close} className={menuItem}>
                  Como funciona {chevron}
                </Link>
              </nav>

              <div className="border-t border-[var(--cream-deep)] p-4">
                <WhatsappButton mensagem={mensagemGenerica()} size="md" className="w-full" />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="border-t border-[var(--cream-deep)]/60 bg-[var(--cream-deep)]/40">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 px-5 py-1.5 text-[11px] tracking-[0.03em] text-[var(--bronze)]">
          <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-[0.14em] text-foreground/70">
            <span className="relative flex h-1.5 w-1.5">
              {status.aberto && (
                <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--whatsapp)] opacity-60 motion-safe:animate-ping" />
              )}
              <span
                className="relative inline-flex h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: status.aberto ? "var(--whatsapp)" : "var(--terracotta)" }}
              />
            </span>
            {status.texto}
          </span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {CIDADE}
          </span>
          <span aria-hidden>·</span>
          <span>Entrega ou retirada</span>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24">
      <div className="bg-[var(--terracotta)] text-[var(--cream-soft)]">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <img
              src={LOGO_CREME}
              alt="AB Sabor na Caixa"
              className="h-20 w-auto"
              width={776}
              height={454}
            />
            <p className="mt-4 max-w-xs text-sm text-[var(--cream-soft)]/85">
              Cestas e caixas artesanais, montadas à mão em {CIDADE}.
            </p>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--cream-soft)]/30 px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--cream-soft)]/10 hover:text-white"
            >
              <Instagram className="h-4 w-4" strokeWidth={1.8} />@{INSTAGRAM}
            </a>
          </div>
          <div className="text-sm">
            <h4 className="font-display text-lg text-[var(--cream)]">Navegar</h4>
            <ul className="mt-3 space-y-2 text-[var(--cream-soft)]/85">
              <li>
                <a href="/#catalogo" className="hover:text-white">
                  Catálogo
                </a>
              </li>
              <li>
                <a href="/#sobre" className="hover:text-white">
                  Quem somos
                </a>
              </li>
              <li>
                <Link href="/informacoes" className="hover:text-white">
                  Como funciona
                </Link>
              </li>
            </ul>
          </div>
          <div className="text-sm">
            <h4 className="font-display text-lg text-[var(--cream)]">Contato</h4>
            <ul className="mt-3 space-y-2 text-[var(--cream-soft)]/85">
              <li>Pedidos via WhatsApp</li>
              <li>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
                >
                  <Instagram className="h-3.5 w-3.5" />@{INSTAGRAM}
                </a>
              </li>
              <li>
                <a
                  href={MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{ENDERECO}</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[var(--cream-soft)]/15 py-4 text-center text-xs text-[var(--cream-soft)]/70">
          © {new Date().getFullYear()} AB Sabor na Caixa · feito com afeto
        </div>
      </div>
    </footer>
  );
}
