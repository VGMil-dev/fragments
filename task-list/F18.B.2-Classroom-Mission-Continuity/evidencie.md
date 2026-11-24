# Evidencia F18.B.2

Estado: especificación acotada; implementación en curso.

- Requisito basado en F18.B, F17 y el incremento F18.B.1 ya desplegado: en `/student/classrooms`, las misiones usan `StudentAssignmentsList`, cuyo CTA actual siempre inicia una propuesta. Debe continuar solo una propuesta propia cuyo `assignmentVersionId` coincida exactamente con la versión publicada.
- La ruta `/student/classrooms` actualmente no carga `GET /api/me/proposals`; el arquitecto añadirá la carga y el reintento en `App.tsx`, mientras el agente UI implementa estados y CTA en `StudentClassroomsScreen` / `StudentAssignmentsList`.
- No se modifican contratos, backend, permisos, migraciones ni datos. Todo fixture de prueba se etiqueta fake; sin proveedores IA ni pruebas destructivas.
- Pendiente: registrar commits, comandos y resultados frescos, PR/CI, release F14 y verificación Ego Lite segura si está disponible. La carga de datos reales/UX autenticada queda NO COMPROBADA en ausencia de sesión autorizada para este flujo.
