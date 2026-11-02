# J.Franco suite — start the supervisor automatically at boot (Windows).
# Created by J.Franco. MIT. Task Scheduler, at logon, restarts on crash is
# handled by re-running the task (add /ri 5 with /sc minute if needed).
#
# Usage (PowerShell):
#   .\tools\autostart\install-autostart.ps1          # install
#   .\tools\autostart\install-autostart.ps1 -Remove  # uninstall

param([switch]$Remove)
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $Node) { $Node = "$env:APPDATA\..\Local\Programs\deepseek-harness\runtime\primary-runtime\dependencies\node\node.exe" }
$Data = if ($env:DSH_SUPERVISOR_DATA) { $env:DSH_SUPERVISOR_DATA } else { "$env:USERPROFILE\.dsh\supervisor-data" }

if ($Remove) {
  schtasks /delete /tn "JFrancoSupervisor" /f 2>$null
  Write-Host "Auto-arranque removido (Windows)."
  exit 0
}

[Environment]::SetEnvironmentVariable("DSH_SUPERVISOR_DATA", $Data, "User")
[Environment]::SetEnvironmentVariable("DSH_SECTOR_PACKS_DIR", "$Root\docs\sector-packs", "User")

$Cmd = "powershell -NoProfile -Command `"`$env:DSH_SUPERVISOR_DATA='$Data'; `$env:DSH_SECTOR_PACKS_DIR='$Root\docs\sector-packs'; & '$Node' '$Root\supervisor\server.js' --lan --https`""
schtasks /create /tn "JFrancoSupervisor" /tr $Cmd /sc onlogon /rl limited /f

Write-Host "Auto-arranque instalado (Windows, Task Scheduler, al iniciar sesión)."
Write-Host "Quitar: .\tools\autostart\install-autostart.ps1 -Remove"
