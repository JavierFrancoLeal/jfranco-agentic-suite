-- DSH Assistant — autonomous action layer of the J.Franco suite.
-- Created by J.Franco.
--
-- How to use it:
--   1. Open "Script Editor" and save this text as an APPLICATION named
--      "DSH Assistant".
--   2. Put it in the Dock: that is your button.
--   3. One click → it asks what you need → speak (with dictation) or type,
--      starting with "listen" → the AI works autonomously with your plugins
--      (the "campo" profile) and the result opens in TextEdit.
--
-- Requirement: the "campo" profile must exist with the suite's plugins
-- (see the suite README).
set dshBin to "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh"
set theInput to text returned of (display dialog "What do you need? Speak (with dictation) or type, starting with \"listen\"…" default answer "" with title "DSH Assistant" buttons {"Cancel", "Run"} default button "Run")
if theInput is "" then return
display notification "DSH Assistant working…" with title "DSH Assistant"
set shellCmd to dshBin & " --profile campo headless " & quoted form of theInput
set theResult to do shell script shellCmd
set resultFile to (path to desktop as text) & "DSH-Result.txt"
do shell script "printf %s " & quoted form of theResult & " > " & quoted form of (POSIX path of resultFile)
tell application "TextEdit" to open (resultFile as alias)
