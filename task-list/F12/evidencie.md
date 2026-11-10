# F12 — Evidencia de integración

Estado: COMPLETADA en rama local `codex/v0.3.0-integration`. No publicar, desplegar ni crear tag.

## Git y migraciones

- Trainer confirmado en `05ba030`; Mentor en `81b185d` (F11 `15491a9`); merge ordinario y no destructivo.
- Commit de integración: `d2eba8a1b5372c747f7e26d5b446b87b3b375062`. HEAD verificado antes de este cierre documental: `6235d9bcedf8e08acef8aa5b70d831899de062d3`.
- Migraciones v1–v9 se mantienen sin cambios: v7/v8 Trainer, v9 Mentor. Las pruebas de esquema y conservación ejecutadas anteriormente constan en el commit de integración; no se repitieron.

## Recorrido integrado de Ego Lite

- Ego Lite 2.2.0, API temporal local, Better Auth real, SQLite temporal aislada. Cuenta de prueba y secret generados solo en ejecución; el archivo temporal se eliminó al terminar.
- Mentor docente: login, edición, borrador, publicación v2; el estudiante vio la consigna; evaluación fake local dio 100/100 y mostró versión 2.
- Review: fixture de commit, resultado 90/100 con evidencias de dos rutas; pantalla completa y versión móvil.
- Trainer: dos retos distintos (`src/search.ts` y `src/validation.ts`), una pista consultada, progreso persistido, historial y repaso. En móvil se volvió a recorrer el reto y el repaso.
- Inspector: sin sesión respondió `401 AUTH_REQUIRED`; con Better Auth docente creó, asignó y registró defensa. Captura final muestra ayuda sintética solo en área docente.
- Móvil 390 px: Trainer, Mentor y Review registraron `innerWidth=390` y `scrollWidth=390`.
- Proveedores usados: fake etiquetados. AI Gateway live: 0 llamadas, coste USD 0. No fue necesaria una evaluación facturable. Modelo configurado visto como metadato de desarrollo: `alibaba/qwen3.7-flash`; nunca se reveló una clave.

## Pruebas dirigidas frescas (2026-11-09)

- Better Auth, Mentor control, Trainer HTTP/service, Inspector service/review adapter y Review worker HTTP: 7 archivos, 23 tests, exit 0.
- Trainer screen, Review screen y validación Review web: 3 archivos, 7 tests, exit 0.
- Suite completa anterior: 161/161, typecheck, build y lint aprobados en `d2eba8a`; esta continuación no modificó código ni migraciones.

## Paquete privado

- [Manifiesto](evidence/manifest.md) y [comandos/resultados](evidence/commands-results.md).
- `task-list/F12/evidence/`: 14 archivos de 20; 8 capturas Ego Lite, 4 scripts de fixture/recorrido y 2 documentos.
- `git check-ignore -v task-list/F12/evidence/manifest.md` confirma `.gitignore`; `git ls-files task-list/F12/evidence` no lista archivos.
- Sin `.env`, base de datos, credenciales, cookies o archivos de producción en la evidencia. Los servicios temporales quedaron detenidos.

## Límites

- Review/Mentor/Trainer e Inspector usan fixtures sintéticos; no se llamó a repositorios, AI Gateway, Moodle o producción.
- No se modificaron F10, F11 ni migraciones. `main`, VPS y tag v0.3.0 permanecen intactos.
