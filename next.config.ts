import type { NextConfig } from "next";

/* Origem do Supabase para a CSP. Vem da mesma variavel que o cliente usa, com
   o mesmo padrao — se divergir, a CSP bloqueia o proprio banco. */
const SUPABASE_ORIGEM =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://dwfjwbyzhuefnwfgggyz.supabase.co";

/*
 * Content-Security-Policy.
 *
 * Entra em Report-Only de proposito. CSP errada nao degrada: ela quebra a
 * pagina inteira, e a lista abaixo foi montada lendo o codigo, nao observando
 * o site rodando. Em Report-Only o navegador registra a violacao no console e
 * nao bloqueia nada — da para navegar o site todo, ver o que reclamou e so
 * entao trocar para o header que bloqueia.
 *
 * 'unsafe-inline' em script e style tem motivo: o Next injeta script inline
 * para hidratacao e style inline no build. Tirar exige nonce por requisicao,
 * o que desliga a otimizacao estatica das paginas do site institucional.
 * E uma troca a fazer depois, com o site medido.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  // next/font baixa a fonte no build e serve do proprio dominio.
  "font-src 'self' data:",
  // blob: e data: cobrem a previa de imagem antes do upload.
  `img-src 'self' data: blob: ${SUPABASE_ORIGEM}`,
  // wss: o Supabase abre websocket para realtime.
  `connect-src 'self' ${SUPABASE_ORIGEM} ${SUPABASE_ORIGEM.replace("https://", "wss://")} https://viacep.com.br https://brasilapi.com.br`,
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

const nextConfig: NextConfig = {
  // Esconde "X-Powered-By: Next.js": versao de framework so ajuda quem procura
  // exploit conhecido.
  poweredByHeader: false,

  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  async redirects() {
    return [
      // Entradas antigas do painel passam a apontar para as rotas canônicas.
      { source: "/admin", destination: "/inicio", permanent: false },

      { source: "/pedidos", destination: "/vendas/pedidos", permanent: false },
      { source: "/a-receber", destination: "/vendas/a-receber", permanent: false },
      { source: "/realizadas", destination: "/vendas/realizadas", permanent: false },

      { source: "/entradas", destination: "/financeiro/entradas", permanent: false },
      { source: "/saidas", destination: "/financeiro/saidas", permanent: false },

      { source: "/produtos", destination: "/cadastros/produtos", permanent: false },
      { source: "/colecoes", destination: "/cadastros/colecoes", permanent: false },
      { source: "/categorias", destination: "/cadastros/categorias", permanent: false },
      { source: "/insumos", destination: "/cadastros/insumos", permanent: false },
      { source: "/clientes", destination: "/cadastros/clientes", permanent: false },
      { source: "/fornecedores", destination: "/cadastros/fornecedores", permanent: false },


      { source: "/produtos/novo", destination: "/cadastros/produtos/novo", permanent: false },
      {
        source: "/produtos/:id/editar",
        destination: "/cadastros/produtos/:id/editar",
        permanent: false,
      },
      {
        source: "/admin/cadastros/produtos",
        destination: "/cadastros/produtos",
        permanent: false,
      },
      {
        source: "/admin/cadastros/produtos/novo",
        destination: "/cadastros/produtos/novo",
        permanent: false,
      },
      {
        source: "/admin/cadastros/produtos/:id/editar",
        destination: "/cadastros/produtos/:id/editar",
        permanent: false,
      },
      {
        source: "/admin/cadastros/insumos",
        destination: "/cadastros/insumos",
        permanent: false,
      },

      { source: "/admin/conta/empresa", destination: "/conta/empresa", permanent: false },
      { source: "/admin/conta/plano", destination: "/conta/plano", permanent: false },
      {
        source: "/admin/conta/configuracoes",
        destination: "/conta/configuracoes",
        permanent: false,
      },
    ];
  },

  async rewrites() {
    return [
      // Rotas canônicas do painel. O navegador mantém a URL amigável,
      // enquanto o conteúdo continua sendo servido pelo painel existente.
      { source: "/inicio", destination: "/admin" },

      { source: "/vendas/pedidos", destination: "/admin" },
      { source: "/vendas/a-receber", destination: "/admin" },
      { source: "/vendas/realizadas", destination: "/admin" },

      { source: "/dashboard", destination: "/admin" },
      { source: "/margem", destination: "/admin" },
      { source: "/custo/calculadora", destination: "/admin" },
      { source: "/custo/simulador", destination: "/admin" },
      { source: "/custo/cozinha", destination: "/admin" },
      { source: "/custo", destination: "/admin" },
      { source: "/estoque", destination: "/admin" },

      { source: "/financeiro/entradas", destination: "/admin" },
      { source: "/financeiro/saidas", destination: "/admin" },
      { source: "/financeiro/a-pagar", destination: "/admin" },

      { source: "/cadastros/produtos", destination: "/admin" },
      { source: "/cadastros/colecoes", destination: "/admin" },
      { source: "/cadastros/categorias", destination: "/admin" },
      { source: "/cadastros/insumos", destination: "/admin" },
      { source: "/cadastros/clientes", destination: "/admin" },
      { source: "/cadastros/fornecedores", destination: "/admin" },
      { source: "/cadastros/financeiro/receitas", destination: "/admin" },
      { source: "/cadastros/financeiro/despesas", destination: "/admin" },

      { source: "/tarefas", destination: "/admin" },


      {
        source: "/cadastros/produtos/novo",
        destination: "/admin/cadastros/produtos/novo",
      },
      {
        source: "/cadastros/produtos/:id/editar",
        destination: "/admin/cadastros/produtos/:id/editar",
      },

      { source: "/conta/empresa", destination: "/admin/conta/empresa" },
      { source: "/conta/plano", destination: "/admin/conta/plano" },
      {
        source: "/conta/configuracoes",
        destination: "/admin/conta/configuracoes",
      },
    ];
  },
};

export default nextConfig;
