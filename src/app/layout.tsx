import "./scrollbars.css";
import type { Metadata } from "next";
import { Cormorant_Garamond, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./admin-fill.css";
import "./panel-shell.css";
import "./flua-hero-visual.css";

import { AdminPathSync } from "@/components/admin/AdminPathSync";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    icon: [{ url: "/flua-favicon.svg", type: "image/svg+xml" }],
    shortcut: "/flua-favicon.svg",
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
      className={`${geistSans.variable} ${geistMono.variable} ${fluaSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-dvh w-full min-w-0 flex-col overflow-x-hidden">
        <AdminPathSync />
        {children}
      </body>
    </html>
  );
}
