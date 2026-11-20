# FRAGMENTS F18.A — RESULTADO DE ENTREGA

**Estado:** PARCIAL (v0.5.1 desplegada en producción; aceptación funcional integrada completa pendiente).
**PR de integración:** https://github.com/VGMil-dev/fragments/pull/50 (merge `4b07d4f6b843a32d494ad75043ee1f44d6621757`). **Fix de confirmaciones:** PR #56 (merge `5b81542df0b4f725027a44a7bc294199f3289faa`). Cierre documental: PR #53; PR #54 registró el gate inicial.
**Release:** tag anotado `v0.5.1`, sobre `5b81542df0b4f725027a44a7bc294199f3289faa`. Run F14 `44762449183` terminó `success` tras aprobación normal del entorno; GitHub Release: https://github.com/VGMil-dev/fragments/releases/tag/v0.5.1. El release previo v0.5.0 se conserva.
**Producción:** `https://fragments.gavanti.org` sirve build `v0.5.1`, SHA completo `5b81542df0b4f725027a44a7bc294199f3289faa`, observado en Ego en la landing/login pública. `/health` devolvió HTTP 200 (`status=ok`, `database=ready`). UI/recursos de la aplicación cargaron correctamente. Solicitudes directas sin cookies a `/api/teacher/classrooms` y `/api/me/classrooms` devolvieron HTTP 401.
**Main y release:** `main`, tag v0.5.1 y versión servida coinciden en `5b81542df0b4f725027a44a7bc294199f3289faa`.

## Implementación

F18.A añade contratos y persistencia SQLite para aulas docentes, solicitudes por código, membresías aprobadas y asignación docente directa, catálogo privado por docente y habilitación de habilidades por aula. La autorización se valida en backend y las respuestas estudiantiles limitan el acceso a las propias solicitudes, membresías activas y habilidades autorizadas. La verificación nueva de persistencia cierra y reabre una SQLite temporal.

El incremento incorpora a F17: `Mis aulas` consume los endpoints académicos existentes, permite pedir ingreso por código, muestra estados pendiente/activa/rechazada y carga habilidades solo para aulas activas. El dashboard muestra resumen de aulas y solicitudes. No se añadieron misiones, rúbricas por actividad, prácticas ni Trainer académico.

## Verificaciones

- `pnpm exec turbo run test typecheck lint build --force`: PASS, 10/10 tareas, sin caché; contracts 26/26, API 167/167, Web 118/118. Typecheck, lint y build PASS; advertencias no bloqueantes `MODULE_LEVEL_DIRECTIVE` de Lucide.
- CI PR #50 run `44679169801`, PR #53 run `44680560632` y PR #54 run `44681523200`: PASS.
- F14 run `44680764087`: validación de tag/HEAD, tests, typecheck, lint, build, imágenes ARM64, atestación y publicación aprobada PASS. La publicación completó; no se usó bypass.
- Producción comprobada en Ego Lite: versión/build y SHA coinciden con el tag; health 200 y base lista. Verificación HTTP sin sesión: API de docente y estudiante 401; JS/CSS 200.
- Ego Lite con fixtures locales sintéticas: docente creó aulas y código, estudiante A pidió ingreso, docente aprobó, estudiante activo consultó aula y habilidad autorizada; estudiante B fue rechazado; estudiante C recibió asignación directa. Catálogo privado por docente.
- No inicié sesión manualmente con cuentas reales ni usé datos estudiantiles reales. Una llamada GET docente desde el contexto Ego respondió 200 con una lista vacía; como el perfil podría tener cookies persistentes, no la cuento como anónima ni como prueba de flujo real, y no inspeccioné la identidad asociada. Requests HTTP directos sin cookies devolvieron 401 para docente y estudiante. Los recorridos locales con fixtures no certifican OAuth ni el aislamiento entre cuentas reales en producción.
- PR #56 corrigió notificaciones de éxito que se borraban al recargar datos después de una acción; la prueba de regresión y el recorrido Ego local pasaron. El arreglo quedó incluido en v0.5.1.
- 20 PNG capturados desde UI real con Ego/CDP: escritorio 1440×1000 CSS px y móvil 390×1000. La aceptación integrada no cubrió todos los anchos 320/768/1024, ni revisión completa de consola, teclado/foco y movimiento reducido para cada vista. Algunas capturas CDP tuvieron timeouts intermitentes.

## Evidencia visual

Las veinte capturas están en `task-list/F18.A/evidence/screenshots/`. `Fragments_F18A_Final_Evidence.zip` incluye capturas, este informe y `manifest.json` con hashes SHA-256 y dimensiones; no contiene bases SQLite, secretos, `.env` ni datos reales.

## Límites y resultado

F18.A está integrada, publicada como `v0.5.0` y su disponibilidad técnica en producción quedó verificada. La implementación cubre la fundación académica, no Classroom Studio completo: faltan aceptación con sesiones autorizadas de docente/estudiante y cierre de QA visual, consola, teclado y movimiento reducido en la matriz acordada. El catálogo es privado por docente. F18 general permanece abierta; misiones, rúbricas/versionado, Trainer y F19 siguen fuera de esta entrega.
