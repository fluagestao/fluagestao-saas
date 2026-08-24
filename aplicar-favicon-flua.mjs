import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const publicDir = path.join(root, "public");
const assetsDir = path.join(root, "flua-favicon-assets");
const layoutPath = path.join(root, "src", "app", "layout.tsx");

if (!fs.existsSync(layoutPath)) {
  throw new Error("Execute este script na raiz do projeto fluagestao-next.");
}

fs.mkdirSync(publicDir, { recursive: true });

for (const file of ["favicon.ico", "favicon.png", "apple-touch-icon.png"]) {
  const origem = path.join(assetsDir, file);
  const destino = path.join(publicDir, file);

  if (!fs.existsSync(origem)) {
    throw new Error(`Arquivo não encontrado: ${origem}`);
  }

  fs.copyFileSync(origem, destino);
  console.log(`OK: public/${file}`);
}

let layout = fs.readFileSync(layoutPath, "utf8");

layout = layout.replace(
  /title:\s*\{\s*default:\s*"[^"]*",\s*template:\s*"[^"]*",\s*\}/,
  `title: {
    default: "Flua Gestão",
    template: "%s | Flua Gestão",
  }`,
);

if (!layout.includes('default: "Flua Gestão"')) {
  throw new Error("Não consegui localizar/alterar o título em src/app/layout.tsx.");
}

fs.writeFileSync(layoutPath, layout, "utf8");

console.log("OK: título do navegador alterado para Flua Gestão");
console.log("");
console.log("Agora rode: npm run build");
