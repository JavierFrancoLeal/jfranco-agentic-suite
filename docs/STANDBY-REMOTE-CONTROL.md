# STANDBY — the remote-control and Windows-test dossier (suspended)

*Everything we learned and built while automating other screens and the
Windows VM — frozen for the day when resources and DEMAND justify
resuming. Read this first when that day comes: nothing needs to be
rediscovered. 2026-11-05.*

## Resume in 30 minutes

1. The UTM VM "Windows" already has: Windows 11 ARM installed, user
   Javier, the shared folder configured (restart the VM to expose
   `~/transf` inside Explorer — `Fanal.exe` is already there).
2. The keyboard trick: synthetic typing garbles special characters
   under the VM's French AZERTY layout; **Win+Space switches the layout
   to US and then the full URL types cleanly** (proven:
   `192.168.64.1:8000/Fanal.exe`).
3. The network: the VM uses vmnet-shared — the HOST is reached at
   **192.168.64.1** (bridge100), NOT the LAN IP 192.168.2.40.
4. The .exe: `apps/desktop/dist/win-unpacked/Fanal.exe` (built with the
   latest boot, watchdog and browser pilot inside). The NSIS installer
   needs Rosetta on this Mac (`softwareupdate --install-rosetta
   --agree-to-license`) or a native build inside the VM.
5. The recipe with the current UTM buttons + the installer traps:
   docs/WINDOWS-SESSION-PROMPT.md.

## The toolbox that stays (working, low cost)

| Tool | What it does | Verdict |
|---|---|---|
| tools/screen-read.sh | screen capture + on-device Vision OCR — the "text eyes" | KEEP (support) |
| tools/screen-watch.sh v2 | 250 ms bursts, signal-keyword filter, stops at first hit | KEEP (limited use) |
| tools/pilot-badge.sh + badge v4 | the top bar (all Spaces, blue/green/red), done auto-dismisses in 30 s | KEEP minimal |
| supervisor/browser-cdp.js + /api/browser/* | the VISIBLE browser pilot with the mandatory badge and SEMI confirm | KEEP (the product!) |
| tools/transf-server.sh | serves ~/transf for the VM | KEEP (dormant) |

## The lessons already in the Knowledge Ledger

- #28 macOS code signing vs native bindings (node-nohr).
- #29 GitHub silences brand-new accounts.
- #30 the watcher that watched its own echo: aim at signals, skip the
  echo, stop at the first hit — act, never poll the same state twice.
- (new) The synthetic keyboard is the human's, not the agent's:
  AZERTY remaps special chars; switch layouts before typing.
- (new) The announcement must not outlive the announced: every "done"
  state auto-dismisses; silence is green, never an alarm.
- (new) The diminishing-returns rule: prepare in the browser, decide in
  the human; drive the DOM only for the PREPARATION layer.

## The trigger to resume (demand-first)

Resume this dossier only when a PAYING organism or client asks for it:
the MRC node, the government forms pack (Le Secrétaire), or a client
that needs cross-application automation. Until then: Phase 0 (demand)
is the road.
