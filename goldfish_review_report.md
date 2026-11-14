# Revisiones Goldfish — F16-CICD

## Ronda 1 — diseño inicial — no limpia

Tres revisores independientes completaron la lectura de sus personas, estándares y fuentes. Se lanzaron con `fork_turns: none`, `model: gpt-6-luna`, `reasoning_effort: medium`; el sistema confirmó la creación de cada agente. El registro de lanzamiento prueba los parámetros enviados, no expone una telemetría separada del runtime del subagente.

### Hallazgos

| ID | Revisor | Severidad | Hallazgo | Resolución |
|---|---|---|---|---|
| `design_critic-1-1` | seguridad de Actions/procedencia | Major | El plan de política no fijaba una validación estructural, casos negativos ni cobertura por workflow/job. Buscar texto podía pasar ante permisos efectivos o triggers alterados. | Añadido parser `yaml@2.9.1`, mapa estructural explícito de triggers/runners/permisos/pins y fixtures negativos. |
| `design_critic-1-2` | seguridad de Actions/procedencia | Nit | Faltaba evaluar parser YAML mantenido frente a regex propio. | Alternativa y coste de dependencia documentados. |
| `implementation_readiness-1-1` | despliegue/backup/rollback | Major | Rollback de imágenes no tenía una barrera ejecutable para evitar migraciones incompatibles. | Añadida prueba de política que bloquea DDL destructivo y `NOT NULL` sin `DEFAULT` mientras rollback sea solo de código. |
| `zoom_out-1-1` | aislamiento/fallos adversariales | Major | Una caída después de guardar `deploying` puede dejar el release fuera de reintentos y del rollback manual. | Añadida reconciliación al siguiente ciclo basada en imágenes, salud, volumen y contenedores vecinos; incluye resultados de estado intacto, aplicado y parcial. |

No hubo Blockers. La ronda no converge por los tres hallazgos Major; los cambios anteriores actualizan el diseño y los criterios, todavía no el código productivo.

### Estado para la siguiente ronda

- Cambios de diseño: parser YAML estructural; checks Node/Python incluidos en tres workflows; test directo de backup; barrera de migración compatible con rollback; recuperación de ledger `deploying` tras caída.
- Próxima ronda: volver a lanzar revisores frescos y verificar cada cambio contra el código fuente.
- Criterio EGM: requiere dos rondas limpias consecutivas antes de implementar.

## Ronda 2 — diseño revisado — no limpia

Tres revisores frescos completaron la lectura de persona, estándar y contexto. Los lanzamientos usaron `fork_turns: none`, `model: gpt-6-luna`, `reasoning_effort: medium`; el modelo de runtime efectivo no se expone en una telemetría del agente. No editaron archivos ni ejecutaron pruebas.

### Hallazgos

| ID | Revisor | Severidad | Hallazgo | Disposición |
|---|---|---|---|---|
| `design_critic-2-1` | seguridad de Actions/procedencia | Major | Los tests estructurales descritos aún no están en `test-release-agent-scripts.mjs`. | **CONTESTADO como no aplicable al diseño previo a implementación.** El agente verificó el estado actual del código; el target es el plan que especifica crearlos, no afirma que ya existan. En fase de implementación se revisará que el código cumpla el diseño. |
| `implementation_readiness-2-1` | deploy/backup/rollback | Major | La transacción `deploying` carecía de campos y transiciones exactos para crash/restart. | Diseño actualizado: campos obligatorios, fsync/replace, poll/idempotencia y estados exactos sin Compose; los estados ambiguos pasan a intervención manual. |
| `implementation_readiness-2-2` | deploy/backup/rollback | Major | Un scanner SQL de migraciones no probaría compatibilidad del binario previo ni definía gramática. | **Aceptado como límite de alcance.** F16 no cambia `apps/api` ni las migraciones; no se afirmará compatibilidad futura ni se añadirá un scanner sintáctico insuficiente. Cualquier futura tarea que incluya DDL debe probar el binario previo contra el esquema migrado o definir rollout/rollback expand-contract. |
| `zoom_out-2-1` | aislamiento/fallos adversariales | Major | No estaba definida la identidad idempotente del registro pendiente frente a duplicados terminales. | Diseño actualizado: solo el mismo registro único `deploying` se actualiza; los estados terminales siguen rechazando repeticiones. |
| `zoom_out-2-2` | aislamiento/fallos adversariales | Major | Revertir imágenes ante cambios concurrentes o estado desconocido podría pisar trabajo ajeno. | Diseño actualizado: observaciones ambiguas/desconocidas/mix requieren `recovery_required` sin llamadas mutadoras; se vuelven a muestrear imágenes, salud, volumen y vecinos antes de marcar estado. |
| `zoom_out-2-3` | aislamiento/fallos adversariales | Nit | Test de backup debía mantener origen/destino aislados y recalcular digest independientemente. | Aceptado: fixture, destinos y retención se limitan al temporal y el test calcula SHA-256 por separado. |

