# F06 — Specification

**Objetivo:** Inspector docente privado desde una revisión exacta y evidencia verificada hasta defensa registrada.

## Contratos y API

- Entrada al dominio: review `id`, `projectId`, owner/repo/SHA guardados, snapshot recuperado para ese SHA exacto y análisis validado; proveedor de reto y almacén inyectados.
- El adaptador Inspector vuelve a pedir snapshot por owner/repo/SHA almacenados, rechaza identidad distinta y verifica el digest canónico del contenido. El dominio también recalcula el digest, rechaza rutas duplicadas/inexistentes y rangos de líneas fuera del archivo.
- El adaptador de credenciales lee `teachers.password_hash` con formato scrypt fijo; un helper genera hashes para aprovisionamiento manual controlado. No hay creación de usuarios ni credenciales por HTTP.
- Respuesta docente: `InspectorChallengeRecordResponseSchema`, con reto privado, SHA, estado, asignación y defensa.
- Asignación: `POST /api/inspector/challenges/:id/assign`, body `{}` estricto; identidad obtenida de sesión docente, nunca del body.
- Defensa: `POST /api/inspector/challenges/:id/record`, `InspectorDefenseRecordRequestSchema` limita campos a dos booleanos y notas de hasta 2000 caracteres.
- Consulta/creación por review: `GET|POST /api/inspector/:reviewId/challenges`.
- Todas las rutas requieren cookie de sesión docente válida, emiten `Cache-Control: no-store` y validan respuestas.
- Salida estudiantil usa solo `InspectorStudentChallengeResponseSchema` y `InspectorChallengePublicSchema`; el hint docente se elimina y se rechaza si aparece.

## Persistencia y comportamiento

- SQLite almacena reto, estado, autor de asignación, SHA reemplazante y defensa; no persiste archivos fuente o código ejecutable.
- Se crea reto solo para review del commit actual con evidencia `verified` que coincide con digest/ruta/líneas del snapshot.
- Pending pasa a obsolete ante commit nuevo; assigned conserva su contenido y registra SHA sucesor; completed y defensa se conservan.
- Nunca se ejecuta código del estudiante ni se llama a GitHub/IA en tests; el HTTP E2E usa review/provider fake explícitos.

## UI

- Ruta `/teacher/inspector` integrada a navegación de `App`, panel docente con consulta por ID de revisión, creación, asignación y defensa.
- El panel tiene estados vacíos/errores, teclado/foco visible y vista 390/1440 px. Solo datos obtenidos con cookie docente pueden renderizar la guía privada.

## Criterios de aceptación

- [x] GIVEN una revisión fake con snapshot/digest válidos, WHEN docente consulta/crea/asigna/registra, THEN la ruta HTTP usa SQLite y responde con contrato validado.
- [x] GIVEN entrada inválida o sesión ausente, WHEN se accede a rutas privadas, THEN el servidor devuelve error genérico sin revelar guía docente.
- [x] GIVEN revisión de otro SHA o evidencia sin hallazgo verificado, THEN el dominio rechaza crear un reto.
- [x] GIVEN commit nuevo, WHEN se reconcilian registros, THEN pendientes quedan obsoletos y asignados/realizados se conservan con invariantes documentadas.
- [x] GIVEN hints privados, WHEN se construye respuesta estudiantil, THEN `teacherHint` no aparece y el schema público lo rechaza.
- [x] GIVEN un Review persistido y un reader falso offline, WHEN Inspector recupera evidencia, THEN pide el owner/repo/SHA completo guardado y rechaza snapshot con identidad o digest diferentes.
- [x] GIVEN un hash scrypt provisionado manualmente, WHEN se valida el login mediante el adaptador y sesión existentes, THEN contraseña incorrecta se rechaza y la correcta produce una cookie firmada verificable.
- [x] GIVEN panel integrado, WHEN se visualiza con Ego Lite, THEN layout 390/1440 y navegación visible verificados.
- [ ] GIVEN despliegue normal, WHEN una revisión F05 existente se selecciona en Inspector, THEN la composición usa almacenamiento Review y cliente GitHub real sin adaptador fake.
- [ ] GIVEN configuración local de auth docente, WHEN docente inicia sesión en la UI, THEN la app proporciona y conserva sesión segura de extremo a extremo.

**Bloqueos de cierre:** F05 aún no tiene repositorio SQLite ni rutas integradas en el runner; el adaptador local necesita que composición le provea `getById`, `getLatestCommit(projectId)` y reader por SHA exacto. El runner tampoco inyecta el verificador scrypt ni presenta login en UI. Las dos últimas comprobaciones quedan para integración compartida.
