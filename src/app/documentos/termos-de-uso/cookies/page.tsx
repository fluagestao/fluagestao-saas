import type { Metadata } from "next";
import LegalDocumentPage from "../../LegalDocumentPage";

export const metadata: Metadata = {
  title: "PolÃ­tica de Cookies",
  description: "PolÃ­tica de Cookies da Flua GestÃ£o.",
};

const sections = [
  {
    title: "O que sÃ£o cookies",
    paragraphs: [
      "Cookies sÃ£o pequenos arquivos ou identificadores armazenados no navegador ou dispositivo durante a navegaÃ§Ã£o. Eles podem ajudar um site a funcionar corretamente, lembrar preferÃªncias, proteger sessÃµes e compreender como as pÃ¡ginas sÃ£o utilizadas.",
    ],
  },
  {
    title: "Como a Flua pode utilizar cookies",
    paragraphs: [
      "A Flua pode utilizar cookies e tecnologias semelhantes de acordo com a necessidade de funcionamento do site e da plataforma, respeitando as preferÃªncias e a legislaÃ§Ã£o aplicÃ¡vel.",
    ],
    bullets: [
      "Manter sessÃµes autenticadas e recursos essenciais em funcionamento.",
      "Salvar preferÃªncias e configuraÃ§Ãµes escolhidas pelo usuÃ¡rio.",
      "ReforÃ§ar mecanismos de seguranÃ§a e prevenÃ§Ã£o a acessos indevidos.",
      "Medir desempenho e entender a utilizaÃ§Ã£o do site.",
      "Avaliar campanhas e comunicaÃ§Ãµes, quando houver base legal e configuraÃ§Ã£o compatÃ­vel.",
    ],
  },
  {
    title: "Cookies essenciais",
    paragraphs: [
      "SÃ£o necessÃ¡rios para que funcionalidades bÃ¡sicas operem de forma segura, incluindo autenticaÃ§Ã£o, navegaÃ§Ã£o, preferÃªncias de sessÃ£o e proteÃ§Ã£o contra uso indevido. Por serem necessÃ¡rios ao serviÃ§o solicitado, podem nÃ£o depender de consentimento quando a legislaÃ§Ã£o assim permitir.",
    ],
  },
  {
    title: "PreferÃªncias e funcionalidades",
    paragraphs: [
      "Podem permitir que o site lembre escolhas feitas anteriormente, como preferÃªncias de interface ou configuraÃ§Ãµes que tornam a navegaÃ§Ã£o mais conveniente.",
    ],
  },
  {
    title: "MediÃ§Ã£o e anÃ¡lise",
    paragraphs: [
      "Quando utilizados, cookies analÃ­ticos ajudam a compreender de forma agregada como visitantes interagem com pÃ¡ginas e recursos, permitindo identificar pontos de melhoria de desempenho e experiÃªncia.",
    ],
  },
  {
    title: "Publicidade e campanhas",
    paragraphs: [
      "Tecnologias relacionadas a publicidade ou mediÃ§Ã£o de campanhas somente devem ser utilizadas quando houver fundamento jurÃ­dico adequado e de acordo com as escolhas disponÃ­veis ao usuÃ¡rio.",
    ],
  },
  {
    title: "Gerenciamento de cookies",
    paragraphs: [
      "VocÃª pode utilizar as configuraÃ§Ãµes disponibilizadas pela Flua, quando presentes, e tambÃ©m as opÃ§Ãµes do seu navegador para bloquear, excluir ou limitar cookies.",
      "A desativaÃ§Ã£o de cookies essenciais pode impedir o funcionamento correto de determinadas funcionalidades da plataforma.",
    ],
  },
  {
    title: "Cookies de terceiros",
    paragraphs: [
      "Alguns recursos podem depender de serviÃ§os de terceiros que adotam suas prÃ³prias tecnologias e polÃ­ticas. Nesses casos, o tratamento realizado diretamente por esses terceiros estarÃ¡ sujeito Ã s respectivas condiÃ§Ãµes de privacidade.",
    ],
  },
  {
    title: "AlteraÃ§Ãµes desta polÃ­tica",
    paragraphs: [
      "Esta PolÃ­tica poderÃ¡ ser revisada em razÃ£o de mudanÃ§as tecnolÃ³gicas, regulatÃ³rias ou na forma de utilizaÃ§Ã£o dos cookies. A versÃ£o atualizada serÃ¡ disponibilizada nos canais oficiais da Flua.",
    ],
  },
];

export default function CookiesPage() {
  return (
    <LegalDocumentPage
      eyebrow="POLÃTICA DE COOKIES"
      title="Tecnologia Ãºtil sem perder a transparÃªncia."
      description="Veja como cookies e tecnologias semelhantes podem apoiar seguranÃ§a, funcionamento e melhoria da experiÃªncia na Flua."
      updatedAt="23 de agosto de 2026"
      sections={sections}
    />
  );
}