Las disposiciones están documentadas y deben ser comprobadas por una tercera ronda fresca. Ronda 2 no se cuenta limpia hasta esa revisión.

## Ronda 3 — revisión de límites — no limpia

Tres revisores frescos completaron personas, estándares y fuentes de código. Se mantuvieron los parámetros de lanzamiento `gpt-6-luna` / `medium` y `fork_turns: none`.

| ID | Revisor | Severidad | Hallazgo | Resolución |
|---|---|---|---|---|
| `design_critic-3-1` | seguridad/procedencia | — | Sin hallazgos pendientes dentro del alcance de diseño. | Sin acción. |
| `zoom_out-3-1` | simpleza/backup/rollback | — | Sin hallazgos pendientes; la limitación de backup local y migraciones excluidas se entienden. | Sin acción. |
| `implementation_readiness-3-1` | recuperación | Major | No separaba errores transitorios de errores permanentemente inválidos ni decía qué filas terminales evitarían reintentos. | Añadidas clases transitorias/permanentes y estados `rejected`/`recovery_required`, con reglas de no mutar. |
| `implementation_readiness-3-2` | recuperación | Major | El poll podía usar una instantánea vieja y crear request tras transición terminal; faltaba regla consumidor/locking. | El request se define como señal; el aplicador relee ledger bajo `flock` exclusivo y consume sin-op si el estado ya es terminal. |
| `implementation_readiness-3-3` | recuperación | Major | `flock` no evita cambios Docker de root externos; la doble muestra no elimina completamente TOCTOU. | Todos los mutadores soportados comparten flock; reconciliación no muta Docker; el runbook prohíbe administración externa concurrente y el documento declara esa limitación explícita. |

Ronda 3 no limpia. Las resoluciones anteriores pasan a revisión independiente en ronda 4.

## Ronda 4 — taxonomía de errores — no limpia

Tres revisores frescos con gpt-6-luna / medium, ork_turns: none, revisaron el diseño, la especificación y fuentes pertinentes. El registro de lanzamiento demuestra parámetros enviados, no telemetría independiente del runtime.

| Revisor | Severidad | Hallazgo | Resolución |
|---|---|---|---|
| security/procedencia | Major | HTTP fuera de 408/429/5xx y excepciones desconocidas no tenían clasificación ni pruebas de límites. | Ampliada la clasificación exhaustiva con 408/425/429/5xx, rate limit 403 condicionado, resto permanente, causas estables y default fail-closed; especificar cobertura de límites. |
| recuperación | Major | También faltaban códigos no cero de Git/gh y respuestas inválidas/excesivas. | Cubierto: timeout/transporte identificados transitorios; otros códigos y respuestas permanentes con causa estable. |
| alcance/simpleza | — | Sin hallazgos pendientes. | Sin acción. |

Ronda 4 no limpia. La siguiente ronda debe verificar que los límites sean comprobables y que no haya nuevas omisiones.
## Ronda 5 — límites operativos — no limpia

Tres revisores frescos gpt-6-luna / medium, fork_turns: none; lectura de diseño/spec y código en modo solo lectura.

