# Filosofía Visual de Trasunto & Fanal — Geometría Luminosa y Soberanía Humana (v1.2)

*Documento rector de diseño de interfaz, experiencia de usuario y coherencia espacial para todas las aplicaciones del ecosistema **Trasunto** (escritorio macOS/Windows/Linux, tabletas de mostrador/cocina, teléfonos inteligentes iOS/Android, Wallboards y consola web).*

---

## 1. El Alma Visual: ¿Por qué Morado Luminoso en la 4.ª Revolución Industrial?

En la 4.ª Revolución Industrial (automatización agéntica + IA ubicua + regulación de privacidad como la **Loi 25**), la mayoría del software con IA cae en uno de dos extremos hostiles para el trabajador real:
1. **La estética de "terminal hacker"** (fondos negros `#090d16`, texto monoespaciado, neón cian/verde): intimida al restaurantero, médico, abogado o contratista y comunica riesgo o fragilidad técnica.
2. **El ERP corporativo opaco** (cientos de menús, tablas densas, advertencias burocráticas): paraliza la toma de decisiones diaria.

**Trasunto elige un tercer camino: el Fanal Luminoso.**
- **El espectro Índigo → Violeta → Lavanda** (`#4D6BFE` → `#7c5cff` → `#a78bfa`) une dos polos psicológicos esenciales de nuestra doctrina:
  - **Índigo (`#4D6BFE`)**: rigor fiduciario, precisión operativa, claridad institucional.
  - **Violeta (`#7c5cff` → `#a78bfa`)**: visión estratégica, inteligencia serena que ilumina sin deslumbrar (*le Fanal*: la luz del faro al anochecer).
- **Lógica Apple adaptada a Trasunto**:
  - **Deferencia**: la interfaz nunca compite con la decisión humana ni muestra cables internos (cero IDs técnicos crudos en la superficie).
  - **Claridad orgánica**: aire generoso, tipografía del sistema nativa, contraste WCAG AA (`>= 4.5:1`), jerarquía obvia desde el primer vistazo.
  - **Profundidad contenida**: superficies blancas translúcidas (`rgba(255,255,255,.96)`) sobre lienzo solar lavanda-marfil (`#e8edff → #f6f7fb → #fdf1f8`) y tarjetas interiores sutiles (`#f5f7ff`), de modo que cada pantalla parezca parte de un mismo organismo vivo.

---

## 2. Sistema de Tokens Cromáticos (Fuente Única de Verdad)

Toda aplicación Trasunto —sin importar si corre en Electron, SwiftUI/iOS, Kotlin/Android, iPadOS o PWA— debe respetar exactamente estos tokens:

### 2.1 Superficies e Identidad Principal (Modo Claro Predeterminado)
| Token | Valor | Uso obligatorio |
|---|---|---|
| `--trasunto-grad-brand` | `linear-gradient(135deg, #4D6BFE 0%, #7c5cff 100%)` | Cabecera principal, botones de acción primaria, barra de progreso del asistente |
| `--trasunto-grad-portal` | `linear-gradient(160deg, #4D6BFE 0%, #7c5cff 55%, #a78bfa 100%)` | Pantallas de umbral: Bienvenida, Selector de Idioma, Asistente de Instalación y Cortina de Bóveda Bloqueada (`#fanal-lock-curtain`) |
| `--trasunto-canvas` | `linear-gradient(165deg, #e8edff 0%, #f6f7fb 45%, #fdf1f8 100%)` | Fondo del espacio de trabajo cotidiano |
| `--trasunto-surface` | `#ffffff` / `rgba(255,255,255,.96)` | Tarjetas principales (`.card`) y modales centrales (`.wiz-card`) |
| `--trasunto-subsurface` | `#f5f7ff` (`rgba(77,107,254,.05)`) | Subtarjetas encastradas dentro de un formulario (Bóveda, Biometría, Sectores, Permisos) |
| `--trasunto-border` | `rgba(15,23,42,.10)` / `rgba(77,107,254,.22)` | Delimitación sutil de tarjetas y campos interactivos |
| `--trasunto-ink` | `#101828` | Títulos y texto principal |
| `--trasunto-ink-muted` | `#667085` | Descripciones, subtítulos y contexto |
| `--trasunto-ink-meta` | `#98a2b3` | Metadatos secundarios, etiquetas de tiempo, separadores |

