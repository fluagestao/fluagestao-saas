import type { Metadata } from "next";
import LegalDocumentPage from "../../LegalDocumentPage";

export const metadata: Metadata = {
  title: "Privacidade e LGPD",
  description: "PolÃ­tica de Privacidade e proteÃ§Ã£o de dados da Flua GestÃ£o.",
};

const sections = [
  {
    title: "Compromisso com a privacidade",
    paragraphs: [
      "A Flua GestÃ£o trata dados pessoais com respeito Ã  privacidade, Ã  transparÃªncia e Ã  legislaÃ§Ã£o brasileira, especialmente a Lei Geral de ProteÃ§Ã£o de Dados Pessoais â€” LGPD (Lei nÂº 13.709/2018).",
      "Esta PolÃ­tica explica quais informaÃ§Ãµes podem ser tratadas quando vocÃª acessa o site, cria uma conta ou utiliza a plataforma, bem como as principais finalidades e direitos relacionados a esses dados.",
    ],
  },
  {
    title: "Dados que podem ser tratados",
    paragraphs: [
      "Os dados tratados variam conforme a relaÃ§Ã£o do titular com a Flua e os recursos utilizados.",
    ],
    bullets: [
      "Dados cadastrais, como nome, telefone, e-mail e informaÃ§Ãµes da empresa.",
      "Dados de autenticaÃ§Ã£o, perfil, permissÃµes e registros de acesso.",
      "InformaÃ§Ãµes fornecidas pelo usuÃ¡rio durante o uso da plataforma.",
      "Dados tÃ©cnicos de dispositivo, navegador, endereÃ§o IP e eventos de seguranÃ§a.",
      "InformaÃ§Ãµes relacionadas a suporte, atendimento e comunicaÃ§Ãµes.",
      "Dados necessÃ¡rios Ã  contrataÃ§Ã£o, cobranÃ§a e cumprimento de obrigaÃ§Ãµes legais, quando aplicÃ¡vel.",
    ],
  },
  {
    title: "Finalidades do tratamento",
    bullets: [
      "Criar e administrar contas de usuÃ¡rio e empresas.",
      "Disponibilizar funcionalidades contratadas e prestar suporte.",
      "Proteger contas, prevenir fraudes e manter a seguranÃ§a da plataforma.",
      "Processar pagamentos e administrar assinaturas, quando aplicÃ¡vel.",
      "Cumprir obrigaÃ§Ãµes legais, regulatÃ³rias e ordens de autoridades competentes.",
      "Melhorar desempenho, usabilidade e funcionalidades da Flua.",
      "Enviar comunicaÃ§Ãµes operacionais e, quando permitido, informaÃ§Ãµes comerciais.",
    ],
  },
  {
    title: "Bases legais",
    paragraphs: [
      "O tratamento poderÃ¡ ocorrer, conforme o caso, com fundamento na execuÃ§Ã£o de contrato ou procedimentos preliminares, cumprimento de obrigaÃ§Ã£o legal ou regulatÃ³ria, legÃ­timo interesse, exercÃ­cio regular de direitos, proteÃ§Ã£o contra fraude e consentimento, nos termos da LGPD.",
    ],
  },
  {
    title: "Dados inseridos por clientes da Flua",
    paragraphs: [
      "Empresas que utilizam a Flua podem inserir dados de seus prÃ³prios clientes, destinatÃ¡rios, contatos ou colaboradores. Nessas situaÃ§Ãµes, a empresa usuÃ¡ria normalmente define as finalidades do tratamento e deve assegurar que possui base legal adequada para utilizar essas informaÃ§Ãµes.",
      "A Flua processa esses dados para disponibilizar as funcionalidades da plataforma e de acordo com as instruÃ§Ãµes e configuraÃ§Ãµes do cliente, observadas as obrigaÃ§Ãµes legais aplicÃ¡veis.",
    ],
  },
  {
    title: "Compartilhamento e operadores",
    paragraphs: [
      "Dados podem ser compartilhados com fornecedores necessÃ¡rios Ã  operaÃ§Ã£o da plataforma, como serviÃ§os de infraestrutura, hospedagem, autenticaÃ§Ã£o, comunicaÃ§Ã£o, suporte e processamento de pagamentos, sempre na medida necessÃ¡ria Ã  prestaÃ§Ã£o do serviÃ§o.",
      "TambÃ©m poderÃ¡ haver compartilhamento para cumprimento de obrigaÃ§Ã£o legal, ordem judicial ou proteÃ§Ã£o de direitos, seguranÃ§a e prevenÃ§Ã£o a fraudes.",
    ],
  },
  {
    title: "Armazenamento e retenÃ§Ã£o",
    paragraphs: [
      "Os dados sÃ£o mantidos pelo perÃ­odo necessÃ¡rio Ã s finalidades informadas, Ã  execuÃ§Ã£o da relaÃ§Ã£o contratual e ao cumprimento de obrigaÃ§Ãµes legais ou regulatÃ³rias.",
      "ApÃ³s o tÃ©rmino da relaÃ§Ã£o, determinadas informaÃ§Ãµes poderÃ£o ser conservadas para cumprimento de dever legal, exercÃ­cio regular de direitos, prevenÃ§Ã£o a fraudes ou outras hipÃ³teses autorizadas pela LGPD.",
    ],
  },
  {
    title: "Direitos do titular",
    paragraphs: [
      "Nos termos da LGPD e conforme aplicÃ¡vel, o titular poderÃ¡ solicitar informaÃ§Ãµes e exercer direitos relacionados aos seus dados pessoais.",
    ],
    bullets: [
      "ConfirmaÃ§Ã£o da existÃªncia de tratamento e acesso aos dados.",
      "CorreÃ§Ã£o de dados incompletos, inexatos ou desatualizados.",
      "AnonimizaÃ§Ã£o, bloqueio ou eliminaÃ§Ã£o quando cabÃ­vel.",
      "Portabilidade, observados os requisitos legais e tÃ©cnicos.",
      "InformaÃ§Ãµes sobre compartilhamentos.",
      "RevogaÃ§Ã£o do consentimento, quando essa for a base legal utilizada.",
      "RevisÃ£o ou oposiÃ§Ã£o ao tratamento nas hipÃ³teses previstas em lei.",
    ],
  },
  {
    title: "SeguranÃ§a e incidentes",
    paragraphs: [
      "A Flua adota medidas tÃ©cnicas e administrativas voltadas Ã  proteÃ§Ã£o dos dados contra acessos nÃ£o autorizados, destruiÃ§Ã£o, perda, alteraÃ§Ã£o ou divulgaÃ§Ã£o indevida.",
      "Nenhum ambiente digital Ã© totalmente imune a riscos. Caso ocorra incidente relevante envolvendo dados pessoais, serÃ£o adotadas medidas de contenÃ§Ã£o, avaliaÃ§Ã£o e comunicaÃ§Ã£o conforme as exigÃªncias legais aplicÃ¡veis.",
    ],
  },
  {
    title: "AtualizaÃ§Ãµes e contato",
    paragraphs: [
      "Esta PolÃ­tica poderÃ¡ ser atualizada para refletir mudanÃ§as na plataforma, em processos internos ou na legislaÃ§Ã£o. A versÃ£o vigente ficarÃ¡ disponÃ­vel nos canais oficiais da Flua.",
      "SolicitaÃ§Ãµes relacionadas Ã  privacidade e ao exercÃ­cio de direitos podem ser encaminhadas pelos canais oficiais de contato disponibilizados pela Flua GestÃ£o.",
    ],
  },
];

export default function PrivacidadePage() {
  return (
    <LegalDocumentPage
      eyebrow="PRIVACIDADE E LGPD"
      title="Seus dados tratados com clareza e responsabilidade."
      description="Entenda como a Flua pode coletar, utilizar, proteger e armazenar dados pessoais durante o uso de seus serviÃ§os."
      updatedAt="23 de agosto de 2026"
      sections={sections}
    />
  );
}

