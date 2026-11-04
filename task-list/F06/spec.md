# F06 — Specification
**Objetivo:** Inspector privado y pruebas E2E.
**Implementación aislada de dominio (este commit):**
- Entrada: revisión ya evaluada con `id`, `projectId`, SHA, `RepositorySnapshot` y `AiAnalysis`; el proveedor de reto y almacén son puertos inyectados.
- Salida docente: `InspectorChallengeSchema` más estado/registro de defensa. La fuente de evidencia se toma del hallazgo verificado del mismo snapshot; el proveedor no elige ruta ni digest.
- Salida estudiante: solo `InspectorChallengePublicSchema` después de asignación; cualquier `teacherHint` se elimina y el esquema público lo rechaza.
- Estados: pendiente, asignado, realizado u obsoleto. Un commit nuevo vuelve obsoletos los pendientes, conserva los retos asignados con commit reemplazante y mantiene defensas realizadas.
- Enrutamiento y persistencia no se implementan aquí: métodos HTTP están listados en `docs/SYSTEM_DESIGN.md`; faltan DTOs de cuerpo/respuesta en el contrato compartido y el almacenamiento durable queda para integración del planner.

**Criterios de aceptación**
- [ ] GIVEN contratos de `docs/CONTRACTS.md`, WHEN se implementa el slice, THEN funciona de punta a punta en una prueba real/fake declarada. (Dominio fake listo; falta HTTP/SQLite/UI wiring.)
- [x] GIVEN entrada inválida, WHEN la recibe, THEN el mensaje indica qué corregir sin filtrar datos sensibles.
- [x] GIVEN repositorio sin credenciales, WHEN se ejecuta el dominio, THEN funciona offline con fake provider/store.
- [x] GIVEN revisión de otro SHA o evidencia no verificada, THEN no crea un reto.
- [x] Pruebas específicas de mutación inversa, privacidad docente, defensa registrada y obsolescencia de commit.
- [ ] Ego visual/E2E y capturas una vez que el panel y rutas se integren.
**No hacer:** No revelar hints a alumnos.
