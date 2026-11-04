# @javierfrancoleal/plugin-authoring

Skill de **autoría de plugins** para DeepSeek Harness. Registra la skill
`plugin-authoring`, cuyo cuerpo (`assets/plugin-authoring.md`) contiene la guía
destilada para crear y publicar plugins sin redescubrir la arquitectura.

La skill cubre: los tres tipos de plugin (host / cliente / doble cara), la anatomía
de `package.json` + `cordis.patch.yml`, el half host (skills/comandos/efectos), el
half browser (`dsh.client` + `window.__ModuleLoader__` + slots), locale, tokens de
tema, instalación, gotchas y checklist de validación.

## Uso

- **Agentes**: cargar la skill `plugin-authoring` antes de crear o extender un plugin.
- **Humanos**: leer `docs/PLUGIN-AUTHORING.md` (fuente canónica), copiar la plantilla
  `templates/dsh-plugin/`, y usar `tools/new-plugin.sh` + `tools/check-plugin.sh`.

## Instalación

Como cualquier bundle: añadir `@javierfrancoleal/plugin-authoring` a
`dsh.profile.bundles` (y su dependencia `link:`), `pnpm install`, y reiniciar la app.

Creado por **J.Franco**.