### 2.2 Modo Nocturno / Wallboard (`body.dark`, `body.wall`)
Cuando la app opera en sala oscura, Wallboard Live o tablero de taller a distancia, el fondo cambia a **Índigo de Medianoche** (`linear-gradient(165deg, #0b1220 0%, #141f31 50%, #1e1b4b 100%)`), conservando el subtono `#1e1b4b`. **Queda prohibido** mezclar paneles negros de terminal (`#090d16`, `#020617`, `#0f172a`, `#1b2436`) o fondos rosados/cian neón (`#38bdf8`, `#fff5f5`, `#064e3b`) en ninguna vista secundaria (`#wallView`, `/panel`, visores de prueba o ventanas `BrowserWindow` de escritorio).

### 2.3 Semáforo Fiduciario (Semántica Estricta — Cero Decoración)
En la 4.ª Revolución Industrial, el color significa **nivel de autonomía y responsabilidad**:

| Nivel | Texto | Superficie | Borde | Significado humano |
|---|---|---|---|---|
| **Verde (`GREEN`)** | `#15803d` | `#dcfce7` / `rgba(21,128,61,.07)` | `rgba(21,128,61,.30)` | Rutina verificada, bóveda robusta (`scrypt OK`), biometría vinculada, éxito confirmado |
| **Ámbar (`SEMI / YELLOW`)** | `#b45309` | `#fef3c7` | `rgba(217,119,6,.30)` | Propuesta pendiente de revisión o ahorro energético en batería |
| **Rojo (`RED`)** | `#b91c1c` | `#fee2e2` | `rgba(220,38,38,.30)` | Freno fiduciario obligatorio: acción irreversible, alerta de validación, bloqueo temporal |
| **Índigo (`HUMAN ACTIVE`)** | `#4D6BFE` | `rgba(77,107,254,.10)` | `rgba(77,107,254,.30)` | Toma de volante humano, progreso activo, foco interactivo |

### 2.4 Regla Anti-Camuflaje del Logo y Medallón de Contraste

Un emblema de identidad **jamás puede trazarse con el mismo espectro cromático que su fondo**:
- **Prohibición explícita**: nunca renderizar el isotipo en gradiente `#4D6BFE -> #7c5cff` de forma desnuda (`background: none`) sobre `#4D6BFE -> #7c5cff -> #a78bfa` (`--trasunto-grad-portal` / `--trasunto-grad-brand`), ni depender de `backdrop-filter: blur(...)` como único contraste (las reglas de reposo `0% GPU` desactivan filtros de desenfoque).
- **El Par Complementario Apple / Trasunto**:
  - **En icono de sistema / App Dock (`icon.png` / `le-veilleux-appicon.svg`)**: trazo blanco `#FFFFFF` dentro de squircle degradado `#4D6BFE -> #7c5cff` (y en **Fanal Studio** `icon-studio.png`, fondo índigo profundo `#1e1b4b -> #312e81` con emblema blanco e insignia ámbar `STUDIO` para distinción inmediata en Dock/Finder).
  - **Sobre cabeceras, pantallas de umbral (`#langStep`, `#splash`, `welcome.html`), acceso (`#loginView`), Panel de Acción (`/panel`) y Live Wallboard (`#wallView`)**: todo isotipo vive alojado dentro de un **Medallón Perla Luminoso** (`.brand-medallion` / `.brand-mark` squircle `linear-gradient(155deg, #ffffff 0%, #f3f6ff 100%)`, borde `1.5px`–`2px solid #ffffff`, halo exterior `0 0 0 3px..8px rgba(255,255,255,.16)` y sombra difusa `0 6px 22px rgba(15,23,42,.22)`), trazado en el interior con el gradiente de marca `#4D6BFE -> #7c5cff` usando **`viewBox="6 6 52 52"` y una proporción de ocupación de ~`84%`–`86%` dentro del recuadro blanco** (`34px` en cápsula de `40px`, `62px` en `74px`, `96–100px` en `112–118px`, `122px` en `144px`), garantizando aire mínimo sin encoger el símbolo ni recortar su trazo (`> 3:1` WCAG 1.4.11 tanto en modo claro como sobre índigo nocturno `#0b1220 -> #1e1b4b`).
