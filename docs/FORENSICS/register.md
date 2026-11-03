# 🦴 Dossier forense — La caja virtual (contra-registro)

*Dig ejecutado con el órgano `forensics` el 2026-11-03. Una función, cuatro capas.*

## 1. Los estratos

- **UI**: `supervisor/dashboard.html` — la tarjeta "🪙 Virtual register" (mesero) y "🪙 Day register" (dueño).
- **API**: `supervisor/server.js` — cinco endpoints `/api/register*` (líneas 366-370).
- **Estado**: `register.json` en el directorio de datos — un solo archivo, no una base.
- **Registros**: el Z-report exportable (`/api/export?type=register`) — la memoria auditable.

## 2. El rastreo (de punta a punta)

1. El mesero toca **"Open register"** → `POST /api/register/open` → escribe `{status:"open", items:[], sales:[]}` en `register.json`.
2. Añade artículos → `POST /api/register/add` → cada artículo entra a `items` con nombre y precio.
3. Toca **"💳 Record sale"** (elige método) → `POST /api/register/charge` → suma los `items`, crea una `sale` (con trabajador y método), y vacía `items`.
4. Cierra → `POST /api/register/close` con el total DECLARADO del terminal físico.
5. El servidor calcula: **registrado** (sus ventas) vs **declarado** (el terminal) → **varianza**.
6. El dueño ve la diferencia en ámbar y exporta el **Z-report**.

*Cada paso exige sesión (401 sin token) — el registro es un documento de dinero.*

## 3. El registro fósil (por qué existe así)

- El registro nació de la decisión **cash-first** ([docs/PAYMENTS-STRATEGY.md](PAYMENTS-STRATEGY.md)): *"no procesamos dinero; damos al dueño lo que paga a otros: la conciliación."*
- Evidencia de la intención: el endpoint `charge` guarda `worker` y `method` (commit del turno 135) — para que la varianza se atribuya a QUIÉN y CÓMO.
- El bug cazado al nacer: `saveUsers` no creaba el directorio en un arranque sin `init` → la lección está en EL-FUEGO-LOG (formato canónico).

## 4. El dossier (lenguaje llano)

**Qué hace:** una caja registradora paralela que NO cobra — anota lo que se vendió, quién y cómo, y al cierre compara contra el terminal físico. La diferencia es la señal: error, fuga o robo.

**Cómo fluye:** mesero (añade/registra) → archivo `register.json` → dueño (varianza + Z-report).

**Por qué cada pieza existe:** el archivo único (simplicidad, cero dependencias); la sesión obligatoria (es dinero); el Z-report (la prueba imprimible para contabilidad).

**Riesgos/gaps:** un solo archivo por día (la historia se sobrescribe al abrir de nuevo — conviene archivar el Z-report); la varianza no distingue error humano de robo (es señal, no veredicto — lo decide el dueño).

**Vocabulario para ordenar cambios:** *"en la caja: [abrir|añadir|registrar|cerrar|varianza|Z-report] — cambia [el método|el total|el filtro] a [valor]"*.

---
## 2026-11-03 — La caja que no procesa, solo recuerda
- concepto: flujo
- fricción: se quería integrar un procesador de pagos (Stripe/Lightspeed) antes de tener clientes.
- lección: el valor inmediato no es procesar el pago sino REGISTRARLO — el contra-registro ahorra capital (conciliación) sin comisiones ni riesgo.
- orden-correcta: "Añade una caja virtual: registrar ventas con método, cerrar contra el terminal, y mostrar la varianza."
- evidencia: supervisor/server.js (366-370), docs/PAYMENTS-STRATEGY.md, commit 53c306d.
