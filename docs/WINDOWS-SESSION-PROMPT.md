# Prompt for the Windows DSH session

Copy this prompt into a NEW DSH session running on a Windows machine
(DSH runs on Windows). It builds and field-tests the Windows installers
of Fanal.

---

PROMPT START

Trabaja en el repositorio público
https://github.com/JavierFrancoLeal/jfranco-agentic-suite
(rama main). Clónalo en esta máquina Windows y haz lo siguiente, en
este orden, sin generar artefactos de otras plataformas:

1. PREPARACIÓN: instala lo que falte (git, Node 24+, pnpm). El repo
   incluye apps/desktop con el paquete Electron.
2. LAS 3 PUERTAS (deben pasar ANTES de construir):
   - sh tools/check.sh  (si no hay shell, usa Git Bash incluido con git)
   - sh tools/verify-app.sh
   - sh tools/fanal-optimize.sh
   Si alguna puerta falla, arréglala en el repo (commit + push) o
   repórtala claramente — NUNCA construyas con puertas en rojo.
3. CONSTRUYE LOS INSTALADORES DE WINDOWS (sin firma):
   cd apps/desktop && pnpm install && pnpm exec electron-builder --win
   nsis portable --x64
   Verifica que dist/ contenga el instalador NSIS y el portable
   (Fanal-<version>-x64.exe).
4. PRUEBA REAL DE CAMPO (en esta máquina Windows):
   - Instala el NSIS (o corre el portable).
   - Primer arranque: idioma → animación de Fanal → el ASISTENTE de
     instalación de 7 pasos (Démarrage → negocio → sector → clave IA →
     permisos de Windows → resumen → cuenta del dueño).
   - Verifica que el paso de PERMISOS muestra las rutas de WINDOWS
     ("Settings → Privacy & security → Microphone", Explorador de
     archivos) y que el texto dice "Nothing leaves this PC" — si dice
     "Mac", es un bug: arréglalo.
   - Verifica que el panel (/panel) transcribe y resume con el cerebro
     flash, y que el supervisor se lanzó con el node del propio
     Electron (sin Node del sistema).
   - Verifica el micrófono y las notificaciones reales en Windows.
5. REPORTE: escribe docs/WINDOWS-FIELD-REPORT.md con: qué pasó, qué
   falló, capturas si es posible, y los commits/arreglos. Commit +
   push a main.

Reglas de la casa: todo lo automático queda registrado; nada se
sobrepromete; si algo no se puede probar en esta máquina, se dice
honestamente en el reporte. NO firmes el instalador (el certificado OV
es un paso posterior del operador).

PROMPT END

## How to run this on a SINGLE MacBook Air M1 (no second machine)

The same computer can host a Windows virtual machine. CURRENT steps
(verified against the official UTM docs, 2026 — the old "gallery"
button no longer exists):

1. Install **UTM**: https://mac.getutm.app
2. Install **CrystalFetch** (the tool UTM itself recommends for getting
   the Windows installer legally from Microsoft):
   App Store → search "CrystalFetch", or from
   https://github.com/TuringSoftware/CrystalFetch/releases
   → open CrystalFetch → pick the **Windows 11 ARM64** build → download
   the ISO.
3. In UTM, click the **"+"** button → **"Virtualize"** → **"Windows"** →
   choose RAM/cores → make sure **"Install Windows 10 or higher"** AND
   **"Install drivers and SPICE tools"** are checked → **Browse** →
   select the ISO from step 2 → choose disk size → **Save** → press the
   ▶ Run button.
4. In the VM window, press any key to start the Windows installer and
   follow it. Known traps (from the official docs):
   - "This PC can't run Windows 11" → newer UTM enables Secure Boot/TPM
     automatically; if not, the registry LabConfig bypass is in the UTM
     docs.
   - No network during setup → Shift+F10 → `OOBE\BYPASSNRO`, or on
     newer builds Shift+F10 → `start ms-cxh:localonly`.
   - Black screen after the guest tools (24H2) → eject the guest ISO
     from the CD menu and reset.
   (Windows needs a valid Microsoft license; for testing you can run
   unactivated.)
5. Inside Windows: install **Git for Windows** (git-scm.com) and
   **Node.js ARM64** (nodejs.org, Windows ARM64 build).
6. Install **DeepSeek Harness for Windows** (the official installer; if
   it only ships x64, Windows 11 ARM runs it under emulation).
7. Open a DSH session inside the VM (the web GUI opens in the VM's
   browser) and paste the prompt above.

Notes: Windows 11 ARM is the only Windows that runs on an M1; x64 apps
work through its built-in emulation. The unsigned .exe can ALSO be
generated directly on macOS (electron-builder cross-build) — the VM is
for the REAL field test.
