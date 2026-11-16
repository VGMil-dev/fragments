# Evidencia — INC-REVIEW-2026-11-16

## Estado

COMPLETED LOCAL. No se desplegó ni se modificaron los seis trabajos originales.

## Línea base

- Checkout original limpio: rama `main`, HEAD `60e31bfb4781693b2310b7cd22cfc45e9aa1cdd2` (igual a `origin/main`).
- Worktree aislado: `C:\Users\vgmil\.codex\worktrees\review-incident-2026-11-16\fragments`, rama `codex/review-incident-2026-11-16`, iniciado desde el HEAD anterior.
- Producción: API/web `v0.4.7`, revisión `86313395ca2cc0470c5e84c9c4df9848b4a108d2`, API healthy. La revisión no existe en el clone local; no se hizo fetch externo.
- Seis filas Review fallidas entre 2026-11-16 17:35:19 y 17:37:46 UTC (12:35–12:37 Bogotá), todas con un intento. No hay evidencia suficiente para atribuir causa a GitHub, Repomix o IA.
- Se observaron ocho POSTs `/api/reviews` en Nginx para seis filas idempotentes; solo un GET de estado. Todos los POST recibieron 202. No se copiaron IPs, referencias, agentes de usuario ni rutas con IDs al informe.
- Los logs API solo muestran arranque/Better Auth; worker y sondeo descartaban errores. El ledger no tiene reservas Review del incidente, indicio pre-IA pero no prueba.

## Evidencia preservada en el servidor

- SQLite: `/var/backups/fragments/fragments-incident-review-2026-11-16.sqlite`, 4,968,448 bytes, `PRAGMA integrity_check=ok`, SHA-256 `6d85f4874c478630ce4900ba414619dc73992baa12df495484508cedcbeffeca`, propietario `root:root`, modo `0600`.
- Metadatos privados de los seis trabajos: `/var/backups/fragments/review-incident-2026-11-16-jobs.json`, modo `0600`, SHA-256 `ea501c52f37b0e065152fb697eb69ca49e0c68fe4aa8be70979c17908ce07160`. Contiene IDs, estados, intentos y marcas UTC; no se incluirán IDs en Git.
- Logs Docker: API `json-file`, 5 × 10 MB; web `json-file`, 3 × 5 MB. Archivos actuales comprobados `root:root`, modo `0640`. Backup directory `root:root`, modo `0700`.

## Cambios, comandos, revisiones y commit

### Diagnóstico confirmado y límites

- Las seis filas tienen estado `failed` y un intento cada una; se preservaron sus IDs, estados, intentos y timestamps en el JSON protegido descrito arriba. El JSON no se copió al repositorio.
- Se observaron ocho solicitudes de encolado con respuesta 202 para seis trabajos idempotentes y una consulta de estado. La API no tenía diagnósticos de etapa porque el worker y el sondeo descartaban excepciones.
- En el código desplegado, `ON CONFLICT(idempotency_key) DO NOTHING` podía devolver una fila ya fallida y el worker solo reclamaba `pending`; por eso una nueva solicitud no recuperaba un trabajo `failed`. La ruta HTTP anterior también presentaba el estado como encolado.
- El ledger no muestra reservas Review del incidente. Esto apunta a una posible falla previa al despacho facturable, pero no identifica en qué paso falló cada trabajo ni prueba la causa inicial. Los seis quedan clasificados `LEGACY_UNCLASSIFIED/manual` hasta reconciliación individual.
- No se atribuyó el incidente a GitHub, Repomix o IA y no se reejecutó ningún trabajo original.

### Protección de evidencia y logs

- Backup SQLite verificado con `PRAGMA integrity_check=ok`, hash SHA-256 y permisos `0600`; metadatos de seis filas conservados aparte bajo `root:root`, `0600`, dentro de `/var/backups/fragments` (`0700`).
- La API conserva logs Docker con rotación 5 × 10 MB; web 3 × 5 MB. Los archivos activos comprobados son `root:root`, modo `0640`. No se borraron logs históricos ni se alteró producción; los logs anteriores a la corrección quedan restringidos por permisos y expiran mediante rotación configurada.
- La configuración candidata Nginx deja logs de acceso JSON solo con hora, método, estado y duración; no emite request/URI/query, Referer, IP ni agente de usuario. `Referrer-Policy: no-referrer` se aplica también en `/`, donde otra cabecera reemplaza herencia. Better Auth consume solo `X-Real-IP`, que el proxy sobrescribe desde `CF-Connecting-IP`; siguen activos los rate limits.
- `nginx -t` exitoso con la imagen Nginx actualmente desplegada, dentro de un contenedor efímero aislado (`--network none`); no se editó ni reinició ningún contenedor productivo.

### Cambios locales

- Migración 11 registra etapa, código y clasificación y crea historial durable de intentos; los trabajos fallidos preexistentes se migran como manuales sin inferir causa. Como su hora de inicio y duración no están disponibles, el historial deja esos dos campos nulos y conserva solo el cierre conocido.
- Worker, cola y adaptadores guardan eventos JSON con campos allowlist (`reviewId`, `jobId`, etapa, código, duración, intento y estado); mensajes/excepciones y contenido del repositorio nunca se serializan.
- Reintento explícito mediante el mismo ID y clave de idempotencia, autorizado contra el contexto estudiantil original, compare-and-transition dentro de `BEGIN IMMEDIATE`, solo para fallos transitorios, con backoff y máximo de tres intentos. Resultados completos se reutilizan; estado ambiguo después de IA queda manual. Reservas facturables sin recibo pasan a `uncertain` y bloquean nuevos despachos.
- Nginx y Better Auth tienen sus límites de logs/IP actualizados. UI estudiantil comunica reintento seguro cuando aplica; los errores públicos siguen siendo genéricos.
- No se modificó F16.5 ni se desplegó.

### Verificación y revisiones

- API: suite completa, 130 pruebas en 29 archivos; web: suite completa, 86 pruebas en 20 archivos.
- Typecheck API y web: exitosos. Builds API y web: exitosos. Vite conserva advertencia de bundle mayor a 500 kB, sin fallo.
- `node --test deploy/production/nginx.conf.test.mjs`: 3/3 exitosas.
- `nginx -t`: exitoso con la imagen desplegada, ejecutada efímeramente y sin red.
- Revisiones independientes: fiabilidad, seguridad OAuth/Nginx e idempotencia/persistencia. Rondas 5 y 6: las tres áreas CLEAN en ambas rondas consecutivas.
- Rama local: `codex/review-incident-2026-11-16`; worktree aislado indicado arriba. Sin push, PR, deploy ni reejecución productiva.
- Commit local de implementación: `ca77ac1` (`fix(review): recupera trabajos fallidos y protege logs`).
- Estado final: readiness local PASS para revisión/PR; despliegue NO autorizado y no realizado. No hubo push ni PR.

### Plan de recuperación estudiantil

Después de desplegar una versión autorizada, reconciliar cada uno de los seis trabajos de forma individual con su ID protegido, etapa/estado y ledger; pedir al estudiante confirmar repositorio y commit. Reprocesar solo tras clasificar como transitorio y confirmar que no hubo despacho IA/cargo, una revisión por vez. Para los casos ambiguos, un docente deberá decidir tras reconciliar el ledger. No ejecutar un reintento masivo.
