# F25 — Evidencia offline

## Estado

Parcial: harness fake determinista revisado y ejecutado localmente. Calidad de evaluaciones reales **NO COMPROBADA**.

## Inventario seguro (2026-11-22)

- En el árbol versionado se encontraron `evals/fixtures/review-cases.yaml`, `evals/fixtures/fragments-test-commits.json` y `evals/providers/fake-review-provider.mjs`; no se encontró corpus local de salidas/evaluaciones persistidas en archivos SQLite, JSONL o NDJSON. La búsqueda excluyó `.git`, dependencias, artefactos de build y archivos `.env`.
- La aplicación usa persistencia PostgreSQL según `docs/SYSTEM_DESIGN.md`, pero no se consultó ninguna base: no se autorizó una conexión externa y no se inspeccionó configuración/secretos. Por tanto, el inventario de evaluaciones guardadas en DB queda **NO COMPROBADO**.
- El archivo de commits declara A `1104f4046a8049e7736b14748c9f02d5a9f7a533`, B `a66a8da27aec0f2b5a25a3ddd67142688ed8c518` y C `e2b54b2a3760b22a509c89a8b1345d0e5f4e1781` en `VGMil-dev/fragments-test-app`. No hay clon de ese repositorio en los worktrees locales inventariados. Caso golden técnico A/B/C **NO COMPROBADO**: obtenerlos requeriría una operación de red, expresamente fuera de alcance.
- `evals/promptfooconfig.yaml` referencia solo `file://providers/fake-review-provider.mjs` y `fixtures/review-cases.yaml`; los asserts son JSON/JavaScript deterministas. El test de inyección verifica que la fixture no altere el criterio.
- Promptfoo no está instalado en el checkout (`node_modules`/binario ausentes). No se usó `npx` ni se descargó software. Ejecución completa de Promptfoo **NO COMPROBADA**.

## Verificación fresca

Comando local, desde la raíz, usando Node v24.21.0:

```powershell
node --input-type=module -e "import assert from 'node:assert/strict'; import Provider from './evals/providers/fake-review-provider.mjs'; const p=new Provider(); const base={fixture:'grounded',digest:'a'.repeat(64),inputDigest:'b'.repeat(64)}; const a=await p.callApi('',{vars:base}); const b=await p.callApi('',{vars:base}); assert.equal(a.output,b.output); const parsed=JSON.parse(a.output); assert.equal(parsed.modelId,'fake:review-fixture-v1'); assert.equal(parsed.findings[0].evidence[0].path,'src/math.ts'); assert.match(parsed.limitations[0],/no representa una evaluación académica real/); assert.ok((await p.callApi('',{vars:{...base,digest:'bad'}})).error); console.log('offline-provider assertions: 5 passed; calls: 0 external');"
```

Salida:

```text
v24.21.0
offline-provider assertions: 5 passed; calls: 0 external
```

## Límites

El resultado solo prueba repetibilidad/estructura del proveedor fake y la presencia de limitaciones explícitas. No prueba la calidad, calibración ni validez educativa de modelos reales ni del proveedor productivo. No se ejecutó el script `evals/scripts/audit-public-fixtures.mts`: crea un lector GitHub REST y requeriría llamadas de red.

## Referencia técnica A/B/C — revisión estática pública (2026-11-22)

Los objetos A/B/C y archivos relevantes se leyeron en modo GET mediante el conector oficial GitHub, sin clonar ni ejecutar el repositorio. Se inspeccionó `App.tsx`, `src/domain/lost-items.ts` y `tests/lost-items.test.mjs` en B/C, además de metadata/diffs de los tres commits:

