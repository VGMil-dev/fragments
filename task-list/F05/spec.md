# F05 — Specification

**Objetivo:** Review IA segura por commit exacto.

## Entradas

`projectId`, `owner`, `repo`, SHA completo, `rubricVersion` y `evaluatorVersion`. El lector de repositorios acepta solo owner/repo/SHA, nunca una URL arbitraria ni una rama.

## Flujo y salidas

1. Validar el snapshot conforme a `RepositorySnapshotSchema`, comparar repositorio y SHA solicitados, revisar digest, tamaño y rutas duplicadas.
2. Empaquetar contenido textual de forma determinista en memoria con límites de bytes y tokens; omitir secretos, archivos binarios, dependencias, lockfiles y entradas sobre el presupuesto. Informar rutas omitidas.
3. Solicitar análisis al puerto `AiProvider`; validar `AiAnalysisSchema`, huella de entrada y evidencia existente en el snapshot. No guardar el snapshot completo.
4. Guardar el resultado por la clave idempotente `(projectId, commitSha, rubricVersion, evaluatorVersion)` mediante el puerto `EvaluationRepository`.
5. Servir hallazgos por niveles 1–4; crear PDF y token de verificación solo al solicitarlo, con snapshot de entrega sin bytes PDF persistidos.

## Criterios verificables

- [x] Un flujo de inicio a fin pasa con drivers falsos declarados y adaptadores locales sin credenciales.
- [x] Entrada inválida devuelve instrucciones de corrección sin incluir contenido o datos sensibles.
- [x] Un SHA, repositorio o evidencia diferente/inexistente se rechaza antes de aceptar el análisis.
- [x] El cache evita repetir IA para la misma clave.
- [x] Feedback progresivo, descarga PDF a demanda y consulta de verificación se cubren por pruebas.
- [x] Promptfoo ejecuta fixtures estructurales deterministas sin Gateway ni evaluador de pago.

## Límites de integración

El worktree parte del scaffold F00 y no contiene `apps/api`, sus dependencias, router ni persistencia SQLite. Por ello este slice permanece como módulos TS aislados bajo `apps/api/src`, con pruebas directas; no se crea otro `package.json` ni se cambia el contrato compartido. W3/planner integra la composición HTTP y persistencia cuando exista el paquete común.
