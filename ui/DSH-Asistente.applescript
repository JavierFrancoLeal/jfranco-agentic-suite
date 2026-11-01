-- DSH Asistente — capa de acción autónoma de la suite J.Franco.
-- Creado por J.Franco.
--
-- Cómo usarlo:
--   1. Abre "Script Editor" y guarda este texto como APLICACIÓN llamada
--      "DSH Asistente".
--   2. Ponla en el Dock: ese es tu botón.
--   3. Un clic → te pregunta qué necesitas → habla (con dictado) o escribe,
--      empezando por "escucha" → la IA trabaja de forma autónoma con tus
--      plugins (perfil "campo") y el resultado se abre en TextEdit.
--
-- Requisito: haber creado el perfil "campo" con los plugins de la suite
-- (ver README de la suite).
set dshBin to "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh"
set theInput to text returned of (display dialog "¿Qué necesitas? Habla (con dictado) o escribe, empezando por \"escucha\"…" default answer "" with title "DSH Asistente" buttons {"Cancelar", "Ejecutar"} default button "Ejecutar")
if theInput is "" then return
display notification "DSH Asistente trabajando…" with title "DSH Asistente"
set shellCmd to dshBin & " --profile campo headless " & quoted form of theInput
set theResult to do shell script shellCmd
set resultFile to (path to desktop as text) & "DSH-Resultado.txt"
do shell script "printf %s " & quoted form of theResult & " > " & quoted form of (POSIX path of resultFile)
tell application "TextEdit" to open (resultFile as alias)
