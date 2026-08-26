import type { Metadata } from "next";
import LegalDocumentPage from "../../LegalDocumentPage";

export const metadata: Metadata = {
  title: "SeguranÃ§a",
  description: "PrincÃ­pios de seguranÃ§a da informaÃ§Ã£o da Flua GestÃ£o.",
};

const sections = [
  {
    title: "SeguranÃ§a como princÃ­pio",
    paragraphs: [
      "A Flua trata seguranÃ§a como parte essencial da operaÃ§Ã£o da plataforma. O objetivo Ã© reduzir riscos, proteger informaÃ§Ãµes e manter a disponibilidade e a integridade dos serviÃ§os utilizados pelos clientes.",
      "As medidas adotadas sÃ£o avaliadas conforme a natureza dos dados, os riscos envolvidos, a arquitetura da plataforma e a evoluÃ§Ã£o das boas prÃ¡ticas de seguranÃ§a.",
    ],
  },
  {
    title: "Controle de acesso",
    bullets: [
      "Contas individuais e mecanismos de autenticaÃ§Ã£o.",
      "PermissÃµes e nÃ­veis de acesso compatÃ­veis com as funÃ§Ãµes disponÃ­veis.",
      "PrincÃ­pio de acesso mÃ­nimo necessÃ¡rio sempre que aplicÃ¡vel.",
      "RevogaÃ§Ã£o ou restriÃ§Ã£o de acessos quando houver mudanÃ§a de necessidade ou risco identificado.",
    ],
  },
  {
    title: "ProteÃ§Ã£o das comunicaÃ§Ãµes",
    paragraphs: [
      "A Flua busca proteger a transmissÃ£o de informaÃ§Ãµes entre usuÃ¡rios e serviÃ§os por mecanismos de seguranÃ§a adequados ao ambiente web, incluindo conexÃµes protegidas em trÃ¢nsito quando aplicÃ¡vel.",
    ],
  },
  {
    title: "Infraestrutura e disponibilidade",
    paragraphs: [
      "A arquitetura da plataforma utiliza serviÃ§os de infraestrutura necessÃ¡rios Ã  hospedagem, processamento e armazenamento de informaÃ§Ãµes. SÃ£o adotadas prÃ¡ticas de atualizaÃ§Ã£o, configuraÃ§Ã£o e acompanhamento voltadas Ã  continuidade e Ã  reduÃ§Ã£o de riscos operacionais.",
    ],
  },
  {
    title: "Backups e continuidade",
    paragraphs: [
      "Procedimentos de cÃ³pia, recuperaÃ§Ã£o e continuidade podem ser adotados de acordo com a criticidade dos serviÃ§os e os recursos de infraestrutura utilizados, com o objetivo de reduzir impactos decorrentes de falhas ou incidentes.",
    ],
  },
  {
    title: "Monitoramento e prevenÃ§Ã£o",
    bullets: [
      "Acompanhamento de eventos relevantes de aplicaÃ§Ã£o e infraestrutura.",
      "PrevenÃ§Ã£o e investigaÃ§Ã£o de acessos indevidos ou comportamentos anÃ´malos.",
      "CorreÃ§Ãµes e atualizaÃ§Ãµes de componentes quando necessÃ¡rias.",
      "RevisÃ£o de controles diante de novos riscos ou mudanÃ§as relevantes na plataforma.",
    ],
  },
  {
    title: "Responsabilidade do usuÃ¡rio",
    paragraphs: [
      "A seguranÃ§a tambÃ©m depende de boas prÃ¡ticas de quem utiliza a plataforma. O usuÃ¡rio deve proteger suas credenciais, manter dispositivos e navegadores atualizados e limitar o acesso apenas a pessoas autorizadas.",
    ],
    bullets: [
      "NÃ£o compartilhar senhas.",
      "Utilizar credenciais fortes e exclusivas.",
      "Encerrar acessos de colaboradores que nÃ£o devem mais utilizar a plataforma.",
      "Comunicar imediatamente qualquer suspeita de comprometimento da conta.",
    ],
  },
  {
    title: "GestÃ£o de incidentes",
    paragraphs: [
      "Quando identificado um evento de seguranÃ§a relevante, a Flua poderÃ¡ adotar medidas de contenÃ§Ã£o, investigaÃ§Ã£o, correÃ§Ã£o e recuperaÃ§Ã£o conforme a natureza e o impacto do incidente.",
      "Quando houver obrigaÃ§Ã£o legal ou risco relevante a titulares de dados pessoais, serÃ£o observadas as comunicaÃ§Ãµes previstas na legislaÃ§Ã£o aplicÃ¡vel.",
    ],
  },
  {
    title: "Relato responsÃ¡vel de vulnerabilidades",
    paragraphs: [
      "Caso vocÃª identifique comportamento que possa representar uma vulnerabilidade na Flua, pedimos que nÃ£o explore, divulgue publicamente ou acesse informaÃ§Ãµes de terceiros. Utilize os canais oficiais da Flua para relatar o ocorrido com detalhes suficientes para anÃ¡lise.",
    ],
  },
  {
    title: "EvoluÃ§Ã£o contÃ­nua",
    paragraphs: [
      "SeguranÃ§a Ã© um processo contÃ­nuo. Controles, processos e medidas tÃ©cnicas podem ser atualizados conforme a evoluÃ§Ã£o da plataforma, novas ameaÃ§as, alteraÃ§Ãµes de infraestrutura e requisitos legais.",
    ],
  },
];

export default function SegurancaPage() {
  return (
    <LegalDocumentPage
      eyebrow="SEGURANÃ‡A"
      title="ProteÃ§Ã£o pensada para sustentar o seu negÃ³cio."
      description="ConheÃ§a os princÃ­pios que orientam a proteÃ§Ã£o de contas, informaÃ§Ãµes e continuidade dos serviÃ§os da Flua."
      updatedAt="23 de agosto de 2026"
      sections={sections}
    />
  );
}

