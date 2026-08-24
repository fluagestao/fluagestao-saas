import type { Metadata } from "next";
import LegalDocumentPage from "../LegalDocumentPage";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos de Uso da plataforma Flua Gestão.",
};

const sections = [
  {
    title: "Objeto e aceitação",
    paragraphs: [
      "Estes Termos de Uso regulam o acesso e a utilização da plataforma Flua Gestão e de seus recursos digitais. Ao criar uma conta, iniciar um período de teste ou utilizar a plataforma, o usuário declara que leu e concorda com estas condições.",
      "A Flua é uma solução de gestão voltada especialmente a negócios de cestas artesanais, tábuas de frios, presentes, kits e operações por encomenda, podendo disponibilizar funcionalidades de pedidos, clientes, produção, entregas, produtos, estoque, financeiro, relatórios, catálogo e outros recursos relacionados.",
    ],
  },
  {
    title: "Cadastro e conta",
    paragraphs: [
      "O usuário é responsável por fornecer informações verdadeiras, completas e atualizadas no cadastro, bem como por manter a confidencialidade das credenciais de acesso.",
      "A conta não deve ser compartilhada com pessoas não autorizadas. Qualquer atividade realizada por meio das credenciais cadastradas será atribuída à conta correspondente, ressalvadas hipóteses comprovadas de acesso indevido.",
    ],
    bullets: [
      "Utilizar senha segura e não compartilhá-la com terceiros.",
      "Comunicar prontamente suspeitas de acesso não autorizado.",
      "Manter dados cadastrais e informações do negócio atualizados.",
    ],
  },
  {
    title: "Uso permitido da plataforma",
    paragraphs: [
      "A plataforma deve ser utilizada para fins lícitos e compatíveis com sua finalidade. É proibida qualquer tentativa de violar mecanismos de segurança, acessar dados de terceiros sem autorização, interferir no funcionamento do serviço ou utilizar a Flua para práticas ilegais.",
    ],
    bullets: [
      "Não tentar contornar controles de acesso ou permissões.",
      "Não inserir código malicioso, realizar ataques ou explorar vulnerabilidades.",
      "Não utilizar dados de clientes, fornecedores ou terceiros em desacordo com a legislação aplicável.",
    ],
  },
  {
    title: "Dados inseridos pelo usuário",
    paragraphs: [
      "O usuário permanece responsável pela legitimidade, exatidão e base legal dos dados que inserir na plataforma, inclusive informações de clientes, produtos, endereços, pedidos e demais registros de sua operação.",
      "A Flua poderá processar essas informações na medida necessária à prestação dos serviços contratados, conforme sua Política de Privacidade e a legislação aplicável.",
    ],
  },
  {
    title: "Disponibilidade e evolução do serviço",
    paragraphs: [
      "A Flua busca manter a plataforma disponível e estável, mas poderá realizar manutenções, correções, atualizações e alterações necessárias à segurança, desempenho ou evolução do produto.",
      "Funcionalidades podem ser aprimoradas, substituídas ou descontinuadas, observadas as obrigações legais, contratuais e comunicações cabíveis.",
    ],
  },
  {
    title: "Planos, pagamentos e cancelamento",
    paragraphs: [
      "Condições de teste, planos, preços, recorrência, cobrança, renovação e cancelamento são apresentadas no momento da contratação ou na área correspondente da plataforma.",
      "O acesso a funcionalidades pagas poderá depender da confirmação do pagamento e da regularidade da assinatura. Em caso de inadimplência, o acesso poderá ser limitado ou suspenso conforme as condições informadas ao contratante.",
    ],
  },
  {
    title: "Propriedade intelectual",
    paragraphs: [
      "A marca Flua, sua identidade visual, software, interfaces, textos, estruturas, bases tecnológicas e demais elementos próprios são protegidos pela legislação de propriedade intelectual.",
      "A contratação não transfere ao usuário qualquer direito de propriedade sobre a plataforma, concedendo apenas o direito de utilização nos limites do plano e destes Termos.",
    ],
  },
  {
    title: "Responsabilidades",
    paragraphs: [
      "A Flua responde pelos serviços na forma da legislação aplicável. O usuário é responsável pelas decisões comerciais, fiscais, financeiras, operacionais e legais tomadas com base nas informações de sua própria operação.",
      "Integrações, meios de pagamento, serviços de terceiros e indisponibilidades externas podem estar sujeitos às condições e à infraestrutura de seus respectivos fornecedores.",
    ],
  },
  {
    title: "Suspensão e encerramento",
    paragraphs: [
      "O acesso poderá ser suspenso em caso de violação destes Termos, risco de segurança, utilização ilegal, inadimplência ou determinação legal. Sempre que possível e aplicável, o usuário será informado sobre a medida.",
      "O encerramento da conta não elimina obrigações pendentes nem afasta os prazos de retenção de dados exigidos por lei ou necessários ao exercício regular de direitos.",
    ],
  },
  {
    title: "Alterações e legislação aplicável",
    paragraphs: [
      "Estes Termos podem ser atualizados para refletir mudanças legais, técnicas ou comerciais. Alterações relevantes serão comunicadas por meios adequados.",
      "A relação será regida pela legislação brasileira. Quando houver relação de consumo, serão preservados os direitos e regras de competência previstos na legislação aplicável.",
    ],
  },
];

export default function TermosDeUsoPage() {
  return (
    <LegalDocumentPage
      eyebrow="TERMOS DE USO"
      title="Regras simples para uma relação transparente."
      description="Este documento estabelece as condições para cadastro, acesso e utilização da plataforma Flua Gestão."
      updatedAt="23 de agosto de 2026"
      sections={sections}
    />
  );
}
