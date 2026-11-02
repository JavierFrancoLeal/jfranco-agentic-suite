# J.Franco Agentic Workflow Suite — one-command installer (Windows).
# Created by J.Franco. MIT license.
#
# What it does:
#   1. Locates DeepSeek Harness.
#   2. Asks your sector (creates decisions.md with starter rules).
#   3. Asks where to install: desktop, campo (autonomous), or both.
#   4. Installs the six @javierfrancoleal/* plugins into each chosen profile.
#   5. Creates ~/.dsh/decisions.md (training) and ~/.dsh/supervision.md (log).
#
# Usage: right-click > "Run with PowerShell". Safe to re-run.
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

Write-Host ""
Write-Host "=== J.Franco Agentic Workflow Suite — Installer ===" -ForegroundColor Cyan
Write-Host ""

# 1. Locate DeepSeek Harness CLI
$dsh = "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd"
if (-not (Test-Path $dsh)) { $dsh = "C:\Program Files\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd" }
if (-not (Test-Path $dsh)) {
  Write-Host "DeepSeek Harness was not found. Install it first, then run this installer again." -ForegroundColor Red
  exit 1
}
Write-Host "OK DeepSeek Harness found." -ForegroundColor Green

# 2. Sector (starter rules)
Write-Host ""
Write-Host "Choose your sector - this creates decisions.md with starter rules"
Write-Host "(more sectors and guidance in docs\SECTOR-CATALOG.md):"
Write-Host "  1) Hotel & Hospitality        2) Restaurant & Food Service   3) Retail & Commerce"
Write-Host "  4) Healthcare (clinic)        5) Legal (lawyer, notary)      6) Accounting & Tax"
Write-Host "  7) Real Estate                8) Insurance                   9) Beauty & Wellness"
Write-Host " 10) Auto & Repairs            11) Logistics & Delivery       12) Education & Training"
Write-Host " 13) Non-profits & Community   14) Construction & Trades      15) Freelancers & Pros"
Write-Host " 16) Management & Executive    17) Tourism & Travel           18) Police & Public Safety"
Write-Host " 19) Government & Public       G) General (no template)"
$sector = Read-Host "Choice [G]"
$tpl = $null
switch ($sector) {
  "1"  { $tpl = "$Root\docs\decisions-hotel.md" }
  "2"  { $tpl = "$Root\docs\decisions-restaurant.md" }
  "3"  { $tpl = "$Root\docs\decisions-retail.md" }
  "4"  { $tpl = "$Root\docs\decisions-healthcare.md" }
  "5"  { $tpl = "$Root\docs\decisions-legal.md" }
  "6"  { $tpl = "$Root\docs\decisions-accounting.md" }
  "7"  { $tpl = "$Root\docs\decisions-realestate.md" }
  "8"  { $tpl = "$Root\docs\decisions-insurance.md" }
  "9"  { $tpl = "$Root\docs\decisions-beauty.md" }
  "10" { $tpl = "$Root\docs\decisions-auto.md" }
  "11" { $tpl = "$Root\docs\decisions-logistics.md" }
  "12" { $tpl = "$Root\docs\decisions-education.md" }
  "13" { $tpl = "$Root\docs\decisions-nonprofit.md" }
  "14" { $tpl = "$Root\docs\decisions-construction.md" }
  "15" { $tpl = "$Root\docs\decisions-freelance.md" }
  "16" { $tpl = "$Root\docs\decisions-management.md" }
  "17" { $tpl = "$Root\docs\decisions-tourism.md" }
  "18" { $tpl = "$Root\docs\decisions-police.md" }
  "19" { $tpl = "$Root\docs\decisions-government.md" }
  default { $tpl = $null }
}

# 3. Profile
$prof = Read-Host "Install for: 1) The open app (desktop)  2) Autonomous (campo)  3) Both [3]"
switch ($prof) {
  "1" { $profiles = @("desktop") }
  "2" { $profiles = @("campo") }
  default { $profiles = @("desktop", "campo") }
}

# 4. Ensure the campo (autonomous) profile exists when needed
if ($profiles -contains "campo") {
  $campo = "$HOME\.dsh\profiles\campo"
  if (-not (Test-Path "$campo\package.json")) {
    Write-Host "Creating the campo (autonomous) profile..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $campo | Out-Null
    '{"name":"dsh-profile-campo","private":true,"dependencies":{},"dsh":{"profile":{"bundles":["@deepseek-ai/dsh-base","@deepseek-ai/dsh-headless"]}}}' |
      Out-File -Encoding UTF8 "$campo\package.json"
    @"
- id: agent-default-model
  name: "@deepseek-ai/dsh-agent-default-model"
  config:
    provider: deepseek-api-key
    model: deepseek-chat
    reasoningEffort: max
"@ | Out-File -Encoding UTF8 "$campo\cordis.patch.yml"
    @"
packages:
  - .

nodeLinker: hoisted
autoInstallPeers: false
"@ | Out-File -Encoding UTF8 "$campo\pnpm-workspace.yaml"
  }
}

# 5. Install the six plugins into each chosen profile
$plugins = @("jfranco-workflow-master", "jfranco-input-detector", "jfranco-decision-router",
             "jfranco-accountability-auditor", "jfranco-interpreter", "jfranco-autonomy-grader", "jfranco-usage-auditor")
foreach ($p in $profiles) {
  Write-Host ""
  Write-Host "Installing the six plugins into profile '$p'..." -ForegroundColor Blue
  foreach ($pl in $plugins) {
    & $dsh plugin --profile $p add "$Root\$pl" | Out-Null
    if ($LASTEXITCODE -eq 0) { Write-Host "OK $pl -> $p" -ForegroundColor Green }
    else { Write-Host "FAILED $pl -> $p" -ForegroundColor Red }
  }
}

# 6. decisions.md (global training rules)
New-Item -ItemType Directory -Force -Path "$HOME\.dsh" | Out-Null
$dec = "$HOME\.dsh\decisions.md"
if (Test-Path $dec) {
  Write-Host ""
  Write-Host "decisions.md already exists - keeping it (your rules are authoritative)." -ForegroundColor Yellow
} elseif ($tpl) {
  Get-Content $tpl | Out-File -Encoding UTF8 $dec
  Write-Host ""
  Write-Host "OK decisions.md created from the sector template: $dec" -ForegroundColor Green
} else {
  Write-Host ""
  Write-Host "OK No sector template chosen - defaults stay active. Create decisions.md later to train the AI." -ForegroundColor Green
}

# 7. supervision.md (living supervision log)
$sup = "$HOME\.dsh\supervision.md"
if (-not (Test-Path $sup)) {
  "# supervision.md - living supervision log (append-only)." | Out-File -Encoding UTF8 $sup
  Write-Host "OK supervision.md created: $sup" -ForegroundColor Green
} else {
  Write-Host "supervision.md already exists - keeping it." -ForegroundColor Yellow
}

# 8. Done
Write-Host ""
Write-Host "=== Installation complete ===" -ForegroundColor Green
Write-Host "Next steps:"
Write-Host "  1. Open ui\panel.html - or say 'listen' in a new DeepSeek Harness session."
Write-Host "  2. Edit $HOME\.dsh\decisions.md any time to train your rules."
if ($profiles -contains "campo") {
  Write-Host "  3. Autonomous mode: set your API key once - set DSH_DEEPSEEK_API_KEY=sk-..."
}
