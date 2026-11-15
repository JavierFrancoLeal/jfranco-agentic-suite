# Filosofía Visual de Trasunto & Fanal — Geometría Luminosa y Soberanía Humana (v1.0)

*Documento rector de diseño de interfaz, experiencia de usuario y coherencia espacial para todas las aplicaciones del ecosistema **Trasunto** (escritorio macOS/Windows/Linux, tabletas de mostrador/cocina, teléfonos inteligentes iOS/Android y consola web).*

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
Cuando la app opera en sala oscura o tablero de taller a distancia, el fondo cambia a **Índigo de Medianoche** (`linear-gradient(165deg, #0b1220 0%, #141f31 50%, #1e1b4b 100%)`), conservando el subtono `#1e1b4b`. **Queda prohibido** mezclar paneles negros de terminal (`#090d16`, `#020617`) con acentos cian neón (`#38bdf8`) o verde pantano (`#064e3b`) dentro de pantallas claras u onboarding.

### 2.3 Semáforo Fiduciario (Semántica Estricta — Cero Decoración)
En la 4.ª Revolución Industrial, el color significa **nivel de autonomía y responsabilidad**:

| Nivel | Texto | Superficie | Borde | Significado humano |
|---|---|---|---|---|
| **Verde (`GREEN`)** | `#15803d` | `#dcfce7` / `rgba(21,128,61,.07)` | `rgba(21,128,61,.30)` | Rutina verificada, bóveda robusta (`scrypt OK`), biometría vinculada, éxito confirmado |
| **Ámbar (`SEMI / YELLOW`)** | `#b45309` | `#fef3c7` | `rgba(217,119,6,.30)` | Propuesta pendiente de revisión o ahorro energético en batería |
| **Rojo (`RED`)** | `#b91c1c` | `#fee2e2` | `rgba(220,38,38,.30)` | Freno fiduciario obligatorio: acción irreversible, alerta de validación, bloqueo temporal |
| **Índigo (`HUMAN ACTIVE`)** | `#4D6BFE` | `rgba(77,107,254,.10)` | `rgba(77,107,254,.30)` | Toma de volante humano, progreso activo, foco interactivo |

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

## 4. Las 6 Leyes de Interacción Trasunto (Aplicables a Cualquier Plataforma)

1. **Test de Una Oración por Pantalla**: Si una pantalla no puede explicarse en una sola frase honesta al dueño del negocio, debe dividirse o simplificarse.
2. **Retroalimentación Inmediata y Visible en Capas Superiores**: Ningún clic puede quedarse "mudo". Las notificaciones flotantes (`.toast`) viven siempre en la capa superior absoluta (`z-index` por encima de asistentes y cortinas de seguridad), y toda acción crítica (como vincular Touch ID / Contraseña Maestra) muestra **estado en línea junto al botón**, foco automático al campo faltante y mensaje localizado en el idioma elegido.
3. **La Inacción No Envía (`Default Safe = NO`)**: Ante alertas o envíos externos, si el humano no confirma explícitamente (ej. temporizador de 10 s), el sistema elige no actuar y conserva el borrador intacto.
4. **De la Simplicidad al Poder Oculto (`Inbox-First / Progressive Disclosure`)**: Al abrir la app el usuario ve únicamente **lo que requiere su firma ahora**; los controles avanzados de configuración permanecen a un toque en **Ajustes** o modo avanzado.
5. **Cero Desperdicio de Cómputo (`0% CPU/GPU en Reposo`)**: Prohibidos `backdrop-filter` masivos en listas largas, prohibidos `setInterval` activos con la pestaña oculta (`visibilitychange`), animaciones discretas (`<= 0.35s`) con respeto estricto a `prefers-reduced-motion` y suspensión automática de tareas pesadas con batería baja.
6. **Continuidad Visual entre Estados Críticos**: El asistente inicial, el dashboard operativo, el HUD de piloto agéntico y la cortina de bloqueo biométrico comparten la **misma paleta morado-índigo**, tipografía y geometría. Un bloqueo por Loi 25 debe sentirse tan sereno y confiable como desbloquear la pantalla de un iPhone o Mac.

---

## 5. Adaptación Multidispositivo (Desktop · Tablet · Smartphone)

| Dispositivo | Rol en el ecosistema | Reglas espaciales Trasunto |
|---|---|---|
| **Escritorio (macOS · Windows · Linux)** | Silo central soberano del dueño, Bóveda cifrada `AES-256-GCM + scrypt`, piloto lado a lado | Ventana principal apilable o **franja lateral de 380–420 px** (junto al programa contable o navegador); HUD superior unificado (`38 px`, lavanda claro / oscuro adaptativo); atajo biométrico OS (Touch ID / Windows Hello) sin fricción. |
| **Tableta (iPadOS · Android — Cocina, Clínica, Recepción)** | Puesto operativo compartido (`Panel de Acción` y `Wallboard`) | Objetivos táctiles `>= 48 px`, rejilla 2 columnas, tipografía legible a distancia (`--trasunto-grad-portal` o Wallboard índigo nocturno), sin configuración sensible de propietario expuesta. |
| **Smartphone (iOS · Android PWA / Nativo)** | Firma rápida del dueño y dictado en movimiento | Flujo a un solo pulgar (`flex-direction: column` bajo `560 px`), inputs `>= 16 px`, tarjeta de decisión de pantalla completa para firmar o descartar propuestas en < 5 segundos. |

---

## 6. Separación Visual entre App Cliente (PYME) y Consola Trasunto (Creador/Operador)

Para prevenir errores humanos graves (por ejemplo, operar cuentas de terceros desde la misma ventana donde se gestionan expedientes propios):
- La **App Cliente Fanal** muestra exclusivamente la marca del negocio instalado, su silo cifrado local y sus flujos diarios; jamás expone herramientas de aprovisionamiento o firma interna de Trasunto.
- Toda futura **Consola Operativa de Trasunto (Admin)** debe portar una insignia visual y cromática claramente diferenciada (cabecera administrativa explícita + carpeta/perfil de datos aislado) y nunca compartir directorio de datos con la instalación PYME cotidiana del fundador.

---

## 7. Lista de Verificación Anti-Deriva (Antes de Aprobar Cualquier Pantalla)

- [ ] ¿Todos los fondos, botones, modales y cortinas de seguridad pertenecen a `#4D6BFE` / `#7c5cff` / `#a78bfa`, blanco o superficie `#f5f7ff` (sin parches `#090d16` ni `#064e3b` insertados a mano)?
- [ ] ¿Las alertas `.toast` flotan por encima de absolutamente cualquier overlay, asistente o cortina (`z-index` superior)?
- [ ] ¿Cada botón responde visualmente al clic en < 100 ms (estado en línea, deshabilitado temporal o foco al requisito previo)?
- [ ] ¿Las 10 lenguas soportadas (`en`, `es`, `fr`, `de`, `it`, `pt`, `zh`, `ja`, `ko`, `ar`) tienen traducción completa sin textos duros en un solo idioma?
- [ ] ¿Se conserva compatibilidad total con `prefers-reduced-motion`, teclado (`Enter` / `Tab`) y pantallas `<= 560 px`?
