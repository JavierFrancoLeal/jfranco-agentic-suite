# 🔥 EL FUEGO-LOG — el registro canónico del fuego (append-only)

*Formato canónico del estándar EL FUEGO. Nunca editar — solo anexar. El
órgano `audit` escribe aquí cada lección, y el órgano `forensics` la
recupera para quien llegue después.*

## 2026-11-02 — El menú impreso: el arreglo que no llegaba al probador
- concepto: flujo
- fricción: el usuario reportaba "persiste" tras arreglos correctos; probaba una app instalada que no se reemplazaba.
- lección: un "persiste" puede ser un build obsoleto — el arreglo no existe hasta que el artefacto llega a la pantalla correcta.
- orden-correcta: "Reconstruye el .dmg y REEMPLAZA la app en Aplicaciones antes de probar; añade la versión visible en el footer."
- evidencia: triage.md 2026-11-02 (carrete), footer verBadge en supervisor/dashboard.html.

## 2026-11-02 — La referencia muerta que mató la página entera
- concepto: componentes
- fricción: "hiciste todo mal": la página quedó muerta — un contenedor borrado seguía referenciado dentro de un arreglo dinámico.
- lección: una referencia a un elemento inexistente mata TODO el script, no solo un botón; las pruebas indulgentes lo ocultan.
- orden-correcta: "Ejecuta el smoke ESTRICTO (ids ausentes = fallo) antes de publicar."
- evidencia: tools/smoke-dashboard.js (STRICT), commit be69ae1.

## 2026-11-02 — El menú invisible (z-index)
- concepto: capas
- fricción: "al presionar el botón no pasa nada" — el menú se abría DETRÁS de la pantalla (z-index 90 < 95).
- lección: "no pasa nada" casi siempre es una capa: verifica qué está encima de qué.
- orden-correcta: "El menú debe abrirse ENCIMA de todas las capas (z-index superior)."
- evidencia: supervisor/dashboard.html (.langov z-index 110), LEARNINGS.md (z-index ledger).

## 2026-11-02 — El logo invisible y el contenido que dependía de la animación
- concepto: animación
- fricción: el logo no se veía — nacía con stroke oculto esperando una animación que el usuario tenía desactivada (reducir movimiento).
- lección: el contenido nunca debe depender de la animación para existir; la animación es decoración, la visibilidad es un derecho.
- orden-correcta: "Visible por defecto; la animación solo si el usuario permite movimiento."
- evidencia: supervisor/dashboard.html (prefers-reduced-motion: no-preference), commit 07396f2.

## 2026-11-02 — El solapamiento de pantallas
- concepto: línea de tiempo
- fricción: "bug en la transición" — el splash se desvanecía mientras la pantalla siguiente ya aparecía.
- lección: secuencia explícita: la pantalla anterior termina de desvanecerse ANTES de que entre la siguiente.
- orden-correcta: "Splash sale (0.5s de fade), DESPUÉS entra la siguiente con su propio fade."
- evidencia: supervisor/dashboard.html (1300ms → 1900ms), LEARNINGS.md (timeline explícita).

## 2026-11-02 — La caja blanca que rompía la familia visual
- concepto: sistema de diseño
- fricción: "incongruencia entre el diseño" — el login era una tarjeta blanca en un mundo de degradados y cristal.
- lección: la página de inicio es el ADN estético; toda pantalla lo hereda.
- orden-correcta: "Misma estética que la página de idiomas: degradado, cristal, mismo rectángulo."
- evidencia: supervisor/dashboard.html (#loginView transparente sobre degradado), commit 197f5a6.

## 2026-11-03 — Una sola puerta: el primer arranque ES el login
- concepto: flujo
- fricción: "hay dos inicios de sesión… se repite un proceso" — la bienvenida y el login convivían.
- lección: el usuario no debe distinguir entre instalar, crear y entrar: un solo momento de bienvenida, y la creación vive DENTRO del login (solo si no hay usuarios).
- orden-correcta: "Elimina la segunda etapa; si no hay dueño, muestra los campos de creación dentro de la misma tarjeta."
- evidencia: supervisor/server.js (/api/setup, /api/setup-status), supervisor/dashboard.html (#setupSection), commit a4aea04.

## 2026-11-03 — Texto blanco sobre fondo claro (y tokens de diseño corruptos)
- concepto: color
- fricción: "hiciste todo mal, no sé ni por dónde comenzar" — el login transparente tenía texto blanco, pero el degradado saturado solo se aplicaba al CAMBIAR de vista; al cargar, quedaba sobre el degradado claro.
- lección: el estado visual inicial debe ser correcto por defecto (el fondo correcto desde la carga), y los tokens de diseño nunca deben auto-referenciarse (--card2:var(--card2)).
- orden-correcta: "Aplica el fondo correcto desde la carga inicial y verifica que las variables de diseño tengan valores reales."
- evidencia: supervisor/dashboard.html (document.body.classList.add("loginpage") en el arranque; :root restaurado), commit be69ae1.

## 2026-11-03 — No toda idea es un órgano: el conductor fue absorbido
- concepto: sistema de diseño
- fricción: se creó un órgano nuevo (conductor) para enseñar, cuando el organismo YA tenía quién revisa la fricción (audit).
- lección: antes de crear un órgano nuevo, pregunta si uno existente ya respira esa función — la lente industrial se aplica también a las propias ideas.
- orden-correcta: "Absorbe la pedagogía en el audit; depreca el conductor con su historia honesta."
- evidencia: jfranco-audit/assets/audit.md ("Teach, not only report"), conductor deprecado en npm, commit 636aa23.
