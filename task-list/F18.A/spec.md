# F18.A — Especificación

## API y datos

- El owner de `packages/contracts` define DTOs Zod para aulas, matrículas, códigos públicos, catálogo/disponibilidad de habilidades y consultas propias del estudiante. No se acepta `teacherId` como autoridad de entrada; no se serializa `codeHash`.
- Una aula es propiedad de un `user.id` docente y tiene estado `active` o `archived`. Archivar conserva matrículas y referencias.
- La combinación normalizada de asignatura, grupo y período es única por docente; grupos o períodos distintos permiten varias aulas de la misma asignatura.
- Ingreso por código guarda solo SHA-256 del secreto de alta entropía. Código expirado, revocado o desconocido no crea matrícula. Archivar un aula revoca sus códigos y bloquea aprobaciones pendientes; reactivarla no reactiva códigos antiguos. Un código válido crea `pending`; aprobar/rechazar requiere acción explícita del docente dueño.
- Asignación docente directa valida un `user.id` existente con vínculo GitHub y rol estudiantil. Crea `active` con `source=teacher_assignment`; si hay una solicitud `pending`, la acción directa del docente la activa y queda auditada. `rejected` y `removed` no se reactivan automáticamente. La combinación aula/estudiante es única.
- Cada transición de matrícula escribe auditoría transaccional con estado anterior/nuevo, actor, procedencia y fecha. Solo `active` en una aula activa aparece en `GET /api/me/classrooms` o permite consultar habilidades habilitadas.
- Los intentos de código se limitan a 10 por estudiante en ventana de 15 minutos. El endpoint devuelve error genérico para códigos no válidos sin revelar el aula.
- Las habilidades pertenecen al docente creador, se deduplican por nombre normalizado dentro de ese catálogo, se pueden habilitar en sus propias aulas y al archivarse conservan sus referencias.

## Interfaz docente

Implementar Mis aulas, Nueva aula, detalle/Miembros y Habilidades con datos de API, sin fixtures de producción. Mantener cabecera superior, tokens/componentes F16, iconos funcionales Lucide, estados de carga/vacío/error/permisos y navegación de teclado. Omitir funciones no incluidas en F18.A.

## Aceptación

- GIVEN docentes A y B, WHEN A crea/edita aula o habilidad, THEN B no puede verla ni cambiarla.
- GIVEN solicitud estudiantil por código válido, WHEN se crea, THEN permanece `pending` y el estudiante no ve aula ni habilidades hasta aprobación.
- GIVEN matrícula `active`, WHEN el estudiante consulta sus recursos, THEN ve solo su aula y habilidades habilitadas; otro estudiante no obtiene esas filas.
- GIVEN código inválido/expirado/revocado, WHEN se intenta, THEN no se crea matrícula, no se filtra información del aula y se aplican límites de intentos.
- GIVEN asignación directa, WHEN el docente selecciona una identidad GitHub verificada, THEN se crea membresía `active`, queda auditada como `teacher_assignment` y no simula aprobación por código.
- GIVEN habilidad archivada, WHEN se consulta el catálogo, THEN el ID y las referencias históricas permanecen y no puede volver a habilitarse.
- GIVEN cualquier request del cliente, WHEN intenta indicar propietario, estado inválido o ID de otra persona, THEN Zod/ACL lo rechaza sin afectar persistencia.

## Verificación

Vitest con SQLite temporal y fake auth/identidades etiquetadas `fixture-*`; migración repetible e integridad SQLite; suite, typecheck, lint, build y `git diff --check`; QA Ego Lite en 320/390/768/1440 px, teclado, foco y movimiento reducido. No se certifica aislamiento real entre cuentas productivas.
