# Informe Goldfish — INC-AI-GATEWAY-429

## Alcance y ejecución

- PR revisado: https://github.com/VGMil-dev/fragments/pull/43.
- Rama: `codex/mentor-ai-incident`.
- HEAD auditado: `5ce6ab6d871a9bf602f4e42acec2ec71698cb4e4` (diff contra `origin/main`).
- Framework: EGM oficial `egm@egm` versión `0.1.1`, instalada desde el marketplace oficial en esta sesión.
- Tres revisores nativos frescos, lanzados con `fork_turns: none`, modelo solicitado `gpt-6-luna`, esfuerzo `medium`. La orquestación no puede observar telemetría separada que certifique el modelo efectivo del runtime.
- Cada reviewer leyó su persona, estándar asignado y archivos requeridos. Todos fueron de solo lectura; ninguno modificó archivos, ejecutó pruebas, contactó producción o llamó al proveedor.
- La comprobación de marcador parent-only no detectó su presencia en los informes. `fork_turns: none` no demuestra aislamiento de archivos de instrucciones del host, como advierte la guía EGM.

## Resultados

### Codebase Details

**Lecturas:** `agents/codebase_details.md`, `resources/document_standards/re-implementation-standard.md`, diff completo y archivos AI/runtime y de evidencia relevantes.

**Resultado:** 0 Blockers, 0 Majors, 0 Nits. Confirmó separación de status Gateway/proveedor, evidencia de despacho antes de `fetch`, `Retry-After`, estados del ledger, clave idempotente hasheada, lease/cooldown compartido y diagnósticos redactados.

### Implementation Readiness

**Lecturas:** `agents/implementation_readiness.md`, `resources/document_standards/implementation-readiness-standard.md`, especificación, runbook, migración, implementación y pruebas.

**Resultado:** 0 Blockers, 0 Majors, 0 Nits. Confirmó que los límites de reintento, la incertidumbre de despacho y el procedimiento condicional del ledger están documentados y probados.

**Condición para release:** antes de publicar, debe verificarse que la imagen API anterior tolera el esquema SQLite aditivo v12. Esa pareja de revisiones aún no se ha probado; la puerta está registrada en `recovery-plan.md`.

### Zoom Out

**Lecturas:** `agents/zoom_out.md`, `resources/document_standards/zoom-out-standard.md`, `docs/SYSTEM_DESIGN.md`, diff, especificación y runbook.

**Resultado:** 0 Blockers, 0 Majors, 0 Nits. Consideró justificado el control de despacho/cooldown compartido: los leases actuales de la cola gestionan propiedad de jobs, no límites globales de llamadas al Gateway.

## Dictamen

El review satisface el control Goldfish para el HEAD auditado: cero Blockers y cero Majors. R1 del review se limita al commit indicado; un runbook de release conserva la condición de compatibilidad API previa/v12. El PR no fue fusionado ni desplegado.

## Revisión fresca R2 y remediación

La revisión fresca posterior sobre HEAD `d29d0649a883113d0c5898d217e0cf279016c1e4` encontró dos Majors y un Nit; por ello el resultado R1 anterior no se considera dictamen del HEAD actual:

- **Major — agotamiento no probado:** faltaba demostrar el límite de cuatro despachos totales cuando cada respuesta era un HTTP 429 confirmado sin cargo, incluyendo el error final y el estado financiero del ledger.
- **Major — evidencia stale:** `TASKS.md` y la evidencia marcaban la tarea completa citando CI de un HEAD previo, aunque la evidencia decía que el siguiente commit aún necesitaba CI.
- **Nit — alcance del informe:** los cero hallazgos originales correspondían solo a `5ce6ab6`, no a `d29d064`.

Remediación implementada localmente: se añadió una prueba de agotamiento que exige cuatro llamadas, tres esperas, error 429, una única fila idempotente liberada, cero reserva/cargo y ledger desbloqueado. `TASKS.md` quedó pendiente hasta que el nuevo commit tenga CI y Goldfish exactos; la revisión R1 se conserva explícitamente limitada a su SHA. La revisión Goldfish final del nuevo HEAD y su CI remoto quedan pendientes de publicación.

