# F23 — Informe de evidencia

Estado de esta revisión: **validación local PASS; integración y producción pendientes**. Commit de implementación en `codex/f23-teacher-dashboard`: `4382f22bd18bb7642d3c54bc00394d9c92d94b84`.

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

Esta evidencia no acredita merge, tag ni despliegue. Faltan PR y CI, integración normal, release protegida por F14, chequeo y provisionamiento idempotente de la única identidad docente autorizada en `fragments_prod`, verificación de configuración/aceptación de Resend y solicitud segura de reset para que el propietario defina su contraseña. Un HTTP exitoso por sí solo no acredita recepción del correo. No se cambiarán roles ajenos ni se ejecutarán seeds o migraciones experimentales en producción.

No hay todavía vínculo verificable de proyectos/Review con aula en el panel y la actividad no tiene una consulta docente autorizada. No se presenta progreso ficticio.
