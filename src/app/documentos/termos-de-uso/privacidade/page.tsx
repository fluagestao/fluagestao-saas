import type { Metadata } from "next";
import LegalDocumentPage from "../LegalDocumentPage";

export const metadata: Metadata = {
  title: "Privacidade e LGPD",
  description: "Política de Privacidade e proteção de dados da Flua Gestão.",
};

const sections = [
  {
    title: "Compromisso com a privacidade",
    paragraphs: [
      "A Flua Gestão trata dados pessoais com respeito à privacidade, à transparência e à legislação brasileira, especialmente a Lei Geral de Proteção de Dados Pessoais — LGPD (Lei nº 13.709/2018).",
      "Esta Política explica quais informações podem ser tratadas quando você acessa o site, cria uma conta ou utiliza a plataforma, bem como as principais finalidades e direitos relacionados a esses dados.",
    ],
  },
  {
    title: "Dados que podem ser tratados",
    paragraphs: [
      "Os dados tratados variam conforme a relação do titular com a Flua e os recursos utilizados.",
    ],
    bullets: [
      "Dados cadastrais, como nome, telefone, e-mail e informações da empresa.",
      "Dados de autenticação, perfil, permissões e registros de acesso.",
      "Informações fornecidas pelo usuário durante o uso da plataforma.",
      "Dados técnicos de dispositivo, navegador, endereço IP e eventos de segurança.",
      "Informações relacionadas a suporte, atendimento e comunicações.",
      "Dados necessários à contratação, cobrança e cumprimento de obrigações legais, quando aplicável.",
    ],
  },
  {
    title: "Finalidades do tratamento",
    bullets: [
      "Criar e administrar contas de usuário e empresas.",
      "Disponibilizar funcionalidades contratadas e prestar suporte.",
      "Proteger contas, prevenir fraudes e manter a segurança da plataforma.",
      "Processar pagamentos e administrar assinaturas, quando aplicável.",
      "Cumprir obrigações legais, regulatórias e ordens de autoridades competentes.",
      "Melhorar desempenho, usabilidade e funcionalidades da Flua.",
      "Enviar comunicações operacionais e, quando permitido, informações comerciais.",
    ],
  },
  {
    title: "Bases legais",
    paragraphs: [
      "O tratamento poderá ocorrer, conforme o caso, com fundamento na execução de contrato ou procedimentos preliminares, cumprimento de obrigação legal ou regulatória, legítimo interesse, exercício regular de direitos, proteção contra fraude e consentimento, nos termos da LGPD.",
    ],
  },
  {
    title: "Dados inseridos por clientes da Flua",
    paragraphs: [
      "Empresas que utilizam a Flua podem inserir dados de seus próprios clientes, destinatários, contatos ou colaboradores. Nessas situações, a empresa usuária normalmente define as finalidades do tratamento e deve assegurar que possui base legal adequada para utilizar essas informações.",
      "A Flua processa esses dados para disponibilizar as funcionalidades da plataforma e de acordo com as instruções e configurações do cliente, observadas as obrigações legais aplicáveis.",
    ],
  },
  {
    title: "Compartilhamento e operadores",
    paragraphs: [
      "Dados podem ser compartilhados com fornecedores necessários à operação da plataforma, como serviços de infraestrutura, hospedagem, autenticação, comunicação, suporte e processamento de pagamentos, sempre na medida necessária à prestação do serviço.",
      "Também poderá haver compartilhamento para cumprimento de obrigação legal, ordem judicial ou proteção de direitos, segurança e prevenção a fraudes.",
    ],
  },
  {
    title: "Armazenamento e retenção",
    paragraphs: [
      "Os dados são mantidos pelo período necessário às finalidades informadas, à execução da relação contratual e ao cumprimento de obrigações legais ou regulatórias.",
      "Após o término da relação, determinadas informações poderão ser conservadas para cumprimento de dever legal, exercício regular de direitos, prevenção a fraudes ou outras hipóteses autorizadas pela LGPD.",
    ],
  },
  {
    title: "Direitos do titular",
    paragraphs: [
      "Nos termos da LGPD e conforme aplicável, o titular poderá solicitar informações e exercer direitos relacionados aos seus dados pessoais.",
    ],
    bullets: [
      "Confirmação da existência de tratamento e acesso aos dados.",
      "Correção de dados incompletos, inexatos ou desatualizados.",
      "Anonimização, bloqueio ou eliminação quando cabível.",
      "Portabilidade, observados os requisitos legais e técnicos.",
      "Informações sobre compartilhamentos.",
      "Revogação do consentimento, quando essa for a base legal utilizada.",
      "Revisão ou oposição ao tratamento nas hipóteses previstas em lei.",
    ],
  },
  {
    title: "Segurança e incidentes",
    paragraphs: [
      "A Flua adota medidas técnicas e administrativas voltadas à proteção dos dados contra acessos não autorizados, destruição, perda, alteração ou divulgação indevida.",
      "Nenhum ambiente digital é totalmente imune a riscos. Caso ocorra incidente relevante envolvendo dados pessoais, serão adotadas medidas de contenção, avaliação e comunicação conforme as exigências legais aplicáveis.",
    ],
  },
  {
    title: "Atualizações e contato",
    paragraphs: [
      "Esta Política poderá ser atualizada para refletir mudanças na plataforma, em processos internos ou na legislação. A versão vigente ficará disponível nos canais oficiais da Flua.",
      "Solicitações relacionadas à privacidade e ao exercício de direitos podem ser encaminhadas pelos canais oficiais de contato disponibilizados pela Flua Gestão.",
    ],
  },
];

export default function PrivacidadePage() {
  return (
    <LegalDocumentPage
      eyebrow="PRIVACIDADE E LGPD"
      title="Seus dados tratados com clareza e responsabilidade."
      description="Entenda como a Flua pode coletar, utilizar, proteger e armazenar dados pessoais durante o uso de seus serviços."
      updatedAt="23 de agosto de 2026"
      sections={sections}
    />
  );
}
