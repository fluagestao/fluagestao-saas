$ErrorActionPreference = "Stop"

$root = "C:\Users\G3\Desktop\fluagestao-next"
Set-Location $root

$layout = ".\src\app\layout.tsx"
if (-not (Test-Path $layout)) {
  throw "Nao encontrei src\app\layout.tsx"
}

$content = Get-Content $layout -Raw

if ($content -notmatch 'scrollbars\.css') {
  $content = 'import "./scrollbars.css";' + [Environment]::NewLine + $content
  Set-Content $layout $content -Encoding UTF8
  Write-Host "scrollbars.css importado no layout."
} else {
  Write-Host "scrollbars.css ja estava importado."
}

Write-Host ""
Write-Host "Home da Flua aplicada."
Write-Host "Regra global de paleta aplicada."
Write-Host "Scroll continua funcionando, mas sem barra visual."
