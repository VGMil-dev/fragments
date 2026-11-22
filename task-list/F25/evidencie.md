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

## Cierre Git

- Commit de auditoría del corpus semántico offline: `fd3ee9515b4541a38bc5088eac642bf9efb2c645` (`test(F25): audita corpus offline semantico`).
- Commit del harness offline y su evidencia: `5c5efa5cfc6aec87cc4045256f9160a86ab8313e` (`test(F25): etiqueta alcance de fixtures offline`).
- Commit de implementación y documentación: `ee51314b780c64cb4695f27318ad588220f9dad9` (`docs(F25): documenta baseline offline de Review`).
- Commit de consolidación de evidencia: `5d9ce133bcbc74c3133469ab7ee8f7f9ee9566aa` (`docs(F25): registra cierre local del baseline`).
- Rama local: `codex/f25-offline-calibration`; árbol limpio tras el commit.
