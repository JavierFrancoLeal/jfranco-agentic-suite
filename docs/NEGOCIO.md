# Negocio — Instalación, enseñanza y supervisión

El playbook de J.Franco para llevar la suite a clientes reales: instalar,
enseñar, supervisar y aprender de la vida real.

## 1. Qué se ofrece

Un **asistente de flujos de trabajo con accountability** para empresas:

- La IA **escucha** (botón, voz, cualquier idioma), **divide** el trabajo,
  **ejecuta** lo automático, **propone** lo que necesita aprobación y
  **reporta** todo — el humano verifica y decide.
- Traducción/interpretación en tiempo real dentro del mismo flujo.
- Un **registro vivo de supervisión** (`supervision.md`) donde queda cada
  reporte: qué entendió la IA, qué hizo sola, qué aprobó cada trabajador.

## 2. Instalación en el negocio

1. Instalar **DeepSeek Harness** en la computadora (Mac o Windows).
2. Instalar la **suite** (`dsh plugin --profile desktop add <ruta>` para los
   5 paquetes `@jfranco/*`).
3. Abrir el **Panel de Acción** (`ui/panel.html`) en el navegador o crear la
   app **DSH Asistente** (Mac: AppleScript; Windows: `DSH-Asistente.ps1`).
4. Clave API una vez para el modo autónomo (perfil `campo`).
5. Copiar la **plantilla de decisiones** del sector (hotel, restaurante,
   policía…) a `decisions.md` y ajustarla con el dueño del negocio.

## 3. Enseñanza al cliente (sesión de 1 hora)

1. **El botón:** un clic → la IA escucha.
2. **El flujo:** habla la conversación → di "eso es todo" → la IA divide →
   ejecuta lo 🟢, propone lo 🟡, pregunta lo 🔴.
3. **El reporte:** qué verificar (⚑) y qué decidir.
4. **Entrenar:** corregir con palabras normales; reglas nuevas a
   `decisions.md`.
5. **Interpretar:** decir "traduce" en cualquier momento, sin salir del
   flujo.

## 4. La prueba en la vida real

Fases: **piloto** (1 puesto, 1 semana) → **ajuste** (reglas y plantilla) →
**expansión** (varios puestos) → **métricas**.

Métricas desde el registro de supervisión:

- Acciones automáticas realizadas por la IA (tiempo ahorrado).
- Propuestas 🟡: cuántas se aprobaron, ajustaron o rechazaron.
- Correcciones del humano a la detección (calidad del entendimiento).
- Errores encontrados en la verificación ⚑ (calidad de la ejecución).

## 5. Supervisión del dueño

- Cada reporte se anexa a `supervision.md` (registro inmutable por turno).
- El dueño revisa semanalmente: qué decidió cada trabajador, qué hizo la IA
  sola, qué falló.
- Los ajustes van a `decisions.md` (más verde = más autonomía; más amarillo =
  más control).
- Impacto: comparar tiempos antes/después y calidad de las decisiones.

## 6. Open source y modelo de negocio

- Todo es **MIT** y público en GitHub: los clientes pueden auditar el código.
- Modelos posibles: **instalación y soporte** (servicio), **plugins a medida**
  por sector, **capacitación**, y **suscripción a conectores** de apps
  especializadas cuando existan.
- La prueba real es el producto: cada cliente aporta aprendizajes que
  mejoran la suite para todos (bitácora en `docs/APRENDIZAJES.md`).

## 7. Incertidumbre y aprendizaje

La vida real trae inputs imprevistos. Reglas de oro:

- Ante la duda, el semáforo va a 🟡 o 🔴, nunca a 🟢.
- Todo error se registra como gap en el reporte y se convierte en regla en
  `decisions.md`.
- El humano decide siempre: la IA nunca es responsable legal ni comercial.
  Eso se le explica al cliente el primer día.
