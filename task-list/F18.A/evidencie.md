# F18.A — Evidencia

## Base y preflight

- Rama: `codex/f18a-classroom-foundation`.
- Worktree actual: `C:\Users\vgmil\.codex\worktrees\f18a-classroom\fragments`; se movió desde D: (exFAT no permite los symlinks de pnpm). No se modificó el worktree F17 ni `task-list/F18`.
- Base `origin/main`: `70bb2f30935eb0d9174ed69ebbfa107dd379d19e`; `v0.4.11`: `09f9670e60981bd4e594a37cce5502486bddfc9d`, ancestro confirmado con `git merge-base --is-ancestor` (código 0).
- ZIP validado sin extracción: 23 archivos, 0 faltantes y 0 hashes discordantes; el README lo describe como preview conceptual.
- `pnpm install --frozen-lockfile`: falló en D: exFAT por `EISDIR`; instalación repetida en NTFS terminó correctamente (18.2 s; 310 reutilizados, 0 descargados). No se cambiaron manifests ni lockfile.
- `.env` no se leyó ni se incorporó a evidencia. El QA web usó Better Auth local con identidad de prueba y SQLite temporal, exclusivamente valores sintéticos. No hubo llamadas a AI Gateway, GitHub OAuth, Moodle ni servicios de producción.
- Se preserva `task-list/F18`, que corresponde al hotfix Review histórico.

## Implementación

- Contratos Zod tipados para aulas, matrícula, códigos de ingreso, catálogo privado del docente, disponibilidad por aula y lecturas propias del estudiante; entradas no pueden asignar propietario y respuestas no exponen hashes.
- Migración SQLite 14 repetible con aulas, hashes/revocación de códigos, solicitudes y matrículas, auditoría de transiciones, control de intentos y catálogo/relaciones de habilidades. Restricciones compuestas impiden habilitar en un aula una habilidad ajena al docente propietario.
- API con propietario derivado de Better Auth, privacidad por docente/estudiante, aprobación explícita de solicitudes, asignación directa diferenciada, reglas de archivo y limitación de intentos.
- UI docente conectada en `/teacher/classrooms*` y `/teacher/skills`, adaptada a rutas protegidas, estados vacíos/carga/error y tokens F16.
- Revisión visual detectó que `/teacher/classrooms/new` se consultaba como si `new` fuera un ID. Se agregó una prueba de regresión: falla antes del arreglo y pasa después.

## Verificación local

- `pnpm --filter @fragments/api test`: 32 archivos / 157 pruebas aprobadas.
- `pnpm --filter @fragments/web exec vitest run src/features/classroom/ClassroomStudio.test.tsx`: 1 prueba aprobada; el mismo comando produjo fallo intencional antes del arreglo (consultaba el ID `new`).
- `pnpm exec turbo run test typecheck lint build --force`: 10 tareas exitosas. Suite final: contracts 25, API 157, web 96.
- Typecheck de API/web/contratos, lint TypeScript y build completaron sin error. Build reporta chunk web de 523.60 kB (límite informativo 500 kB) y notas `use client` originadas en `lucide-react`.
- `git diff --check`: sin errores de whitespace.
- Ego Lite local con docente sintético: ingreso docente, vista vacía, alta de aula, detalle, generación de código y alta de habilidad. Foco por teclado visible (borde 3 px en “Saltar al contenido”) y media query `prefers-reduced-motion: reduce` confirmada.
- Captura de escritorio inspeccionada visualmente: `task-list/F18.A/evidence/classroom-desktop.png`. Capturas 320/390/768 px no quedaron disponibles: Ego agotó el timeout de captura tras `Emulation.setDeviceMetricsOverride`; QA responsive a esos anchos queda `NOT_VERIFIED`.
- Catálogo privado probado entre docentes A/B y lecturas/matrículas entre estudiantes A/B en fixtures explícitas `fixture-*`. No certifica aislamiento de cuentas reales en producción.
- Revisión Goldfish/peer independiente: `NOT_VERIFIED` (sin agente independiente solicitado/disponible). Se hizo revisión manual local de cambios.

## Límites y cierre

- Notion no se modificó; ver recomendaciones de actualización en el resumen de entrega.
- Sin merge, tag o despliegue. Commit y PR pendientes.
- Commit de implementación: `281f04b` (`feat(classroom): implementa base de Classroom Studio`).
