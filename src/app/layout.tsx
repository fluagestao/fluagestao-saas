import "./scrollbars.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./admin-fill.css";

import { AdminPathSync } from "@/components/admin/AdminPathSync";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.fluagestao.com.br"),
  title: {
    default: "Flua Gestão",
    template: "%s | Flua Gestão",
  },
  description:
    "Organize pedidos, financeiro, clientes, produtos e a rotina do seu negócio em um só lugar com a Flua Gestão.",
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
    title: "Flua Gestão | Gestão simples. Negócio fluindo.",
    description:
      "Organize pedidos, financeiro, clientes, produtos e a rotina do seu negócio em um só lugar.",
    images: [
      {
        url: "/og-flua.png",
        width: 1200,
        height: 630,
        alt: "Flua Gestão — gestão simples. negócio fluindo.",
      },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-dvh w-full min-w-0 flex-col overflow-x-hidden">
        <AdminPathSync />
        {children}
      </body>
    </html>
  );
}
