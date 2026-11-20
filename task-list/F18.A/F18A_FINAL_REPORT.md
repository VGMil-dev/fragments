# FRAGMENTS F18.A — RESULTADO DE ENTREGA

**Estado:** PARCIAL (desplegada en producción; aceptación funcional completa pendiente).
**PR de integración:** https://github.com/VGMil-dev/fragments/pull/50 (merge `4b07d4f6b843a32d494ad75043ee1f44d6621757`). **Cierre documental:** PR #53 (merge `fc64eb1944d3e5c2846644fd1b95a4a3f2f58f04`). PR #54 registra estado del gate.
**Release:** tag anotado `v0.5.0`, objeto `79705074d95a294088bf36fba2b3694339a7e35a`, apunta al commit `fc64eb1944d3e5c2846644fd1b95a4a3f2f58f04`. Run F14 `44680764087` terminó `success`; GitHub Release: https://github.com/VGMil-dev/fragments/releases/tag/v0.5.0.
**Producción:** `https://fragments.gavanti.org` sirve build `v0.5.0`, commit `fc64eb1944d3e5c2846644fd1b95a4a3f2f58f04`. `/health` respondió HTTP 200 (`status=ok`, `database=ready`). Los recursos JS/CSS respondieron 200. Las llamadas externas sin sesión a `/api/teacher/classrooms` y `/api/me/classrooms` respondieron 401, confirmando que requieren autenticación.
**Main actual:** `e09952a74ca0149f17063a83f2b2b50759c2a120` (incluye documentación posterior al tag; el release v0.5.0 conserva el SHA exacto etiquetado).

## Implementación

F18.A añade contratos y persistencia SQLite para aulas docentes, solicitudes por código, membresías aprobadas y asignación docente directa, catálogo privado por docente y habilitación de habilidades por aula. La autorización se valida en backend y las respuestas estudiantiles limitan el acceso a las propias solicitudes, membresías activas y habilidades autorizadas. La verificación nueva de persistencia cierra y reabre una SQLite temporal.

El incremento incorpora a F17: `Mis aulas` consume los endpoints académicos existentes, permite pedir ingreso por código, muestra estados pendiente/activa/rechazada y carga habilidades solo para aulas activas. El dashboard muestra resumen de aulas y solicitudes. No se añadieron misiones, rúbricas por actividad, prácticas ni Trainer académico.

## Verificaciones

- `pnpm exec turbo run test typecheck lint build --force`: PASS, 10/10 tareas, sin caché; contracts 26/26, API 167/167, Web 118/118. Typecheck, lint y build PASS; advertencias no bloqueantes `MODULE_LEVEL_DIRECTIVE` de Lucide.
- CI PR #50 run `44679169801`, PR #53 run `44680560632` y PR #54 run `44681523200`: PASS.
- F14 run `44680764087`: validación de tag/HEAD, tests, typecheck, lint, build, imágenes ARM64, atestación y publicación aprobada PASS. La publicación completó; no se usó bypass.
- Producción comprobada en Ego Lite: versión/build y SHA coinciden con el tag; health 200 y base lista. Verificación HTTP sin sesión: API de docente y estudiante 401; JS/CSS 200.
- Ego Lite con fixtures locales sintéticas: docente creó aulas y código, estudiante A pidió ingreso, docente aprobó, estudiante activo consultó aula y habilidad autorizada; estudiante B fue rechazado; estudiante C recibió asignación directa. Catálogo privado por docente.
- No se autenticó con cuentas reales ni se usaron datos estudiantiles reales. Por tanto, estos recorridos locales no certifican el flujo OAuth ni el aislamiento entre cuentas reales en producción.
- 20 PNG capturados desde UI real con Ego/CDP: escritorio 1440×1000 CSS px y móvil 390×1000. La aceptación integrada no cubrió todos los anchos 320/768/1024, ni revisión completa de consola, teclado/foco y movimiento reducido para cada vista. Algunas capturas CDP tuvieron timeouts intermitentes.

## Evidencia visual

Las veinte capturas están en `task-list/F18.A/evidence/screenshots/`. `Fragments_F18A_Final_Evidence.zip` incluye capturas, este informe y `manifest.json` con hashes SHA-256 y dimensiones; no contiene bases SQLite, secretos, `.env` ni datos reales.

## Límites y resultado

F18.A está integrada, publicada como `v0.5.0` y su disponibilidad técnica en producción quedó verificada. La implementación cubre la fundación académica, no Classroom Studio completo: faltan aceptación con sesiones autorizadas de docente/estudiante y cierre de QA visual, consola, teclado y movimiento reducido en la matriz acordada. El catálogo es privado por docente. F18 general permanece abierta; misiones, rúbricas/versionado, Trainer y F19 siguen fuera de esta entrega.