- **Aislamiento de Gradientes SVG Inline**: cuando convivan múltiples instancias `<svg>` del emblema en un mismo HTML, cada `<linearGradient>` debe portar un `id` único (`fanalLangGd`, `fanalSplGd`, `fanalHdrGd`, `fanalLoginGd`, `fanalWallGd`) para evitar colisiones o pérdidas de trazo si otro contenedor se oculta con `display: none`.

---

## 3. Geometría Concéntrica, Tipografía y Tactilidad

Siguiendo el principio de **curvas concéntricas de Apple**, cada radio exterior envuelve armónicamente al interior (`R_ext = R_int + padding_rel`):

- **Modales y Cartas Umbral** (`.wiz-card`, tarjeta de desbloqueo de bóveda): `border-radius: 26px`, `padding: 34px 28px`, sombra difusa profunda `0 30px 80px rgba(15,23,42,.35)`.
- **Tarjetas Operativas** (`.card`): `border-radius: 20px`, `padding: 16px`, sombra suave `0 8px 24px rgba(15,23,42,.06)`.
- **Subtarjetas y Opciones Seleccionables** (`.ws`, `.wiz-subcard`, `.metric`): `border-radius: 14px`–`16px`, `padding: 12px`–`14px`.
- **Campos de Texto y Botones** (`input`, `select`, `textarea`, `.btn`): `border-radius: 12px`–`14px`, altura táctil mínima `44px` en móvil/tablet.
- **Píldoras, Badges y Notificaciones Toast**: `border-radius: 999px`.
- **Tipografía**: pila nativa del sistema (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`) — cero descargas de fuentes externas en red (privacidad y rendimiento sin conexión), `font-size >= 15px–16px` en formularios (evita zoom forzado en iOS/Android). La fuente `monospace` se reserva exclusivamente para trazas técnicas puntuales, nunca para etiquetas o campos de usuario.

---

## 4. Las 10 Leyes de Interacción Trasunto (Aplicables a Cualquier Plataforma)

1. **Test de Una Oración por Pantalla**: Si una pantalla no puede explicarse en una sola frase honesta al dueño del negocio, debe dividirse o simplificarse.
2. **Retroalimentación Inmediata y Visible en Capas Superiores**: Ningún clic puede quedarse "mudo". Las notificaciones flotantes (`.toast`) viven siempre en la capa superior absoluta (`z-index` por encima de asistentes y cortinas de seguridad), y toda acción crítica (como vincular Touch ID / Contraseña Maestra) muestra **estado en línea junto al botón**, foco automático al campo faltante y mensaje localizado en el idioma elegido.
3. **La Inacción No Envía (`Default Safe = NO`)**: Ante alertas o envíos externos, si el humano no confirma explícitamente (ej. temporizador de 10 s), el sistema elige no actuar y conserva el borrador intacto.
4. **De la Simplicidad al Poder Oculto (`Inbox-First / Progressive Disclosure` + Pedagogía Autodisolvible)**: Al abrir la app el usuario ve únicamente **lo que requiere su firma ahora** (objetivos de usabilidad: *Time-To-First-OK* `< 6 s`, *3 firmas en 18 s*). Cuando `pending > 0`, el ruido pedagógico cae a `0%` (**Silencio VERDE**); cuando la bandeja está vacía o una función está en sus primeros 3 usos (*SEMI 1/3 -> 3/3*), muestra una explicación breve con nombres de beneficio humano (ej. *Escudo de Datos*, nunca siglas internas), disolviéndose tras el tercer uso exitoso.
5. **Cero Desperdicio de Cómputo (`0% CPU/GPU en Reposo`)**: Prohibidos `backdrop-filter` masivos en listas largas, prohibidos `setInterval` activos con la pestaña oculta (`visibilitychange`), animaciones discretas (`<= 0.35s`) con respeto estricto a `prefers-reduced-motion` y suspensión automática de tareas pesadas con batería baja.
6. **Continuidad Visual entre Estados Críticos**: El asistente inicial, el dashboard operativo, el Live Wallboard (`/dashboard?wall=1`), el Panel de Acción (`/panel`), el HUD de piloto agéntico, las ventanas de prueba sincronizada en escritorio y la cortina de bloqueo biométrico comparten la **misma paleta morado-índigo**, medallón perla, tipografía y geometría. Un bloqueo por Loi 25 debe sentirse tan sereno y confiable como desbloquear la pantalla de un iPhone o Mac.
7. **Iconografía Vectorial Unificada (Zero-Emoji Chrome)**: Los botones utilitarios de cabecera (modo simple/avanzado, modo nocturno, notificaciones, síntesis de voz y limpieza rápida) se construyen siempre con **iconografía SVG de trazo continuo (`stroke-width: 1.9`, esquinas redondeadas)** alojada en cápsulas de cristal esmerilado (`36–38 px`, `border-radius: 11px–12px`). Nunca se colocan emojis genéricos de sistema operativo (`👁️`, `🌙`, `🔊`, `🔔`, `🗑️`) como controles principales de cabecera porque rompen la unidad tipográfica entre macOS, Windows e iOS.
8. **Navegación Sin Callejones (Zero Dead-Ends) y Cabecera Limpia**: Toda vista secundaria o modal de pantalla completa (`Live Wallboard`, `/panel`, configuraciones avanzadas) debe ofrecer siempre un botón visible `← Volver` (`#wallBackBtn`, `#panelBackBtn`) arriba a la izquierda dentro de la misma ventana, sin abrir pestañas atrapadas con `target="_blank"` dentro de la aplicación de escritorio. Debajo del bloque superior izquierdo `Fanal / TRASUNTO` no se renderiza ningún rectángulo semitransparente decorativo ni lema vacío. Además, la selección global de idioma vive exclusivamente en la **pantalla de inicio** (`#langStep`) y en la **pantalla de ingreso** (`#loginView`), centralizando todo cambio posterior únicamente dentro de **Ajustes** (`#tab-reglages` -> `#reglageLangs`).
9. **Continuidad al Reabrir y Protección Antiespía Nativa**: Cerrar y reabrir Fanal debe restaurar inmediatamente el estado activo (asistente si faltan usuarios, acceso PIN/biométrico si existe dueño) sin ocultar jamás contenedores padres por efectos secundarios del DOM. En paralelo, todas las ventanas de escritorio mantienen activa la protección nativa `setContentProtection(true)`: cualquier captura de pantalla o grabador externo ve únicamente el fondo del escritorio, blindando PII, biometría y datos fiscales bajo Loi 25 por diseño.
10. **Nubes de Ayuda Contextual (`#fanalTooltip`) — Regla Estricta de Cursor vs Táctil**: En entornos con puntero fino (`@media (hover: hover) and (pointer: fine)`), pasar el cursor sobre cualquier botón o pestaña muestra una nube sobria (`rgba(16,24,40,.94)` claro / `rgba(30,27,75,.96)` oscuro, borde lavanda sutil, `max-width: 240px`) **antes de presionar clic** tras una pausa anti-parpadeo de `150 ms` (`80 ms` en transiciones continuas) con `pointer-events: none` sobre sub-elementos internos, desapareciendo en `0 ms` al mover el cursor, presionar clic, hacer scroll o pulsar `Escape`, e impidiendo la aparición simultánea del `title` nativo del sistema operativo. En selectores de idioma (`.langbtn`, `.orow`, `.pill`), cada opción muestra la nube **escrita en su propio idioma destino** (incluyendo `dir="rtl"` en árabe, ej. *"Para seleccionar Español, presiona aquí"*). Debe respetar las fronteras de la ventana incluso en **franja lateral de `380 px`**, ofrece interruptor opcional en **Ajustes** (`fanal-tooltips`), y **se suprime por completo en teléfonos y tabletas táctiles** (`hover: none` / `pointer: coarse`), donde todo control explica su efecto con microcopia visible debajo del campo o dentro del botón.

---

## 5. Matriz Completa Multidispositivo y Especificidad de Patrones

El código web de Fanal sigue la doctrina **Un solo cerebro web, múltiples pieles (*One web brain, many skins*)**: Electron en escritorio, PWA/Safari/Chrome hoy y Capacitor (APK/IPA) cuando la flota de dispositivos lo exija. Cada patrón de diseño **debe activarse únicamente donde la ergonomía física del dispositivo lo hace útil**:

| Patrón / Mecanismo de Diseño | Escritorio (`macOS · Windows · Linux` + Electron/Web) | Tableta (`iPadOS · Android` — Cocina, Mostrador, Clínica) | Smartphone (`iOS · Android <= 560px` — PWA / Pulgar) | Kiosko / Wallboard (`>= 1280px` — Sala, Pasillo) |
|---|---|---|---|---|
| **Rol en el ecosistema** | Silo central soberano del dueño, Bóveda cifrada `AES-256-GCM + scrypt`, piloto navegador lado a lado | Puesto operativo compartido (`Panel de Acción` `/panel` o cocina) conectado al cerebro por LAN/HTTPS | Firma rápida en movimiento (`3 decisiones en < 18 s`) y dictado por voz de terreno | Pulso visual pasivo (`updates 30s`) en modo nocturno ÍNDIGO `#0b1220 -> #1e1b4b` |
| **Nubes de ayuda con cursor (`#fanalTooltip`)** | ✅ **Activo (opcional en Ajustes)** — `150 ms` / `80 ms`, idioma nativo en selector de lenguas, pinzado a `380px`, cero `title` OS | ❌ **Desactivado por CSS/JS** (`pointer: coarse`) — Sin cursor el hover queda pegado tras tocar. Usar subtítulos `.hint` visibles | ❌ **Desactivado por CSS/JS** (`hover: none`) — Reemplazado por etiqueta clara en botón y 1 línea debajo | ❌ **No aplica** — Sin interacción continua |
| **Acoplamiento en franja lateral (`380–420 px`) y Doble Pantalla (Monitor 1 + Monitor 2)** | ✅ **Obligatorio** — Fanal corre junto a Excel/Chrome sin scroll horizontal; HUD `38 px` con split `50|50` | ⚠️ **2 columnas / pantalla completa** — Rejilla adaptable `repeat(2,1fr)` sin paneles divididos estrechos | ❌ **Flujo a 1 sola columna** (`flex-direction: column` bajo `560px`), cero tablas anchas sin scroll | ❌ **Vista panorámica** — Rejilla amplia de tarjetas KPI `.wall-grid` |
| **Navegación inferior de pulgar (`.bnav`) y objetivos táctiles `>= 44–48 px`** | ❌ **Oculta** — Usa pestañas horizontales superiores `.tabs` y controles `.ico-btn` `36px` | ✅ **Objetivos `>= 48 px`** para uso compartido rápido con manos ocupadas o guantes | ✅ **Obligatorio** — Barra inferior `.bnav` fija (`<= 560px`), botones `>= 44px`, teclado cómodo | ✅ **Botón `← Volver` (`38–44 px`)** arriba a la izquierda (`#wallBackBtn`) para salir al panel |
| **Campos `font-size >= 16px` anti-zoom y `.row` apilado** | ➖ `14px`–`15px` legible en escritorio | ✅ `15px`–`16px` legible a brazo extendido | ✅ **Obligatorio (`16px`)** — Evita zoom automático forzado por iOS Safari / Android Chrome | ❌ Solo lectura |
| **Lectura en voz alta (`SpeechSynthesis`) + Dictado (`SpeechRecognition`)** | ✅ **Activo** (requiere permiso SO de Micrófono en el asistente) | ✅ **Activo** — Ideal en recepción o cocina para traducción bilingüe en mostrador (`/panel`) | ✅ **Activo** — Flujo WhatsApp: tocar micrófono grande `#listenBtn`, dictar y confirmar | ❌ Silencioso salvo campana de orden aprobada |
| **Medallón Perla anti-camuflaje + `Zero-Emoji Chrome`** | ✅ Obligatorio en cabecera, login, asistente y Wallboard | ✅ Obligatorio (`/panel` idéntico al dashboard) | ✅ Medallón compactado (`96px` bajo `560px`) | ✅ Medallón en `.wall-brand` sobre índigo oscuro o morado |
| **Biometría nativa (Touch ID / Windows Hello / Face ID)** | ✅ **Electron (`safeStorage` + clave máquina)** para abrir bóveda en `0.4 s` | 🔜 **Via Capacitor / WebAuthn** cuando pase a PWA/nativo con dueño autorizado | 🔜 **Via Capacitor / WebAuthn** para firma móvil rápida sin reescribir lógica | ❌ **Prohibido** en pantallas públicas o compartidas |
| **Protección antiespía (`setContentProtection`) y bloqueo automático** | ✅ **Obligatorio en Electron** (bloqueo por inactividad `300 s`, tapa cerrada o pantalla bloqueada) | ⚠️ **Solo sesión operativa de campo** (sin llaves BYOK ni bóveda del dueño en puesto compartido) | ✅ Bloqueo del dispositivo + cierre de sesión; jamás exponer llaves maestras | ✅ Solo muestra métricas agregadas sin PII ni clientes |
| **Cero Cómputo en Reposo (`0% CPU/GPU` + modo batería)** | ✅ **Crítico en portátil** — Pausa captura IMAP/pollers con `onBattery`, `visibilitychange` y sin `backdrop-filter` | ✅ `visibilitychange` evita drenar batería en tablets de mostrador | ✅ Imprescindible en datos móviles y batería baja | ✅ Sondeo ligero cada `30 s` sin filtros GPU pesados |

---

## 6. Separación Visual entre App Cliente (PYME) y Consola Trasunto (Creador/Operador)

Para prevenir errores humanos graves (por ejemplo, operar cuentas de terceros desde la misma ventana donde se gestionan expedientes propios):
- **Dos binarios independientes (`supervisor/edition.js` + `tools/build-editions.mjs`)**:
  - **App Cliente PYME (`Fanal`, `ca.trasunto.fanal`, puerto `8787`, datos `~/.dsh/supervisor-data`)**: muestra exclusivamente la marca del negocio instalado, su silo cifrado local y sus flujos diarios; bloquea (`403 studio_edition_only`) las rutas de proveedor (`hotpatch-verify`, `passport/verify`, `evolution/*`, `nodes`, `beta/reader`) y nunca expone la pestaña ni el estilo de Consola Studio.
  - **App Creador / Operador (`Fanal Studio`, `ca.trasunto.fanal.studio`, puerto `8788`, datos `~/.dsh/trasunto-studio-data`)**: porta insignia explícita (`#studioHeaderBadge` + acento cromático índigo-ámbar `#1e1b4b -> #312e81 -> #b45309`), icono propio en Dock/Finder (`icon-studio.png`) y pestaña `🛠️ Studio` (Inspector de Diagnósticos Loi 25 re-sanitizados, Nodos Piloto y Verificador de Pasaportes), con perfil Electron y carpeta de datos totalmente aislados para coexistir sin colisión con la app cliente.

---

## 7. Guardia Perceptual Anti-Camuflaje y Puerta Automática de Contraste (`WCAG 2.1` + `CIELAB ΔE`)

Toda pantalla Trasunto/Fanal (claro, noche índigo, Studio, Wallboard, Panel de Acción y ventanas Electron) queda sujeta a verificación matemática automática antes de aprobar cualquier cambio visual:

- **Regla de Oro de Contraste (`WCAG 2.1 AA+`)**:
  - Texto normal (`< 24 px`, o `< 18,66 px` en negrita): contraste mínimo **`>= 4,5:1`** frente al fondo efectivo resultante de componer todas las capas translúcidas RGBA y probar **cada parada de degradado** del elemento contenedor.
  - Texto grande (`>= 24 px` o `>= 18,66 px` negrita), bordes activos, controles y `<select> option`: contraste mínimo **`>= 3,0:1`** (`>= 4,5:1` en opciones de formulario y píldoras).
- **Calibración de Tokens sobre Morado Trasunto**:
  - Los tonos luminosos `#4D6BFE` y `#7c5cff` son el alma de marca para acentos, trazos de isotipo y superficies decorativas, pero **todo botón con texto blanco** y pestaña activa emplea los equivalentes oscurecidos de alto contraste (`#354ed6 -> #573bd4 -> #6842cc`, contraste `> 5,8:1`).
  - Las insignias críticas (`#notifBadge`, errores `.loginerr`) emplean `#b91c1c` (`> 6,4:1` con texto blanco) y los encabezados de **Fanal Studio** degradan hacia bronce oscuro `#78350f` en lugar de ámbar lavado `#b45309`, manteniendo la insignia `.studio-pill` con contraste superior a `10:1`.
  - La paleta de texto secundario pasa de `#667085` a **`#475467`** en tema claro (`> 7,1:1`) y `#cbd5e1` en noche índigo (`> 10:1`).
- **Distancia Perceptual Anti-Camuflaje (`CIELAB ΔE`)**:
  - Todo medallón de marca (`.brand-mark`, `.lang-medallion`, `.splash-medallion`, `.welcome-medallion`) mantiene **`ΔE >= 15`** respecto a su superficie padre y **`ΔE >= 18`** entre los trazos vectoriales del faro y el relleno perla del medallón.
- **Puerta Continua en CI (`tools/audit-contrast.mjs`)**:
  - Integrada directamente en `tools/check.sh` y `tools/check.ps1`: ejecuta validación estática multi-archivo y, mediante Chrome Headless por protocolo CDP nativo, recorre todas las pantallas y temas en busca de texto o iconos ilegibles.

---

## 8. Divulgación Progresiva en Cascada (`Caja 1 -> Caja 2`)

Para eliminar contradicciones al registrar o configurar un cliente:
- **Estado Inicial Vacío Obligatorio (`value=""`)**: La **Caja 1** (Estructura: *Trabajador autónomo*, *Microempresa*, *PYME*) comienza sin preselección engañosa mientras la **Caja 2** permanece oculta (`hidden`), siguiendo la economía visual de Apple / Stripe / Linear.
- **Desbloqueo Determinista Basado en Motor (`supervisor/quebec-profiles.js`)**:
  - Si Caja 1 = **`AUTONOMOUS_SOLO`**, Caja 2 se desbloquea mostrando los **11 oficios autónomos reconocidos en Québec** (`prof:*`: CPA, Abogado/Barreau, Notario, Corredor OACIQ, Consultor CRIC/MIFI, Clínico CNESST/SAAQ, Gimnasio OPC, Propietario Plex TAL, Contratista RBQ, Consultor TI y Otro autónomo), activando automáticamente reglas deterministas de plazos y cumplimientos del oficio.
  - Si Caja 1 = **`MICRO_SINGLE_OWNER`** o **`SME_CELL`**, Caja 2 se desbloquea mostrando los **11 sectores económicos SCIAN** (`solo`, `restaurant`, `hotel`, `clinic`, `pharmacy`, `workshop`, `realestate`, `school`, `tourisme`, `agroalimentaire`, `generic`), sincronizado en registro inicial, asistente de 8 pasos, `Ajustes` y `welcome.html` en los 10 idiomas.

---

## 9. Lista de Verificación Anti-Deriva (Antes de Aprobar Cualquier Pantalla)

- [ ] **Paleta íntegra**: ¿Todos los fondos, botones, modales, vistas secundarias (`#wallView`, `/panel`, visores de escritorio) y cortinas de seguridad pertenecen a `#354ed6` / `#4D6BFE` / `#573bd4` / `#6842cc`, `#0b1220 -> #1e1b4b`, bronce oscuro `#78350f` (Studio), blanco o superficie `#eef2ff` (sin `#090d16`, `#020617`, `#0f172a`, `#1b2436`, `#38bdf8`, `#fff5f5` ni `#064e3b`)?
- [ ] **Auditoría automática de contraste (`audit-contrast.mjs`)**: ¿Pasan todas las pantallas en modo claro y noche índigo con `>= 4,5:1` texto normal, `>= 3,0:1` UI y `CIELAB ΔE >= 18` en medallones sin errores en Chrome Headless?
- [ ] **Anti-camuflaje y proporción del logo**: ¿Cada instancia del isotipo Fanal sobre fondos morados o nocturnos está enmarcada en su **Medallón Perla Luminoso** (`.brand-medallion` / `.brand-mark` / `.welcome-medallion` / `.logo`) con `viewBox="6 6 52 52"`, ocupación ~`84%`–`86%` y `id` de `<linearGradient>` SVG único?
- [ ] **Divulgación progresiva Caja 1 -> Caja 2**: ¿La Caja 1 comienza sin valor ambiguo y desbloquea dinámicamente los 11 oficios autónomos (`AUTONOMOUS_SOLO`) o los 11 sectores SCIAN (`MICRO_SINGLE_OWNER` / `SME_CELL`) traducidos en los 10 idiomas?
- [ ] **Iconografía limpia y transición semántica de estado**: ¿Todos los controles de cabecera (`#viewBtn`, `#darkBtn`, `#notifBell`, `#soundBtn`) y reveladores de contraseña (`#eyeBtn`) usan SVG vectoriales de trazo limpio con transición suave (`opacity` + `transform`) donde **Luna** indica modo oscuro activo, **Sol** indica modo claro activo, **Bocina con ondas/tachada** refleja audio activo/silenciado y **Ojo reposado/abierto-iluminado** refleja vista simple/avanzada y contraseña oculta/visible?
- [ ] **Nubes de ayuda en todo elemento interactivo de cursor**: ¿Cualquier botón, campo de entrada (`#loginUser`, `#loginPass`, `#setup*`, Ajustes), selector, enlace o tarjeta accionable muestra una explicación breve en `#fanalTooltip` antes del clic únicamente en dispositivos con `(hover: hover) and (pointer: fine)` (ocultándose al escribir o pulsar, con interruptor en Ajustes y suprimida en teléfonos/tabletas)?
- [ ] **Aislamiento Cliente vs Studio**: ¿El compilado por defecto (`apps/desktop/edition.json`) permanece estrictamente fijado en `"client"` (`ca.trasunto.fanal`) sin acceso a rutas de creador, mientras `Fanal Studio` (`ca.trasunto.fanal.studio`) se empaqueta por separado desde directorio aislado?
- [ ] **Navegación sin callejones**: ¿Toda vista secundaria (`/dashboard?wall=1` y `/panel`) tiene un botón `← Volver` visible y funcional sin depender del botón Atrás del navegador ni de `target="_blank"` en Electron?
- [ ] **Continuidad al reabrir**: ¿Cerrar y reabrir la app con `users === 0` después de seleccionar idioma mantiene `#loginView` y `#setupSection` visibles (verificado por prueba automática en `tools/smoke-dashboard.js`)?
- [ ] **Capas y respuesta instantánea**: ¿Las alertas `.toast` y `#fanalTooltip` flotan sobre cualquier overlay, asistente o cortina (`z-index` superior), y cada botón responde en `< 100 ms`?
- [ ] **Cobertura total i18n**: ¿Las 10 lenguas soportadas (`en`, `es`, `fr`, `de`, `it`, `pt`, `zh`, `ja`, `ko`, `ar`) tienen traducción completa (incluyendo nubes de ayuda, 11 oficios autónomos, Studio y Ajustes) sin marcas heredadas fuera de Fanal/Trasunto?
- [ ] **Ergonomía y privacidad nativa**: ¿Se valida la vista en **franja lateral de `380 px`**, `<= 560 px` táctil (`16 px` inputs + `.bnav`), `prefers-reduced-motion`, `0% GPU` en reposo y `setContentProtection(true)` en ventanas Electron?
