# DSH Assistant — Windows. Created by J.Franco.
# Autonomous action layer: runs the suite's plugins (the "campo" profile)
# without opening DeepSeek Harness and opens the result in Notepad.
#
# Usage: right-click > "Run with PowerShell". Adjust $dsh to your real path.
# Requirement: the "campo" profile must exist + API key
# (set DSH_DEEPSEEK_API_KEY=sk-...).

$dsh = "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd"
if (-not (Test-Path $dsh)) { $dsh = "C:\Program Files\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd" }

$input = Read-Host "What do you need? (speak or type, starting with 'listen')"
if ([string]::IsNullOrWhiteSpace($input)) { exit }

& $dsh --profile campo headless $input | Out-File -Encoding UTF8 "$env:USERPROFILE\Desktop\DSH-Result.txt"
Start-Process notepad "$env:USERPROFILE\Desktop\DSH-Result.txt"
