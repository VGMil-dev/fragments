# F23 — Informe de evidencia

Estado de esta revisión: **implementación, integración, release F14 y health/version públicas PASS; cuenta marcada docente y solicitud de recuperación aceptada por el envío Resend; inicio de sesión autenticado pendiente de que el propietario establezca contraseña**. Commit de implementación `4382f22bd18bb7642d3c54bc00394d9c92d94b84`; PR #81 integrada con merge `d0b9334463baf56f1644f305164cb87cf8599393`. CI del PR run `44972438641` pasó. Actualizaciones documentales integradas: PR #82 merge `6bc7ca7dc15a56cc40d9adab3febbe0ca8249e5d` (CI `44974016480`), PR #83 merge `a4822bf242fe55939631782b34690cf933fbc9cb` (CI `44974308892`) y PR #85 merge `ba1e1dfc88468bfb4196173ad11f07019f5f1538` (CI `44980150852`).

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

La release anotada `v0.5.9` apunta al merge `d0b9334463baf56f1644f305164cb87cf8599393`. En F14 run `44973255280`, `verify-build`, `attest-package` y `publish-approved-release` terminaron `success`. Se desactivó exclusivamente `Required reviewers`, según la decisión aprobada para despliegue automático; el entorno `fragments-production`, regla `v*.*.*`, controles CI, firmas, backups, healthchecks, rollback, Wait timer apagado y admin bypass apagado se conservaron. El propietario aprobó manualmente esta ejecución mientras el gate aún estaba activo; no se creó otra tag ni se relanzó el workflow. La próxima release legítima debe avanzar automáticamente al superar los gates técnicos.

La verificación pública de producción devolvió GET `/` 200 y GET `/health` 200 con `database=ready`. El bundle público `/assets/index-Dtep3H8e.js` contiene `v0.5.9` y `d0b9334`, confirmando versión y commit desplegados.

**Cuenta docente productiva — preparada.** Se usó el alias SSH documentado `servidor` y se validó `current_database() = fragments_prod`. La consulta inicial encontró una sola identidad del correo, `role=user`, `isTeacher=false`, con cuentas `credential` y `github`; no tenía matrículas, propuestas ni aulas asociadas. Conforme a la autorización explícita para esta cuenta exacta, se actualizó únicamente su indicador `isTeacher=true`, conservando `role=user`, credencial, proveedor GitHub y todos los demás registros. Lectura posterior confirmó `isTeacher=true` y ambos proveedores siguen conectados. No se ejecutaron seeds, migraciones ni cambios a otras cuentas. `AUTH_ENABLED=true`; RESEND_API_KEY y RESEND_FROM_EMAIL están configurados (solo presencia comprobada). Better Auth respondió HTTP 200 al request de reset y no registró el aviso de fallo; su callback solo completa sin error cuando Resend devuelve 2xx, así que el proveedor aceptó el envío. El listado de historial de Resend no está permitido para esta llave (GET devolvió 401), por lo que no se obtuvo ID/evento; no se afirma recepción en la bandeja. El correo no fue abierto ni se imprimió el token.

**Acceso docente al sitio:** `PUBLIC_APP_URL` corresponde al origen `https://fragments.gavanti.org`. La solicitud de reset fue aceptada por el flujo de Better Auth/Resend; `/teacher/reset-password` y `/teacher/dashboard` responden HTTP 200 y cargan la SPA. El componente lee el token desde el fragmento `#token`, acorde al enlace que Better Auth construye para `/teacher/reset-password`. No se usó el enlace de recuperación ni se realizó login en producción: queda pendiente que el propietario abra su correo y establezca su contraseña definitiva; luego podrá validar sesión y permisos efectivos en el dashboard.

F14 y F23 en Notion registran la regla de despliegue automático y los resultados del release. F23 registra el aprovisionamiento docente, la solicitud de recuperación y el pendiente de inicio de sesión.

No hay todavía vínculo verificable de proyectos/Review con aula en el panel y la actividad no tiene una consulta docente autorizada. No se presenta progreso ficticio.
