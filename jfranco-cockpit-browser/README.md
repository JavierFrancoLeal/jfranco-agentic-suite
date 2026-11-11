# @javierfrancoleal/cockpit-browser — EL NAVEGADOR DE CABINA

> ⚡ **Super Agent Ready** — un navegador Chromium **real** que el agente de DSH
> controla por CDP, con las barandillas de seguridad de Fanal. Cero dependencias
> npm, cero `eval`.

## Qué hace (de verdad)

Registra el comando **`/cockpit`**, que lanza un navegador (Chrome/Edge/Chromium)
y lo maneja por Chrome DevTools Protocol. El agente puede abrir una URL, leer la
página, rellenar casillas, hacer clic, capturar pantalla y leer el estado del
HUD — con:

- **Sesión persistente** — perfil dedicado `~/.dsh/cockpit-browser/profile`; las
  contraseñas las guarda Chromium en el llavero del sistema (Keychain/DPAPI).
- **Sin `file://`** — solo `http(s)`.
- **Freno constitucional** — `click` rechaza Envoyer/Soumettre/Payer/Transmettre
  (y `submit/pay/send/post/…`) con 🛑 FRENO.
- **Borde esmeralda** — todo lo que el agente toca queda con borde `#10b981`.
- **HUD** — ⚡ AGENTE / 🖐️ VOLANTE HUMANO / 🛑 FRENO, con `pause/resume/step` y
  detección automática del ratón físico.

## Qué NO hace (honesto)

- **No** dibuja el navegador dentro de la ventana de DSH: el host de DSH no
  expone Electron a plugins (límite duro de la plataforma). Abre una **ventana
  Chromium separada**, real, que tú puedes ver y tomar en cualquier momento.
- **No** envía por sí solo (el clic final es siempre tuyo).

## Instalar

```bash
dsh plugin --profile <perfil> add @javierfrancoleal/cockpit-browser
```

Reinicia la app. Requiere un navegador Chromium instalado. Configuración por
variables: `COCKPIT_CHROME`, `COCKPIT_PORT` (9333), `COCKPIT_PROFILE`.

## Documentos

- [assets/cockpit-browser.md](assets/cockpit-browser.md) — el skill que enseña al agente a usarlo.
- [assets/commands.md](assets/commands.md) — la referencia de comandos.
