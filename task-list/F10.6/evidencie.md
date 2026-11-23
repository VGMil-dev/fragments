# Evidencia F10.6

Estado: implementación integrada localmente, lista para PR; sin push ni despliegue. El backend y el cliente crean y reutilizan una clave UUID por intento. El servidor deduplica atómicamente por sesión + clave y conserva intentos históricos con clave nula. La respuesta al reintento retorna el intento original; el cliente mantiene payload/reto si la respuesta es ambigua y reemplaza filas de historial por ID para no duplicarlas visualmente.

Commits: backend `7bf6ee7`; merge normal local de integración `9ae139a`; cliente con clave reutilizada `f530701`; corrección de historial duplicado `d5e287f`.

Verificación local: Prisma validate/generate PASS; typecheck API y web PASS; TrainerScreen web **10/10**; API trainer service **6/6**; pruebas focales API con PostgreSQL desechable **3/3**, tras confirmar `current_database() = fragments_test` antes de migrar/probar la deduplicación concurrente. La suite API completa con DB desechable pasó 250/251; la única falla agregada fue `review/worker-http.test.ts` y la repetición aislada pasó 9/9, por lo que la suite completa no se declara verde. Sin `DATABASE_URL`, 178 pruebas API pasan y 73 se omiten. `git diff --check` PASS. Revisión reflexiva final: sin bloqueantes; confirmó resuelto el caso de historial cargado antes del reintento. No se han publicado ramas ni desplegado esta implementación.

Criterio pendiente: publicar esta rama mediante PR normal, obtener CI requerida y resolver cualquier fallo antes de integrar. No se ha creado tag ni iniciado despliegue. F14 y Ego Lite corresponden a la release posterior a la integración; las sesiones estudiantil/docente se mantienen abiertas.