La revisión R2 finalizó sobre `a71ef7a1cf050b43c496bb159fc7371ea9d819d6` y encontró además un Major de readiness: `spec.md` no enumeraba los paths autorizados ni las columnas e índice de la migración v12. Encontró un Nit en la trazabilidad: evidencia y task list describían como pendientes el commit y el CI aunque `a71ef7a` ya estaba publicado y verificado. La especificación ahora enumera paths permitidos, esquema SQL lógico exacto, índice parcial y comportamiento del singleton; la evidencia registra commit/CI #71 y deja pendientes solo los checks del siguiente cambio documental. Estos cambios documentales requieren CI y Goldfish sobre su propio HEAD antes de cerrar la tarea.

Resultados agregados R2 para `a71ef7a1cf050b43c496bb159fc7371ea9d819d6`:

| Perspectiva | Blocker | Major | Nit |
|---|---:|---:|---:|
| Codebase Details | 0 | 0 | 0 |
| Implementation Readiness | 0 | 1 | 1 |
| Zoom Out | 0 | 0 | 1 |

El Major de readiness se remedia con el alcance/esquema añadido arriba. Los Nits eran de trazabilidad en evidencia y spec de readiness; ahora se registra el SHA, commit y CI ya confirmados, y se deja explícito que la revisión del siguiente HEAD documental queda pendiente. La puerta de compatibilidad de la imagen API previa con esquema v12 sigue como condición de release en `recovery-plan.md`, no como Blocker/Major de merge.

## Revisión fresca R3 y remediación en curso

Goldfish volvió a revisar el HEAD `743007db0340bf3c93ca5e3dd20f8645ec3edd69`, comparado con la base `e25bacf1d4a3c32ca31fd510bbcb5d0a8b90cdb6` del PR. Conteo agregado:

| Perspectiva | Blocker | Major | Nit |
|---|---:|---:|---:|
| Codebase Details | 0 | 1 | 0 |
| Implementation Readiness | 0 | 1 | 1 |
| Zoom Out | 0 | 0 | 1 |

Hallazgos:

- **Major financiero (Codebase Details):** `GatewayRetryExhaustedError` no copiaba `providerDispatchPossible`. Un 429 ambiguo con señal explícita de despacho posible podía reclasificarse como rechazo sin cargo y permitir liberar la reserva del ledger.
- **Major de alcance (Implementation Readiness):** la lista de archivos de Mentor decía “pruebas correspondientes” en lugar de enumerar `apps/api/src/features/mentor/service.test.ts` y `http.test.ts`.
- **Nit (Implementation Readiness):** `origin/main` local apuntaba a `35546eb`, distinto de la base `e25bacf` solicitada para esta revisión. Goldfish usó el SHA base solicitado explícitamente.
- **Nit (Zoom Out):** la evidencia y TASKS aún no tenían CI/Goldfish del SHA R3 bajo revisión.

Remediación local posterior a R3: el wrapper ahora copia `providerDispatchPossible`; una prueba de política→ledger demuestra que el 429 ambiguo produce una sola llamada y conserva la reserva `uncertain`/bloqueante. La prueba se ejecutó en rojo antes del arreglo y en verde después (suite focalizada 7/7). `spec.md` ahora enumera ambos paths de prueba. La rama requiere además sincronización normal con el `origin/main` que avanzó a `35546eb`; CI/Goldfish del SHA siguiente siguen pendientes y no se atribuyen a R3.

La sincronización se completó después de R3 con merge normal de `origin/main` `35546eb5745b6d6edfe7efcb4d0a97b1dbe4d6cf` en commit `7ea1d43cfd0a7c4bf0422c628bf20f38674f1f8e`. La suite local tras el merge pasó 10/10 tareas (API 152, contratos 19, web 97; typecheck/lint/build). Al cierre de R3 ese merge y la actualización documental aún requerían push y checks; después se publicó `0d4cb78`, que recibió la revisión R4 descrita a continuación. No se infieren resultados anteriores para SHA distintos.

## Revisión fresca R4 y ajuste de trazabilidad

Goldfish revisó el HEAD `0d4cb781a62b33ed40de31b092fe3cc7a428a63e`, ya basado en `origin/main` `35546eb5745b6d6edfe7efcb4d0a97b1dbe4d6cf`. Resultados:

| Perspectiva | Blocker | Major | Nit |
|---|---:|---:|---:|
| Codebase Details | 0 | 0 | 0 |
| Implementation Readiness | 0 | 0 | 1 |
| Zoom Out | 0 | 0 | 0 |

