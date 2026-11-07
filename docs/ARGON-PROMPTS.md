# ARGON-PROMPTS — the copy-paste kit (chronological)

*The exact prompts to run in YOUR SAME Gemini Argon Max conversation.
Copy ONE, paste it, wait for the answer, then paste the NEXT. The
conversation already discussed the multi-brain Electron idea — Prompt 1
tells Gemini what Fanal really is. 2026-11-06.*

## Prompt 1 — Tell Gemini what Fanal is

"Recuerda la arquitectura multicerebro en Electron que discutimos.
Pues la CONSTRUÍ — y quiero que la audites como consultor adversarial.
Se llama Fanal: una capa de orquestación agéntica soberana para PYMEs
de Québec. La pila REAL: un supervisor Node.js de UN SOLO ARCHIVO (sin
framework, sin cadena de build, sin librería de esquemas) + una app
Electron (macOS/Windows) + un dashboard web en 10 idiomas. Su jaula
determinista son FUNCIONES PLANAS: validateDraft (vacío/inválido, piso
de precios en dígitos Y en palabras), la Constitución del cliente (tono,
políticas, precio mínimo, condiciones extremas, escaladas), un router
de cerebros (providers.json: baseUrl/modelo/clave por nivel — nube o
Ollama local), un velo PII en memoria (regex: los nombres de la Memoria
del cliente + teléfonos/correos se tokenizan ANTES de la nube y se
re-hidratan DESPUÉS), el elevador S (validar → 1 reintento con el error
exacto → hot-swap al cerebro profundo → paracaídas de 90 s → humano),
el semáforo (GREEN/SEMI/YELLOW/RED, registrado), y la accountability
bilateral (firma el que tiene la piel en el juego: el cliente o el
dueño). Medido: 10 tareas reales, S = 100% al primer pase, ~$0.03 en
total. REGLA: estás auditando un sistema REAL Y FUNCIONANDO — no
propongas reconstrucciones; propón los CAMBIOS MÍNIMOS que suban su
fiabilidad y soberanía. Empieza con tu veredicto de una línea."

## Prompt 2 — Battery A: the cage verdict

"Mi jaula determinista usa funciones planas, sin librería de esquemas y
sin TypeScript. Tu receta usa Zod + electron-vite. Enumera EXACTAMENTE
qué PIERDO y qué GANO en: cobertura de modos de falla, auditabilidad,
tiempo de arreglar un invariante roto, y la curva de aprendizaje de un
desarrollador nuevo. Luego: ¿cuál es la UNA librería de esquemas que
más protección añade al MENOR costo de cadena de build — o confirma que
las funciones planas bastan a mi escala? Responde con la estructura
exacta: VERDICTO (1 línea) · HUECOS (los 3 más importantes) · CAMBIOS
MÍNIMOS (a nivel código, en orden) · NO HAGAS · los números que
asumiste."

## Prompt 3 — Battery B: the PII veil adversarial audit

"Audita mi velo PII de forma ADVERSARIA. Es en memoria, con regex:
tokeniza los nombres/identificadores de la Memoria del cliente, y
patrones de teléfono/correo, ANTES de enviar el prompt a la nube, y
re-hidrata la respuesta al volver. Lista los textos concretos que AÚN
filtran PII: nombres que NO están en la Memoria, plurales y posesivos
('les Tremblay'), variantes de mayúsculas, acentos, apodos, líneas de
dirección, números de factura — y qué atrapa TU bóveda SQLite que el
mío no. Para cada fuga, dame el regex mínimo o el paso mínimo. Termina
con: ¿el riesgo Loi 25 justifica migrar YA a la bóveda SQLite, o solo
cuando un cliente gubernamental lo exija? (Misma estructura de
respuesta: VERDICTO · HUECOS · CAMBIOS MÍNIMOS · NO HAGAS · números.)"

## Prompt 4 — Battery C: the S-elevator failure modes

"Estresa mi elevador S: validar → 1 reintento con el error exacto →
hot-swap al cerebro profundo → paracaídas de 90 s → humano. Lista los
modos de falla que NO he cubierto: el proveedor colgado SIN timeout
dentro de la llamada, la varianza de temperatura, las diferencias de
soporte de json_object entre los proveedores del router, el prompt del
reintento creciendo hasta reventar el contexto del cerebro barato, y el
cerebro profundo fallando TAMBIÉN en aritmética. Para cada uno, dame el
arreglo mínimo. Termina con tu estimación honesta de S a 1 000 tareas
reales — no a 10. (Misma estructura.)"

## Prompt 5 — Battery D: the Electron hardening five

"Mi app Electron lanza el supervisor como proceso hijo, tiene bloqueo
de instancia única, watchdog, y un dashboard con token-gate. NO usa
todavía contextIsolation ni safeStorage como en tu receta. Lista SOLO
los CINCO pasos de endurecimiento de mayor prioridad para un despliegue
de PYME en Québec, ordenados por reducción de riesgo por hora de
trabajo, con los ajustes o módulos exactos de Electron para cada uno.
Prohibido proponer reescribir la interfaz. (Misma estructura.)"

## Prompt 6 — Battery E: the AI-MSP stress test

"Estresa mi tesis con números: compro tokens a ~$0.0002/tarea (flash
$0.002 o Qwen local), los envuelvo en validación determinista (S medido
100% en 10 tareas reales), y vendo la tarea resuelta a $0.20-$1.00.
Calcula el CTE honesto a S = 99%, 99.5%, 99.9% con 1% de hot-swaps a
$0.05/tarea, el CAC de venderle a PYMEs de Charlevoix (venta directa,
un fundador), y el volumen MENSUAL mínimo de tareas donde el margen
bruto de 90% sobrevive a los costos de corrección. Termina con: ¿cuál
es la UNA cosa que mata esta tesis más que el precio del token?
(Misma estructura.)"

## Prompt 7 — The synthesis

"Con tus seis respuestas anteriores, dame EL roadmap único para Fanal:
los cambios en orden cronológico (semana 1, semana 2…), cada uno con su
costo en horas y su ganancia en fiabilidad o soberanía, y marca con
'DEMANDA' los que solo valen cuando un cliente los pague. Una tabla
final: cambio · horas · riesgo que elimina · cuándo hacerlo."

## What to do with each answer

Copy Gemini's full answer and paste it back into OUR session — I score
it against the house doctrine (sovereignty, HITL, zero-build-chain,
demand-first) and record the adoption decision:
ADOPTED / ADAPTED / REJECTED — with the reason, in the review ledger.
