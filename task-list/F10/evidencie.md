# F10 / F10.1 — Evidencia de Trainer

Estado: COMPLETADAS. Owner: PLANNER. Rama: `codex/v0.3.0-trainer`, base `origin/main` (`8fcd6c14b218658e5ad281caab8e70f8f28ceca6`). F10.1 continúa la misma rama y carpeta privada `task-list/F10/evidence/`.

## Commits

- `5acc0b206b5c1fe29ed35b987837aa411e340f79` — implementación base F10; contiene la regla `.gitignore` `/task-list/F10/evidence/`.
- `66a643d700462696b0a4fa5a51da2093208216f2` — persistencia SQLite F10.
- `1539821` — cierre local y paquete de evidencia F10.
- `8ae8b55` — registro de configuración IA local.
- `4133219a2cbd37ac0c40a0ef041fc3e3d36f4e29` — implementación F10.1: banco variado, lease concurrente SQLite y señal UI de cantidad/repaso.
- `3cda9a4` — test de repaso para un único reto compatible.

## Cambios F10.1

- Review validado aporta hasta cinco hallazgos distintos con referencias de snapshot/digest exactas; el banco se genera una vez, filtra texto duplicado y amplía bancos F10 previos sin borrar intentos.
- Migraciones v7/v8 guardan completitud del banco, dueño y lease transaccional de generación. Solicitudes concurrentes en instancias separadas comparten banco.
- API/UI incluyen tamaño del banco y mensaje de una sola funcionalidad compatible; la categoría `review` sigue disponible.
- Sin cambio a contracts; Inspector sigue separado; no se ejecuta código remoto.

## Verificación fresca — 2026-11-09

- `$env:CI='true'; pnpm exec turbo test --force` — exit 0, caché 0; contracts 18/18, API 87/87, web 52/52; total 157.
- Pruebas API enfocadas — exit 0, 4 archivos/9 tests (service, HTTP, repository, migraciones/open).
- `$env:CI='true'; pnpm exec turbo typecheck --force` — exit 0, 4 tareas.
- `$env:CI='true'; pnpm exec turbo build --force` — exit 0, 3 paquetes.
- `$env:CI='true'; pnpm exec turbo lint --force` — exit 0, lint configurado de contracts.
- `git diff --check` — exit 0.
- Ego Lite v2.2.0 con UI real local, fixture local rotulada y provider fake: tres funcionalidades, pistas 1–3, progreso restaurado tras recarga, historial y repaso. Móvil 390×844: `innerWidth=390`, `scrollWidth=390`.

## Prueba live autorizada y gasto

Fixture pública `VGMil-dev/fragments-test-app`; SHA completo `e24fce1c998aec9b52d86d1d4a1a49d727936c5f`, comprobado contra `HEAD` y `refs/heads/main`. Review completó sobre ese SHA y devolvió tres hallazgos verificados. Trainer generó dos retos desde rutas distintas, descartó un candidato duplicado y sorteó uno completado como repaso.

Proveedor `alibaba`, modelo `alibaba/qwen3.7-flash`: 4 llamadas asentadas en la corrida satisfactoria, coste registrado USD 0.000294. Una corrida anterior facturó un Review real antes de fallar en la rehidratación GitHub sin token; el ledger temporal se limpió antes de conservar el recibo exacto. La reserva máxima calculada fue USD 0.00172. La corrida siguiente aplicó ledger aislado de USD 0.04828; cota acumulada ≤ USD 0.05. El dato no se presenta como coste exacto total. Tarifas verificadas y resultados ampliados están en `task-list/F10/evidence/03-pruebas.md`, `04-recorrido.md` y `18-tests.txt`.

## Seguridad y evidencias privadas

- Token GitHub local usado solo en memoria para GET del repositorio público; no se imprimió ni se incluyó en evidencia. AI Gateway usó credencial local ya configurada; ningún secreto salió a reportes ni frontend.
- `git check-ignore -v` confirma F10/evidence ignorado; `git ls-files task-list/F10/evidence` no lista archivos; no se usó `git add -f`.
- Carpeta local exacta `D:\Dev\Trabajo\Fragments\task-list\F10\evidence\`: 20 archivos, 9 capturas PNG reales abiertas, sin subcarpetas ni ZIP. La captura de Inspector con autofill se eliminó por privacidad y se sustituyó por `16-inspector.md`.
- Escaneo de informes: cero patrones de claves/credenciales y cero correos. No hay `.env`, cookies, contraseñas, base de datos o datos privados de estudiantes.
- No hubo push, deploy ni modificación del repo remoto. `Fragments_Mentor_Plantilla_Propuesta.docx` sigue como archivo local no relacionado y no se añadió al commit.
