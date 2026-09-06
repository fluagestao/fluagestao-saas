import type { ReactNode } from "react";
import { Check } from "lucide-react";

import "./format-comparison.css";

/* A tabela existe porque os tres cards de preco levantam a pergunta "qual e a
   diferenca de verdade" e nao respondem: cada card lista o que TEM, nenhum
   mostra o que NAO tem. Aqui as tres colunas ficam lado a lado e a resposta
   aparece de uma olhada. */

type Linha = {
  nome: ReactNode;
  site: boolean;
  ambos: boolean;
  sistema: boolean;
};

const linhas: Linha[] = [
  { nome: <><strong>Catálogo online</strong> com a sua marca</>, site: true, ambos: true, sistema: false },
  { nome: <>Página de produto com opções e <strong>adicionais</strong></>, site: true, ambos: true, sistema: false },
  { nome: <>Carrinho e <strong>pedido pronto no seu WhatsApp</strong></>, site: true, ambos: true, sistema: false },
  { nome: <>Domínio, hospedagem e publicação</>, site: true, ambos: true, sistema: false },
  { nome: <><strong>Pedido do site entrando sozinho</strong> no sistema</>, site: false, ambos: true, sistema: false },
  { nome: <>Controle de pedidos e produção</>, site: false, ambos: true, sistema: true },
  { nome: <>Entregas, clientes e histórico</>, site: false, ambos: true, sistema: true },
  { nome: <>Financeiro e relatórios de vendas</>, site: false, ambos: true, sistema: true },
  { nome: <>Mensagens automáticas no WhatsApp</>, site: false, ambos: true, sistema: true },
  { nome: <><strong>Plano de indicação</strong> — 1 mês grátis por cliente indicado</>, site: false, ambos: true, sistema: true },
  { nome: <>Configuração, treinamento e suporte</>, site: true, ambos: true, sistema: true },
];

/* O simbolo e decorativo: quem usa leitor de tela ouve a palavra da celula,
   nao o desenho. Por isso o aria-hidden no icone e o texto em .sr-only. */
function Celula({ tem, coluna }: { tem: boolean; coluna: string }) {
  return (
    <td className={tem ? "flua2-compare-sim" : "flua2-compare-nao"}>
      {tem ? <Check size={17} aria-hidden="true" /> : <span aria-hidden="true">—</span>}
      <span className="flua2-compare-leitura">
        {tem ? `Incluído em ${coluna}` : `Não incluído em ${coluna}`}
      </span>
    </td>
  );
}

export default function FormatComparison() {
  return (
    <section id="formatos" className="flua2-section flua2-compare">
      <div className="flua2-shell">
        <div className="flua2-centered-heading">
          <span className="flua2-kicker">como contratar</span>
          <h2>Três formatos. O que cada um entrega.</h2>
        </div>

        <div className="flua2-compare-quadro">
          <table>
            <caption className="flua2-compare-leitura">
              Comparação do que está incluído em cada formato de contratação
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  <span className="flua2-compare-leitura">Recurso</span>
                </th>
                <th scope="col">Só o site</th>
                <th scope="col" className="flua2-compare-destaque">Site + sistema</th>
                <th scope="col">Só o sistema</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha, indice) => (
                <tr key={indice}>
                  <th scope="row">{linha.nome}</th>
                  <Celula tem={linha.site} coluna="só o site" />
                  <Celula tem={linha.ambos} coluna="site + sistema" />
                  <Celula tem={linha.sistema} coluna="só o sistema" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="flua2-compare-nota">
          <strong>Só o site</strong> organiza a venda. <strong>Só o sistema</strong> organiza
          o que vem depois dela. <strong>Juntos</strong>, ninguém digita nada — o pedido nasce
          no site e cai no sistema sozinho. E juntos a mensalidade do sistema cai para{" "}
          <strong>R$ 95,00</strong> — contratado separado, são R$ 170,00.
        </p>
      </div>
    </section>
  );
}
