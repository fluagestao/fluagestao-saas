import fs from "node:fs";
import path from "node:path";

const root = "C:\\Users\\G3\\Desktop\\fluagestao-next";
const backupRoot = path.join(root, "backup-limpeza-ab");

function p(rel) {
  return path.join(root, ...rel.split("/"));
}

function read(rel) {
  const file = p(rel);
  if (!fs.existsSync(file)) throw new Error(`Arquivo não encontrado: ${rel}`);
  return fs.readFileSync(file, "utf8");
}

function backup(rel) {
  const src = p(rel);
  const dst = path.join(backupRoot, ...rel.split("/"));
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  if (!fs.existsSync(dst)) fs.copyFileSync(src, dst);
}

function write(rel, text) {
  backup(rel);
  fs.writeFileSync(p(rel), text.replace(/\r?\n/g, "\n"), "utf8");
  console.log(`OK: ${rel}`);
}

function replaceOnce(text, regex, replacement, label) {
  if (!regex.test(text)) throw new Error(`Não encontrei o trecho esperado: ${label}`);
  regex.lastIndex = 0;
  return text.replace(regex, replacement);
}

console.log("\n1/6 - Prompt da BIA multiempresa");

const prompt = `/**
 * Prompt padrão da BIA.
 *
 * A BIA representa a empresa usuária da Flua, nunca uma marca fixa da plataforma.
 * {{EMPRESA_NOME}} é substituído no servidor pelo nome da empresa logada.
 */
export const PROMPT_PADRAO = \`Você é a BIA, assistente virtual comercial da empresa {{EMPRESA_NOME}}.

# Seu papel

Você ajuda clientes com atendimento, dúvidas comerciais, catálogo, pedidos e informações da empresa.
Fale em português do Brasil, de forma humana, clara, educada e objetiva.

Não presuma o segmento, os produtos, a cidade, formas de pagamento, prazos, taxas, políticas ou condições da empresa.
Use somente as informações que estiverem disponíveis no contexto, no catálogo, no pedido ou nas configurações da empresa.

# Regras principais

- Nunca invente produto, preço, estoque, prazo, promoção, endereço, taxa ou condição de pagamento.
- Quando uma informação não estiver disponível, diga que precisa confirmar com a equipe.
- Não prometa descontos, brindes ou condições que não estejam informados.
- Não solicite senha, número completo de cartão ou qualquer credencial.
- Se o cliente pedir atendimento humano, informe que vai encaminhar para a equipe.
- Se houver dúvida importante ou risco de informar algo incorreto, priorize a confirmação humana.
- Trate cada empresa como uma operação independente.
- Nunca mencione outra empresa, cliente ou marca fixa do sistema.

# Conversa

Faça uma pergunta por vez quando precisar coletar dados.
Evite mensagens longas e linguagem de robô.
Quando o cliente já informou algo, não peça a mesma informação novamente.
Quando houver um pedido, confirme os dados de forma organizada antes de concluir.

# WhatsApp

Prefira mensagens curtas e naturais.
Quando precisar dividir uma resposta em mensagens separadas, use [--].
Use no máximo três blocos por resposta.

# Identidade

Você representa {{EMPRESA_NOME}}, não a Flua Gestão.
A Flua é apenas o sistema utilizado pela empresa e não deve ser apresentada como a vendedora dos produtos ou serviços.\`;

export function contextoDoDia(opts: {
  hojeISO: string;
  hojeTexto: string;
  amanhaISO: string;
  amanhaTexto: string;
  atendimento: string;
  waId?: string | null;
  nomeConhecido?: string | null;
}): string {
  return \`

# Agora

Hoje é \${opts.hojeTexto} — **\${opts.hojeISO}**.
Amanhã é \${opts.amanhaTexto} — **\${opts.amanhaISO}**.

Sempre que trabalhar com datas, use o formato AAAA-MM-DD e considere o ano informado acima.

\${opts.atendimento}\${
    opts.waId
      ? \`

Você está conversando com o WhatsApp **\${opts.waId}**\${
          opts.nomeConhecido ? \` (\${opts.nomeConhecido})\` : ""
        }. Esse é o contato atual da conversa.\`
      : ""
  }\`;
}
`;
write("src/lib/bia-prompt.ts", prompt);

console.log("\n2/6 - BIA usando o nome da empresa");

