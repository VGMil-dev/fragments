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
- Commits: `281f04b` implementación inicial, `3379e9b` evidencia, `68fdc4e` fix de contrato/CI, `c392e73` y `92f33ac` CI/evidencia, `9d9b7818a65fdc8fd5a513af12c0a919e1a15d34` alinea revocación, acota DTOs y añade capturas; `e535698c539839e3e3483d204b254f8af0154c31` registra QA final.

## Actualización de integración F17 y evidencia visual — 2026-11-20

- F17 desplegada en `v0.4.12` está en `origin/main` (`a4aeba2474f83278c8b2076fad657f2d0842495d`). Se integró en el worktree y PR #50 conserva esa base mediante el merge commit `b14a50777d2c346b219992a8bf4c766766bf827d`.
- La integración local F17 añade `Mis aulas`, solicitudes propias, resumen del dashboard y lectura de habilidades autorizadas. Recorrido Ego con SQLite local y fixtures sintéticos: aula creada, código emitido, estudiante A pidió ingreso, docente aprobó, estudiante activo consultó aula/habilidad; estudiante C fue asignado directamente. El estudiante B dejó una solicitud pendiente; la UI muestra estado rechazada después de la acción docente, pendiente verificación independiente de otros errores de autorización.
- Verificación fresca posterior a la integración: `pnpm exec turbo run test typecheck lint build --force` PASS, 10/10 tareas, sin caché; contracts 26/26, API 167/167, web 118/118; typecheck/lint/build PASS. Permanecen avisos de `MODULE_LEVEL_DIRECTIVE` de Lucide. `git diff --check` PASS antes del commit.
- Commit F17 de esta subfase: `d8f33bd980a88f21f9c3c971038b6e6cba3983d9` (`feat(f18a): conectar aulas con portal estudiantil`). Rama publicada: `codex/f18a-classroom-foundation`. PR #50 no-draft: https://github.com/VGMil-dev/fragments/pull/50.
- CI `Fragments CI` run `44679169801`, HEAD `d8f33bd980a88f21f9c3c971038b6e6cba3983d9`: PASS. Protección de `main` requiere `verify`; no exige revisiones aprobatorias. Aún no consta merge de F18.A, tag/release o despliegue.
- Se generaron 20 capturas reales Ego en `evidence/screenshots/` con 1440×1000 (escritorio) y 390×1000 (móvil). `Fragments_F18A_Final_Evidence.zip` incluye las 20 imágenes, informe y manifest SHA-256; los hashes del ZIP y 22 entradas pasaron verificación. No incluye bases SQLite, secretos, `.env` ni datos personales reales.
- QA móvil y visual de la integración F17 quedó limitado a 390 px; la matriz 320/768/1024, consola completa, teclado/foco y reduced-motion para todas las pantallas siguen sin cierre. Ego tuvo timeouts de captura intermitentes, pero se obtuvieron las 20 imágenes solicitadas con CDP del mismo frontend.
- Estado permanece abierto hasta completar CI del commit documental/paquete, merge normal de PR #50, tag SemVer nuevo únicamente en el SHA de `main`, proceso F14 protegido y verificación real de producción. F18.A es solo la primera fase: no declarar F18 completa.
- CI verification antes de preparar la entrega: PR #50 run `44679169801` concluyó `success` para `d8f33bd980a88f21f9c3c971038b6e6cba3983d9`. El nuevo commit de documentación y paquete tendrá un run distinto, requerido antes del merge.
- Rechazo adicional completado en UI docente: solicitud sintética de estudiante B cambió de `pending` a `rejected`; la lista mostró “Rechazada”.
- Paquete actual `Fragments_F18A_Final_Evidence.zip`: 22 entradas (20 PNG + informe + manifest). SHA-256: `9e281dff71ab2866d4ac21aacedf60bf09d49d8dc2359439179a16dfb15238c4`. Relectura ZIP verificó todas las sumas SHA-256 contra `manifest.json`.
- Notion actualizado: página principal Fragments, ficha F18, ficha F17, contrato F17–F19 y fila ER FUT-03 del Atlas; se mantiene explícito que F18.A sigue en rama/PR y no está desplegada, y que Assignment/versiones siguen siendo diseño futuro.

## Merge normal de PR #50 — 2026-11-20

- `gh pr merge 50 --merge` completó bajo protección normal después de que verify requerido estuviera PASS. PR #50: MERGED, `mergedAt=2026-11-20T05:17:29Z`, merge SHA `4b07d4f6b843a32d494ad75043ee1f44d6621757`.
- `git fetch origin main --tags` y `git rev-parse origin/main` confirmaron `4b07d4f6b843a32d494ad75043ee1f44d6621757`; `v0.4.12` es ancestro. Rama local se avanzó por fast-forward sin editar `main`; HEAD `origin/main` coincide.
- Release F14 aún no iniciada. No crearé tag hasta actualizar evidencia post-merge, confirmar nombre libre, árbol limpio, `main` exacto y atestiguar que el workflow de release corresponde al mismo SHA. El resultado de producción sigue pendiente y no se declara desplegado.
