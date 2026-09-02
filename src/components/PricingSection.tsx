import { ArrowRight, Check, Sparkles } from "lucide-react";

const WHATSAPP_NUMBER = "5548996510100";

/* Mensagem sem preco de proposito: ela abre editavel no WhatsApp, entao um
   valor escrito ali e um numero que a pessoa pode alterar antes de enviar. O
   preco fica so nos cards, com uma fonte de verdade. */
function whatsappLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export default function PricingSection() {
  return (
    <section id="planos" className="flua2-section flua2-pricing">
      <div className="flua2-shell">
        <div className="flua2-centered-heading flua2-investment-heading">
          <span className="flua2-kicker">investimento</span>
          <h2>Três formas de começar.</h2>
          <p>
            Escolha o ponto de entrada que faz sentido para o seu negócio.
          </p>
        </div>

        <div className="flua2-investment-grid">
          <article className="flua2-investment-card">
            <div className="flua2-investment-option">OPÇÃO 1</div>
            <h3>Site</h3>

            <p className="flua2-investment-description">
              Para quem quer o catálogo online e segue fechando tudo no WhatsApp.
            </p>

            <div className="flua2-investment-price">
              <strong>R$ 1.000,00</strong>
              <span>implantação</span>
            </div>

            <div className="flua2-investment-monthly">
              <div><b>+ R$ 40,00</b><span>/ mês</span></div>
              <small>domínio e hospedagem</small>
            </div>

            <div className="flua2-investment-features">
              {[
                "Catálogo com a identidade da sua marca",
                "Página de produto com opções e adicionais",
                "Carrinho com o total somado",
                "Finalização do pedido no seu WhatsApp",
                "Site responsivo, feito para o celular",
                "Publicação, domínio e suporte",
              ].map((item) => (
                <p key={item}><Check size={15} />{item}</p>
              ))}
            </div>

            <a
              href={whatsappLink(
                "Oi! Quero o site da Flua para o meu catálogo, seguindo com os pedidos no WhatsApp. Como começamos?",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flua2-btn flua2-btn-wine flua2-investment-button"
            >
              Quero começar <ArrowRight size={17} />
            </a>
          </article>

          <article className="flua2-investment-card flua2-investment-featured">
            <span className="flua2-investment-badge">MAIS COMPLETO</span>

            <div className="flua2-investment-option">OPÇÃO 2</div>

            <h3>
              Site + Sistema
              <small>integrados</small>
            </h3>

            <p className="flua2-investment-description">
              O catálogo vendendo e o sistema controlando — os dois conversando entre si.
            </p>

            <div className="flua2-investment-price">
              <strong>R$ 1.500,00</strong>
              <span>implantação</span>
            </div>

            <div className="flua2-investment-monthly">
              <div><b>+ R$ 170,00</b><span>/ mês</span></div>
              <small>domínio, hospedagem e sistema</small>
            </div>

            <div className="flua2-investment-features">
              {[
                "Tudo o que está na opção 1",
                "Pedidos do site entrando sozinhos no sistema",
                "Controle de produção, entregas e clientes",
                "Financeiro e relatórios de vendas",
                "Produtos e preços em um lugar só",
                "Configuração completa e treinamento",
              ].map((item) => (
                <p key={item}><Check size={15} />{item}</p>
              ))}

              <p className="flua2-investment-ai">
                <Sparkles size={15} />
                IA Consultora grátis (100 primeiros)
              </p>
            </div>

            <a
              href={whatsappLink(
                "Oi! Quero o site e o sistema da Flua integrados — o catálogo vendendo e os pedidos organizados. Como começamos?",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flua2-btn flua2-btn-wine flua2-investment-button"
            >
              Quero o mais completo <ArrowRight size={17} />
            </a>
          </article>

          <article className="flua2-investment-card">
            <div className="flua2-investment-option">OPÇÃO 3</div>

            <h3>Sistema</h3>

            <p className="flua2-investment-description">
              Para quem já tem site ou vende só pelo WhatsApp e Instagram.
            </p>

            <div className="flua2-investment-price flua2-investment-no-setup">
              <strong>Sem implantação</strong>
            </div>

            <div className="flua2-investment-monthly">
              <div><b>R$ 170,00</b><span>/ mês</span></div>
              <small>sistema completo e suporte</small>
            </div>

            <div className="flua2-investment-features">
              {[
                "Pedidos do primeiro contato à entrega",
                "Produção e o que montar em cada dia",
                "Clientes, histórico e datas especiais",
                "Entregas com agenda e status",
                "Financeiro, entradas e saídas",
                "Relatórios do que mais vende",
              ].map((item) => (
                <p key={item}><Check size={15} />{item}</p>
              ))}

              <p className="flua2-investment-ai">
                <Sparkles size={15} />
                IA Consultora grátis (100 primeiros)
              </p>
            </div>

            <a
              href={whatsappLink(
                "Oi! Quero o sistema da Flua para organizar pedidos, produção e financeiro. Como começamos?",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flua2-btn flua2-btn-wine flua2-investment-button"
            >
              Quero usar a Flua <ArrowRight size={17} />
            </a>
          </article>
        </div>

        <div className="flua2-investment-payment">
          <p><strong>Implantação:</strong> 50% para iniciar e 50% na entrega.</p>
          <p><strong>À vista antecipado:</strong> 5% de desconto.</p>
          <p><strong>Mensalidade:</strong> começa quando o site entra no ar.</p>
        </div>
      </div>
    </section>
  );
}
