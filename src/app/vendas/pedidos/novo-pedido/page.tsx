import { redirect } from "next/navigation";

/**
 * Novo pedido deve ser aberto dentro do painel padrão de Vendas.
 * A tela isolada antiga não compartilhava o mesmo shell responsivo do restante
 * do SaaS e acabava ficando cortada/desalinhada em diferentes resoluções.
 */
export default function NovoPedidoPage() {
  redirect("/vendas/pedidos");
}
