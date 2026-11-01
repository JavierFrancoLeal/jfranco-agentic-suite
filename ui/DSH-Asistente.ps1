# DSH Asistente — Windows. Creado por J.Franco.
# Capa de acción autónoma: ejecuta los plugins de la suite (perfil "campo")
# sin abrir DeepSeek Harness y abre el resultado en el Bloc de notas.
#
# Uso: clic derecho > "Ejecutar con PowerShell". Ajusta $dsh a tu ruta real.
# Requisito: perfil "campo" creado + clave API (export DSH_DEEPSEEK_API_KEY=sk-...).

$dsh = "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd"
if (-not (Test-Path $dsh)) { $dsh = "C:\Program Files\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd" }

$input = Read-Host "Que necesitas? (habla o escribe, empezando por 'escucha')"
if ([string]::IsNullOrWhiteSpace($input)) { exit }

& $dsh --profile campo headless $input | Out-File -Encoding UTF8 "$env:USERPROFILE\Desktop\DSH-Resultado.txt"
Start-Process notepad "$env:USERPROFILE\Desktop\DSH-Resultado.txt"
