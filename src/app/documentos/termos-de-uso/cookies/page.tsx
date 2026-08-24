import type { Metadata } from "next";
import LegalDocumentPage from "../LegalDocumentPage";

export const metadata: Metadata = {
  title: "Política de Cookies",
  description: "Política de Cookies da Flua Gestão.",
};

const sections = [
  {
    title: "O que são cookies",
    paragraphs: [
      "Cookies são pequenos arquivos ou identificadores armazenados no navegador ou dispositivo durante a navegação. Eles podem ajudar um site a funcionar corretamente, lembrar preferências, proteger sessões e compreender como as páginas são utilizadas.",
    ],
  },
  {
    title: "Como a Flua pode utilizar cookies",
    paragraphs: [
      "A Flua pode utilizar cookies e tecnologias semelhantes de acordo com a necessidade de funcionamento do site e da plataforma, respeitando as preferências e a legislação aplicável.",
    ],
    bullets: [
      "Manter sessões autenticadas e recursos essenciais em funcionamento.",
      "Salvar preferências e configurações escolhidas pelo usuário.",
      "Reforçar mecanismos de segurança e prevenção a acessos indevidos.",
      "Medir desempenho e entender a utilização do site.",
      "Avaliar campanhas e comunicações, quando houver base legal e configuração compatível.",
    ],
  },
  {
    title: "Cookies essenciais",
    paragraphs: [
      "São necessários para que funcionalidades básicas operem de forma segura, incluindo autenticação, navegação, preferências de sessão e proteção contra uso indevido. Por serem necessários ao serviço solicitado, podem não depender de consentimento quando a legislação assim permitir.",
    ],
  },
  {
    title: "Preferências e funcionalidades",
    paragraphs: [
      "Podem permitir que o site lembre escolhas feitas anteriormente, como preferências de interface ou configurações que tornam a navegação mais conveniente.",
    ],
  },
  {
    title: "Medição e análise",
    paragraphs: [
      "Quando utilizados, cookies analíticos ajudam a compreender de forma agregada como visitantes interagem com páginas e recursos, permitindo identificar pontos de melhoria de desempenho e experiência.",
    ],
  },
  {
    title: "Publicidade e campanhas",
    paragraphs: [
      "Tecnologias relacionadas a publicidade ou medição de campanhas somente devem ser utilizadas quando houver fundamento jurídico adequado e de acordo com as escolhas disponíveis ao usuário.",
    ],
  },
  {
    title: "Gerenciamento de cookies",
    paragraphs: [
      "Você pode utilizar as configurações disponibilizadas pela Flua, quando presentes, e também as opções do seu navegador para bloquear, excluir ou limitar cookies.",
      "A desativação de cookies essenciais pode impedir o funcionamento correto de determinadas funcionalidades da plataforma.",
    ],
  },
  {
    title: "Cookies de terceiros",
    paragraphs: [
      "Alguns recursos podem depender de serviços de terceiros que adotam suas próprias tecnologias e políticas. Nesses casos, o tratamento realizado diretamente por esses terceiros estará sujeito às respectivas condições de privacidade.",
    ],
  },
  {
    title: "Alterações desta política",
    paragraphs: [
      "Esta Política poderá ser revisada em razão de mudanças tecnológicas, regulatórias ou na forma de utilização dos cookies. A versão atualizada será disponibilizada nos canais oficiais da Flua.",
    ],
  },
];

export default function CookiesPage() {
  return (
    <LegalDocumentPage
      eyebrow="POLÍTICA DE COOKIES"
      title="Tecnologia útil sem perder a transparência."
      description="Veja como cookies e tecnologias semelhantes podem apoiar segurança, funcionamento e melhoria da experiência na Flua."
      updatedAt="23 de agosto de 2026"
      sections={sections}
    />
  );
}
