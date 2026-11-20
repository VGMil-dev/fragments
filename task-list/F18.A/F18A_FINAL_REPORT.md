# FRAGMENTS F18.A — RESULTADO FINAL

**Estado:** PARCIAL (integrada en `main`; release F14 y verificación de producción pendientes)
**PR de integración:** https://github.com/VGMil-dev/fragments/pull/50 (fusionada el 2026-11-20)
**Release:** Ninguna para F18.A todavía; `v0.4.12` es la versión base anterior. `v0.5.0` es la versión candidata para el siguiente release si los gates F14 están habilitados.
**Commit de integración F17:** `d8f33bd980a88f21f9c3c971038b6e6cba3983d9`
**SHA de `main` tras integrar código:** `4b07d4f6b843a32d494ad75043ee1f44d6621757` (merge normal PR #50; base F17 v0.4.12 `a4aeba2474f83278c8b2076fad657f2d0842495d`)
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
- CI del HEAD de integración `d8f33bd980a88f21f9c3c971038b6e6cba3983d9` pasó en run `44679169801`; el CI del commit documental `20fffa9002f6961b07f2416831613469a1c9a766` pasó en run `44679921084`. PR #50 fue fusionada normalmente como `4b07d4f6`.

## Integración F17 ↔ F18

El navegador de prueba usó identidades sintéticas `fixture-teacher-a`, `fixture-student-a/b/c` y una base SQLite temporal local. El aula creada por el docente se persistió y apareció en F17 tras aprobar la solicitud. Una matrícula pendiente no dio acceso al aula; una activa sí. La vista de estudiante cargó el catálogo autorizado luego de habilitar «Componentes». La API y la suite automatizada también comprueban permisos y persistencia tras reiniciar la conexión a SQLite.

## Evidencia visual

Las 20 capturas están en `task-list/F18.A/evidence/screenshots/`. El ZIP adjunto contiene las veinte imágenes, este informe y `manifest.json`. Resoluciones reales codificadas en IHDR se registran en el manifiesto.

## Limitaciones conocidas

La PR #50 se fusionó normalmente como `4b07d4f6`. CI del commit documental/paquete pasó en run `44679921084` para HEAD `20fffa9002f6961b07f2416831613469a1c9a766`. El release F14 y su aprobación protegida siguen pendientes. No se creó tag, release ni se inició F14; no se solicitó ni obtuvo aprobación del entorno de producción, y no se comprobó salud/versión en el servidor. No se verificó OAuth real. El catálogo es privado por docente. Las pruebas visuales con los otros anchos y una inspección de consola/foco/reduced-motion permanecen incompletas para la integración F17.

## Resultado

La implementación está funcional localmente, pasa la suite completa y evidencia un recorrido integrado de código, solicitud, aprobación y consumo F17 con fixtures. **F18.A ya está integrada en `main` pero aún no desplegada**, por lo que el resultado es parcial y no declara Classroom Studio disponible en producción.
