import { Eye, MoreVertical, Search } from "lucide-react";

const orders = [
  { id: "#9281", date: "24/05/2025 10:32", client: "Ana Paula Souza", phone: "(11) 98765-4321", product: "Cesta Romântica", ref: "CR-001", origin: "WhatsApp", originTone: "whatsapp", total: "R$ 259,90", delivery: "Entrega", when: "26/05/2025 (manhã)", status: "Novo", statusTone: "new" },
  { id: "#9280", date: "24/05/2025 09:15", client: "Juliana Martins", phone: "(11) 91234-5678", product: "Cesta Café da Manhã", ref: "CCM-002", origin: "WhatsApp", originTone: "whatsapp", total: "R$ 149,90", delivery: "Entrega", when: "25/05/2025 (tarde)", status: "Em produção", statusTone: "production" },
  { id: "#9279", date: "23/05/2025 16:45", client: "Camila Ribeiro", phone: "(11) 99876-5432", product: "Tábua Premium", ref: "TP-003", origin: "Instagram", originTone: "instagram", total: "R$ 329,90", delivery: "Entrega", when: "26/05/2025 (manhã)", status: "Aguardando retirada", statusTone: "waiting" },
  { id: "#9278", date: "23/05/2025 14:20", client: "Marina Lopes", phone: "(11) 97654-3210", product: "Presente Especial", ref: "PE-004", origin: "Manual", originTone: "manual", total: "R$ 414,90", delivery: "Retirada na loja", when: "24/05/2025 15:00", status: "Em produção", statusTone: "production" },
  { id: "#9277", date: "22/05/2025 11:08", client: "Beatriz Lima", phone: "(11) 93456-7890", product: "Cesta Maternidade", ref: "CM-005", origin: "WhatsApp", originTone: "whatsapp", total: "R$ 289,90", delivery: "Entrega", when: "23/05/2025 (tarde)", status: "Entregue", statusTone: "done" },
  { id: "#9276", date: "22/05/2025 17:30", client: "Rodrigo Almeida", phone: "(11) 98888-1111", product: "Tábua Happy Hour", ref: "THH-006", origin: "WhatsApp", originTone: "whatsapp", total: "R$ 189,90", delivery: "Retirada na loja", when: "22/05/2025 16:00", status: "Entregue", statusTone: "done" },
  { id: "#9275", date: "21/05/2025 10:50", client: "Patrícia Duarte", phone: "(11) 91111-2222", product: "Cesta Romântica", ref: "CR-007", origin: "Instagram", originTone: "instagram", total: "R$ 259,90", delivery: "Entrega", when: "23/05/2025 (manhã)", status: "Novo", statusTone: "new" },
  { id: "#9274", date: "20/05/2025 15:12", client: "Gabriela Nunes", phone: "(11) 92222-3333", product: "Cesta Café da Manhã", ref: "CCM-008", origin: "WhatsApp", originTone: "whatsapp", total: "R$ 149,90", delivery: "Entrega", when: "22/05/2025 (tarde)", status: "Aguardando retirada", statusTone: "waiting" },
  { id: "#9273", date: "19/05/2025 09:40", client: "Carlos Eduardo", phone: "(11) 93333-4444", product: "Presente Especial", ref: "PE-009", origin: "Manual", originTone: "manual", total: "R$ 414,90", delivery: "Retirada na loja", when: "20/05/2025 14:00", status: "Cancelado", statusTone: "cancelled" },
  { id: "#9272", date: "18/05/2025 13:25", client: "Larissa Mello", phone: "(11) 94444-5555", product: "Tábua Premium", ref: "TP-010", origin: "WhatsApp", originTone: "whatsapp", total: "R$ 329,90", delivery: "Entrega", when: "19/05/2025 (manhã)", status: "Entregue", statusTone: "done" },
];

export default function SalesPreviewDemo() {
  return (
    <div className="cv-sales-preview cv-sales-demo" aria-label="Prévia do controle de vendas Flua">
      <div className="cv-demo-topbar">
        <div>
          <span className="cv-demo-kicker">VENDAS</span>
          <strong>Pedidos</strong>
          <small>Pedidos do site entram sozinhos. Os que chegam por telefone ou Instagram, lance aqui.</small>
        </div>
        <button type="button"><span>+</span> Novo pedido</button>
      </div>

      <div className="cv-demo-summary">
        <article><span>FATURAMENTO DO MÊS</span><strong>R$ 3.243,30</strong></article>
        <article><span>PEDIDOS NO MÊS</span><strong>12</strong></article>
        <article><span>EM ABERTO</span><strong>5</strong></article>
      </div>

      <div className="cv-demo-controls">
        <div className="cv-demo-view-tabs"><span className="active">☷ Lista</span><span>⊞ Quadro</span></div>
        <div className="cv-demo-statuses"><span className="active">Novo</span><span>Em produção</span><span>Aguardando retirada</span><span>Entregue</span><span>Cancelado</span><span>Todos</span></div>
      </div>

      <div className="cv-demo-search"><Search size={14} /><span>Buscar por nome ou WhatsApp</span></div>

      <div className="cv-demo-table">
        <div className="cv-demo-row cv-demo-head">
          <span>PEDIDO</span><span>CLIENTE</span><span>PRODUTO</span><span>ORIGEM</span><span>TOTAL</span><span>ENTREGA / RETIRADA</span><span>STATUS</span><span>AÇÕES</span>
        </div>
        {orders.map((order) => (
          <div className="cv-demo-row" key={order.id}>
            <div><b>{order.id}</b><small>{order.date}</small></div>
            <div><b>{order.client}</b><small className="phone">● {order.phone}</small></div>
            <div><b>{order.product}</b><small>Ref: {order.ref}</small></div>
            <div><em className={`origin ${order.originTone}`}>{order.origin}</em></div>
            <div><strong>{order.total}</strong></div>
            <div><b>{order.delivery}</b><small>{order.when}</small></div>
            <div><i className={`status ${order.statusTone}`}>{order.status}</i></div>
            <div className="cv-demo-actions"><button aria-label={`Visualizar ${order.id}`}><Eye size={13} /></button><button aria-label={`Mais ações ${order.id}`}><MoreVertical size={13} /></button></div>
          </div>
        ))}
      </div>
    </div>
  );
}
