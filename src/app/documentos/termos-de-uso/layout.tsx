import type { Metadata } from "next";
import "../documento.css";

export const metadata: Metadata = {
  title: {
    default: "Documentos | Flua GestÃ£o",
    template: "%s | Flua GestÃ£o",
  },
  description:
    "Termos, privacidade, cookies e informaÃ§Ãµes de seguranÃ§a da Flua GestÃ£o.",
};

export default function DocumentosLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}

