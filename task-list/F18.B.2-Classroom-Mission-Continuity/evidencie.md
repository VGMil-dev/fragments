# Evidencia F18.B.2

Estado: implementación integrada localmente y verificada; PR/CI/release pendientes.

- Requisito basado en F18.B, F17 y el incremento F18.B.1 ya desplegado: en `/student/classrooms`, las misiones usan `StudentAssignmentsList`, cuyo CTA actual siempre inicia una propuesta. Debe continuar solo una propuesta propia cuyo `assignmentVersionId` coincida exactamente con la versión publicada.
- Brecha corregida: `App.tsx` carga `GET /api/me/proposals` al entrar a `/student/classrooms` y conecta estado, reintento, continuación y nuevo inicio con `StudentClassroomsScreen` / `StudentAssignmentsList`. `proposalsLoadedPath` evita habilitar una acción con datos/error provenientes de otra ruta durante el primer render.
- No se modifican contratos, backend, permisos, migraciones ni datos. Todo fixture de prueba se etiqueta fake; sin proveedores IA ni pruebas destructivas.
- Commits: `34f4cae` (UI/estados y pruebas), `4c9299e` (ruta, callbacks y test de continuidad a Mentor), `fce8373` (gate por ruta para no habilitar acciones con propuestas anteriores). Especificación/registro planner: `500dcef`.
- Pruebas frescas: suite web `pnpm --filter @fragments/web test` — 54 archivos, 290/290 PASS; typecheck PASS; build PASS; `git diff --check` PASS. Focal de continuidad — `App.student-flow`, `StudentClassroomsScreen` y `AssignmentsPanel`: 28/28 PASS.
- El test integrado confirma que una misión en Mis aulas abre la propuesta propia vinculada y conserva contexto/skill en Mentor. Prueba aparte confirma que el CTA para nueva propuesta espera la respuesta de `GET /api/me/proposals`; el test unitario también cubre match exacto, versión distinta, error y reintento, y selecciona la propuesta más recientemente actualizada si hay varias del mismo snapshot.
- Revisión reflexiva independiente: CLEAN tras detectar y cerrar la ventana de carga del primer render con datos del path anterior.
- El build conserva advertencias del bundle >500 kB y directivas `use client` de Lucide. PR, CI y F14 pendientes. La verificación Ego Lite de este flujo productivo sigue NO COMPROBADA; no se navegaron ni cerraron sesiones, ni se modificó producción.
- Próximo paso: publicar PR por merge normal, esperar CI, integrar si pasa y usar F14 solo tras checks verdes. Revisar con Ego Lite únicamente una sesión académica autorizada, sin guardar ni reevaluar propuestas.
