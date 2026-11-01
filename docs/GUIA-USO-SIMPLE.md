# Guía de uso simple — DeepSeek Harness estilo Siri

Cómo tener a tus agentes siempre disponibles, en segundo plano, y activarlos
con un botón, una tecla o una frase — en cualquier idioma.

## 1. Siempre en segundo plano

- Deja **DeepSeek Harness** abierto (minimizado o en otra pantalla): tus
  plugins y sesiones siguen vivos en segundo plano.
- Opcional: Preferencias del Sistema → General → "Abrir al iniciar sesión"
  para que arranque solo con tu Mac.

## 2. El botón

- Crea la aplicación **"DSH Escucha"** con el script
  [`ui/DSH-Escucha.applescript`](../ui/DSH-Escucha.applescript) (Script
  Editor → guardar como Aplicación) y ponla en el **Dock**.
- Un clic = DeepSeek Harness al frente, listo para escuchar.

## 3. La voz (dictado de macOS, como Siri)

macOS trae dictado integrado; actívalo una vez en Preferencias del Sistema →
Teclado → Dictado. Después:

1. Clic en el botón (o Cmd+Tab a DeepSeek Harness).
2. Pulsa la tecla de dictado (por defecto: doble toque de Fn).
3. Di: **"escucha"** (o "listen", "écoute", "hör zu", "ascolta", "escuta",
   "听", "聞いて", "들어봐", "استمع"…) y relata la conversación.
4. Di: **"eso es todo"**.

La IA confirma "Listening — go ahead", divide las acciones, ejecuta lo
automático, te propone lo que necesita tu aprobación y cierra con el reporte.

## 4. Interpretación en tiempo real

Si uno de los interlocutores habla otro idioma, no hace falta nada más:
- El modo escucha detecta los idiomas y llama al **intérprete** solo.
- O di **"traduce"** / "translate" / "interpreta" / `/interpret`.
- Recibes el significado en tu idioma y la frase lista para decir en el
  idioma de la otra persona (en modo auricular: frases cortas y hablables).

## 5. La capa de acción (un botón, cero fricción)

La suite incluye dos accesos construidos para que la IA trabaje de forma
independiente:

- **Panel de Acción** ([`ui/panel.html`](../ui/panel.html)): ábrelo en tu
  navegador. Botones grandes (ESCUCHAR / HOTEL / RESTAURANTE / POLICÍA /
  INTERPRETAR), selector de idioma, dictado por voz, lectura en voz alta y
  botón de copiar. Pulsa, copia y pega en una nueva sesión de DSH.
- **DSH Asistente** ([`ui/DSH-Asistente.applescript`](../ui/DSH-Asistente.applescript)):
  una app de un botón que ejecuta tus plugins de forma **autónoma** (perfil
  `campo`, sin abrir DeepSeek Harness): te pregunta qué necesitas, la IA
  trabaja sola con los 5 plugins y el resultado se abre en TextEdit.
- **Paso único para el modo autónomo:** el perfil `campo` usa una clave API
  (la sesión interactiva de la app no se puede reutilizar desde fuera, por
  seguridad). Añade tu clave una sola vez:
  `export DSH_DEEPSEEK_API_KEY=sk-...` en tu Terminal (o en tu shell de
  arranque). Sin la clave, usa el **Panel de Acción** con la app abierta, que
  funciona sin configuración.

Para crear las apps en tu Mac: abre **Script Editor**, pega el texto del
`.applescript`, guárdalo como **Aplicación** y arrástrala al Dock.

## 6. Resumen de una línea

**Botón (Dock) → tecla de dictado → "escucha" → habla → "eso es todo" →
verifica el reporte → decides → resultado.** (O un clic en "DSH Asistente"
para ejecución totalmente autónoma.)

## Futuro (hoja de ruta)

- Botón flotante "escuchar" dentro de la propia app (client plugin).
- Modo barra de menú del Mac.
- Palabra de activación siempre activa ("DSH, escucha") con hardware
  compatible.
