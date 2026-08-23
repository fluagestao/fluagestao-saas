"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function MarketingHeader() {
  const pathname = usePathname();
  const visible = pathname === "/" || pathname.startsWith("/funcionalidades/");

  if (!visible) return null;

  return (
    <header className="marketing-global-header">
      <div className="marketing-global-shell">
        <Link href="/" className="marketing-global-brand" aria-label="Flua Gestão">
          <Image
            src="/flua-logo.webp"
            alt="Flua Gestão"
            width={1200}
            height={676}
            priority
          />
        </Link>

        <nav className="marketing-global-nav" aria-label="Navegação institucional">
          <Link href="/funcionalidades/controle-de-vendas">NOSSO SAAS</Link>
          <Link href="/#para-quem">A FLUA</Link>
          <Link href="/#contato">CONTATO</Link>
          <Link href="/catalogo">MINHA LOJA</Link>
          <Link href="/#documentos">DOCUMENTOS</Link>
          <Link href="/login">PORTAL</Link>
        </nav>

        <div className="marketing-global-actions">
          <Link href="/login" className="marketing-global-login">Entrar</Link>
          <Link href="/cadastro" className="marketing-global-trial">Teste grátis</Link>
        </div>
      </div>
    </header>
  );
}
