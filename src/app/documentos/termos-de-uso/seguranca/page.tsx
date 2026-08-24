import type { Metadata } from "next";
import LegalDocumentPage from "../LegalDocumentPage";

export const metadata: Metadata = {
  title: "Segurança",
  description: "Princípios de segurança da informação da Flua Gestão.",
};

const sections = [
  {
    title: "Segurança como princípio",
    paragraphs: [
      "A Flua trata segurança como parte essencial da operação da plataforma. O objetivo é reduzir riscos, proteger informações e manter a disponibilidade e a integridade dos serviços utilizados pelos clientes.",
      "As medidas adotadas são avaliadas conforme a natureza dos dados, os riscos envolvidos, a arquitetura da plataforma e a evolução das boas práticas de segurança.",
    ],
  },
  {
    title: "Controle de acesso",
    bullets: [
      "Contas individuais e mecanismos de autenticação.",
      "Permissões e níveis de acesso compatíveis com as funções disponíveis.",
      "Princípio de acesso mínimo necessário sempre que aplicável.",
      "Revogação ou restrição de acessos quando houver mudança de necessidade ou risco identificado.",
    ],
  },
  {
    title: "Proteção das comunicações",
    paragraphs: [
      "A Flua busca proteger a transmissão de informações entre usuários e serviços por mecanismos de segurança adequados ao ambiente web, incluindo conexões protegidas em trânsito quando aplicável.",
    ],
  },
  {
    title: "Infraestrutura e disponibilidade",
    paragraphs: [
      "A arquitetura da plataforma utiliza serviços de infraestrutura necessários à hospedagem, processamento e armazenamento de informações. São adotadas práticas de atualização, configuração e acompanhamento voltadas à continuidade e à redução de riscos operacionais.",
    ],
  },
  {
    title: "Backups e continuidade",
    paragraphs: [
      "Procedimentos de cópia, recuperação e continuidade podem ser adotados de acordo com a criticidade dos serviços e os recursos de infraestrutura utilizados, com o objetivo de reduzir impactos decorrentes de falhas ou incidentes.",
    ],
  },
  {
    title: "Monitoramento e prevenção",
    bullets: [
      "Acompanhamento de eventos relevantes de aplicação e infraestrutura.",
      "Prevenção e investigação de acessos indevidos ou comportamentos anômalos.",
      "Correções e atualizações de componentes quando necessárias.",
      "Revisão de controles diante de novos riscos ou mudanças relevantes na plataforma.",
    ],
  },
  {
    title: "Responsabilidade do usuário",
    paragraphs: [
      "A segurança também depende de boas práticas de quem utiliza a plataforma. O usuário deve proteger suas credenciais, manter dispositivos e navegadores atualizados e limitar o acesso apenas a pessoas autorizadas.",
    ],
    bullets: [
      "Não compartilhar senhas.",
      "Utilizar credenciais fortes e exclusivas.",
      "Encerrar acessos de colaboradores que não devem mais utilizar a plataforma.",
      "Comunicar imediatamente qualquer suspeita de comprometimento da conta.",
    ],
  },
  {
    title: "Gestão de incidentes",
    paragraphs: [
      "Quando identificado um evento de segurança relevante, a Flua poderá adotar medidas de contenção, investigação, correção e recuperação conforme a natureza e o impacto do incidente.",
      "Quando houver obrigação legal ou risco relevante a titulares de dados pessoais, serão observadas as comunicações previstas na legislação aplicável.",
    ],
  },
  {
    title: "Relato responsável de vulnerabilidades",
    paragraphs: [
      "Caso você identifique comportamento que possa representar uma vulnerabilidade na Flua, pedimos que não explore, divulgue publicamente ou acesse informações de terceiros. Utilize os canais oficiais da Flua para relatar o ocorrido com detalhes suficientes para análise.",
    ],
  },
  {
    title: "Evolução contínua",
    paragraphs: [
      "Segurança é um processo contínuo. Controles, processos e medidas técnicas podem ser atualizados conforme a evolução da plataforma, novas ameaças, alterações de infraestrutura e requisitos legais.",
    ],
  },
];

export default function SegurancaPage() {
  return (
    <LegalDocumentPage
      eyebrow="SEGURANÇA"
      title="Proteção pensada para sustentar o seu negócio."
      description="Conheça os princípios que orientam a proteção de contas, informações e continuidade dos serviços da Flua."
      updatedAt="23 de agosto de 2026"
      sections={sections}
    />
  );
}
