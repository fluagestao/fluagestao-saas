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
      {
        source: "/admin/cadastros/produtos",
        destination: "/produtos",
        permanent: false,
      },
      {
        source: "/admin/cadastros/produtos/novo",
        destination: "/produtos/novo",
        permanent: false,
      },
      {
        source: "/admin/cadastros/produtos/:id/editar",
        destination: "/produtos/:id/editar",
        permanent: false,
      },
      {
        source: "/admin/cadastros/insumos",
        destination: "/insumos",
        permanent: false,
      },
    ];
  },

  async rewrites() {
    return [
      { source: "/pedidos", destination: "/admin" },
      { source: "/a-receber", destination: "/admin" },
      { source: "/realizadas", destination: "/admin" },
      { source: "/dashboard", destination: "/admin" },
      { source: "/entradas", destination: "/admin" },
      { source: "/saidas", destination: "/admin" },
      { source: "/colecoes", destination: "/admin" },
      { source: "/categorias", destination: "/admin" },
      { source: "/etiquetas", destination: "/admin" },
      { source: "/clientes", destination: "/admin" },
      { source: "/fornecedores", destination: "/admin" },
      { source: "/bairros", destination: "/admin" },
      { source: "/horarios", destination: "/admin" },
      { source: "/tarefas", destination: "/admin" },
      { source: "/bia", destination: "/admin" },
      { source: "/bia/conversas", destination: "/admin" },
      { source: "/bia/ajustes", destination: "/admin" },
      {
        source: "/produtos/novo",
        destination: "/admin/cadastros/produtos/novo",
      },
      {
        source: "/produtos/:id/editar",
        destination: "/admin/cadastros/produtos/:id/editar",
      },
    ];
  },
};

export default nextConfig;
