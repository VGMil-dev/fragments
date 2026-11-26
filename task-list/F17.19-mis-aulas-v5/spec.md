# F17.19 — Especificación Mis aulas V5

## Entradas

- Aulas activas y solicitudes del estudiante autenticado, desde los estados existentes de `/api/me/classrooms` y `/api/me/classroom-requests`.
- Habilidades autorizadas por aula activa, desde `studentApi.getMyClassroomSkills`.
- Misiones publicadas, desde `assignmentsApi.listStudent`.
- Propuestas del propio estudiante y callbacks existentes para iniciar o continuar misión.
- El formulario de incorporación existente y sus estados reales de error/solicitud.

## Salidas y navegación

- Micronavegación Aulas / Inventario de habilidades / Solicitudes dentro de `/student/classrooms`.
- Aulas activas con búsqueda, hasta ocho inicialmente y entrada a una vista de detalle por aula.
- Detalle con Volver a mis aulas y pestañas Misiones / Habilidades del aula.
- Misiones con título, objetivo, hasta tres inicialmente, detalle publicado y CTA enlazado al flujo existente de continuidad.
- Inventario de habilidades deduplicado por `id`, con búsqueda, filtro por aula, aulas de origen y misiones vinculadas.
- Solicitudes conservando códigos, estados, mensajes y formularios reales.
- Se conserva la barra lateral compartida; esta tarea no modifica el shell ni el router general.

## Datos y permisos

- Solo las matrículas con `status === "active"` habilitan la carga y lectura del contenido privado del aula.
- No agrupar habilidades por nombre ni mostrar dominio, certificación o progreso no existente.
- Misión, objetivos, contexto Mentor versionado, habilidades, rúbrica y entregas provienen de la instantánea publicada devuelta por F18.
- Continuidad conserva `StudentAssignmentsList` y sus callbacks; no reconstruye una regla de fase paralela.
- Sin cambios a `packages/contracts`, endpoints, tablas, dependencias o persistencia.

## UI y aceptación

- Adaptar con fidelidad el HTML aprobado del kit, su paleta, tipografía, proporciones, iconos, espaciado y reflow; importar los WebP originales usados mediante Vite.
- GIVEN más de ocho aulas o tres misiones, WHEN abre la vista, THEN aparecen los límites iniciales y controles Ver más/menos.
- GIVEN habilidades con igual nombre e IDs diferentes, WHEN se muestra el inventario, THEN permanecen separadas; igual ID se agrupa y enumera sus aulas de origen.
- GIVEN una misión publicada, WHEN se abre Ver misión, THEN se ven solo campos/versiones publicados y la acción de continuar usa el flujo académico persistido.
- GIVEN solicitudes o fallos de red, WHEN se abre Solicitudes, THEN se conservan el formulario y estados auténticos, sin códigos de ejemplo.
- GIVEN una ventana de 320, 390, 768, 1024 o 1440 CSS px, WHEN se navega por teclado, THEN no hay desbordamiento horizontal y el foco permanece visible; se respeta reduced-motion.
- Probar búsqueda, filtros, vacíos, carga, error, solicitud y ausencia de matrícula activa sin operaciones destructivas ni evaluación de IA.
