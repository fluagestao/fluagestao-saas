$ErrorActionPreference = "Stop"

$root = "C:\Users\G3\Desktop\fluagestao-next"
Set-Location $root

$utf8 = New-Object System.Text.UTF8Encoding($false)

function Ler([string]$rel) {
  $path = Join-Path $root $rel
  if (-not (Test-Path $path)) { throw "Arquivo nao encontrado: $rel" }
  return [IO.File]::ReadAllText($path)
}

function Gravar([string]$rel, [string]$texto) {
  $path = Join-Path $root $rel
  [IO.File]::WriteAllText($path, $texto, $utf8)
  Write-Host "Atualizado: $rel"
}

function Trocar([string]$texto, [string]$antigo, [string]$novo, [string]$rotulo) {
  if (-not $texto.Contains($antigo)) {
    throw "Nao encontrei o trecho esperado em: $rotulo"
  }
  return $texto.Replace($antigo, $novo)
}

Write-Host ""
Write-Host "1/7 - Tornando o contexto da empresa realmente multiempresa..."
$rel = "src\lib\company-context.server.ts"
$t = Ler $rel

$alvo = @'
  if (!membro) {
    throw new Error("Seu usuário ainda não está vinculado a uma empresa ativa.");
  }

  return {
'@
$novo = @'
  if (!membro) {
    throw new Error("Seu usuário ainda não está vinculado a uma empresa ativa.");
  }

  const { data: empresa, error: empresaError } = await supabase
    .from("companies")
    .select("name")
    .eq("id", membro.company_id)
    .maybeSingle();

  if (empresaError) throw empresaError;

  return {
'@
$t = Trocar $t $alvo $novo "company-context: consulta da empresa"

$alvo = @'
    displayName: membro.display_name,
    role: membro.role,
'@
$novo = @'
    displayName: membro.display_name,
    companyName: empresa?.name ?? "Empresa",
    role: membro.role,
'@
$t = Trocar $t $alvo $novo "company-context: companyName"
Gravar $rel $t

Write-Host ""
Write-Host "2/7 - Substituindo o prompt fixo da antiga loja por um prompt multiempresa..."
$rel = "src\lib\bia-prompt.ts"
$t = @'
/**
 * Prompt padrão da BIA.
 *
 * IMPORTANTE:
 * - Nunca presume o segmento da empresa.
 * - O nome real da empresa é injetado no servidor em {{EMPRESA_NOME}}.
 * - Configurações personalizadas da empresa continuam podendo substituir este texto.
 */
export const PROMPT_PADRAO = `Você é a BIA, assistente virtual comercial da empresa {{EMPRESA_NOME}}.

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
- Trate cada empresa como uma operação independente. Nunca mencione outra marca ou outro cliente da plataforma Flua.
- Nunca diga "AB Sabor na Caixa", "Sabor na Caixa" ou qualquer marca fixa do sistema.

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
A Flua é apenas o sistema utilizado pela empresa e não deve ser apresentada como a vendedora dos produtos ou serviços.`;

export function contextoDoDia(opts: {
  hojeISO: string;
  hojeTexto: string;
  amanhaISO: string;
  amanhaTexto: string;
  atendimento: string;
  waId?: string | null;
  nomeConhecido?: string | null;
}): string {
  return `

# Agora

Hoje é ${opts.hojeTexto} — **${opts.hojeISO}**.
Amanhã é ${opts.amanhaTexto} — **${opts.amanhaISO}**.

Sempre que trabalhar com datas, use o formato AAAA-MM-DD e considere o ano informado acima.

${opts.atendimento}${
    opts.waId
      ? `

Você está conversando com o WhatsApp **${opts.waId}**${
          opts.nomeConhecido ? ` (${opts.nomeConhecido})` : ""
        }. Esse é o contato atual da conversa.`
      : ""
  }`;
}
'@
Gravar $rel $t

Write-Host ""
Write-Host "3/7 - Fazendo a BIA receber o nome da empresa logada..."
$rel = "src\lib\bia.ts"
$t = Ler $rel

$alvo = @'
type Supabase = Contexto["supabase"];
'@
$novo = @'
type Supabase = Contexto["supabase"];

function promptDaEmpresa(prompt: string, companyName: string): string {
  return prompt.replaceAll(
    "{{EMPRESA_NOME}}",
    companyName.trim() || "sua empresa",
  );
}
'@
$t = Trocar $t $alvo $novo "bia: helper de prompt"

$pattern = 'export async function carregarBia\(\) \{\r?\n  const \{ supabase, companyId \} = await requireCompany\(\);'
if (-not [regex]::IsMatch($t, $pattern)) { throw "Nao encontrei carregarBia para adicionar companyName." }
$t = [regex]::Replace(
  $t,
  $pattern,
  'export async function carregarBia() {' + [Environment]::NewLine +
  '  const { supabase, companyId, companyName } = await requireCompany();',
  1
)

$t = Trocar $t `
  '      prompt: config.prompt ?? PROMPT_PADRAO,' `
  '      prompt: promptDaEmpresa(config.prompt ?? PROMPT_PADRAO, companyName),' `
  "bia: prompt exibido"

$pattern = 'export async function enviarParaBia\(input: \{ data: unknown \}\) \{([\s\S]*?)const \{ supabase, companyId \} = await requireCompany\(\);'
if (-not [regex]::IsMatch($t, $pattern)) { throw "Nao encontrei enviarParaBia para adicionar companyName." }
$t = [regex]::Replace(
  $t,
  $pattern,
  { param($m)
    $m.Value.Replace(
      'const { supabase, companyId } = await requireCompany();',
      'const { supabase, companyId, companyName } = await requireCompany();'
    )
  },
  1
)

$t = Trocar $t `
  '    prompt: config?.prompt || PROMPT_PADRAO,' `
  '    prompt: promptDaEmpresa(config?.prompt || PROMPT_PADRAO, companyName),' `
  "bia: prompt enviado a IA"

Gravar $rel $t

Write-Host ""
Write-Host "4/7 - Tirando a marca fixa das mensagens de vendas..."
$rel = "src\lib\vendas.ts"
$t = Ler $rel

$t = $t.Replace(
  ' * Para editar o texto: é aqui, no código — a AB decidiu não ter isso na UI.',
  ' * O nome da empresa é recebido do painel para não existir marca fixa no SaaS.'
)

$t = Trocar $t `
  'export function mensagemRetomada(pedido: Pedido): string {' `
  'export function mensagemRetomada(pedido: Pedido, empresaNome = "Sua empresa"): string {' `
  "vendas: assinatura mensagemRetomada"

$t = Trocar $t `
  '  const nome = primeiroNome(pedido.cliente_nome);' `
  ('  const nome = primeiroNome(pedido.cliente_nome);' + [Environment]::NewLine +
   '  const empresa = empresaNome.trim() || "Sua empresa";') `
  "vendas: nome da empresa"

$t = Trocar $t `
  '? `Oi, ${nome}! 🤍 Aqui é da *AB Sabor na Caixa*.`' `
  '? `Oi, ${nome}! 🤍 Aqui é da *${empresa}*.`' `
  "vendas: saudacao com nome"

$t = Trocar $t `
  ': "Oi! 🤍 Aqui é da *AB Sabor na Caixa*.",' `
  ': `Oi! 🤍 Aqui é da *${empresa}*.`, ' `
  "vendas: saudacao sem nome"

$t = Trocar $t `
  'export function linkRetomada(pedido: Pedido): string | null {' `
  'export function linkRetomada(pedido: Pedido, empresaNome = "Sua empresa"): string | null {' `
  "vendas: assinatura linkRetomada"

$t = Trocar $t `
  '  return `${base}?text=${encodeURIComponent(mensagemRetomada(pedido))}`;' `
  '  return `${base}?text=${encodeURIComponent(mensagemRetomada(pedido, empresaNome))}`;' `
  "vendas: linkRetomada multiempresa"

Gravar $rel $t

Write-Host ""
Write-Host "5/7 - Tornando a ficha de pedido multiempresa..."
$rel = "src\lib\ficha-pedido.ts"
$t = Ler $rel

$t = Trocar $t `
  'export function htmlDaFicha(p: Pedido): string {' `
  ('export function htmlDaFicha(p: Pedido, empresaNome = "Sua empresa"): string {' + [Environment]::NewLine +
   '  const empresa = esc(empresaNome.trim() || "Sua empresa");') `
  "ficha: assinatura"

$t = Trocar $t `
  '<title>Pedido #${p.numero} — AB Sabor na Caixa</title>' `
  '<title>Pedido #${p.numero} — ${empresa}</title>' `
  "ficha: titulo"

$t = Trocar $t `
  '  .logo { height: 16mm; }' `
  ('  .marca { text-align: right; max-width: 58mm; }' + [Environment]::NewLine +
   '  .marca strong { display: block; color: #703D3A; font-size: 12pt; }' + [Environment]::NewLine +
   '  .marca span { display: block; margin-top: 1mm; color: #9a8578; font-size: 7.5pt; }') `
  "ficha: estilo marca"

$t = Trocar $t `
  '    <img class="logo" src="/logo-ab-terracota.png" alt="AB Sabor na Caixa">' `
  '    <div class="marca"><strong>${empresa}</strong><span>Gestão via Flua</span></div>' `
  "ficha: cabecalho"

$t = Trocar $t `
  '  <div class="rodape"><span>AB Sabor na Caixa • Tubarão/SC</span><span>absabornacaixa.com.br</span></div>' `
  '  <div class="rodape"><span>${empresa}</span><span>Gerado pela Flua Gestão</span></div>' `
  "ficha: rodape"

$t = Trocar $t `
  'export function imprimirFicha(p: Pedido): boolean {' `
  'export function imprimirFicha(p: Pedido, empresaNome = "Sua empresa"): boolean {' `
  "ficha: imprimir assinatura"

$t = Trocar $t `
  '  janela.document.write(htmlDaFicha(p));' `
  '  janela.document.write(htmlDaFicha(p, empresaNome));' `
  "ficha: imprimir empresa"

$t = $t.Replace(
  '  // Espera a logo carregar, senão a impressão sai sem ela.' + [Environment]::NewLine,
  ''
)

Gravar $rel $t

Write-Host ""
Write-Host "6/7 - Passando o nome da empresa do painel para pedidos e mensagens..."
$rel = "src\components\admin\PedidoCard.tsx"
$t = Ler $rel

$alvo = @'
export function PedidoCard({
  pedido: p,
  acoes,
  compacto = false,
  className,
}: {
  pedido: Pedido;
  acoes: AcoesPedido;
  compacto?: boolean;
  className?: string;
}) {
'@
$novo = @'
export function PedidoCard({
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
}) {
'@
$t = Trocar $t $alvo $novo "PedidoCard: prop empresa"
$t = $t.Replace('imprimirFicha(p)', 'imprimirFicha(p, empresaNome)')
$t = $t.Replace('mensagemRetomada(p)', 'mensagemRetomada(p, empresaNome)')
Gravar $rel $t

$rel = "src\components\admin\VendasPanel.tsx"
$t = Ler $rel
$t = $t.Replace('const CHAVE_VISAO = "ab-admin-vendas-visao";', 'const CHAVE_VISAO = "flua-admin-vendas-visao";')

$alvo = @'
export function VendasPanel({
  produtos,
  vista: subExterna,
  onVista,
}: {
  produtos: ProdutoOpcao[];
'@
$novo = @'
export function VendasPanel({
  produtos,
  vista: subExterna,
  onVista,
  empresaNome,
}: {
  produtos: ProdutoOpcao[];
  empresaNome: string;
'@
$t = Trocar $t $alvo $novo "VendasPanel: prop empresa"

$t = $t.Replace(
  '<PedidoCard key={p.id} pedido={p} acoes={acoes} />',
  '<PedidoCard key={p.id} pedido={p} acoes={acoes} empresaNome={empresaNome} />'
)

Gravar $rel $t

$rel = "src\app\admin\admin-client.tsx"
$t = Ler $rel
$alvo = @'
              <VendasPanel
                vista={subVendas}
                onVista={setSubVendas}
'@
$novo = @'
              <VendasPanel
                vista={subVendas}
                onVista={setSubVendas}
                empresaNome={companyName}
'@
$t = Trocar $t $alvo $novo "AdminClient: VendasPanel companyName"
Gravar $rel $t

Write-Host ""
Write-Host "7/7 - Removendo SiteChrome antigo somente se nao estiver sendo usado..."
$siteChrome = Join-Path $root "src\components\SiteChrome.tsx"
if (Test-Path $siteChrome) {
  $refs = Get-ChildItem (Join-Path $root "src") -Recurse -Include *.ts,*.tsx |
    Where-Object { $_.FullName -ne $siteChrome } |
    Select-String -Pattern 'SiteChrome' -SimpleMatch

  if ($refs) {
    Write-Host "SiteChrome ainda possui referencias. Nao foi apagado:"
    $refs | Select-Object Path, LineNumber, Line | Format-Table -AutoSize
  } else {
    Remove-Item $siteChrome -Force
    Write-Host "Removido: src\components\SiteChrome.tsx"
  }
}

Write-Host ""
Write-Host "============================================================"
Write-Host "VARREDURA DE RESTOS DA ANTIGA MARCA"
Write-Host "============================================================"

$hits = Get-ChildItem .\src -Recurse -Include *.ts,*.tsx,*.css |
  Select-String -Pattern 'Sabor na Caixa|AB Sabor|absabornacaixa|logo-ab|hero-dia-dos-pais|adriana-selo|__l5e|ab-admin-' |
  Select-Object Path, LineNumber, Line

if ($hits) {
  $hits | Format-Table -AutoSize
  Write-Host ""
  Write-Host "Ainda existem referencias acima. Envie essa lista no chat."
} else {
  Write-Host "Nenhuma referencia da antiga marca encontrada nesse filtro."
}

Write-Host ""
Write-Host "Agora execute: npm run build"
