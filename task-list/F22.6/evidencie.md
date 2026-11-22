# Evidencia F22.6 — Filtro local del feed admin

## Implementación

- Rama: `codex/f22-activity-event-filter`, creada desde `origin/main` en el worktree F22 limpio. La rama anterior `codex/f22-audit-log-feed` se dejó intacta.
- La UI del feed incluye un selector accesible por tipo; aplica filtro local sobre los eventos ya cargados, muestra un vacío específico y conserva filtro al actualizar.
- No se modificaron API, contratos, rutas compartidas, esquema, migraciones ni límite del feed. Sin persistencia nueva ni afirmación de durabilidad.
- No hubo acceso a producción, secretos, servicios externos ni navegador, conforme al alcance asignado.
- Skill: `vercel-react-best-practices` leída; aplicada de forma acotada al derivar el subconjunto durante render sin llamadas adicionales ni estado duplicado de resultados.

## Verificación local

- TDD rojo: prueba focal antes de implementación — 2 pruebas nuevas fallaron por ausencia del control de filtro (2 existentes pasaron).
- TDD verde, repetido después del commit de implementación: `pnpm --filter @fragments/web exec vitest run src/features/admin-audit-log/AdminAuditLogScreen.test.tsx --maxWorkers=1` — PASS, 4/4 (22 nov 2026, 14:15:40 local).
- `pnpm --filter @fragments/web typecheck`, repetido después del commit de implementación — PASS (22 nov 2026, 14:15:40 local).
- `git diff --check` — PASS antes y después del commit de implementación; final sobre evidencia y árbol se repite antes del commit documental.

## Commit

- Commit de implementación: `ebf0c113e4358bc55ee80bd14678bb700e30d9c8` (`feat(admin-audit-log): filtra eventos del feed`).
- Esta evidencia se incluye en un commit documental posterior al commit de implementación; historia sin reescrituras.

## Limitaciones

- El filtro solo permite explorar los eventos devueltos por la consulta existente (máximo actual 50); no amplía la muestra ni altera su retención efímera.
- No se ejecutó suite completa ni revisión visual de navegador; el alcance pidió pruebas UI focales, typecheck y diff check, y excluyó navegador.
