# Evidencia F10.6

Estado: implementada, integrada y publicada por F14. El backend y el cliente crean y reutilizan una clave UUID por intento. El servidor deduplica atómicamente por sesión + clave y conserva intentos históricos con clave nula. La respuesta al reintento retorna el intento original; el cliente mantiene payload/reto si la respuesta es ambigua y reemplaza filas de historial por ID para no duplicarlas visualmente.

Commits: backend `7bf6ee7`; merge normal local de integración `9ae139a`; cliente con clave reutilizada `f530701`; corrección de historial duplicado `d5e287f`.

Verificación local: Prisma validate/generate PASS; typecheck API y web PASS; TrainerScreen web **10/10**; API trainer service **6/6**; pruebas focales API con PostgreSQL desechable **3/3**, tras confirmar `current_database() = fragments_test` antes de migrar/probar la deduplicación concurrente. La suite API completa con DB desechable pasó 250/251; la única falla agregada fue `review/worker-http.test.ts` y la repetición aislada pasó 9/9, por lo que la suite completa no se declara verde. Sin `DATABASE_URL`, 178 pruebas API pasan y 73 se omiten. `git diff --check` PASS. Revisión reflexiva final: sin bloqueantes; confirmó resuelto el caso de historial cargado antes del reintento. Estas verificaciones locales antecedieron la integración y release registradas abajo.

## Integración y release · 2026-11-23

- PR [#207](https://github.com/VGMil-dev/fragments/pull/207) merge normal en `main`, merge SHA `cb0e33d44cd0041bc132301b9fd5d6a74a32360b`; CI `45257118234` SUCCESS.
- Tag anotada `v0.5.49` y F14 run `45257748265` SUCCESS en `verify-build`, `attest-package` y `publish-approved-release`. La tag y el SHA de código corresponden exactamente; releases siguientes v0.5.50–v0.5.52 incluyen ese código.
- Los tests fake y de integración local descritos arriba validan los reintentos idempotentes. La inspección read-only más reciente verificó en producción contenedores y bundle de v0.5.52 (`7da17ec`), pero el flujo autenticado de reintento ambiguo no se repitió en producción/Ego Lite: queda **NO COMPROBADO**. No se crearon intentos productivos.
- No queda pendiente la integración/CI/F14. No se declara probado el comportamiento visual/autenticado posterior al despliegue.
