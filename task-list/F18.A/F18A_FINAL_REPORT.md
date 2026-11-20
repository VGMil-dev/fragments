# FRAGMENTS F18.A — RESULTADO FINAL

**Estado:** PARCIAL (integrada y etiquetada; aprobación F14 y despliegue pendientes)
**PR de integración:** https://github.com/VGMil-dev/fragments/pull/50 (fusionada el 2026-11-20)
**Release:** Tag anotado `v0.5.0`, objeto `79705074d95a294088bf36fba2b3694339a7e35a`, apunta al `main` SHA `fc64eb1944d3e5c2846644fd1b95a4a3f2f58f04`. Run F14 `44680764087` construyó imágenes ARM64 y atestó el paquete; el job de publicación espera aprobación protegida. No existe despliegue verificado todavía.
**Commit de integración F17:** `d8f33bd980a88f21f9c3c971038b6e6cba3983d9`
**SHA del merge de código PR #50:** `4b07d4f6b843a32d494ad75043ee1f44d6621757`
**SHA etiquetado de `main`:** `fc64eb1944d3e5c2846644fd1b95a4a3f2f58f04` (cierre documental PR #53; el tag apunta a este SHA exacto)
**Servidor:** No se verificó una nueva versión en producción; no se afirma disponibilidad desplegada.

## Implementación

F18.A añade contratos y persistencia SQLite para aulas docentes, solicitudes por código, membresías aprobadas y asignación docente directa, catálogo privado por docente y habilitación de habilidades por aula. La autorización se valida en backend y las respuestas estudiantiles limitan el acceso a las propias solicitudes, membresías activas y habilidades autorizadas. La verificación nueva de persistencia cierra y reabre una SQLite temporal.

El incremento incorpora a F17: `Mis aulas` consume los endpoints académicos existentes, permite pedir ingreso por código, muestra estados pendiente/activa/rechazada y carga habilidades solo para aulas activas. El dashboard muestra resumen de aulas y solicitudes. No se añadió otra shell estudiantil ni se implementaron misiones, rúbricas por actividad, prácticas ni Trainer académico.

## Verificaciones

- `pnpm exec turbo run test typecheck lint build --force`: PASS, 10/10 tareas, sin caché.
- Contracts: 26/26 pruebas; API: 167/167; Web: 118/118.
- Typecheck, lint y build: PASS. Build conserva advertencias `MODULE_LEVEL_DIRECTIVE` de Lucide.
- `git diff --check`: PASS antes del commit de código.
- Ego Lite con fixtures locales sintéticas: creación de segunda aula del mismo curso, generación de código, solicitud de estudiante A, aprobación docente, lectura como estudiante activo, creación de habilidad, habilitación por aula y asignación directa de estudiante C. El docente vio la solicitud y la transición `pending → active`; el estudiante recibió el aula activa y la habilidad permitida.
- Una segunda solicitud de estudiante B quedó `pending` y luego el docente la rechazó; la UI mostró `Rechazada`. El aislamiento observado es de fixtures locales, no de cuentas reales ni producción.
- Se capturaron 20 PNG desde la UI real por Ego/CDP. Vistas de escritorio usan 1440×1000 CSS px; vistas móviles usan 390×1000 CSS px. No se completaron en esta integración todos los anchos solicitados (320, 768, 1024), ni una revisión completa de consola, foco de teclado o movimiento reducido en cada nueva vista. Algunas capturas CDP tuvieron timeouts intermitentes; no se usaron capturas sintéticas.
- CI del HEAD de integración `d8f33bd980a88f21f9c3c971038b6e6cba3983d9` pasó en run `44679169801`; el CI documental pasó en run `44679921084`. PR #50 se fusionó como `4b07d4f6`; PR #53 se fusionó como `fc64eb19` tras CI `44680560632` PASS.
- Release F14 `v0.5.0`: validación de tag/HEAD, tests, typecheck, lint, build, imagen ARM64 y atestación PASS en run `44680764087`. Estado del job protegido `publish-approved-release`: `waiting` para aprobación de `fragments-production`.

## Integración F17 ↔ F18

El navegador de prueba usó identidades sintéticas `fixture-teacher-a`, `fixture-student-a/b/c` y una base SQLite temporal local. El aula creada por el docente se persistió y apareció en F17 tras aprobar la solicitud. Una matrícula pendiente no dio acceso al aula; una activa sí. La vista de estudiante cargó el catálogo autorizado luego de habilitar «Componentes». La API y la suite automatizada también comprueban permisos y persistencia tras reiniciar la conexión a SQLite.

## Evidencia visual

Las 20 capturas están en `task-list/F18.A/evidence/screenshots/`. El ZIP adjunto contiene las veinte imágenes, este informe y `manifest.json`. Resoluciones reales codificadas en IHDR se registran en el manifiesto.

## Limitaciones conocidas

PR #50 se fusionó como `4b07d4f6` y PR #53 como `fc64eb19`. El tag anotado `v0.5.0` está en `main` y el build/attestation F14 pasó; el job publish espera aprobación del entorno `fragments-production`. No hay GitHub Release publicado ni se comprobó salud/versión de producción. No se verificó OAuth real. El catálogo es privado por docente. Las pruebas visuales con los otros anchos y una inspección de consola/foco/reduced-motion permanecen incompletas para la integración F17.

## Resultado

La implementación está funcional localmente, pasa la suite completa y evidencia un recorrido integrado de código, solicitud, aprobación y consumo F17 con fixtures. **F18.A está integrada y etiquetada en `main`; publicación F14 espera aprobación manual protegida. El despliegue y su comprobación aún no ocurrieron**, por lo que el resultado es parcial y no declara Classroom Studio disponible en producción.