Codebase y Readiness confirmaron que `providerDispatchPossible` sobrevive la envoltura del 429 ambiguo y la reserva sigue en `uncertain`; los 4 intentos confirmados sin cargo terminan liberando una sola reserva. La spec enumera los paths del diff y el esquema v12.

El único Nit fue documental: `TASKS.md` y evidencia decían que faltaba publicar el commit, aunque `0d4cb78` ya estaba en el branch remoto. Se corrigió en esta actualización. CI #73 (`44015643394`), job `verify`, terminó `success` sobre `0d4cb78`. Readiness mantiene como puerta de release la prueba de compatibilidad entre la imagen API anterior y SQLite v12; sigue separada de la aprobación de merge.

## Revisión fresca R5: 429 desnudo y certeza de despacho

Goldfish auditó el HEAD `57ca4621b3d210656b692c4c2a538fe8cdc56317` contra `origin/main` `35546eb5745b6d6edfe7efcb4d0a97b1dbe4d6cf`:

| Perspectiva | Blocker | Major | Nit |
|---|---:|---:|---:|
| Codebase Details | 0 | 1 | 1 |
| Implementation Readiness | 0 | 0 | 1 |
| Zoom Out | 0 | 0 | 0 |

**Major financiero (Codebase Details):** `gateway-error.ts` infería `providerDispatchPossible=false` para un Gateway 429 solo porque no traía status upstream ni generación. `hasConfirmedNoChargeGatewayRejection` trataba esa ausencia como prueba positiva y la política podía reintentar/liberar la reserva. R5 confirmó que el SDK instalado no expone en `GatewayRateLimitError` el número/resultado de intentos de proveedor; el propio Vercel documenta que 429 puede proceder del Gateway o upstream.

**Nits:** R5 readiness detectó que la evidencia `[x]` de `TASKS.md` citaba CI/Goldfish para `0d4cb78`, no el SHA R5 `57ca462`; Codebase anotó que la ausencia de metadatos de proveedor no es prueba de no despacho. La tarea se reabrió y se está corrigiendo la regla antes de cualquier cierre.

Remediación local posterior a R5: la falta de datos ahora clasifica el posible despacho como verdadero. Solo un indicador explícito y confiable `providerDispatchPossible=false` habilita retry/release de un 429 sin upstream; el SDK normal actual no provee esa señal, de modo que un 429 ordinario se queda incierto y no se reintenta automáticamente. Gateway 402 con código `quota_for_entity_exceeded` sigue siendo un rechazo sin despacho, salvo evidencia upstream contraria. Las regresiones nuevas fallaron antes del fix (2 fallos del clasificador/política) y pasaron después; suite focalizada 16/16, suite completa local 10/10 tareas (API 154, contratos 19, web 97; typecheck/lint/build). Este estado corregido todavía requiere commit, CI y Goldfish exactos antes de volver a declarar el PR listo.

## Revisión fresca R6: fases de implementación

Goldfish R6 revisó el SHA `6c9a9418a814f3d9fd0a996d24d2cd6a5e0ab8ae` contra `origin/main` `35546eb5745b6d6edfe7efcb4d0a97b1dbe4d6cf`:

| Perspectiva | Blocker | Major | Nit |
|---|---:|---:|---:|
| Codebase Details | 0 | 0 | 0 |
| Implementation Readiness | 0 | 1 | 1 |
| Zoom Out | 0 | 0 | 0 |

**Major de readiness:** faltaba definir fases de implementación con checkpoints buildable/testable. **Nit documental:** el estado decía commit/push pendientes aunque `6c9a941` ya estaba en remoto. La spec ahora define cuatro fases (ledger/migración; clasificación/policy; integración Mentor/UI; verificación integrada) con paths y resultados verificables. La evidencia ya identifica `6c9a941`, CI #75 PASS y el SHA documental siguiente pendiente; el Nit no se aplica al nuevo estado.

La revisión reconfirmó que la rama no reintenta un 429 SDK desnudo por falta de evidencia positiva: conserva el holdback incierto. Esa limitación funcional debe comunicarse con claridad; no afirmar que el SDK normal permite retry de 429. La migración anterior API/v12 sigue como puerta pre-release separada. Los cambios documentales que remedian R6 requieren CI y Goldfish sobre su nuevo HEAD.