| Revisor | Severidad | Hallazgo | Disposición |
|---|---|---|---|
| seguridad/procedencia | Major | urlopen puede seguir 3xx y no se definía política; fallos de subprocess carecían de señales precisas comprobables. | Diseño/spec ahora deshabilitan redirecciones HTTP, hacen todos los 3xx permanentes y definen TimeoutExpired como único retry Git/gh; OSError y cualquier nonzero son permanentes, sin parsear stderr. Añadidos tests de casos límite. |
| recuperación | Major/Blocker | Señaló que el código aún no implementa taxonomía, recuperación ni integración de suites. | CONTESTADO por fase: esta ronda revisa convergencia del diseño y la implementación aún no se autoriza hasta dos rondas limpias consecutivas; la observación de ausencia de código es cierta y se convierte en criterio de verificación de la etapa de implementación, no en defecto del diseño. Ninguna implementación se afirma. |
| alcance/simpleza | — | Sin hallazgos de alcance o simplicidad. | Sin acción. |

Ronda 5 no limpia por los dos hallazgos de seguridad válidos; sus cambios se someten a dos rondas limpias consecutivas nuevas.

## Ronda 6 — límites de API y CDN — no limpia

Tres revisores frescos gpt-6-luna / medium, fork_turns: none; revisión de diseño/spec y código en modo solo lectura.

| Revisor | Severidad | Hallazgo | Resolución |
|---|---|---|---|
| seguridad/procedencia | Major + Nit | El redirect policy no distinguía API JSON de descarga asset, necesaria para CDN; faltaba código estable para HTTP transient 408/425/5xx. | Diseño/spec separan API sin redirects de asset HTTPS con allowlist y máximo cinco saltos; código `asset_redirect_rejected`; causa `http_transient_status` y campo numérico `http_status` añadidos. |
| readiness/recuperación | Major | Ambigüedad entre bloquear redirects globalmente y permitir redirects CDN de assets. | Resuelto en diseño/spec con clientes, hosts, límites y casos de prueba separados. |
| alcance/simpleza | Nit | Frase decía Git/gh timeout o transporte transitorio aunque regla posterior solo permite `TimeoutExpired`. | Alineada la frase en diseño con regla específica de subprocess. |

Ronda 6 no limpia. Los cambios requieren confirmación independiente en dos rondas limpias consecutivas nuevas.

## Ronda 7 — errores, logs y revalidación — no limpia

Tres revisores frescos gpt-6-luna / medium, fork_turns: none; revisión de diseño/spec y fuentes en modo solo lectura.

| Revisor | Severidad | Hallazgo | Resolución |
|---|---|---|---|
| seguridad/procedencia | Nit | Mensaje libre de 403 rate-limit no tenía patrón acotado. | Se quitó la señal por mensaje; solo `X-RateLimit-Remaining: 0` habilita transitorio. |
| recuperación/readiness | Major + Nit | Faltaba shape exacto de error persistido y evento para transitorios; regla subprocess no delimitaba todas las invocaciones. | Ledger fija `error:{code,http_status?}` solo en estados relevantes; retry emite JSON `release_retry` sin body/stderr/secretos. La regla ahora separa comandos remotos de GitHub y operaciones locales. |
| alcance/simpleza | Major | Fallo de red no-cero en `git fetch` remoto podía descartar terminalmente una tag válida. | Todo timeout/código no cero en `git fetch` y `gh attestation trusted-root` ahora es retryable no terminal (`command_timeout`/`remote_command_unavailable`) y revalida la misma tag; fallos locales siguen permanentes/rollback según fase. |

Ronda 7 no limpia. Se solicitan dos rondas limpias frescas consecutivas tras confirmar estas reglas.

## Ronda 8 — telemetría, reintentos y destinos asset — no limpia

Tres revisores frescos gpt-6-luna / medium, fork_turns: none; revisión read-only.

