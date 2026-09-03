import type { Metadata } from "next";
import LegalDocumentPage from "../../LegalDocumentPage";

export const metadata: Metadata = {
  title: "Política de Cookies",
  description: "Política de Cookies da Flua Gestão.",
};

const sections = [
  {
    title: "O que são cookies",
    paragraphs: [
      "Cookies são pequenos arquivos ou identificadores armazenados no navegador durante a navegação. Eles ajudam o site a funcionar, manter sessões seguras e lembrar escolhas feitas pelo visitante.",
    ],
  },
  {
    title: "Categorias utilizadas",
    paragraphs: [
      "A Flua organiza o uso de cookies em categorias claras. Cookies opcionais permanecem desativados até que você faça uma escolha.",
    ],
    bullets: [
      "Necessários: autenticação, segurança, navegação e registro das preferências. Não podem ser desativados.",
      "Análise e desempenho: ajudam a entender, de forma agregada, como o site é utilizado e onde pode ser melhorado.",
      "Marketing: permitem medir campanhas e tornar comunicações mais relevantes.",
    ],
  },
  {
    title: "Seu consentimento",
    paragraphs: [
      "Cookies de análise e marketing somente podem ser ativados após seu consentimento. Você pode aceitar todos, recusar os opcionais ou escolher cada categoria separadamente.",
      "Recusar cookies opcionais não impede o uso das funções essenciais do site e da plataforma.",
    ],
  },
  {
    title: "Como registramos sua escolha",
    paragraphs: [
      "A preferência é armazenada neste navegador por até 180 dias. O registro inclui as categorias escolhidas, a data da decisão e a versão deste mecanismo de consentimento.",
      "Uma nova escolha poderá ser solicitada quando o prazo terminar ou quando houver mudança relevante nas categorias ou finalidades.",
    ],
  },
  {
    title: "Gerenciar ou revogar",
    paragraphs: [
      "Você pode mudar ou retirar seu consentimento a qualquer momento pelo botão “Configurar cookies”, disponível no rodapé do site. Também é possível apagar cookies nas configurações do navegador.",
      "Ao revogar uma categoria, novas tecnologias daquela categoria deixam de ser autorizadas. Cookies já gravados por serviços externos podem precisar ser removidos nas configurações do navegador.",
    ],
  },
  {
    title: "Serviços de terceiros",
    paragraphs: [
      "Quando a Flua utilizar serviços externos de análise ou campanhas, eles deverão respeitar a categoria escolhida. Esses fornecedores podem adotar políticas próprias para os dados tratados diretamente por eles.",
    ],
  },
  {
    title: "Prazo e atualização",
    paragraphs: [
      "Os prazos específicos podem variar conforme a finalidade e o fornecedor, sempre limitados ao necessário. Esta política poderá ser atualizada por mudanças técnicas, legais ou operacionais; a versão vigente permanecerá publicada nesta página.",
    ],
  },
  {
    title: "Contato",
    paragraphs: [
      "Em caso de dúvida sobre cookies, privacidade ou exercício de direitos, utilize os canais oficiais de contato indicados no site da Flua Gestão.",
    ],
  },
];

export default function CookiesPage() {
  return (
    <LegalDocumentPage
      eyebrow="POLÍTICA DE COOKIES"
      title="Tecnologia útil sem perder a transparência."
      description="Entenda quais cookies podem ser utilizados e escolha, com clareza, o que deseja autorizar."
      updatedAt="3 de setembro de 2026"
      sections={sections}
    />
  );
}
