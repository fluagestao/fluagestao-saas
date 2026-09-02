import "./scrollbars.css";
import type { Metadata } from "next";
import { Cormorant_Garamond, Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./admin-fill.css";
import "./panel-shell.css";
import "./flua-hero-visual.css";
import "./flua-hero-background.css";
import "./flua-hero-background-fix.css";
import "./marketing-header.css";
import "./responsive-system.css";
import "./home-compact.css";
import "./mobile-admin.css";
// Por ultimo de proposito: admin-fill e panel-shell forcam height/overflow
// no main com !important, e esta folha precisa vencer os dois.
import "./painel-viewport.css";

import { AdminPathSync } from "@/components/admin/AdminPathSync";
import { MobileAdminNav } from "@/components/admin/MobileAdminNav";
import { NovoPedidoRouteBridge } from "@/components/admin/NovoPedidoRouteBridge";
import { OnboardingPrompt } from "@/components/admin/OnboardingPrompt";
import { MarketingHeader } from "@/components/MarketingHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/* Duas serifadas de proposito, cada uma no tamanho para o qual foi desenhada.
   A Cormorant e de texto de livro: contraste alto e hastes finas, que viram
   elegancia nos titulos de 60-80px do site. No painel, em 34px, as hastes
   finas somem e a leitura sofre. A Fraunces e serifada de display: haste cheia
   e canto macio, feita para tamanho grande em tela. Se um dia o site migrar
   para Fraunces tambem, esta e a variavel que fica. */
const fluaDisplay = Fraunces({
  variable: "--font-flua-display",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

const fluaSerif = Cormorant_Garamond({
  variable: "--font-flua-serif",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.fluagestao.com.br"),
  title: {
    default: "Flua Gestão | Sistema para Cestas e Tábuas de Frios",
    template: "%s | Flua Gestão",
  },
  description:
    "Sistema de gestão especializado para cestas artesanais, cafés da manhã, presentes e tábuas de frios. Controle pedidos, clientes, produção, estoque, entregas e financeiro em um só lugar.",
  applicationName: "Flua Gestão",
  icons: {
    icon: [
      {
        url: "/flua-favicon.svg?v=20260823-1036",
        type: "image/svg+xml",
        sizes: "any",
      },
    ],
    shortcut: "/flua-favicon.svg?v=20260823-1036",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://www.fluagestao.com.br",
    siteName: "Flua Gestão",
    title: "Flua Gestão | Gestão simples para cestas e tábuas de frios",
    description:
      "Controle pedidos, clientes, produção, estoque, entregas e financeiro da sua casa até a sua empresa.",
    images: [
      {
        url: "/og-flua.png",
        width: 1200,
        height: 630,
        alt: "Flua Gestão — sistema para cestas e tábuas de frios",
      },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${fluaSerif.variable} ${fluaDisplay.variable} h-full antialiased`}
    >
      <body className="flex min-h-dvh w-full min-w-0 flex-col overflow-x-hidden">
        <AdminPathSync />
        <NovoPedidoRouteBridge />
        <MarketingHeader />
        {children}
        <OnboardingPrompt />
        <MobileAdminNav />
      </body>
    </html>
  );
}