| Revisor | Severidad | Hallazgo | Resolución |
|---|---|---|---|
| seguridad/procedencia | Nit | Campo 403 rate-limit no asignaba código estable inequívoco. | Se especificó `http_rate_limited`; `http_transient_status` queda para 408/425/429/5xx excepto 403 rate-limit. |
| readiness/recuperación | Nit | Mismo mapeo de causa faltante para 403 con `X-RateLimit-Remaining: 0`. | Mapeo explícito agregado en diseño/spec. |
| alcance/simpleza | 2 Nits | `.amazonaws.com` era wildcard demasiado amplio; reintento remoto cada poll no explicaba volumen/backoff/logging. | Se elimina AWS de allowlist (falla cerrado ante host no aprobado); retry sigue el timer existente de cinco minutos, máximo un evento por release/ciclo, sin backoff adicional. | 

Ronda 8 no limpia por Nits corregidos. Siguiente ronda debe confirmar decisiones y detectar regresiones.
| seguridad/procedencia (revisión adicional) | Nit | El evento retry no cerraba el esquema JSON y no exigía pruebas con sentinels de body/stderr/excepción/secreto. | Se fijó schema exacto con `event` y campos cerrados, prohibición de extras y test de sentinels no filtrados. |

Esta observación adicional también deja ronda 8 no limpia; nueva confirmación independiente pendiente.

## Ronda 9 — identidad de imagen y límites de URL — no limpia

Tres revisores frescos gpt-6-luna / medium, fork_turns: none; diseño/spec y fuentes revisados read-only.

| Revisor | Severidad | Hallazgo | Resolución |
|---|---|---|---|
| seguridad/procedencia | Nit | Faltaba normalizar headers duplicados/whitespace para 403 rate-limit. | Solo un header, lookup case-insensitive, quitar OWS ASCII SP/HTAB y comparar exactamente `0`; duplicado/otro/ausente es permanente. |
| alcance/simpleza | Nit | URL asset no rechazaba userinfo ni puerto no-443; reintento remoto sin backoff/log cap suficientemente explícitos. | Asset URL exige HTTPS/443, sin userinfo en origen y redirects; ciclo existente 5 min, max un evento/release/ciclo, sin backoff adicional. |
| readiness/recuperación | Major | La reconciliación por referencias/tags no definía identidad inmutable; una tag movida podía aparentar destino correcto. | Ledger exige `targetImageIds` (`.Id` sha256 tras cargar artefacto verificado) y `previousImageIds` (`.Image` de containers); recovery compara `.Image` inmutable en ambas observaciones, nunca tags/`.Config.Image`; fixture retarget debe caer en `recovery_required`. |

Ronda 9 no limpia. Revisión fresca pendiente de estos contratos.

## Ronda 10 — adversarial tags y retry persistente — no limpia

Tres revisores frescos gpt-6-luna / medium, fork_turns: none; revisión read-only de diseño/spec y código.

| Revisor | Severidad | Hallazgo | Resolución |
|---|---|---|---|
| seguridad/procedencia | — / Nit potencial | Sin hallazgos de diseño; implementación debe preservar headers duplicados y probar casing/OWS. | Reglas/spec ya requieren un header único, case-insensitive, trim OWS ASCII y casos duplicados/whitespace. Se mantiene como detalle de implementación. |
| readiness/recuperación | Major | Faltaba un fixture explícito que retenga `.Config.Image` pero cambie `.Image`. | Spec ahora prescribe `.Config.Image` igual a tag ledger con `.Image` ajeno a target/previous y resto sano; exigir `recovery_required`, cero mutaciones. |
| alcance/simpleza | Nit | Reintento remoto indefinido puede dejar auth/config inválidos pendientes. | Riesgo aceptado/documentado: cada 5 min, como máximo un evento/release/ciclo, sin mutación; runbook detiene servicio, corrige, reanuda y revalida la misma tag. |
| alcance/simpleza | Nit | URLs de assets debían rechazar puerto no-443 y userinfo. | Diseño/spec exigen HTTPS:443 y userinfo ausente en URL inicial y cada redirect; tests de aceptación añadidos. |

