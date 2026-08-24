$ErrorActionPreference = "Stop"

$root = "C:\Users\G3\Desktop\fluagestao-next"
Set-Location $root
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Read-Utf8([string]$rel) {
    $path = Join-Path $root $rel
    if (-not (Test-Path $path)) { throw "Arquivo nao encontrado: $rel" }
    return [IO.File]::ReadAllText($path)
}

function Write-Utf8([string]$rel, [string]$text) {
    $path = Join-Path $root $rel
    [IO.File]::WriteAllText($path, $text, $utf8)
    Write-Host "OK: $rel"
}

function Replace-RegexOnce(
    [string]$text,
    [string]$pattern,
    [string]$replacement,
    [string]$label
) {
    $rx = [regex]::new(
        $pattern,
        [System.Text.RegularExpressions.RegexOptions]::Singleline
    )
    if (-not $rx.IsMatch($text)) {
        throw "Nao encontrei o trecho para: $label"
    }
    return $rx.Replace($text, $replacement, 1)
}

Write-Host ""
Write-Host "1/7 - Contexto multiempresa"

$rel = "src\lib\company-context.server.ts"
$t = Read-Utf8 $rel

if ($t -notmatch 'companyName:\s*empresa\?\.name') {
    $pattern = 'if\s*\(!membro\)\s*\{\s*throw new Error\("Seu usuário ainda não está vinculado a uma empresa ativa\."\);\s*\}\s*(?=return\s*\{)'
    $insert = @'
if (!membro) {
    throw new Error("Seu usuário ainda não está vinculado a uma empresa ativa.");
  }

  const { data: empresa, error: empresaError } = await supabase
    .from("companies")
    .select("name")
    .eq("id", membro.company_id)
    .maybeSingle();

  if (empresaError) throw empresaError;

  '@
    $t = Replace-RegexOnce $t $pattern $insert "consulta da empresa"

    $pattern = 'displayName:\s*membro\.display_name,\s*(?=role:\s*membro\.role,)'
    $replacement = 'displayName: membro.display_name,' + "`r`n" + '    companyName: empresa?.name ?? "Empresa",' + "`r`n" + '    '
    $t = Replace-RegexOnce $t $pattern $replacement "companyName no retorno"
    Write-Utf8 $rel $t
} else {
    Write-Host "OK: company-context ja estava ajustado."
}

Write-Host ""
Write-Host "2/7 - Prompt BIA sem marca antiga"

