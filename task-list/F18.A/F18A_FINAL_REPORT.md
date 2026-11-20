# FRAGMENTS F18.A — RESULTADO FINAL

**Estado:** PARCIAL (implementación y QA local completos; integración, release y despliegue siguen pendientes)  
**PR:** https://github.com/VGMil-dev/fragments/pull/50  
**Release:** Ninguna para F18.A. `v0.4.12` es la versión F17 base y no contiene estos cambios.  
**Commit de integración F17:** `d8f33bd980a88f21f9c3c971038b6e6cba3983d9`  
**Base vigente:** `origin/main` `a4aeba2474f83278c8b2076fad657f2d0842495d` (F17 v0.4.12)  
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
- CI de PR #50 para el HEAD de integración `d8f33bd980a88f21f9c3c971038b6e6cba3983d9` terminó PASS en run `44679169801`. Los cambios documentales y el paquete se publicarán en un commit separado y requieren su propio CI antes del merge.

## Integración F17 ↔ F18

El navegador de prueba usó identidades sintéticas `fixture-teacher-a`, `fixture-student-a/b/c` y una base SQLite temporal local. El aula creada por el docente se persistió y apareció en F17 tras aprobar la solicitud. Una matrícula pendiente no dio acceso al aula; una activa sí. La vista de estudiante cargó el catálogo autorizado luego de habilitar «Componentes». La API y la suite automatizada también comprueban permisos y persistencia tras reiniciar la conexión a SQLite.

## Evidencia visual

Las 20 capturas están en `task-list/F18.A/evidence/screenshots/`. El ZIP adjunto contiene las veinte imágenes, este informe y `MANIFEST.sha256`. Resoluciones reales codificadas en IHDR se registran en el manifiesto.

## Limitaciones conocidas

La PR #50 permanece sin merge. CI del commit documental/paquete y el merge normal son gates pendientes. No se creó tag, release ni se inició F14; no se solicitó ni obtuvo aprobación del entorno de producción, y no se comprobó salud/versión en el servidor. No se verificó OAuth real. El catálogo es privado por docente. Las pruebas visuales con los otros anchos y una inspección de consola/foco/reduced-motion permanecen incompletas para la integración F17.

## Resultado

La implementación está funcional localmente, pasa la suite completa y evidencia un recorrido integrado de código, solicitud, aprobación y consumo F17 con fixtures. **F18.A aún no está integrada en `main` ni desplegada**, por lo que el resultado es parcial y no declara Classroom Studio disponible en producción.