Ronda 10 no limpia; se requiere nueva revisión fresca de los cambios de identidad y riesgo operacional.
| readiness/recuperación | Nit | El README no explicaba el stop/fix/resume same-tag para errores remotos persistentes, aunque diseño/spec sí. | Añadido runbook en README con stop/start units, corrección de red/configuración sin exponer secretos y revalidación de la misma tag. |

Ronda 11 no limpia por este Nit; solicitar nueva revisión fresca del runbook.
| readiness/recuperación | Nit | El stop recipe detenía timer y path pero no una activación `fragments-release-apply.service` ya en curso. | README ahora detiene timer, path y service, y exige confirmar apply inactivo antes de continuar; se actualizan también rollback fallido y pausa. |
| seguridad/procedencia | Nit | El mismo hueco podía dejar Docker activo durante intervención manual. | Resolución compartida con readiness; stop incluye servicio oneshot y verificación de estado. |

Ronda 12 no limpia por el stop incompleto; se solicita ronda fresca.

## Ronda 13 — barrera de operaciones manuales — no limpia

Tres revisores frescos gpt-6-luna / medium, fork_turns: none; revisión read-only de runbook/diseño/spec/systemd.

| Revisor | Severidad | Hallazgo | Resolución |
|---|---|---|---|
| seguridad/procedencia | Major | Runbook verificaba apply inactive después de corrección, no antes; rollback no tenía stop barrier. | Reordenado: detener timer/path, dejar terminar apply (no kill), verificar inactive antes de corregir o mutar. |
| alcance/simpleza | Major | CLI manual podía mutar con recovery_required/estado ambiguo. | Guardrail de diseño/spec: solo ledger deployed/rollback_failed con target IDs exactos, baseline/health correctos; de otro modo cero mutadores e intervención manual. |
| readiness/recuperación | Major | Incluir `apply.service` en stop puede matar un deploy/rollback en curso; no se podía reiniciar same-tag sin reconciliación tras corte. | Stop ahora solo timer/path; esperar a que el oneshot termine. Si no termina/ambiguous, preservar ledger y no reiniciar; validar inactive antes de intervención. |

Ronda 13 no limpia; ronda fresca pendiente.

## Ronda 14 — selección latest y quiescencia — no limpia

Tres revisores frescos gpt-6-luna / medium, fork_turns: none; revisión read-only.

| Revisor | Severidad | Hallazgo | Resolución |
|---|---|---|---|
| readiness/recuperación | Major | No estaba cerrado si `--rollback-latest` filtraba ledger por releases anteriores y saltaba un newest ineligible. | Diseño/spec/README ahora evalúan solo última entrada; prueba older deployed + newest deploying/recovery_required/terminal exige cero mutadores. |
| seguridad/procedencia | Major | Diseño aún mandaba detener apply.service en recovery, contradiciendo quiescencia y podía matar deploy/rollback activo. | Alineado: detener timer/path, dejar terminar service apply, comprobar inactive; si no termina, preservar ledger y escalar. |
| alcance/simpleza | Major + Nit | Mismo conflicto entre README drain-first y diseño; señaló nivel de detalle. | Contradicción del runbook eliminada; detalle de prueba permanece como contrato de implementación. |

Ronda 14 no limpia; se requiere revisión fresca tras alinear latest-only y drain-first.

## Ronda 15 — errores de transporte y consistencia documental — no limpia

Tres revisores frescos gpt-6-luna / medium, fork_turns: none; revisión read-only.

| Revisor | Severidad | Hallazgo | Resolución |
|---|---|---|---|
| seguridad/procedencia | Nit | “Transporte identificado” no enumeraba tipos exactos de urllib/socket. | Spec enumera `socket.gaierror`, TimeoutError/socket.timeout, ConnectionError, RemoteDisconnected y URLError.reason solo de esos tipos; desconocidos permanentes, con tests de bordes. |
| alcance/simpleza | 2 Nits | README podía sonar a bloqueo total de tag reintentada; diseño duplicaba el protocolo detallado de spec. | README aclara duplicados terminales vs mismo `deploying` idempotente; design resumido a arquitectura y remite a spec cláusula 8. |
| readiness/recuperación | Nit | README preflight de rollback no decía que health debía estar conocida/sana antes de invocar CLI. | Añadida precondición explícita en README. |

