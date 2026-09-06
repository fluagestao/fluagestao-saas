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
    pathname === "/contato" ||
    pathname.startsWith("/funcionalidades/");

  if (!visible) return null;

  /* A logo padrão é BRANCA, feita para os heróis escuros das outras páginas.
     Em /contato o herói é creme e ela virava um fantasma no canto — dava para
     ver o contorno e mais nada. A versão terracota é a mesma marca, só na cor
     que enxerga sobre claro.

     Por pathname e não por CSS porque filtro não transforma branco em
     terracota de forma confiável — e trocar o arquivo é o que a situação
     realmente pede. As cores de texto e botão ficam no CSS da própria página,
     onde é fácil achar quem as define. */
  const heroClaro = pathname === "/contato";

  return (
    <header className="marketing-global-header">
      <div className="marketing-global-shell">
        <Link href="/" className="marketing-global-brand" aria-label="Flua Gestão">
          <Image
            src={heroClaro ? "/flua-logo.webp" : "/logotipo-flua-branco-sem-fundo.png"}
            alt="Flua Gestão"
            width={heroClaro ? 518 : 2172}
            height={heroClaro ? 214 : 724}
            priority
          />
        </Link>

        {/* A FLUA, MINHA LOJA e COMO FUNCIONA saíram do menu — ocultas, não
            apagadas. As três rotas continuam de pé e acessíveis: /como-funciona
            é o destino do "Conhecer a Flua" na página de contato, e /login é
            para onde vai o botão Entrar aqui do lado. Tirar as páginas
            quebraria esses caminhos; tirar só os itens do menu, não.

            O `visible` acima também continua listando /a-flua e
            /como-funciona: quem chega nelas por link direto merece o
            cabeçalho, mesmo sem elas estarem no menu. */}
        <nav className="marketing-global-nav" aria-label="Navegação institucional">
          <Link href="/nosso-saas" aria-current={pathname === "/nosso-saas" ? "page" : undefined}>NOSSO SAAS</Link>
          <Link href="/contato" aria-current={pathname === "/contato" ? "page" : undefined}>CONTATO</Link>
        </nav>

        <div className="marketing-global-actions">
          <Link href="/login" className="marketing-global-login">Entrar</Link>
          <Link href="/cadastro" className="marketing-global-trial">Teste grátis</Link>
        </div>
      </div>
    </header>
  );
}
