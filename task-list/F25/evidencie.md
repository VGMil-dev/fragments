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