Ronda 15 no limpia; las correcciones se someten a revisión fresca.

## Ronda 16 — transporte estricto y preflight de rollback — no limpia

Tres revisores frescos gpt-6-luna / medium, fork_turns: none; revisión read-only.

| Revisor | Severidad | Hallazgo | Resolución |
|---|---|---|---|
| seguridad/procedencia | 2 Nits | Canonicalización host para allowlist no fijada; health del rollback decía solo conocida frente a sana. | Spec exige DNS ASCII normalizado lowercase, rechaza trailing dot/IDNA/lookalikes; ambos containers deben tener health conocida y sana antes del rollback. |
| readiness/recuperación | — | latest-only, drain-first, identidad, excepciones de transporte y fixture retag claros. | Sin acción. |
| alcance/simpleza | — | Arquitectura de diseño más concisa, scope y reintento idempotente coherentes. | Sin acción. |

Ronda 16 no limpia por dos Nits corregidos; requiere re-revisión fresca.

## Ronda 17 — canonicalización DNS — no limpia

Tres revisores frescos gpt-6-luna / medium, fork_turns: none; revisión read-only.

| Revisor | Severidad | Hallazgo | Resolución |
|---|---|---|---|
| seguridad/procedencia | Nit | Hostname “inválido” y límite de suffix no tenían gramática DNS exacta ni prueba de longitudes/apex. | Spec define DNS LDH ASCII, lower-case, hostname 1–253 octetos, labels 1–63 alfanuméricos extremos, sin empty/trailing dot/IP/IDNA; suffix exige label anterior. Añadidos casos de límite. |
| alcance/simpleza | Nit | Health rollback debía ser conocida y sana en diseño, no solo spec/README. | Alineado diseño a known+healthy en ambos containers; canonicalization se mantiene detalle de spec. |
| readiness/recuperación | — | Sin hallazgos pendientes; ID inmutable y fixture retag accionables. | Sin acción. |

Ronda 17 no limpia por Nits corregidos; nueva ronda fresca pendiente.

## Ronda 18 — límites de suffix y altura documental — no limpia

Tres revisores frescos gpt-6-luna / medium, fork_turns: none; revisión read-only.

| Revisor | Severidad | Hallazgo | Resolución |
|---|---|---|---|
| seguridad/procedencia | Nit | Suffix `.githubusercontent.com` carecía de ejemplos exactos que probaran el límite de etiqueta. | Spec enumera rechazo de apex y `notgithubusercontent.com`, aceptación de `x.githubusercontent.com`. |
| readiness/recuperación | — | Hostname LDH y preflight rollback sano/latest-only claros. | Sin acción. |
| alcance/simpleza | Nit | Design repetía detalle de ledger, fsync, fixtures y transiciones de la spec. | Se comprimió a decisiones de arquitectura y enlaces explícitos a cláusulas 6–11. |

Ronda 18 no limpia por Nits corregidos; revisión fresca pendiente.

## Ronda 19 — arquitectura y ciclo de redirect — no limpia

Tres revisores frescos gpt-6-luna / medium, fork_turns: none; revisión read-only.

| Revisor | Severidad | Hallazgo | Resolución |
|---|---|---|---|
| seguridad/procedencia | — | Host/suffix exactos y restantes contratos sin omisiones dentro de foco. | Sin acción. |
| readiness/recuperación | Nit | La regla de rechazar ciclos de redirects no definía la llave de URL visitada ni fixture A→B→A. | Spec usa tupla normalizada scheme/host/port/path/query en memoria, omite fragmento y prohíbe log de query firmada; fixture de ciclo agregado. |
| alcance/simpleza | Major + Nit | El design seguía duplicando detalles de protocolos y test cases; README same-tag consistencia adicional. | README ya aclaraba idempotencia; diseño reescrito a arquitectura/racional y remite los contratos operativos a la spec. |

Ronda 19 no limpia; los cambios se someten a revisión fresca.

## Ronda 20 — arquitectura y redirecciones — no limpia

