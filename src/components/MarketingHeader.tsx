"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function MarketingHeader() {
  const pathname = usePathname();
  const visible =
    pathname === "/" ||
    pathname === "/nosso-saas" ||
    pathname === "/a-flua" ||
    pathname === "/como-funciona" ||
    pathname.startsWith("/funcionalidades/");

  if (!visible) return null;

  return (
    <header className="marketing-global-header">
      <div className="marketing-global-shell">
        <Link href="/" className="marketing-global-brand" aria-label="Flua Gestão">
          <Image
            src="/logotipo-flua-branco-sem-fundo.png"
            alt="Flua Gestão"
            width={2172}
            height={724}
            priority
          />
        </Link>

        <nav className="marketing-global-nav" aria-label="Navegação institucional">
          <Link href="/nosso-saas" aria-current={pathname === "/nosso-saas" ? "page" : undefined}>NOSSO SAAS</Link>
          <Link href="/a-flua" aria-current={pathname === "/a-flua" ? "page" : undefined}>A FLUA</Link>
          <Link href="/#contato">CONTATO</Link>
          <Link href="/catalogo">MINHA LOJA</Link>
          <Link href="/#documentos">DOCUMENTOS</Link>
          <Link href="/como-funciona" aria-current={pathname === "/como-funciona" ? "page" : undefined}>COMO FUNCIONA</Link>
        </nav>

        <div className="marketing-global-actions">
          <Link href="/login" className="marketing-global-login">Entrar</Link>
          <Link href="/cadastro" className="marketing-global-trial">Teste grátis</Link>
        </div>
      </div>
    </header>
  );
}