- [Commit A `1104f40`](https://github.com/VGMil-dev/fragments-test-app/commit/1104f4046a8049e7736b14748c9f02d5a9f7a533): base Expo/React Native con formulario y listado; `addItem` agrega el estado en memoria, no valida campos y no hay persistencia observable en la pantalla analizada.
- [Commit B `a66a8da`](https://github.com/VGMil-dev/fragments-test-app/commit/a66a8da27aec0f2b5a25a3ddd67142688ed8c518): separa `validateLostItem`; rechaza nombre/descripción vacíos o solo espacios; muestra mensajes accesibles y guarda valores con `trim()`. El archivo de pruebas afirma esos tres comportamientos. Basado en código, sin ejecutar tests.
- [Commit C `e2b54b2`](https://github.com/VGMil-dev/fragments-test-app/commit/e2b54b2a3760b22a509c89a8b1345d0e5f4e1781): conserva validación; `filterLostItems` busca solo en nombre con trim + minúsculas; `markLostItemRecovered` devuelve una lista nueva y cambia solo el id coincidente. Las pruebas B/C cubren espacios y ejemplos positivos; C además cubre búsqueda insensible a mayúsculas, query vacío, recuperación inmutable e id desconocido. Basado en fuente y pruebas, sin ejecutar código.

### Oráculo técnico provisional para Review

- A: señalar falta de validación de entradas vacías y estado solo en memoria; no afirmar que el código se ejecuta, sincroniza o persiste.
- B: considerar la validación requerida y sanitización por trim demostradas en la implementación, con pruebas fuente asociadas. No elevarlo a persistencia.
- C: aceptar búsqueda por nombre insensible a mayúsculas/espacios e inmutabilidad del cambio de estado; marcar como omisión cualquier afirmación de búsqueda por descripción, persistencia en backend o navegación, porque no aparecen en la pantalla inspeccionada.
- La existencia de Expo/React Native como dependencia o mención README no demuestra navegación, APIs nativas ni funcionalidad de backend.

Este oráculo mejora los criterios estáticos contra los commits exactos, pero no observa outputs de Review ni valida puntuación/citas del proveedor productivo. La calidad real Mentor/Review continúa **NO COMPROBADA**; no se ejecutó la aplicación, sus tests ni proveedor IA.

### Harness offline: alcance de asserts

- Se etiquetaron los casos Promptfoo como estructura/metadatos de cita, fixture de inyección y fixture de ruta ausente. Los comentarios aclaran que las rutas/líneas no se cotejan con un repositorio y los fixtures no prueban comprensión semántica ni validación de dominio.
- Se agregó `evals/scripts/fake-review-provider.test.mjs`, que caracteriza la salida JSON, correspondencia de metadatos de cita con la fixture, rechazo de fixture/huella inválida y el límite semántico: score `75` y hallazgo idéntico ante cambios contradictorios de prompt/snapshot.
- Desde la raíz, `node --test evals/scripts/fake-review-provider.test.mjs` terminó con exit 0: **3 tests, 3 pass, 0 fail**; no depende de servicios externos.
- Desde la raíz, `git diff --check` terminó con exit 0.
- Desde `evals/`, `pnpm --version` devolvió `11.25.0`. El comando `pnpm exec promptfoo eval --config promptfooconfig.yaml --no-cache --no-progress-bar --no-table` terminó con exit 1: `promptfoo` no encontrado. La ejecución de `pnpm exec` materializó 441 paquetes desde el store local y reportó 0 descargados. No se usó `npx`, proveedor remoto ni red. Promptfoo completo queda **NO COMPROBADO**.

### Auditoría de disponibilidad para comparación semántica

- Se ejecutó `node evals/scripts/audit-semantic-corpus.mjs`. El reporte devolvió `status: BLOCKED`, `blockedLabels: [A, B, C]`; para cada commit listó solo `label`, `commitSha`, `evidence`, `verified`, `notPresent` en `evals/fixtures/fragments-test-commits.json`. Ningún caso contiene `reviewOutput`; faltan `rubricVersion`, `score`, `findings`, `modelId` e `inputDigest` y, por tanto, evidencia/citas producidas por Review.
- `evals/fixtures/review-cases.yaml` es la entrada del provider fake. `evals/providers/fake-review-provider.mjs` fija `score: 75`, hallazgos por nombre de fixture e ignora el prompt/snapshot; el test `fake-review-provider.test.mjs` demuestra que respuesta y score se mantienen ante una entrada contradictoria. No es una salida histórica completa ni material válido para puntuar calidad semántica.
- Búsqueda de contenido en el repositorio con `rg -l -g '!node_modules/**' -g '!.git/**' -g '!dist/**' -g '!coverage/**' '"rubricVersion"|"modelId"|"inputDigest"' .` no localizó artefactos de salida persistida: solo código de persistencia/proveedor (`apps/api/src/features/review/prisma-store.ts`, `apps/api/src/adapters/ai/ai-provider.ts`) y el auditor/test recién añadidos. El inventario excluyó directorios de dependencias/build y no consultó bases ni secretos.
- Comando ejecutado: `node --test evals/scripts/audit-semantic-corpus.test.mjs evals/scripts/fake-review-provider.test.mjs` — exit 0, **5 tests, 5 pass, 0 fail**. `node evals/scripts/audit-semantic-corpus.mjs` produjo el bloqueo explícito descrito arriba; `git diff --check` terminó con exit 0.
- Conclusión técnica: no hay un par caso→respuesta Review completa persistido en el repo con el cual estimar calidad semántica. La comparación real queda **BLOQUEADA** hasta que existan salidas completas archivadas offline asociadas a A/B/C; no se ejecutaron modelos, proveedores ni código de esos repositorios.

## Resultado integrado — 2026-11-22

- PR #92 mergeado normalmente a `main`, SHA `74c413ccbbbb3a720065501d088025390e64d5aa`; CI `45030089149` SUCCESS.
- Verificación offline: 5/5 tests PASS. No se ejecutaron proveedores IA ni código de repositorios estudiantiles; no hubo coste externo.
- El corpus A/B/C sigue BLOCKED: faltan respuestas completas persistidas de Review, `rubricVersion`, `score`, `findings`, `modelId` e `inputDigest`. Modelo/proveedor y presupuesto productivo quedan NO COMPROBADOS; calidad semántica real Mentor/Review **NO COMPROBADA**.

## Cierre Git

- Commit de auditoría del corpus semántico offline: `fd3ee9515b4541a38bc5088eac642bf9efb2c645` (`test(F25): audita corpus offline semantico`).
- Commit del harness offline y su evidencia: `5c5efa5cfc6aec87cc4045256f9160a86ab8313e` (`test(F25): etiqueta alcance de fixtures offline`).
- Commit de implementación y documentación: `ee51314b780c64cb4695f27318ad588220f9dad9` (`docs(F25): documenta baseline offline de Review`).
- Commit de consolidación de evidencia: `5d9ce133bcbc74c3133469ab7ee8f7f9ee9566aa` (`docs(F25): registra cierre local del baseline`).
- Rama local: `codex/f25-offline-calibration`; árbol limpio tras el commit.

## Preflight autorizado: revisión de main y Notion · 2026-11-22

- Base inspeccionada: `origin/main` `bb69e0dea8c562b0b77c426e82b9788abd7854ce`. La ficha F25 de Notion (`https://app.notion.com/p/420cd5fa7ed7811eb4c2fa19491655a7`, lectura 2026-11-22 14:57:43 UTC; `verification.state=unverified`) sigue `En desarrollo`. Su próximo paso exige outputs A/B/C completos y presupuesto vigente verificable, y prohíbe llamadas pagadas hasta obtener evidencia. El preflight propuesto en esa ficha pide lectura administrativa legítima con modelo/proveedor y ledger/presupuesto sin revelar secretos.
- Se encontró el clon local `C:\Users\vgmil\Documents\Codex\fragments-test-app`, limpio en `main` SHA `e24fce1c998aec9b52d86d1d4a1a49d727936c5f`. `git cat-file -e '<SHA>^{commit}'` confirmó que A (`1104f404...`), B (`a66a8da...`) y C (`e2b54b2...`) están clonados. `git ls-tree -r --name-only e2b54b2...` no encontró archivos de Review/eval ni outputs; `git grep -n -i -E 'reviewOutput|modelId|rubricVersion|inputDigest|"findings"|score' e2b54b2...` no encontró respuestas de evaluación. No se ejecutó el proyecto ni se inspeccionaron archivos de secretos.
- Rutas de lectura presentes en `main` no cubren el preflight: `GET /api/admin/diagnostics/requests` (`apps/api/src/features/admin-diagnostics/http.ts`) requiere `adminCheck`, pero solo devuelve eventos recientes con `requestId`, fecha, método, familia de ruta, status y duración (`diagnostics.ts`); no incluye respuesta Review, modelo/proveedor ni ledger. `GET /api/reviews/:id` (`apps/api/src/features/review/http.ts`) puede devolver `analysis` completo solo para una sesión estudiantil autenticada que sea dueña de un job conocido; no hay una lista admin de resultados A/B/C ni se encontraron IDs autorizados para esos commits. No se consultó ningún endpoint ni DB.
- La configuración efectiva de modelo/proveedor se carga desde `AI_GATEWAY_MODEL` y `AI_GATEWAY_PROVIDER_ONLY` en `apps/api/src/platform/config.ts`; no hay endpoint de lectura para esos valores. `AiBudgetLedger.summary()` existe en `apps/api/src/adapters/ai/budget-ledger.ts`, pero sus únicas llamadas localizadas son pruebas; no hay endpoint de lectura del ledger. No se leyeron variables de entorno ni se contactaron servicios.

**Bloqueo exacto:** el clon local aporta las entradas A/B/C, no outputs históricos completos. La API solo permite recuperar Review por ID y dueño; no existe una vista administrativa autorizada que exponga el ledger ni el modelo/proveedor efectivos. La DB no se consultó porque no hay una autorización/ruta de lectura de este propósito.

**Único prerequisito verificable para continuar:** un export/preflight de solo lectura emitido por el operador autorizado para el corpus de QA, con cada salida Review íntegra enlazada al SHA exacto (incluidos rubricVersion, score, findings, evidencia/citas e inputDigest), modelo/proveedor efectivos y resumen vigente del presupuesto/ledger, con credenciales y secretos redactados y confirmación de que los registros pertenecen al corpus de QA. Hasta recibirlo, A/B/C, modelo/proveedor y presupuesto productivos siguen **NO COMPROBADOS**; no se hacen llamadas pagadas.

- Commit de esta revisión de acceso autorizado: `5ea839b20f25df2920c9d84ffaa054dd1a3f5441` (`docs(F25): documenta bloqueo de preflight autorizado`), rama local `codex/f25-authorized-preflight` basada en `origin/main` `bb69e0dea8c562b0b77c426e82b9788abd7854ce`.

## Validador estructural offline — 2026-11-22

- Se amplió `evals/scripts/audit-semantic-corpus.mjs` para exigir una respuesta Review completada asociada al SHA del caso, comprobar la forma de los campos de `analysis` y marcar modelos `fake:`/fixture como sintéticos. Las citas se inspeccionan solo por forma (ruta relativa segura, líneas positivas y digest SHA-256); no se comprueba que apunten a código real ni que respalden el hallazgo.
- El reporte declara explícitamente `qualityComparison: NOT_PERFORMED`, `scoreComputed: false`, `citationValidation: SHAPE_ONLY` y `providerProvenance: NOT_AUTHENTICATED`. El auditor no puntúa semántica ni convierte un fake en evidencia de calidad.
- Pruebas primero: se añadieron casos para rechazar el output completo del provider fake y para detectar líneas de cita inválidas. Comando exacto: `node --test evals/scripts/audit-semantic-corpus.test.mjs evals/scripts/fake-review-provider.test.mjs` — exit 0, 7 tests, 7 pass, 0 fail.
- Auditor ejecutado: `node evals/scripts/audit-semantic-corpus.mjs` — exit 0, `status: BLOCKED`, `blockedLabels: [A, B, C]`, `qualityComparison: NOT_PERFORMED`, `scoreComputed: false`. Los casos siguen sin `reviewOutput`; faltan respuestas históricas completas para los SHA A/B/C.
- `git diff --check` — exit 0. No hubo llamadas a Gateway/proveedores, lectura de secretos ni ejecución de repositorios estudiantiles.
- Límite: estas pruebas verifican integridad estructural/citas y provenance declarada; no verifican veracidad de contenido, correspondencia real de citas con snapshots, score, ni validez educativa. Calidad semántica real continúa **NO COMPROBADA**. Sigue faltando el export QA autorizado descrito en el preflight (outputs completos enlazados a SHA y resumen vigente de modelo/proveedor/presupuesto).
- Commit local: `5233a5e` (`test(F25): valida outputs Review offline`). Rama `codex/f25-offline-response-validator` basada en `origin/main` `3911d401326027898991cde4ad1b8fbd5ed6444a`.

## Integración PR #107 — 2026-11-22

- PR #107 se sincronizó normalmente con main, pasó CI `45051154100` SUCCESS y se fusionó mediante merge normal como `a18c55fb54e7aa2657a455953d384ee6397996ab`.
- La revisión independiente fue PASS para la lógica y pruebas del validador. La autenticidad de provider/model ID no queda probada: el auditor declara `providerProvenance: NOT_AUTHENTICATED` y bloquea `fake:` conocido.
- La integración no cambia el estado semántico: A/B/C siguen `BLOCKED` por outputs completos faltantes; score y calidad real Mentor/Review quedan **NO COMPROBADOS**. No hubo llamadas pagadas ni cambios en prompts/rúbricas.

## Inventario agregado de DB QA local · 2026-11-22 (hora de consulta no reportada)

- Según la consulta agregada de solo lectura ejecutada por el coordinador sobre el loopback local `fragments-ux08-test-db`, `current_database()` fue `fragments_test`. Esa instancia no contiene `fragments_prod`; este resultado se limita a esa DB local QA y no determina el estado de ninguna base de producción.
- Conteos agregados informados: `mentor_evaluations=0`, `jobs=0`, `review_attempts=0`, `submissions=7`. Búsquedas por los SHA A/B/C devolvieron cero coincidencias de JSON `MentorEvaluation` y cero payloads de jobs Review.
- No se leyó contenido de filas, no hubo escrituras ni llamadas externas/proveedor. No se inspeccionaron secretos. Este conteo no es una comprobación de producción ni añade outputs Review completos al corpus.
- Sigue `BLOCKED` la calibración A/B/C: los outputs históricos completos y el presupuesto/modelo efectivos siguen sin estar disponibles mediante evidencia autorizada; calidad semántica real **NO COMPROBADA** y llamadas pagadas bloqueadas.
- Fuente de la observación: resumen agregado entregado por el coordinador en la continuación F25; no se recibió el SQL literal ni un log exportado de la sesión. No atribuir a esta nota comandos que no fueron compartidos.
- El agente documentó la observación localmente en commits `cdce261` y `f31e16f` de su rama F25; se preservaron sin reescribir su historia al actualizarse con `origin/main`.

## Comparador mecánico offline A/B/C — 2026-11-22

- Se añadió `evals/scripts/compare-review-behaviors.mjs` y pruebas en `evals/scripts/compare-review-behaviors.test.mjs`. `behaviorReference` en el fixture mapea solo los comportamientos de validación requerida, búsqueda por nombre y estado recuperado a los metadatos preexistentes `verified`/`notPresent`; una prueba verifica esa correspondencia.
- Esos metadatos `verified`/`notPresent` no se revalidaron aquí contra snapshots ni código de A/B/C. Por eso “correcto”, “falso positivo” y “omisión” significan únicamente concordancia mecánica con esos metadatos, no ground truth técnico validado.
- El clasificador etiqueta claims reconocidos como correctos o falsos positivos según el comportamiento de referencia; reporta omisiones solo si se declara coverage completa para todos los IDs del caso. Las pruebas usan outputs sintéticos explícitamente fake y muestran la mecánica, no verdad del proveedor.
- Para salidas persistidas, el gate exige respuesta completa, commit SHA, `inputDigest` ligado a registro, export ID en allowlist declarada, campos de provenance y digest del output coincidentes; rechaza `fake`, `fixture`, `mock` y `test` tanto como IDs exactos como prefijos delimitados. Cita queda `SHAPE_ONLY`.
- El digest y la allowlist prueban coincidencia/integridad respecto al manifest declarado, no autenticación criptográfica. El reporte dice `providerProvenance: NOT_CRYPTOGRAPHICALLY_AUTHENTICATED`, `exportIntegrity: OUTPUT_DIGEST_AND_RECORD_MATCHED` y `exportAuthorization: EXTERNAL_ALLOWLIST_DECLARATION_MATCHED` cuando aplica. `semanticValidity: NOT_VALIDATED`, `qualityComparison: NOT_PERFORMED`, `scoreComputed: false`; no hay `qualityScore`.
- Verificación: `node --test evals/scripts/compare-review-behaviors.test.mjs evals/scripts/audit-semantic-corpus.test.mjs evals/scripts/fake-review-provider.test.mjs` — exit 0, **18 tests, 18 pass, 0 fail**; `node evals/scripts/compare-review-behaviors.mjs` — exit 0, **BLOCKED A/B/C**, cada uno por `missing_persisted_output`; `git diff --check` — exit 0.
- El corpus real disponible sigue sin outputs Review ni manifest: A/B/C permanecen **BLOCKED**. No se ejecutaron proveedores, llamadas externas ni código de estudiantes; no se tocaron prompts/rúbricas.
- Commits locales: `9d75e4f` (`test(F25): compara hallazgos con referencia A-B-C`) y `69bc4c3` (`fix(F25): endurece provenance de outputs fake`). Rama `codex/f25-offline-response-validator`; cambios aún no publicados.

## Clasificación offline de hallazgo y cita no listados · 2026-11-23

- Caso A: el provider fake local `missing_file` genera un finding `missing-file` con cita `src/invented.ts`; el fixture A lista solo `App.tsx` en `evidence` y no tiene ese ID en `behaviorReference`.
- `classifyReferenceBehaviors` ahora informa ese ID como `unclassifiedFindings` y la ruta como `citationsNotInEvidenceList`. Es una comprobación de pertenencia al array `evidence` del fixture, no prueba que el archivo no exista, que las líneas/digest correspondan ni que el hallazgo sea semánticamente correcto.
- La ausencia de outputs persistidos se conserva como `BLOCKED` (`missing_persisted_output`) para A/B/C. `qualityComparison: NOT_PERFORMED`, `scoreComputed: false`, `semanticValidity: NOT_VALIDATED`.
- Pruebas y typecheck: `node --test evals/scripts/compare-review-behaviors.test.mjs evals/scripts/audit-semantic-corpus.test.mjs evals/scripts/fake-review-provider.test.mjs` — exit 0, **19/19**; `pnpm typecheck` — exit 0, **5 tareas correctas**; `node evals/scripts/compare-review-behaviors.mjs` — exit 0, A/B/C `BLOCKED`; `git diff --check` — exit 0.
- No hubo llamadas externas, secretos, proveedor ni ejecución de código estudiantil. Calidad real Mentor/Review sigue **NO COMPROBADA**.
- Commit local de código, pruebas y alcance: `54fe628` (`test(F25): clasifica citas no listadas offline`).

## Comprobación offline final del corpus A/B/C — 2026-11-22

- Se revisó el árbol versionado de `origin/main` tras integrar PR #114. `evals/fixtures/fragments-test-commits.json` contiene SHA y metadata `verified/notPresent/behaviorReference`, pero no salidas `reviewOutput` completas; no hay manifest/export autorizado del corpus.
- No existe corpus elegible para ejecutar el comparador sobre resultados Review auténticos. Faltan análisis y citas completos por cada SHA A/B/C, `inputDigest` ligado e identificador de export autorizado. El comparador mecánico/fixtures fake no reemplaza esas evidencias.
- No se consultaron secretos, DB, servicios ni proveedores; no hubo llamadas IA pagadas. Calidad semántica de puntuaciones Mentor/Review sigue **NO COMPROBADA**.

## Búsqueda local adicional — 2026-11-22

- Revisión en worktree existente limpio (`codex/f14-v0517-evidence`, HEAD `f38a37542975643e08d4308a107d862dba7d02f0`): búsquedas acotadas por SHA A/B/C y por campos de outputs/exports no hallaron corpus auténtico o manifest autorizado. Solo fixtures/scripts de auditoría y los apuntes existentes; F24_EVIDENCIAS no está en este worktree.
- `node evals/scripts/compare-review-behaviors.mjs` — exit 0; A/B/C `BLOCKED` por `missing_persisted_output`; `qualityComparison=NOT_PERFORMED`, `scoreComputed=false`, `semanticValidity=NOT_VALIDATED`.
- No acceso a base, producción o secretos; no llamadas IA, ni modificaciones al modelo, prompts o rúbricas. Calidad semántica Mentor/Review, proveedor/modelo y presupuesto siguen NO COMPROBADOS.
- Bloqueo que requiere al propietario: outputs Review íntegros por SHA con hallazgos/citas/inputDigest y un manifest/export QA autorizado. Sin ese corpus no se calcula ni se juzga puntuación.
