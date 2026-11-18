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
& $node --check "supervisor\brain-catalog.js" | Out-Null
& $node --check "supervisor\diagnostic-sanitizer.js" | Out-Null
& $node --check "supervisor\power-kpi.js" | Out-Null
& $node --check "supervisor\intake-engine.js" | Out-Null
$html2 = Get-Content "supervisor\dashboard.html" -Raw
$m2 = [regex]::Match($html2, "(?s)<script>(.*?)</script>")
Set-Content -Path "$env:TEMP\dsh-dash.js" -Value $m2.Groups[1].Value -Encoding UTF8
& $node --check "$env:TEMP\dsh-dash.js" | Out-Null
& $node --check "supervisor\edition.js"
if ($LASTEXITCODE -ne 0) { throw "edition.js check failed" }
& $node --check "supervisor\quebec-profiles.js"
if ($LASTEXITCODE -ne 0) { throw "quebec-profiles.js check failed" }
& $node --check "supervisor\setup-validator.js"
if ($LASTEXITCODE -ne 0) { throw "setup-validator.js check failed" }
& $node --check "supervisor\usage-telemetry.js"
if ($LASTEXITCODE -ne 0) { throw "usage-telemetry.js check failed" }
& $node --check "supervisor\affluence-forecast.js"
if ($LASTEXITCODE -ne 0) { throw "affluence-forecast.js check failed" }
& $node --check "supervisor\multimodal-bridge.js"
if ($LASTEXITCODE -ne 0) { throw "multimodal-bridge.js check failed" }
& $node "tools\smoke-dashboard.js"
if ($LASTEXITCODE -ne 0) { throw "smoke-dashboard failed" }
& $node "tools\audit-contrast.mjs"
if ($LASTEXITCODE -ne 0) { throw "audit-contrast failed" }
& $node "tools\test-diagnostic-export.mjs"
if ($LASTEXITCODE -ne 0) { throw "test-diagnostic-export failed" }
& $node "tools\test-closed-brain.mjs"
if ($LASTEXITCODE -ne 0) { throw "test-closed-brain failed" }
& $node "tools\test-api-closed-brain.mjs"
if ($LASTEXITCODE -ne 0) { throw "test-api-closed-brain failed" }
& $node "tools\test-editions.mjs"
if ($LASTEXITCODE -ne 0) { throw "test-editions failed" }
& $node "tools\test-intake-pipeline.mjs"
if ($LASTEXITCODE -ne 0) { throw "test-intake-pipeline failed" }
& $node "tools\test-hardware-affluence.mjs"
if ($LASTEXITCODE -ne 0) { throw "test-hardware-affluence failed" }
Write-Host "OK supervisor"

Write-Host "== supervisor package (npm) =="
& $node "tools\sync-desktop.mjs" --check-supervisor-pkg
if ($LASTEXITCODE -ne 0) { throw "sync-desktop --check-supervisor-pkg failed" }
& $node --check "supervisor-pkg\server.js" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "supervisor-pkg server.js syntax error" }
& $node --check "supervisor-pkg\bin\jfranco-supervisor.js" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "supervisor-pkg launcher syntax error" }
Write-Host "OK supervisor-pkg"

Write-Host "== desktop app =="
& $node "tools\sync-desktop.mjs" --check
if ($LASTEXITCODE -ne 0) { throw "sync-desktop --check failed" }
& $node "tools\test-vault-biometric.mjs"
if ($LASTEXITCODE -ne 0) { throw "test-vault-biometric failed" }
& $node "tools\test-desktop-sandbox.mjs"
if ($LASTEXITCODE -ne 0) { throw "test-desktop-sandbox failed" }
& $node "tools\verify-app.mjs"
if ($LASTEXITCODE -ne 0) { throw "verify-app failed" }
Write-Host "OK desktop app"

Write-Host "== installers (PowerShell syntax) =="
$psErrors = $null
[void][System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path "install.ps1"), [ref]$null, [ref]$psErrors)
if ($psErrors -and $psErrors.Count -gt 0) { throw ("install.ps1 syntax error: " + $psErrors[0].Message) }
Write-Host "OK install.ps1"

Write-Host ""
Write-Host "ALL CHECKS PASSED"
