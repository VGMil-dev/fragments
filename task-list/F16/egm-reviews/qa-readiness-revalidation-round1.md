# EGM — revalidación QA/readiness de F16, ronda 1

**Hito:** cierre QA del rediseño existente. **Estado:** no aprobada; hallazgos que requieren corregir especificación/evidencia. Esta es R1 de la revalidación de cierre, independiente de las rondas históricas de diseño y drift. Sin declaración de convergencia.

## Protocolo y alcance

- Protocolo oficial EGM: guías `egm-review`, `egm-review-loop`, `egm-drift-report`; estándares `implementation-readiness-standard.md` y `feature-spec-standard.md`; personas `implementation_readiness`, `codebase_details`, `structural` del plugin local EGM 0.1.1.
- Tres revisores en contextos nuevos (`fork_turns: "none"`), configurados explícitamente con GPT-6 Luna Medio y esfuerzo medio. El modelo del Elephant no se declara verificado: `MODEL_SELECTION_USER_CONFIGURED_UNVERIFIABLE`.
- Alcance limitado a readiness, fixture reproducible, rutas/gates, modelo de QA/evidencia, marcador y secciones tocadas en `GOAL.md`, `spec.md`, `decisions.md`, `QA-INTERACTION-MATRIX.md` y documentación F16 vinculada. Revisión de solo lectura.

## Resultados independientes

### Implementation Readiness — completada

1. **Major:** `spec.md` pide un checkpoint de commit por fase, pero el historial contiene un commit agregado de implementación y otro documental. La especificación debe registrar la desviación observada y no sugerir retrospectivamente checkpoints por fase.
2. **Major:** el gate “todo debe pasar” no define cierre parcial ante OAuth/servicios externos no disponibles; contradecía el objetivo de QA local y los estados `BLOCKED` de la matriz.
3. **Major:** el allowlist de producto era preciso, pero no enumeraba entregables `task-list/F16/*` ni `task-list/TASKS.md`; la especificación debe permitir solo las salidas F16 y fixture realmente necesarias.
4. **Major/Nit:** la fase 3 docente no tenía rango de IDs QA.

### Codebase Details — completada

1. **Major:** la matriz solicita E2E fake, pero los fakes existentes viven en pruebas privadas y el allowlist excluye `apps/api/**`; faltaba un mecanismo ejecutable de fixture local o debía retirarse la exigencia de integración UI.
2. Sin discrepancia adicional de ruta o gate entre la matriz y `App.tsx` inspeccionado.

### Structural — primera tentativa fallida; retry completado

- Primera tentativa: no localizó los estándares del plugin; **no cuenta como revisión válida**.
- Retry fresco: completó tras recibir las rutas absolutas del plugin. Hallazgos:
  1. **Major:** falta el marcador `MODEL_SELECTION_USER_CONFIGURED_UNVERIFIABLE` en GOAL y D10; el modelo principal no es verificable por API.
  2. **Major:** QA-17 mezclaba muestra de foco PASS con cobertura completa BLOCKED; separar alcance y estados.
  3. **Nit:** fase 3 carece de rango QA.

## Cambios requeridos para R2

Añadir fixture local de API fuera de `apps/api/**`, aislado en memoria y sin `.env`/red; anotar desviación de checkpoints y regla de cierre parcial; enumerar fixture y artefactos F16 permitidos; asignar QA docente; incluir el marcador exacto y separar pases parciales de zoom real, cobertura exhaustiva y OAuth externo. La R2 comprobará solamente estas modificaciones y las nuevas evidencias funcionales/responsive asociadas. Al haber hallazgos en R1, una R2 limpia no basta para proclamar dos rondas limpias consecutivas; el tope de dos rondas de este hito impide exceder la política ordinaria.
