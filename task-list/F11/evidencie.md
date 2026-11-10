# F11 — Evidencia

Estado: COMPLETADA. Rama `codex/mentor-control`, worktree aislado desde `8ae8b5537c1f136d422ba122566d668c741687e5`. F10 permanece en el checkout separado.

## Resultado verificable

- Un borrador global configurable con materia, temática, consigna, requisitos, nivel, criterios y pesos; publicar crea una versión inmutable.
- Migración SQLite v7 siembra v1, retiene evaluaciones antiguas y añade digest/versión para deduplicación.
- Better Auth limita administración a cuentas docentes/admin. La vista histórica lee el snapshot y nota guardados, no los recalcula.
- El evaluador Gateway entrega hallazgos por criterio sin puntaje. Mentor valida que coincida con la rúbrica y el servidor calcula `verified = peso`, `not_verified = techo(peso / 2)`, `failed = 0`.
- La llave de reutilización es revisión de propuesta + digest de contenido + versión publicada. Una restricción única SQLite protege también entre procesos; solicitudes simultáneas se agrupan dentro del proceso.
- Mentor muestra la consigna activa y su evaluación muestra versión y puntaje por criterio.
- Dependencias: no se añadieron. Se mantuvo `pnpm-lock.yaml` intacto.

## Verificaciones frescas

- `$env:CI='true'; pnpm exec turbo run test --force` — exit 0; contracts 19/19, API 86/86, web 52/52 (sin caché).
- `$env:CI='true'; pnpm exec turbo run typecheck --force` — exit 0, cuatro tareas.
- `$env:CI='true'; pnpm exec turbo run build --force` — exit 0, tres paquetes; Vite compiló la web.
- `$env:CI='true'; pnpm exec turbo run lint --force` — exit 0. La configuración del repo declara lint únicamente en contracts.
- `git diff --check` — exit 0.
- `apps/api/src/db/migrate.test.ts` verifica que v7 conserva ID, JSON, fecha y nota de un resultado legacy y no inventa versión de rúbrica.
- `apps/api/src/features/mentor/control-http.test.ts` cubre autenticación, publicación inmutable, puntaje server-side (50/100), deduplicación sin segunda llamada, nueva versión y nota histórica (100/100).
- Ego Lite v2.2.0: fixture sintético, Vite local, fake provider; inició sesión docente, publicó v2, evaluó una propuesta y consultó historial con el mismo `90/100` y desglose `30/30, 20/20, 10/20, 15/15, 15/15`. En viewport 390×844 `innerWidth=390`, `scrollWidth=390`.

## Evidencia privada

`task-list/F11/evidence/` contiene seis archivos: cinco capturas Ego Lite y `manifiesto.md`. `git check-ignore -v` confirmó la regla de `.gitignore`; `git ls-files task-list/F11/evidence` no devolvió rutas. La carpeta no excede el límite de 20 archivos ni contiene datos reales o secretos.

## Límites del QA

- Todas las evaluaciones de QA usan `fake-provider:mentor-control-ego-fixture`; llamadas a Gateway/JEV/GitHub/Moodle: cero.
- Ego Lite usó una autenticación docente sintética del fixture; Better Auth se valida con pruebas existentes de autorización y rutas.
- No se desplegó ni publicó.

## Git

- Commit de implementación: `15491a9`.
- No hubo push ni despliegue.
