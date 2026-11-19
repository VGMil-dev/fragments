# F18.A — Evidencia

## Base y preflight

- Rama: `codex/f18a-classroom-foundation`; worktree: `C:\Users\vgmil\.codex\worktrees\f18a-classroom\fragments`.
- Base `origin/main`: `70bb2f30935eb0d9174ed69ebbfa107dd379d19e`. El tag `v0.4.11` apunta a `ca55c37e1b5273391f29838137ef8d3ea8e2c305`; `git merge-base --is-ancestor` confirmó que es ancestro.
- ZIP inspeccionado sin extraer: 24 entradas contando `manifest.json`; 23 recursos declarados, 0 faltantes y 0 discrepancias de tamaño/SHA-256. El README y manifiesto lo describen como preview conceptual. No se requería importar recursos a la UI existente.
- No se modificaron manifests ni lockfile por la instalación. `.env` no se leyó ni incluyó. QA utilizó Better Auth local con identidad sintética y SQLite temporal ya eliminado. Sin llamadas a AI Gateway, OAuth real, Moodle ni producción.
- Se preservó el worktree F17 y el directorio histórico `task-list/F18`.

## Implementación

- Contratos Zod y persistencia para aulas, matrículas, códigos de ingreso, catálogo privado docente, habilidades habilitadas por aula y consultas propias del estudiante. Propiedad docente derivada de Better Auth; hashes no salen en respuestas.
- Migración SQLite 14 repetible con reglas de unicidad, auditoría de transiciones, revocación y límites de intentos. ACL mantiene separados los datos de docentes y estudiantes.
- API distingue solicitudes pendientes por código de asignaciones docentes directas activas. Corregida la forma compartida de revocación `{revoked:true}` entre servidor y cliente.
- Se retiraron DTOs de Assignment/misiones fuera de F18.A; `intent.md` excluye misiones, versiones/rúbricas, Trainer y F19.
- UI persistida para aulas y catálogo docente bajo rutas `/teacher/classrooms*` y `/teacher/skills`, con estados de carga/vacío/error, tokens F16 y navegación accesible.
- QA detectó y corrigió `/teacher/classrooms/new` interpretado como ID. A 768 px se amplió el breakpoint a 820 px para mostrar paneles en una columna.

## Verificación local

- `pnpm exec turbo run test typecheck lint build --force`: PASS, 10/10 tareas, sin caché.
- Suite: contracts 25, API 157, web 96 pruebas aprobadas; typecheck, lint y builds completados.
- Bundle principal web: 459.24 kB; `mammoth` separado (491.75 kB). Permanecen avisos de `use client` de módulos Lucide.
- `node --test deploy/production/release-agent/test-turbo-release-metadata.mjs`: PASS, 1/1 en clon limpio con HEAD `9d9b7818a65fdc8fd5a513af12c0a919e1a15d34`.
- `git diff --check`: PASS para el commit `9d9b781` y para los cambios de documentación.
- Ego Lite, datos sintéticos: 320, 390, 768 y 1440 px, sin overflow horizontal; detalle apilado en móvil y 768 px, paneles en escritorio. Foco visible de 3 px en “Saltar al contenido”; `prefers-reduced-motion: reduce` confirmado.
- Capturas: `classroom-320.png`, `classroom-390.png`, `classroom-768.png`, `classroom-1440.png`, `classrooms-list-1440.png`, `skills-catalog-1440.png` en `task-list/F18.A/evidence/`.
- Aislamiento probado con fixtures sintéticas `fixture-*`; no certifica aislamiento de cuentas reales en producción. Revisión externa independiente: `NOT_VERIFIED`; revisión manual local realizada.

## Estado de revisión y límites

- PR draft #50: https://github.com/VGMil-dev/fragments/pull/50. CI remoto `verify` PASS en head `92f33ac` (run `44571693543`); cambios actuales esperan CI del nuevo head.
- Sin merge, tag ni despliegue. Notion no se modificó.
- Recomendaciones Notion: distinguir F18.A de la incidencia/hotfix Review histórico; documentar que F17 consume aulas, solicitudes, matrículas y habilidades autorizadas; acotar contrato F17–F19 a DTOs actuales y excluir misiones/versionado; registrar decisiones de privacidad, aprobación explícita y procedencia de asignación directa.
- Commits: `281f04b` implementación inicial, `3379e9b` evidencia, `68fdc4e` fix de contrato/CI, `c392e73` y `92f33ac` CI/evidencia, `9d9b7818a65fdc8fd5a513af12c0a919e1a15d34` alinea revocación, acota DTOs y añade capturas.
