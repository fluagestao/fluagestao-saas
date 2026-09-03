import type { NextConfig } from "next";

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
];

const nextConfig: NextConfig = {
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
      { source: "/etiquetas", destination: "/cadastros/etiquetas", permanent: false },
      { source: "/insumos", destination: "/cadastros/insumos", permanent: false },
      { source: "/clientes", destination: "/cadastros/clientes", permanent: false },
      { source: "/fornecedores", destination: "/cadastros/fornecedores", permanent: false },
      { source: "/bairros", destination: "/cadastros/bairros", permanent: false },
      { source: "/horarios", destination: "/cadastros/horarios", permanent: false },

      { source: "/bia", destination: "/bia/simulador", permanent: false },

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
      { source: "/admin/conta/usuarios", destination: "/conta/usuarios", permanent: false },
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
      { source: "/financeiro/previsao", destination: "/admin" },

      { source: "/cadastros/produtos", destination: "/admin" },
      { source: "/cadastros/colecoes", destination: "/admin" },
      { source: "/cadastros/categorias", destination: "/admin" },
      { source: "/cadastros/etiquetas", destination: "/admin" },
      { source: "/cadastros/insumos", destination: "/admin" },
      { source: "/cadastros/clientes", destination: "/admin" },
      { source: "/cadastros/fornecedores", destination: "/admin" },
      { source: "/cadastros/financeiro/receitas", destination: "/admin" },
      { source: "/cadastros/financeiro/despesas", destination: "/admin" },
      { source: "/cadastros/bairros", destination: "/admin" },
      { source: "/cadastros/horarios", destination: "/admin" },

      { source: "/tarefas", destination: "/admin" },

      { source: "/bia/simulador", destination: "/admin" },
      { source: "/bia/conversas", destination: "/admin" },
      { source: "/bia/ajustes", destination: "/admin" },

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
      { source: "/conta/usuarios", destination: "/admin/conta/usuarios" },
      {
        source: "/conta/configuracoes",
        destination: "/admin/conta/configuracoes",
      },
    ];
  },
};

export default nextConfig;
