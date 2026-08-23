import type { Metadata } from "next";
import "./nosso-saas.css";
import "./nosso-saas-typography.css";
import { NossoSaasClient } from "./NossoSaasClient";

export const metadata: Metadata = {
  title: "Nosso SaaS | Flua Gestão",
  description:
    "Conheça a Flua: gestão completa e especializada para cestas artesanais, tábuas de frios, presentes e negócios sob encomenda.",
};

export default function NossoSaasPage() {
  return <NossoSaasClient />;
}