## Revisión fresca R9 — HEAD publicado del PR #43

Goldfish hizo una revisión técnica independiente sobre `0715c3ec1d3bbca75036786fbd3208617ffc4f80`, con base `35546eb5745b6d6edfe7efcb4d0a97b1dbe4d6cf`:

| Perspectiva | Blocker | Major | Nit |
|---|---:|---:|---:|
| Codebase Details | 0 | 0 | 1 |
| Implementation Readiness | 0 | 0 | 0 |
| Zoom Out | 0 | 0 | 1 |

Los dos Nits eran de trazabilidad: registrar CI #78 y el dictamen R9 en `evidencie.md` y actualizar la fila de `TASKS.md`. No señalaron defectos de implementación. Se anotaron los resultados exactos; cero Blockers/Majors pendientes. CI `Fragments CI` run `44018520968`, job requerido `verify` `133822150700`, terminó `success` sobre el mismo SHA; todos los pasos, incluidos tests/typecheck/lint/build y pruebas del agente de release, pasaron. La siguiente actualización documental tiene que recibir su propia corrida CI antes de considerar el PR listo.

## Revisión R10 — hallazgos que reabren la tarea

Goldfish hizo una nueva revisión fresca sobre `cd4c05a3a0174a48c2d6f97e8c1a2b60226f479c`, base `35546eb5745b6d6edfe7efcb4d0a97b1dbe4d6cf`. Los resultados iniciales fueron:

| Perspectiva | Blocker | Major | Nit |
|---|---:|---:|---:|
| Codebase Details | 1 | 0 | 0 |
| Implementation Readiness | 0 | 3 | 1 |
| Zoom Out | 0 | 1 | 1 |

Hallazgos: (1) `safeNoCharge=true` cortaba la comprobación de evidencia upstream y podía reintentar una solicitud facturable; (2) el lease singleton serializaba solicitudes distintas incluso en estado saludable; (3) la spec no definía identidad canónica/hash ni la conducta sin clave; (4) backoff/cooldown carecía de límites operativos exactos; (5) la tabla de respuestas API y campos expuestos estaba incompleta; (6) faltaban aserciones obligatorias para expiración de lease, repetición de clave, cooldown, retry agotado y migración de filas antiguas; (7) detalle de esquema/fases duplicado era un Nit de simplicidad. La tarea vuelve a `[ ]`. La corrección debe verificarse en su propio SHA; ningún resultado R9 aplica a este SHA.

Remediación preparada en el siguiente conjunto de cambios: el rechazo sin cargo ahora exige comprobar primero que no hay status upstream; las rutas normales usan slots no exclusivos y el lease singleton se activa solo durante cooldown/sondeo; v13 agrega ese estado de forma aditiva. El adaptador Mentor exige una identidad canónica derivada de propuesta/version/digest/contexto y persiste solo su SHA-256. La spec fija backoff (base/cap/jitter/tiempo máximo), Retry-After, contratos HTTP y datos redactados; los tests cubren agotamiento, HTTP-date, cooldown de workers, lease vencido, hash, ausencia de clave, migración v11→v13 y respuestas HTTP. El Nit de detalle se acepta donde documenta compatibilidad de esquema y sincronización; se evita duplicar nueva mecánica en archivos compartidos. Verificación local posterior: suite específica 56/56; suite workspace 282/282, 10 tareas incluyendo typecheck/lint/build, con avisos no bloqueantes de `lucide-react`. CI/Goldfish final todavía deben correr sobre el commit que incorpore estos cambios y la evidencia.

## Revisión fresca R7 y dictamen del código actual

Goldfish revisó `fc17c4f364c3a09f27f2484ae8026f50a79cd21e` contra `origin/main` `35546eb5745b6d6edfe7efcb4d0a97b1dbe4d6cf`; el merge-base coincide y el árbol estaba limpio.

| Perspectiva | Blocker | Major | Nit |
|---|---:|---:|---:|
| Codebase Details | 0 | 0 | 0 |
| Implementation Readiness | 0 | 0 | 0 |
| Zoom Out | 0 | 0 | 0 |

