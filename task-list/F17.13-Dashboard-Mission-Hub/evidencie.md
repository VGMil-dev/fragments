# Evidencia F17.13 — Centro de misiones

## Estado

Implementado, integrado y publicado en `v0.5.57` mediante F14.

## Cambio

- Se dio más presencia visual a las misiones y su contexto, manteniendo acciones conectadas al estado existente.
- El borrador propio mantiene precedencia visual y de foco si coexiste con misiones.
- Al elegir entre varias misiones, la lista precede al panel de elección; el orden del DOM permanece igual al visual y al teclado.
- No hubo cambios de contratos, backend, rutas, persistencia, infraestructura o dependencias.

## Verificación

- Prueba focal `StudentDashboard.test.tsx`: 13/13 PASS; se añadió una aserción de orden DOM y se comprobó en rojo/verde el caso borrador + misiones.
- Typecheck web, build web y `git diff --check`: PASS.
- CI PR #233 run `45314909157`: SUCCESS.
- Revisión reflexiva independiente de los commits `42992ba35f66d7ee43da693c95d70c351027cdfc` y `4c7b4b6ec9c80f2b2dd65ba78b214a5223ac975e`: orden lector/foco correcto, sin riesgo material restante.
- Merge normal PR #233: `7648fd5b7d5df4daed3485aef9659b5ba57d5628`.
- Tag anotada `v0.5.57` apunta al SHA exacto. F14 run `45315350460` SUCCESS en verify-build, attest-package y publish-approved-release.
- Producción verificada: bundle `/assets/index-DQPP14Ar.js` contiene versión `v0.5.57` y SHA del merge; `/health` responde `ok`, base `ready`.

## NO COMPROBADO

- QA visual autenticada con Ego Lite en 320/390/768/1024/1440 px, contraste, zoom, foco, lector y reduced motion. El TaskSpace estudiantil no estaba disponible; no se abrió otro ni se cerraron sesiones existentes.
- La publicación del paquete a la cola F14 fue automática; no se usó deploy manual, SSH, migraciones ni escrituras productivas.
