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

## Cierre Git

- Commit de implementación y documentación: `ee51314b780c64cb4695f27318ad588220f9dad9` (`docs(F25): documenta baseline offline de Review`).
- Commit de consolidación de evidencia: `5d9ce133bcbc74c3133469ab7ee8f7f9ee9566aa` (`docs(F25): registra cierre local del baseline`).
- Rama local: `codex/f25-offline-calibration`; árbol limpio tras el commit.