Las tres perspectivas confirmaron las fases/checkpoints de la spec, el allowlist de 22 paths, el esquema SQLite v12, y el comportamiento conservador de 429: sin evidencia afirmativa de no despacho, no reintenta ni libera y el ledger permanece `uncertain`. Este dictamen aplica al SHA citado.

CI `Fragments CI` #76 (`44017680286`), job requerido `verify` `133819432182`, finalizó `success` en ese mismo SHA. La evidencia identifica explícitamente el cambio posterior como documental y pendiente de su propia verificación para evitar atribuirle este resultado R7.

## Revisión R8 y corrección del estado de tarea

Goldfish auditó `2af4d4066a7fbfe74627bbdd6786bbd2aa6d7636` contra la base `35546eb5745b6d6edfe7efcb4d0a97b1dbe4d6cf`. Conteos:

| Perspectiva | Blocker | Major | Nit |
|---|---:|---:|---:|
| Codebase Details | 0 | 0 | 1 |
| Implementation Readiness | 0 | 0 | 1 |
| Zoom Out | 0 | 1 | 0 |

El Major y ambos Nits correspondieron a trazabilidad/completitud: `[x]` se había marcado por resultados en `fc17c4f`, mientras `2af4d40` era un cambio documental posterior y aún no tenía CI/Goldfish exactos en la evidencia. El CI #77 terminó `success` sobre `2af4d40` después de la revisión. La casilla se reabrió en esta actualización y queda `[ ]` hasta que CI y Goldfish evalúen el HEAD que contiene la corrección.

## Revisión fresca R12 — `a0b3b68`

Tres revisores Goldfish frescos inspeccionaron el HEAD `a0b3b68d94cf0dd567858238a897f69614866afd` en modo solo lectura. Codebase Details encontró 0 Blockers, 0 Majors y 0 Nits; Zoom Out encontró 0/0/0. Implementation Readiness encontró un Major: `recovery-plan.md` exigía verificar la compatibilidad de la imagen API previa con SQLite v14 pero no detallaba procedimiento, resultado esperado ni criterio de parada.

El hallazgo se acepta y se resuelve en `recovery-plan.md`: prueba aislada con imagen fijada por digest, base sintética saneada v14, egress bloqueado, chequeos concretos de salud/esquema/integridad/reserva incierta y cancelación del release ante cualquier diferencia. El R12 agregado no fue limpio. Los siguientes ciclos deben revisar un SHA final sin cambios entre rondas; no se ejecutará el procedimiento de compatibilidad como parte de este PR.

## Revisión fresca R13 — `09ac015`

Revisores frescos completaron Codebase Details, Implementation Readiness y Zoom Out sobre `09ac015356b5fc18fc84f55c0bb14600c6f2bc93`:

| Perspectiva | Blocker | Major | Nit |
|---|---:|---:|---:|
| Codebase Details | 2 | 0 | 0 |
| Implementation Readiness | 0 | 1 | 0 |
| Zoom Out | 0 | 0 | 1 |

Codebase encontró (1) que un timeout pre-callback con respuesta upstream aún podía seguir el retry pre-despacho y (2) que `providerCode` no impedía confirmar no-cargo 402 y liberar la reserva. Readiness pidió fixture, ruta y prueba de ausencia de mutación reproducibles. Se añadieron tests TDD (fallaron antes, pasan después), evidencia de respuesta upstream ahora veta no-cargo, y la marca `preDispatchTimeout` se calcula luego de procesar evidencia/posible despacho. El ensayo rollback especifica datos sintéticos, `GET /api/mentor/context`, snapshot lógico exacto y revisión por dos operadores. Zoom Out dejó un Nit editorial y no halló Blockers/Majors. R13 no fue limpio. La remediación quedó en `a1dd0fdd4943e2c02c2646a82ad58ffa8229753f`; CI exacto y rondas de cierre pendientes.

## Revisión fresca R14 — `61f3009`

Codebase 0/0/0, Readiness 0/0/1, Zoom Out 0/0/0 (Blocker/Major/Nit) sobre el mismo SHA `61f3009ae974a4d7c6cf49b9fb0b4f5bcba5c434`. CI #84 (`44024414570`) fue `success` en ese SHA. R14 fue limpia: cero Blockers y Majors. Readiness sugirió precisar el formato del snapshot como Nit.

## Revisión fresca R15 — `61f3009`

