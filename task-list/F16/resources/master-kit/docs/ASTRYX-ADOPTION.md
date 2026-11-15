# Astryx + React 19 — Guía para Codex

Verificado en `apps/web/package.json`: React 19.3.1 y react-dom 19.3.1. Astryx (Meta) requiere React >=19 y está en beta.

Fuentes oficiales:
- https://github.com/meta/astryx
- https://github.com/meta/astryx/blob/main/packages/core/README.md
- https://astryx.atmeta.com/

## Política de incorporación
- Leer `AGENTS.md`, package manager, Vite y estilos actuales ANTES de instalar.
- No actualizar React sin necesidad; versión actual cumple peer dependency.
- Instalar `@astryxdesign/core`, `@astryxdesign/theme-neutral`, `@stylexjs/stylex` y `@astryxdesign/cli` **solo en rama F16** tras comprobar versión y lockfile; comandos oficiales del repo.
- Correr `npx @astryxdesign/cli init` en una copia o rama aislada tras revisar qué añade a AGENTS.md; no sobrescribir instrucciones existentes.
- CLI documentado: `npx @astryxdesign/cli component --list`, `... component Button`, `... docs theme`, `... docs tokens` (si la forma exacta ha cambiado, consultar `--help`).
- CSS recomendado por README oficial, en este orden: `@astryxdesign/core/reset.css`, `@astryxdesign/core/astryx.css`, `@astryxdesign/theme-neutral/theme.css`. Evaluar compatibilidad con reset existente, no introducir doble reset.
- Preferir temas/tokens → className/CSS → swizzle solamente como última alternativa; no fork de entrada.

## Componentes
`Button`, `Card`, `Stack` aparecen explícitamente en documentación oficial. Otros (form, table, tabs, menu, alert, dialog, toast, badges, skeleton, etc.) son **necesidades propuestas**, no exportaciones confirmadas: ver `design/components.json` y resolver su nombre/props con CLI real.

## Arquitectura
`F16ThemeProvider` con tokens semánticos; `AppShell` y `TeacherShell` compuestos; `FeatureCard` y `PixelArtFrame` propios; adaptar componentes existentes sin perder tests ni contratos.
Mantener CSS de negocio útil y migrar gradualmente. Introducir theme flag o punto de montaje F16 para poder revertir visualmente.
