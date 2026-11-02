# J.Franco suite — quality gate (Windows PowerShell). Created by J.Franco. MIT.
# Same checks as tools/check.sh, for Windows machines and CI.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { Write-Host "FAIL node not found"; exit 1 }

Write-Host "== plugins =="
foreach ($p in Get-ChildItem -Directory -Name "jfranco-*") {
  & $node --check "$p\lib\index.js" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "syntax error in $p" }
  Get-Content "$p\package.json" -Raw | ConvertFrom-Json | Out-Null
  foreach ($f in Get-ChildItem "$p\locale\*.json") { Get-Content $f.FullName -Raw | ConvertFrom-Json | Out-Null }
  if (-not (Select-String -Path "$p\cordis.patch.yml" -Pattern "insert:" -Quiet)) { throw "patch missing in $p" }
  Write-Host "OK $p"
}

Write-Host "== ui =="
$html = Get-Content "ui\panel.html" -Raw
$m = [regex]::Match($html, "(?s)<script>(.*?)</script>")
Set-Content -Path "$env:TEMP\dsh-panel.js" -Value $m.Groups[1].Value -Encoding UTF8
& $node --check "$env:TEMP\dsh-panel.js" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "panel script error" }
& $node --check "ui\sw.js" | Out-Null
Get-Content "ui\manifest.webmanifest" -Raw | ConvertFrom-Json | Out-Null
Write-Host "OK ui"

Write-Host "== supervisor =="
& $node --check "supervisor\server.js" | Out-Null
$html2 = Get-Content "supervisor\dashboard.html" -Raw
$m2 = [regex]::Match($html2, "(?s)<script>(.*?)</script>")
Set-Content -Path "$env:TEMP\dsh-dash.js" -Value $m2.Groups[1].Value -Encoding UTF8
& $node --check "$env:TEMP\dsh-dash.js" | Out-Null
Write-Host "OK supervisor"

Write-Host ""
Write-Host "ALL CHECKS PASSED"
