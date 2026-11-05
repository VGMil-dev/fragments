# F06 — Specification

**Objetivo:** Inspector docente privado desde una revisión exacta y evidencia verificada hasta defensa registrada.

## Contratos y API

- Entrada al dominio: review `id`, `projectId`, owner/repo/SHA guardados, snapshot recuperado para ese SHA exacto y análisis validado; proveedor de reto y almacén inyectados.
- El adaptador Inspector vuelve a pedir snapshot por owner/repo/SHA almacenados, rechaza identidad distinta y verifica el digest canónico del contenido. El dominio también recalcula el digest, rechaza rutas duplicadas/inexistentes y rangos de líneas fuera del archivo.
- Better Auth es la única autoridad de sesión/identidad y persiste usuarios y sesiones en SQLite; la autorización de Inspector requiere `isTeacher` o rol `admin` en la sesión.
- Respuesta docente: `InspectorChallengeRecordResponseSchema`, con reto privado, SHA, estado, asignación y defensa.
- Asignación: `POST /api/inspector/challenges/:id/assign`, body `{}` estricto; identidad obtenida de sesión docente, nunca del body.
- Defensa: `POST /api/inspector/challenges/:id/record`, `InspectorDefenseRecordRequestSchema` limita campos a dos booleanos y notas de hasta 2000 caracteres.
- Consulta/creación por review: `GET|POST /api/inspector/:reviewId/challenges`.
- Todas las rutas requieren cookie/sesión Better Auth docente válida, emiten `Cache-Control: no-store` y validan respuestas.
- Salida estudiantil usa solo `InspectorStudentChallengeResponseSchema` y `InspectorChallengePublicSchema`; el hint docente se elimina y se rechaza si aparece.

## Persistencia y comportamiento

- SQLite almacena reto, estado, autor de asignación, SHA reemplazante y defensa; no persiste archivos fuente o código ejecutable.
- Se crea reto solo para review del commit actual con evidencia `verified` que coincide con digest/ruta/líneas del snapshot.
- Pending pasa a obsolete ante commit nuevo; assigned conserva su contenido y registra SHA sucesor; completed y defensa se conservan.
- Nunca se ejecuta código del estudiante. Los tests usan review/provider fake; las lecturas GitHub autorizadas son GET a repositorios públicos. El proveedor Gateway real usa la tarifa verificada y el ledger compartido F05.

## UI

- Ruta `/teacher/inspector` integrada a navegación de `App`, login Better Auth y panel docente con consulta por ID de revisión, creación, asignación y defensa.
- El panel tiene estados vacíos/errores, teclado/foco visible y muestra solo datos obtenidos con cookie docente. Ego Lite verificó escritorio 982×921; QA móvil queda en F07.

## Criterios de aceptación

- [x] GIVEN una revisión fake con snapshot/digest válidos, WHEN docente consulta/crea/asigna/registra, THEN la ruta HTTP usa SQLite y responde con contrato validado.
- [x] GIVEN entrada inválida o sesión ausente, WHEN se accede a rutas privadas, THEN el servidor devuelve error genérico sin revelar guía docente.
- [x] GIVEN revisión de otro SHA o evidencia sin hallazgo verificado, THEN el dominio rechaza crear un reto.
- [x] GIVEN commit nuevo, WHEN se reconcilian registros, THEN pendientes quedan obsoletos y asignados/realizados se conservan con invariantes documentadas.
- [x] GIVEN hints privados, WHEN se construye respuesta estudiantil, THEN `teacherHint` no aparece y el schema público lo rechaza.
- [x] GIVEN un Review persistido y un reader falso offline, WHEN Inspector recupera evidencia, THEN pide el owner/repo/SHA completo guardado y rechaza snapshot con identidad o digest diferentes.
- [x] GIVEN una cuenta provisionada por el comando local explícito, WHEN docente inicia sesión, THEN Better Auth conserva sesión SQLite y Inspector autoriza solo al rol docente.
- [x] GIVEN panel integrado, WHEN se visualiza con Ego Lite, THEN escritorio y navegación visible se verifican; la validación responsive se sigue en F07.
- [x] GIVEN despliegue normal, WHEN una revisión F05 existente se selecciona en Inspector, THEN la composición usa almacenamiento Review y cliente GitHub real sin adaptador fake.
- [x] GIVEN configuración local de auth docente, WHEN docente inicia sesión en la UI, THEN la app proporciona y conserva sesión segura de extremo a extremo.

## Registro histórico de integración — 2026-11-04

- [x] Composición normal obtiene Review SQLite y reader por SHA exacto.
- [x] Login docente real con hash scrypt y sesión firmada; UI presenta login y consulta sesión.
- [x] Anónimo devuelve 401; el secreto docente no se serializa al estudiante.
- [x] Reto queda vinculado a líneas fuente verificadas y exige cita literal del provider.
- [ ] Inicio de sesión en browser con cuenta provisionada: no hay variables locales TEACHER_EMAIL/TEACHER_PASSWORD y no se creó una cuenta.
- [ ] Generación IA live: bloqueada por tarifas máximas ausentes; no se envió prompt ni se consumió presupuesto.

## Verificación integrada — 2026-11-05

- Better Auth `1.7.17` reemplaza el login/sesión artesanal. Registro público apagado; `pnpm --filter @fragments/api provision:teacher` es explícito e idempotente y no imprime credenciales.
- La cuenta local inició sesión desde Ego Lite; la sesión sobrevivió recarga de página y reinicio de API. Logout dejó `/api/auth/get-session` vacío y la ruta Inspector respondió `401 AUTH_REQUIRED` en modo anónimo.
- Review C produjo un reto real con evidencia `src/domain/lost-items.ts:17`; el proyectoId se mapea a un identificador permitido por contrato. Creación, asignación y defensa terminaron en `201`, `200`, `200`; la lista posterior devolvió dos registros completados, con ambos indicadores de defensa persistidos.
- El ensayo registró que no se ejecutó código del repositorio estudiante.
- La vista Ego Lite observada fue 982×921. No se afirma QA móvil en esta revalidación; F07 mantiene esa verificación abierta.
