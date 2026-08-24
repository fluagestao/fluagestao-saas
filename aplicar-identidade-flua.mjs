import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const publicDir = path.join(root, "public");
const sourceDir = path.join(root, "flua-identidade-assets");
const layoutPath = path.join(root, "src", "app", "layout.tsx");

if (!fs.existsSync(layoutPath)) {
  throw new Error("Execute este script na raiz do projeto fluagestao-next.");
}

fs.mkdirSync(publicDir, { recursive: true });

for (const file of ["favicon.ico", "favicon.png", "apple-touch-icon.png", "og-flua.png"]) {
  const src = path.join(sourceDir, file);
  if (!fs.existsSync(src)) throw new Error(`Arquivo ausente: ${file}`);
  fs.copyFileSync(src, path.join(publicDir, file));
  console.log(`OK: public/${file}`);
}

let layout = fs.readFileSync(layoutPath, "utf8");

const metadataRegex = /export const metadata: Metadata = \{[\s\S]*?\n\};/;
const metadata = `export const metadata: Metadata = {
  metadataBase: new URL("https://www.fluagestao.com.br"),
  title: {
    default: "Flua Gestão | Gestão simples. Negócio fluindo.",
    template: "%s | Flua Gestão",
  },
  description:
    "Organize pedidos, financeiro, clientes, produtos e a rotina do seu negócio em um só lugar com a Flua Gestão.",
  applicationName: "Flua Gestão",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://www.fluagestao.com.br",
    siteName: "Flua Gestão",
    title: "Flua Gestão | Gestão simples. Negócio fluindo.",
    description:
      "Organize pedidos, financeiro, clientes, produtos e a rotina do seu negócio em um só lugar.",
    images: [
      {
        url: "/og-flua.png",
        width: 1200,
        height: 630,
        alt: "Flua Gestão — gestão simples. negócio fluindo.",
      },
    ],
  },
};`;

if (!metadataRegex.test(layout)) {
  throw new Error("Não encontrei o bloco export const metadata em src/app/layout.tsx.");
}

layout = layout.replace(metadataRegex, metadata);
layout = layout.replace('lang="en"', 'lang="pt-BR"');

fs.writeFileSync(layoutPath, layout, "utf8");
console.log("OK: metadata e idioma atualizados em src/app/layout.tsx");
console.log("");
console.log("Agora rode: npm run build");
