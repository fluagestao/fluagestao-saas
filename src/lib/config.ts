/**
 * Configuração temporária da futura vitrine pública.
 *
 * O Flua é multiempresa: estes valores não devem virar a identidade de uma
 * empresa específica. Quando a vitrine por empresa for ativada, eles devem
 * vir das configurações do tenant.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const WHATSAPP_NUMERO =
  process.env.NEXT_PUBLIC_FLUA_STORE_WHATSAPP || "";

export const INSTAGRAM =
  process.env.NEXT_PUBLIC_FLUA_STORE_INSTAGRAM || "";

export const INSTAGRAM_URL = INSTAGRAM
  ? `https://instagram.com/${INSTAGRAM}`
  : "#";

export const GOOGLE_REVIEWS_URL = "#";
export const MARCA = "Flua Gestão";
export const CIDADE = "";
export const BAIRRO_RETIRADA = "";
export const ENDERECO = "";
export const MAPS_URL = "#";
export const ENDERECO_COMPLETO = "";

export const SITE_DESCRICAO =
  "Gestão de pedidos, produção, catálogo, clientes e financeiro para negócios artesanais.";

export function whatsappLink(mensagem: string) {
  const numero = WHATSAPP_NUMERO.replace(/\D/g, "");
  return numero
    ? `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`
    : "#";
}

export function mensagemOrcamento(
  produto: {
    nome: string;
    preco?: number | null;
  },
  template?: string | null,
) {
  const preco =
    produto.preco != null
      ? `R$ ${produto.preco.toFixed(2).replace(".", ",")}`
      : "valor a consultar";

  if (template) {
    return template
      .replaceAll("{produto}", produto.nome)
      .replaceAll("{preco}", preco);
  }

  return `Olá! Tenho interesse no(a) *${produto.nome}* (${preco}).`;
}

export function mensagemGenerica() {
  return "Olá! Gostaria de mais informações.";
}
