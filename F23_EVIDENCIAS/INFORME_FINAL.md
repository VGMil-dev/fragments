# F23 — Informe de evidencia

Estado de esta revisión: **implementación, integración y QA local PASS; release F14 en espera de aprobación manual; despliegue y cuenta docente productiva pendientes**. Commit de implementación `4382f22bd18bb7642d3c54bc00394d9c92d94b84`; PR #81 integrada con merge `d0b9334463baf56f1644f305164cb87cf8599393`. CI del PR run `44972438641` pasó.

## Referencia visual

La referencia aprobada de 1671 × 941 px está en `referencia-aprobada.png`; SHA-256 verificado: `95853ad8066e204408b223cf38db8ab43c146cddc8bd25c61520c72fa5b43584`.

## Capturas

| Archivo | Comprobación |
| --- | --- |
| `dashboard-1671.png` | Vista autenticada de escritorio frente a la referencia |
| `dashboard-1440.png` | Escritorio ancho |
| `dashboard-1024.png` | Tablet horizontal |
| `dashboard-768.png` | Reflow KPI apilados en el espacio útil de contenido |
| `dashboard-390.png` | Móvil |
| `dashboard-320.png` | Móvil estrecho |
| `dashboard-320-menu.png` | Navegación móvil abierta con teclado |
| `dashboard-anonimo.png` | Entrada única para sesión docente no autenticada |
| `acceso-estudiante-denegado.png` | Cuenta de estudiante bloqueada en ruta docente |
| `estudiante-dashboard.png` | Portal estudiantil sigue disponible con la sesión separada |
| `review-placeholder.png` | Review docente explica que el vínculo autorizado no está disponible |

El revisor independiente B emitió **PASS** después de que la primera revisión detectara demasiado estrechos los KPI a 768 px. Se ajustó el reflow según el ancho útil y se recapturaron los seis viewports. En los seis tamaños medidos, `scrollWidth` fue igual al ancho del viewport. Perfil docente y estudiante usaron task spaces nuevos en perfiles Ego Lite distintos; el menú abrió con Enter y cerrar sesión volvió al login.

## Datos y seguridad

La API se probó contra PostgreSQL 18.6 efímero en `127.0.0.1:55443`, sin volumen persistente. El guard previo confirmó `current_database() = fragments_test`; los fixtures estaban etiquetados y no se usaron cuentas ni datos de producción. Ningún secreto o contraseña aparece en capturas o evidencia.

La página docente mostró los valores sintéticos reales de `fragments_test`. El total incluye historial; el pendiente corresponde a una solicitud de unión. Proyectos en seguimiento aparece como `—` por falta de relación verificable aula↔proyecto; actividad indica que aún no existe consulta autorizada a eventos persistidos. Review no muestra revisiones de estudiantes.

## Verificación local

- API: `prisma generate`, `prisma migrate deploy` y suite PostgreSQL — PASS; 34 archivos / 150 pruebas.
- Suite general: `pnpm test` — PASS: contracts 28/28, web 137/137 y API 84/84 no dependientes de DB. Otras 66 pruebas de API que requieren DB se omitieron en este comando y quedaron cubiertas por la ejecución anterior con `fragments_test`.
- `pnpm typecheck`, `pnpm lint`, `pnpm build` y `git diff --check` — PASS.
- Build: chunk principal minificado 538.62 kB; Rolldown informa que las directivas `use client` de Lucide no se preservan como directivas de módulo. No bloqueó el build.

## Límites y siguientes pasos autorizados

La release anotada `v0.5.9` apunta al merge `d0b9334463baf56f1644f305164cb87cf8599393`. En F14 run `44973255280`, `verify-build` y `attest-package` terminaron `success`; `publish-approved-release` permanece `waiting` por revisión manual del entorno protegido `fragments-production`. Por ello, no se acredita todavía publicación ni despliegue. El control Required reviewers quedó habilitado y admin bypass deshabilitado antes de crear el tag.

No se consultó ni modificó `fragments_prod`: el acceso SSH preparado según `docs/SSH_WORKSTATIONS.md` fue bloqueado por la política del comando antes de resolver el host; no se intentó una ruta alternativa. Sigue pendiente comprobar/provisionar idempotentemente solo `vgmiltonisaac@gmail.com`, validar configuración y aceptación de Resend, solicitar el reset y comprobar el enlace sin afirmar recepción. Un HTTP exitoso no acredita entrega. No se cambiarán roles ajenos ni se ejecutarán seeds o migraciones experimentales en producción.

La ficha F23 en Notion se actualizó el 2026-11-22 a `En validación`, enlazando PR, CI y release, y dejando deployment y cuenta pendientes.

No hay todavía vínculo verificable de proyectos/Review con aula en el panel y la actividad no tiene una consulta docente autorizada. No se presenta progreso ficticio.