$rel = "src\lib\bia-prompt.ts"
$prompt = @'
/**
 * Prompt padrão da BIA.
 *
 * A BIA representa a empresa usuária da Flua, nunca uma marca fixa da plataforma.
 * {{EMPRESA_NOME}} é substituído no servidor pelo nome da empresa logada.
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
Write-Utf8 $rel $prompt

Write-Host ""
Write-Host "3/7 - Nome da empresa dentro da BIA"

$rel = "src\lib\bia.ts"
$t = Read-Utf8 $rel

if ($t -notmatch 'function\s+promptDaEmpresa') {
    $t = Replace-RegexOnce `
        $t `
        'type Supabase = Contexto\["supabase"\];' `
        ('type Supabase = Contexto["supabase"];' + "`r`n`r`n" +
         'function promptDaEmpresa(prompt: string, companyName: string): string {' + "`r`n" +
         '  return prompt.replaceAll("{{EMPRESA_NOME}}", companyName.trim() || "sua empresa");' + "`r`n" +
         '}') `
        "helper promptDaEmpresa"
}

$t = [regex]::Replace(
    $t,
    'export async function carregarBia\(\)\s*\{\s*const \{ supabase, companyId(?:, companyName)? \} = await requireCompany\(\);',
    'export async function carregarBia() {' + "`r`n" + '  const { supabase, companyId, companyName } = await requireCompany();',
    1
)

$t = $t.Replace(
    'prompt: config.prompt ?? PROMPT_PADRAO,',
    'prompt: promptDaEmpresa(config.prompt ?? PROMPT_PADRAO, companyName),'
)

$t = [regex]::Replace(
    $t,
    '(export async function enviarParaBia\(input: \{ data: unknown \}\)\s*\{[\s\S]*?)const \{ supabase, companyId(?:, companyName)? \} = await requireCompany\(\);',
    '${1}const { supabase, companyId, companyName } = await requireCompany();',
    1
)

$t = $t.Replace(
    'prompt: config?.prompt || PROMPT_PADRAO,',
    'prompt: promptDaEmpresa(config?.prompt || PROMPT_PADRAO, companyName),'
)

Write-Utf8 $rel $t

Write-Host ""
Write-Host "4/7 - WhatsApp sem marca fixa"

$rel = "src\lib\vendas.ts"
$t = Read-Utf8 $rel

$t = $t.Replace(
    ' * Para editar o texto: é aqui, no código — a AB decidiu não ter isso na UI.',
    ' * O nome da empresa é recebido do painel para não existir marca fixa no SaaS.'
)

$t = $t.Replace(
    'export function mensagemRetomada(pedido: Pedido): string {',
    'export function mensagemRetomada(pedido: Pedido, empresaNome = "Sua empresa"): string {'
)

if ($t -notmatch 'const empresa = empresaNome\.trim\(\)') {
    $t = $t.Replace(
        '  const nome = primeiroNome(pedido.cliente_nome);',
        '  const nome = primeiroNome(pedido.cliente_nome);' + "`r`n" +
        '  const empresa = empresaNome.trim() || "Sua empresa";'
    )
}

$t = $t.Replace(
    '? `Oi, ${nome}! 🤍 Aqui é da *AB Sabor na Caixa*.`',
    '? `Oi, ${nome}! 🤍 Aqui é da *${empresa}*.`'
)

$t = $t.Replace(
    ': "Oi! 🤍 Aqui é da *AB Sabor na Caixa*.",',
    ': `Oi! 🤍 Aqui é da *${empresa}*.`,'
)

$t = $t.Replace(
    'export function linkRetomada(pedido: Pedido): string | null {',
    'export function linkRetomada(pedido: Pedido, empresaNome = "Sua empresa"): string | null {'
)

$t = $t.Replace(
    'return `${base}?text=${encodeURIComponent(mensagemRetomada(pedido))}`;',
    'return `${base}?text=${encodeURIComponent(mensagemRetomada(pedido, empresaNome))}`;'
)

Write-Utf8 $rel $t

Write-Host ""
Write-Host "5/7 - Ficha do pedido multiempresa"

$rel = "src\lib\ficha-pedido.ts"
$t = Read-Utf8 $rel

$t = $t.Replace(
    'export function htmlDaFicha(p: Pedido): string {',
    'export function htmlDaFicha(p: Pedido, empresaNome = "Sua empresa"): string {' + "`r`n" +
    '  const empresa = esc(empresaNome.trim() || "Sua empresa");'
)

$t = $t.Replace(
    '<title>Pedido #${p.numero} — AB Sabor na Caixa</title>',
    '<title>Pedido #${p.numero} — ${empresa}</title>'
)

$t = $t.Replace(
    '  .logo { height: 16mm; }',
    '  .marca { text-align: right; max-width: 58mm; }' + "`r`n" +
    '  .marca strong { display: block; color: #703D3A; font-size: 12pt; }' + "`r`n" +
    '  .marca span { display: block; margin-top: 1mm; color: #9a8578; font-size: 7.5pt; }'
)

$t = $t.Replace(
    '    <img class="logo" src="/logo-ab-terracota.png" alt="AB Sabor na Caixa">',
    '    <div class="marca"><strong>${empresa}</strong><span>Gestão via Flua</span></div>'
)

$t = $t.Replace(
    '  <div class="rodape"><span>AB Sabor na Caixa • Tubarão/SC</span><span>absabornacaixa.com.br</span></div>',
    '  <div class="rodape"><span>${empresa}</span><span>Gerado pela Flua Gestão</span></div>'
)

$t = $t.Replace(
    'export function imprimirFicha(p: Pedido): boolean {',
    'export function imprimirFicha(p: Pedido, empresaNome = "Sua empresa"): boolean {'
)

$t = $t.Replace(
    'janela.document.write(htmlDaFicha(p));',
    'janela.document.write(htmlDaFicha(p, empresaNome));'
)

Write-Utf8 $rel $t

Write-Host ""
Write-Host "6/7 - Nome da empresa chegando aos cards de pedido"

$rel = "src\components\admin\PedidoCard.tsx"
$t = Read-Utf8 $rel

if ($t -notmatch 'empresaNome = "Sua empresa"') {
    $t = Replace-RegexOnce `
        $t `
        'export function PedidoCard\(\{\s*pedido: p,\s*acoes,\s*compacto = false,\s*className,\s*\}:\s*\{\s*pedido: Pedido;\s*acoes: AcoesPedido;\s*compacto\?: boolean;\s*className\?: string;\s*\}\)\s*\{' `
        ('export function PedidoCard({' + "`r`n" +
         '  pedido: p,' + "`r`n" +
         '  acoes,' + "`r`n" +
         '  compacto = false,' + "`r`n" +
         '  className,' + "`r`n" +
         '  empresaNome = "Sua empresa",' + "`r`n" +
         '}: {' + "`r`n" +
         '  pedido: Pedido;' + "`r`n" +
         '  acoes: AcoesPedido;' + "`r`n" +
         '  compacto?: boolean;' + "`r`n" +
         '  className?: string;' + "`r`n" +
         '  empresaNome?: string;' + "`r`n" +
         '}) {') `
        "PedidoCard empresaNome"
}

$t = $t.Replace('imprimirFicha(p)', 'imprimirFicha(p, empresaNome)')
$t = $t.Replace('mensagemRetomada(p)', 'mensagemRetomada(p, empresaNome)')
Write-Utf8 $rel $t

$rel = "src\components\admin\VendasPanel.tsx"
$t = Read-Utf8 $rel
$t = $t.Replace('const CHAVE_VISAO = "ab-admin-vendas-visao";', 'const CHAVE_VISAO = "flua-admin-vendas-visao";')

if ($t -notmatch 'empresaNome:\s*string;') {
    $t = Replace-RegexOnce `
        $t `
        'export function VendasPanel\(\{\s*produtos,\s*vista: subExterna,\s*onVista,\s*\}:\s*\{\s*produtos: ProdutoOpcao\[\];' `
        ('export function VendasPanel({' + "`r`n" +
         '  produtos,' + "`r`n" +
         '  vista: subExterna,' + "`r`n" +
         '  onVista,' + "`r`n" +
         '  empresaNome,' + "`r`n" +
         '}: {' + "`r`n" +
         '  produtos: ProdutoOpcao[];' + "`r`n" +
         '  empresaNome: string;') `
        "VendasPanel empresaNome"
}

$t = $t.Replace(
    '<PedidoCard key={p.id} pedido={p} acoes={acoes} />',
    '<PedidoCard key={p.id} pedido={p} acoes={acoes} empresaNome={empresaNome} />'
)

Write-Utf8 $rel $t

$rel = "src\app\admin\admin-client.tsx"
$t = Read-Utf8 $rel

if ($t -notmatch 'empresaNome=\{companyName\}') {
    $t = $t.Replace(
        '                onVista={setSubVendas}' + "`n",
        '                onVista={setSubVendas}' + "`n" +
        '                empresaNome={companyName}' + "`n"
    )
    $t = $t.Replace(
        '                onVista={setSubVendas}' + "`r`n",
        '                onVista={setSubVendas}' + "`r`n" +
        '                empresaNome={companyName}' + "`r`n"
    )
}

Write-Utf8 $rel $t

Write-Host ""
Write-Host "7/7 - SiteChrome antigo e varredura"

$siteChrome = Join-Path $root "src\components\SiteChrome.tsx"
if (Test-Path $siteChrome) {
    $refs = Get-ChildItem (Join-Path $root "src") -Recurse -Include *.ts,*.tsx |
        Where-Object { $_.FullName -ne $siteChrome } |
        Select-String -Pattern 'SiteChrome' -SimpleMatch

    if ($refs) {
        Write-Host "ATENCAO: SiteChrome ainda e usado. Nao apaguei."
        $refs | Select-Object Path, LineNumber, Line | Format-Table -AutoSize
    } else {
        Remove-Item $siteChrome -Force
        Write-Host "OK: SiteChrome antigo removido."
    }
}

Write-Host ""
Write-Host "===== VARREDURA FINAL ====="

$hits = Get-ChildItem .\src -Recurse -Include *.ts,*.tsx,*.css |
    Select-String -Pattern 'Sabor na Caixa|AB Sabor|absabornacaixa|logo-ab|hero-dia-dos-pais|adriana-selo|__l5e|ab-admin-' |
    Select-Object Path, LineNumber, Line

if ($hits) {
    $hits | Format-Table -AutoSize
    Write-Host ""
    Write-Host "Ainda existem referencias acima."
} else {
    Write-Host "Nenhuma referencia da antiga marca encontrada."
}

Write-Host ""
Write-Host "Agora rode: npm run build"
