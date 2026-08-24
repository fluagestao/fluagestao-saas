import type { Metadata } from "next";
import "./documentos.css";

export const metadata: Metadata = {
  title: {
    default: "Documentos | Flua Gestão",
    template: "%s | Flua Gestão",
  },
  description:
    "Termos, privacidade, cookies e informações de segurança da Flua Gestão.",
};

export default function DocumentosLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
