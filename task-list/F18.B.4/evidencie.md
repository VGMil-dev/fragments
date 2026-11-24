# Evidencia F18.B.4

Estado: IMPLEMENTADO LOCAL; CI/PR, Ego Lite y despliegue pendientes.

## Fuente de requisitos

- Notion `Fragments · Requerimientos y casos de uso — QA del recorrido académico`, consultado 2026-11-24: CU-20 y CU-23 figuran Faltante integral/ND. La misma fuente ordena avanzar según el estado real del proyecto, no duplicar proyectos y no iniciar evaluación pagada automáticamente. F18.B.3 aporta snapshots de entregas versionados.
- La matriz prohíbe elevación de roles en producción sin mecanismo legítimo; por separado, la cuenta docente solicitada para promover a admin quedó bloqueada: las rutas admin disponibles son de solo lectura y no hay ruta autorizada de mutación.

## Verificaciones

- Ciclo rojo/verde en contratos: `pnpm --filter @fragments/contracts exec vitest run src/index.test.ts` falló con los dos casos nuevos antes de implementar el esquema; tras añadir el contrato, build y suite pasaron 32/32.
- Resolver y secuencia de entrega: `pnpm --filter @fragments/api exec vitest run src/features/review/academic-link.test.ts` — 3/3 PASS; incluye entrega futura bloqueada hasta completar la actual y rechazo de reutilizar un SHA anterior en otra entrega.
- UI/API estudiante: suites focales Review + student-api + flujo Dashboard/Mis aulas — 40/40 PASS; verifica historial por propuesta, siguiente entrega manualmente y navegación a Review solo si existe una evaluación Mentor persistida.
- Integración de API: `academic-flow.integration.test.ts` contiene ahora aserciones PostgreSQL/HTTP para propiedad, versión vigente, stage gating, persistencia de SHA, idempotencia e historial sin score/hallazgos. Ejecución local: 4 casos **OMITIDOS** porque no hay `DATABASE_URL`; no se usaron credenciales de otra instancia.
- Verificación local completa `pnpm exec turbo run test typecheck lint build --force`: 11/11 tareas PASS; web 54 archivos/304 pruebas PASS; API 50 archivos/192 PASS, 19 archivos/73 omitidos que requieren PostgreSQL/configuración; contratos 32/32 PASS; typecheck, lint y builds PASS. Sigue el aviso conocido de chunk web >500 kB y directivas `use client` de Lucide.
- `git diff --check` — PASS.
- Revisión independiente estática `/root/f16_15_reflexive_review` — CLEAN: ownership/versión/matrícula, aislamiento, gate secuencial, SHA e idempotencia, Review legado y navegación; el revisor no ejecutó pruebas.
- PostgreSQL CI efímero, revisión independiente, producción y Ego Lite aún pendientes. No se llamó a proveedores de IA, no se creó tag, no se escribió en producción y no se cambió infraestructura.

## Skills

- Usada: `notion-spec-to-implementation`.
- Ciclo TDD aplicado en contratos; skills de arquitectura backend y verificación no instaladas en esta sesión y no se atribuye su uso.

## Implementación local

- `ReviewRequest` acepta `assignmentDeliverableId` solo junto con propuesta vinculada. El snapshot del job conserva la entrega exacta; las propuestas legadas siguen funcionando sin el campo.
- El resolver comprueba dueño, matrícula activa, misión publicada, versión fijada, ID de entrega, orden y no reutilización del mismo SHA entre entregas. La idempotencia del Review existente conserva el mismo intento cuando se repite la misma entrega/commit.
- Nuevo endpoint autenticado `GET /api/me/proposals/:id/deliveries` deriva historial del ledger existente, limitado a propuesta propia y aula activa; devuelve estados, SHA/fechas y configuración publicada, sin score ni hallazgos.
- Review carga historial, muestra la etapa vigente y commits previos, deja la invocación manual, permite reintentar intentos fallidos y aclara que Review no es aprobación/nota. Al continuar una propuesta con evaluación Mentor persistida desde Dashboard/Mis aulas, navega a Review; si no hay evidencia Mentor, permanece en Mentor.
- No se agregó migración ni estado duplicado. Progreso solo avanza cuando el job de esa entrega tiene resultado Review persistido; el job `done` sin resultado no se marca como completado.
