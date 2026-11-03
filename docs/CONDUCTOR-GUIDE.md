# El manual del director de orquesta — las 7 ideas para dirigir sin programar

*Para saber mandar hay que saber… las palabras justas. Este manual nace del
análisis de TODAS tus peticiones sobre la pantalla de inicio — cada error
nuestro se convirtió en una lección tuya.*

## Cómo leer este manual

Cada idea tiene: qué es (en restaurante), el vocabulario exacto para tus
prompts, y el ejemplo REAL de esta sesión ("dijiste X → ahora lo pedirías Y").

---

## 1. 🏢 Las capas (z-index) — los pisos de un edificio

Toda pantalla es un edificio: el contenido vive en pisos. Un menú que
"aparece" puede estar **detrás** de otra capa (invisible) — eso pasó
cuando el clic "no hacía nada".

- Vocabulario: *"capa", "encima de", "debajo de", "z-index", "overlay"*.
- Prompt modelo: *"El menú de idiomas debe abrirse ENCIMA de la pantalla
  de idiomas, nunca detrás."*
- Tu caso real: *"Al presionar el botón no pasa nada"* → era el menú
  abriéndose **detrás**. Hoy lo pedirías: *"verifica que el menú esté por
  encima de todas las capas."*

## 2. 🎬 El flujo (una puerta, estados) — el recorrido del cliente

Qué pantalla lleva a qué pantalla, y qué cambia entre "primera visita" y
"visita normal".

- Vocabulario: *"flujo", "pantalla", "transición", "primer arranque",
  "estado", "una sola puerta"*.
- Prompt modelo: *"El flujo debe ser: A → B → C. Sin pantallas repetidas."*
- Tu caso real: *"hay dos inicios de sesión"* → pedías **un solo flujo**.

## 3. ⏱️ La línea de tiempo (secuencia) — el servicio por tiempos

Cuándo entra y sale cada elemento. Dos cosas no deben mostrarse a la vez
sin orden.

- Vocabulario: *"primero", "después", "fade in/out", "duración",
  "solapamiento", "milisegundos"*.
- Prompt modelo: *"Primero termina de desvanecerse el logo (0.5s), DESPUÉS
  aparece la pantalla de idiomas. Sin solaparse."*
- Tu caso real: *"hay un bug en la transición"* → las dos pantallas se
  mostraban a la vez.

## 4. 🧱 Los componentes — los muebles del salón

Cada cosa visible es un componente con propiedades: tamaño, forma,
esquinas, posición.

- Vocabulario: *"logo", "rectángulo", "tarjeta", "botón", "esquinas
  redondeadas/chatas", "tamaño", "centrado", "arriba/abajo"*.
- Prompt modelo: *"El logo más grande (200px), centrado; debajo, el
  rectángulo de idiomas con esquinas chatas."*
- Tu caso real: *"agrandar el logotipo y la barra"* — exactamente esto.

## 5. 🎨 Los colores y la transparencia — la luz del lugar

El color tiene 4 números: R (rojo), G (verde), B (azul) y **alfa** (la
transparencia, de 0 invisible a 1 sólido). "Translúcido" = alfa ~0.3.

- Vocabulario: *"degradado", "translúcido", "alfa/opacidad", "morado
  translúcido", "contraste", "texto legible sobre el fondo"*.
- Prompt modelo: *"El rectángulo con fondo morado translúcido (alfa 0.3) y
  texto blanco legible."*
- Tu caso real: *"utiliza el color morado pero translúcido"* — ahora lo
  pides con el número exacto: *"alfa 0.3"*.

## 6. 🎞️ La animación — el movimiento continuo

Un carrete que gira debe **cerrar el ciclo sin saltar**: se duplica el
contenido y se mueve en bucle. Y una regla de oro: **el contenido nunca
debe depender de la animación para verse** (si el usuario desactiva
movimiento, todo debe seguir visible).

- Vocabulario: *"bucle", "sin salto", "velocidad (segundos por vuelta)",
  "duplicar contenido", "reducir movimiento", "visible por defecto"*.
- Prompt modelo: *"El carrete gira en bucle sin saltos (20s por vuelta); si
  el usuario pide menos movimiento, el logo se muestra completo."*
- Tus casos reales: *"se para y aparece en otra posición"* (bucle con
  salto) y *"el logo no se ve"* (dependía de la animación).

## 7. 🎼 El sistema de diseño — una sola familia visual

La página de inicio define el ADN: degradado, cristal, colores, ritmo.
Toda pantalla hereda ese ADN — nunca una pantalla "blanca" distinta.

- Vocabulario: *"misma estética", "copiar el estilo de", "sistema de
  diseño", "consistencia", "ADN visual"*.
- Prompt modelo: *"La pantalla de login debe copiar la estética de la
  página de idiomas: degradado, cristal y el mismo rectángulo."*
- Tu caso real: *"hay una incongruencia entre el diseño"* → pedías
  consistencia.

---

## 🎯 Tu plantilla de órdenes (el prompt perfecto)

> **"[Acción] [componente] en [pantalla]: [propiedad] de [valor A] a
> [valor B], con [detalle], a [velocidad/duración], [sin/antes/después de]
> [condición]. Misma estética que [pantalla de referencia]."**

Ejemplo completo (mezcla tus peticiones reales):
*"Cambia el rectángulo de idiomas en la pantalla de bienvenida: fondo
morado translúcido (alfa 0.3), esquinas chatas, idiomas deslizando en bucle
sin saltos (20s por vuelta), más grande (460px); al hacer clic se despliega
ENCIMA de todo con English al centro; la pantalla de login copia esta
estética."*