Codebase encontró un Blocker: el fallback pre-callback podía tratar un Gateway 429 sin señal explícita de no despacho como no facturable, habilitando retries y liberación. Readiness reportó dos Nits (serialización snapshot y trazabilidad rezagada); Zoom Out no encontró hallazgos.

La remediación del siguiente cambio exige `providerDispatchPossible=false` para no-cargo/retry 429, marca el 429 ambiguo como posible despacho y agrega una regresión que falla antes del arreglo y pasa después. El snapshot se especifica con proyecciones/columnas, orden, `NULL`, UTF-8, LF y filas sintéticas deterministas; se corrige la trazabilidad. R15 no fue limpia; el commit de corrección requerirá CI y dos nuevas rondas Goldfish limpias sobre el mismo HEAD.

## Revisión fresca R16 — `42ee4c6`

Codebase 0/0/1, Readiness 0/0/2, Zoom Out 0/0/0 (Blocker/Major/Nit) sobre `42ee4c6f4f4974796e82fecc4ab6271006d053d9`; CI #85 (`44025280574`) terminó `success` en el mismo SHA. R16 fue limpia, con 0 Blockers y 0 Majors.

Nits aceptados y corregidos después: la implementación activa cooldown compartido ante todo Gateway 429, incluido el ambiguo, mientras la spec solo mencionaba no-cargo confirmado; y el runbook necesitaba gramática exacta del snapshot para secciones sin filas. También se pidió actualizar la trazabilidad desde R15. El siguiente commit aclara estas reglas; sus resultados R16 no se atribuyen al SHA posterior.

## Revisión fresca R17 — `5742495`

Codebase 0/0/0, Readiness 0/1/0 y Zoom Out 0/0/0 (Blocker/Major/Nit) sobre `57424951929c40e413c0272403dfbd8030e1d149`; CI #86 (`44025561745`) fue `success` en el mismo SHA. R17 encontró un Major en la reproducibilidad del snapshot: la sección de `table_info` unía cuatro tablas sin identificar el origen de cada fila ni fijar orden global de columnas.

El runbook lo corrige añadiendo `table_name` a la proyección y orden binario `(table_name,cid)`. R17 no fue limpio; el SHA que contenga la corrección debe obtener CI y dos nuevas rondas limpias.

## Revisión fresca R18 — `a24aaa3`

Codebase 0/0/0, Readiness 0/0/1 y Zoom Out 0/0/1 (Blocker/Major/Nit) en `a24aaa3483b58ef36f1a525d75d9ef3de0ffcc80`. CI #88 (`44025966049`) pasó en el mismo SHA. R18 fue limpia con 0 Blockers/Majors. Readiness dejó un Nit de trazabilidad (registrar el resultado exacto en el próximo ciclo); Zoom Out observó oportunidad de simplificar un runbook operativo muy detallado, sin Major.

## Revisión fresca R19 — `a24aaa3`

Codebase 0/0/0, Readiness 0/1/0 y Zoom Out 0/0/0. El Major fue que el registro autoritativo aún mostraba R17/CI #86 como estado más reciente, pese a los resultados R18/R19 y CI #88 del HEAD revisado. El hallazgo queda resuelto en el commit documental que añade ambos resultados, verifica PR/ruleset vigentes y mantiene el estado abierto mientras se audita el SHA documental final. R19 no fue limpia por trazabilidad; el nuevo SHA requiere CI y dos nuevas rondas Goldfish idénticas.

## Revisión fresca R20 — `e8adc88`

Codebase 0/0/1, Readiness 0/1/0 y Zoom Out 0/0/1 (Blocker/Major/Nit) sobre `e8adc88d1fdffeeac517c7723f59d245840887ce`; CI #89 (`44026424321`) terminó `success` en ese mismo SHA. No se encontraron fallos de comportamiento financiero.

El Major de Readiness fue que TASKS/evidencia no identificaban el ciclo actual ni SHA exacto; se corrige en este commit registrando R20 y su CI. Codebase también detectó que el resumen superior aún describía migración v12 como actual; se reemplaza con el estado v12–v14, la regla de 429 ambiguo y el límite de dos slots. Zoom Out dejó Nit sobre la especificación byte-level del snapshot, sin bloquear. R20 no fue limpia por el Major de trazabilidad; el HEAD documental nuevo requiere CI y dos ciclos limpios.
