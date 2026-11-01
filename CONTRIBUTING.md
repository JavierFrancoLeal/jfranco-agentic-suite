# Contributing

¡Gracias por contribuir a la suite J.Franco! Todo aporte es bienvenido:
errores, ideas, traducciones, nuevas plantillas de decisiones y nuevos
plugins.

## Cómo contribuir

1. **Issue:** describe el problema o la idea (idioma libre).
2. **Pull request:** haz un fork, crea una rama y envía el cambio. Explica
   qué resuelve y cómo probarlo.
3. **Sin código:** traduce los textos de `ui/panel.html` o de los
   `locale/*.json`, corrige documentación, o añade una plantilla de
   decisiones para un sector nuevo en `docs/`.

## Estructura de un plugin

Cada plugin es un paquete con:

- `package.json` — con `dsh.bundle.patch` y el campo `author`.
- `cordis.patch.yml` — inserta el provider en el árbol Cordis.
- `lib/index.js` — registra el skill en `ctx.skills` (patrón de
  `@deepseek-ai/dsh-skill-badge`).
- `assets/<skill>.md` — el cuerpo del skill.
- `locale/*.json` — títulos y descripciones por idioma.
- `README.md`, `icon.svg`, `LICENSE`.

## Reglas de calidad

- El semáforo nunca se salta: 🟢 ejecuta, 🟡 propone y espera, 🔴 pregunta.
- El humano decide siempre; la IA no es responsable legal ni comercial.
- Todo cambio se verifica: sintaxis, JSON válido, y prueba en una sesión.
- La autoría y la licencia (MIT) se respetan en todo archivo.

## Contacto

Autor: J.Franco. Proyecto open source bajo licencia MIT.