Tres revisores frescos gpt-6-luna / medium, fork_turns: none; revisión read-only.

| Revisor | Severidad | Hallazgo | Resolución |
|---|---|---|---|
| seguridad/procedencia | — | Redirect cycle key está definido sin log de query; controles DNS y error limpios. | Sin acción. |
| readiness/recuperación | — | Especificación accionable para recuperación y ciclo A→B→A. | Sin acción. |
| alcance/simpleza | Nit | Numeración duplicada de decisiones 10/11 en spec. | Renumeradas las dos decisiones finales como 12/13. |

Ronda 20 no limpia por Nit corregido; se requiere nueva revisión fresca.

## Ronda 21 — confirmación de convergencia — limpia

Tres revisores frescos gpt-6-luna / medium, fork_turns: none, leyeron personas/estándares EGM pertinentes, diseño/spec/README y fuentes relevantes en modo solo lectura. Seguridad/procedencia, readiness/recuperación y zoom-out no encontraron hallazgos abiertos. Verificaron numeración consecutiva 1–13, identidad de imagen, rollback latest-only, drain-first, taxonomía fail-closed, hosts/redirects y altura arquitectónica del diseño. Esta es la primera ronda limpia consecutiva.

## Ronda 22 — convergencia de diseño — limpia

Tres revisores frescos gpt-6-luna / medium, fork_turns: none; seguridad/procedencia, readiness/recuperación y zoom-out revisaron diseño/spec/README y fuentes en modo solo lectura. Sin Blockers, Majors ni Nits. Confirmaron contratos de redirects/ciclo, clasificación, ledger/log redacted, identidad inmutable, latest-only/drain-first y scope. Segunda ronda limpia consecutiva tras ronda 21; gate de diseño superado y se autoriza pasar a implementación dentro de los archivos permitidos.

## Revisión de implementación — rondas 23–25 y reauditoría final

Los revisores fueron lanzados con `gpt-6-luna` / `medium`, `fork_turns: none`, y verificaron el worktree F16 cuando la revisión se consideró válida. Los intentos que abrieron el checkout raíz equivocado o no inspeccionaron el cambio no se contabilizan como revisiones concluyentes. El marcador privado del padre estuvo ausente en las revisiones válidas. La herramienta confirma los parámetros de lanzamiento; no expone telemetría independiente del runtime de cada agente.

| Ciclo | Hallazgos válidos | Resolución |
|---|---|---|
| 23 | Majors: rollback debía operar solo sobre el último registro elegible y proteger baseline/identidad; poll podía reencolar estado terminal; errores de `docker load` se clasificaban incorrectamente. Readiness pidió cobertura de recuperación. | Se endurecieron los guardrails latest-only y preflight, el poll valida estado persistido, y timeout/código no cero se mapean a errores estables. Se agregaron pruebas de fallo sin mutaciones. |
| 24 | Major: fallos permanentes tras persistir `deploying` pero antes de mutar Compose podían terminar en estado no documentado. | Los fallos se guardan como `recovery_required` con causa estable, sin confundirlos con una transacción no iniciada. |
| 25 | Major: el baseline de recuperación comprobaba presencia de claves, no la forma/completitud de refs, IDs, volumen y vecinos; podía cerrar como `deployed` con rollback baseline incompleto. | Se añadió `_complete_recovery_baseline` antes de observar estado: valida mapas y claves exactos, valores requeridos y digest SHA-256 completo. La regresión cubre mapa incompleto e IDs previos/objetivo malformados, y exige `recovery_required` sin observaciones ni mutaciones. |
| Reauditoría focal final | Seguridad, alcance y recuperación confirmaron que el validador y pruebas cubren el hallazgo; no quedaron Majors en el foco revisado. | Cambio aceptado; las revisiones fueron read-only. |

La auditoría final de recuperación también confirmó fsync/replace del ledger, reintento del mismo release, recuperación sin Compose, rollback latest-only y respaldo sin restauración automática de SQLite. En Windows, una prueba de contención `flock` se omite deliberadamente y queda cubierta por Linux CI.