{
  const rel = "src/lib/bia.ts";
  let t = read(rel);

  if (!t.includes("function promptDaEmpresa(")) {
    t = replaceOnce(
      t,
      /type Supabase = Contexto\["supabase"\];/,
      `type Supabase = Contexto["supabase"];

async function nomeDaEmpresa(supabase: Supabase, companyId: string): Promise<string> {
  const { data, error } = await supabase
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .maybeSingle();

  if (error) throw error;
  return data?.name?.trim() || "sua empresa";
}

function promptDaEmpresa(prompt: string, companyName: string): string {
  return prompt.replaceAll("{{EMPRESA_NOME}}", companyName);
}`,
      "helper da BIA",
    );
  }

  if (!/export async function carregarBia\(\)[\s\S]*?const companyName = await nomeDaEmpresa/.test(t)) {
    t = replaceOnce(
      t,
      /(export async function carregarBia\(\)\s*\{\s*const \{ supabase, companyId \} = await requireCompany\(\);)/,
      `$1
  const companyName = await nomeDaEmpresa(supabase, companyId);`,
      "carregarBia / companyName",
    );
  }

  t = t.replace(
    "prompt: config.prompt ?? PROMPT_PADRAO,",
    "prompt: promptDaEmpresa(config.prompt ?? PROMPT_PADRAO, companyName),",
  );

  if (!/export async function enviarParaBia[\s\S]*?const companyName = await nomeDaEmpresa/.test(t)) {
    t = replaceOnce(
      t,
      /(export async function enviarParaBia\(input: \{ data: unknown \}\)[\s\S]*?const \{ supabase, companyId \} = await requireCompany\(\);)/,
      `$1
  const companyName = await nomeDaEmpresa(supabase, companyId);`,
      "enviarParaBia / companyName",
    );
  }

  t = t.replace(
    "prompt: config?.prompt || PROMPT_PADRAO,",
    "prompt: promptDaEmpresa(config?.prompt || PROMPT_PADRAO, companyName),",
  );

  write(rel, t);
}

console.log("\n3/6 - WhatsApp sem marca fixa");

{
  const rel = "src/lib/vendas.ts";
  let t = read(rel);

  t = t.replace(
    /export function mensagemRetomada\(pedido: Pedido\): string \{/,
    'export function mensagemRetomada(pedido: Pedido, empresaNome = "Sua empresa"): string {',
  );

  if (!/mensagemRetomada[\s\S]*?const empresa = empresaNome\.trim\(\)/.test(t)) {
    t = replaceOnce(
      t,
      /(export function mensagemRetomada[\s\S]*?const nome = primeiroNome\(pedido\.cliente_nome\);)/,
      `$1
  const empresa = empresaNome.trim() || "Sua empresa";`,
      "mensagemRetomada / empresa",
    );
  }

  t = t.replace(
    "? `Oi, ${nome}! 🤍 Aqui é da *AB Sabor na Caixa*.`",
    "? `Oi, ${nome}! 🤍 Aqui é da *${empresa}*.`",
  );
  t = t.replace(
    ': "Oi! 🤍 Aqui é da *AB Sabor na Caixa*.",',
    ': `Oi! 🤍 Aqui é da *${empresa}*.`,',
  );
  t = t.replace(
    /export function linkRetomada\(pedido: Pedido\): string \| null \{/,
    'export function linkRetomada(pedido: Pedido, empresaNome = "Sua empresa"): string | null {',
  );
  t = t.replace(
    "return `${base}?text=${encodeURIComponent(mensagemRetomada(pedido))}`;",
    "return `${base}?text=${encodeURIComponent(mensagemRetomada(pedido, empresaNome))}`;",
  );
  t = t.replace(
    " * Para editar o texto: é aqui, no código — a AB decidiu não ter isso na UI.",
    " * O nome da empresa é recebido do painel para não existir marca fixa no SaaS.",
  );

  write(rel, t);
}

console.log("\n4/6 - Ficha de pedido multiempresa");

{
  const rel = "src/lib/ficha-pedido.ts";
  let t = read(rel);

  t = t.replace(
    /export function htmlDaFicha\(p: Pedido\): string \{/,
    `export function htmlDaFicha(p: Pedido, empresaNome = "Sua empresa"): string {
  const empresa = esc(empresaNome.trim() || "Sua empresa");`,
  );

  t = t.replace(
    "<title>Pedido #${p.numero} — AB Sabor na Caixa</title>",
    "<title>Pedido #${p.numero} — ${empresa}</title>",
  );

  t = t.replace(
    "  .logo { height: 16mm; }",
    `  .marca { text-align: right; max-width: 58mm; }
  .marca strong { display: block; color: #703D3A; font-size: 12pt; }
  .marca span { display: block; margin-top: 1mm; color: #9a8578; font-size: 7.5pt; }`,
  );

  t = t.replace(
    '    <img class="logo" src="/logo-ab-terracota.png" alt="AB Sabor na Caixa">',
    '    <div class="marca"><strong>${empresa}</strong><span>Gestão via Flua</span></div>',
  );

  t = t.replace(
    '  <div class="rodape"><span>AB Sabor na Caixa • Tubarão/SC</span><span>absabornacaixa.com.br</span></div>',
    '  <div class="rodape"><span>${empresa}</span><span>Gerado pela Flua Gestão</span></div>',
  );

  t = t.replace(
    /export function imprimirFicha\(p: Pedido\): boolean \{/,
    'export function imprimirFicha(p: Pedido, empresaNome = "Sua empresa"): boolean {',
  );

  t = t.replace(
    "janela.document.write(htmlDaFicha(p));",
    "janela.document.write(htmlDaFicha(p, empresaNome));",
  );

  write(rel, t);
}

console.log("\n5/6 - Nome da empresa chegando ao módulo de Vendas");

{
  const rel = "src/components/admin/PedidoCard.tsx";
  let t = read(rel);

  if (!t.includes('empresaNome = "Sua empresa"')) {
    t = replaceOnce(
      t,
      /export function PedidoCard\(\{\s*pedido: p,\s*acoes,\s*compacto = false,\s*className,\s*\}:\s*\{\s*pedido: Pedido;\s*acoes: AcoesPedido;\s*compacto\?: boolean;\s*className\?: string;\s*\}\)\s*\{/,
      `export function PedidoCard({
  pedido: p,
  acoes,
  compacto = false,
  className,
  empresaNome = "Sua empresa",
}: {
  pedido: Pedido;
  acoes: AcoesPedido;
  compacto?: boolean;
  className?: string;
  empresaNome?: string;
}) {`,
      "PedidoCard / empresaNome",
    );
  }

  t = t.replaceAll("imprimirFicha(p)", "imprimirFicha(p, empresaNome)");
  t = t.replaceAll("mensagemRetomada(p)", "mensagemRetomada(p, empresaNome)");

  write(rel, t);
}

{
  const rel = "src/components/admin/VendasPanel.tsx";
  let t = read(rel);

  t = t.replace(
    'const CHAVE_VISAO = "ab-admin-vendas-visao";',
    'const CHAVE_VISAO = "flua-admin-vendas-visao";',
  );

  if (!/empresaNome:\s*string;/.test(t)) {
    t = replaceOnce(
      t,
      /export function VendasPanel\(\{\s*produtos,\s*vista: subExterna,\s*onVista,\s*\}:\s*\{\s*produtos: ProdutoOpcao\[\];/,
      `export function VendasPanel({
  produtos,
  vista: subExterna,
  onVista,
  empresaNome,
}: {
  produtos: ProdutoOpcao[];
  empresaNome: string;`,
      "VendasPanel / empresaNome",
    );
  }

  t = t.replaceAll(
    '<PedidoCard key={p.id} pedido={p} acoes={acoes} />',
    '<PedidoCard key={p.id} pedido={p} acoes={acoes} empresaNome={empresaNome} />',
  );

  write(rel, t);
}

{
  const rel = "src/app/admin/admin-client.tsx";
  let t = read(rel);

  if (!t.includes("empresaNome={companyName}")) {
    t = replaceOnce(
      t,
      /(<VendasPanel\s+vista=\{subVendas\}\s+onVista=\{setSubVendas\})/,
      `$1
                empresaNome={companyName}`,
      "AdminClient / empresaNome",
    );
  }

  write(rel, t);
}

console.log("\n6/6 - Removendo SiteChrome antigo e fazendo varredura");

const siteChrome = p("src/components/SiteChrome.tsx");
if (fs.existsSync(siteChrome)) {
  const refs = [];
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(ent.name) && full !== siteChrome) {
        const txt = fs.readFileSync(full, "utf8");
        if (txt.includes("SiteChrome")) refs.push(full);
      }
    }
  }
  walk(p("src"));

  if (refs.length === 0) {
    fs.copyFileSync(siteChrome, path.join(backupRoot, "SiteChrome.tsx"));
    fs.unlinkSync(siteChrome);
    console.log("OK: SiteChrome antigo removido.");
  } else {
    console.log("ATENÇÃO: SiteChrome ainda é referenciado. Não foi removido:");
    for (const ref of refs) console.log(" -", ref);
  }
}

const termos = [
  /Sabor na Caixa/i,
  /AB Sabor/i,
  /absabornacaixa/i,
  /logo-ab/i,
  /hero-dia-dos-pais/i,
  /adriana-selo/i,
  /__l5e/i,
  /ab-admin-/i,
];

const hits = [];
function scan(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) scan(full);
    else if (/\.(ts|tsx|css)$/.test(ent.name)) {
      const lines = fs.readFileSync(full, "utf8").split(/\r?\n/);
      lines.forEach((line, i) => {
        if (termos.some((re) => re.test(line))) {
          hits.push(`${full}:${i + 1}: ${line.trim()}`);
        }
      });
    }
  }
}
scan(p("src"));

console.log("\n===== VARREDURA FINAL =====");
if (hits.length) {
  for (const hit of hits) console.log(hit);
  console.log("\nAinda existem referências acima.");
} else {
  console.log("Nenhuma referência da antiga marca encontrada.");
}

console.log("\nBackup criado em:");
console.log(backupRoot);
console.log("\nAgora rode: npm run build");
