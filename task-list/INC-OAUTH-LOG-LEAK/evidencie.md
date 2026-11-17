# INC-OAUTH-LOG-LEAK — evidencia

## Base

- Worktree aislado desde `origin/main` en `e25bacf1d4a3c32ca31fd510bbcb5d0a8b90cdb6` (v0.4.8).
- Better Auth está fijado en `1.7.17`; `toNodeHandler` delega al adaptador Node de `better-call` y no registra solicitudes.
- Reproducción local de callback OAuth ficticio antes de la corrección: el logger por defecto de Better Auth escribió un `StateError` que contenía `details.state` a stderr. El fallo de regresión se observó sin publicar el valor fuera de la salida de prueba.
- Corrección candidata: `createSafeBetterAuthLogger`, conectado en `createFragmentsAuth`. Emite solo `event`, severidad y un código OAuth allowlist; no serializa mensaje, error, detalles, cabeceras ni causas.
- Prueba focal tras la corrección: `pnpm --filter @fragments/api exec vitest run src/auth/auth-diagnostics.test.ts src/auth/better-auth.test.ts -t 'fake OAuth callback parameters|safe Better Auth diagnostics' --reporter=dot` — 3 pruebas pasan.
- La integración cubre estado inválido, código no aceptado por proveedor simulado, excepción anidada ficticia y callback GitHub simulado exitoso; captura métodos de consola y comprueba sesión/rate limiting.
- Reproducción exacta: Better Auth registra `Failed to parse state` y pasa un `StateError` con `details.state` al logger. Su logger por defecto escribe el objeto completo por `console.error`/stderr. El adaptador `toNodeHandler` de Better Auth es pasarela; no es el emisor de esa línea.
- Destino y acceso: Compose usa `json-file` con rotación API 5×10 MiB y web 3×5 MiB. Archivos activos `root:root` modo `0640`; socket Docker `root:docker` modo `0660`. El único miembro estático del grupo Docker corresponde a un servicio de runner self-hosted de otro proyecto, con contraseña bloqueada, sin SSH keys/sudo y proceso asociado a `actions.runner.GAVANTI-STARTUP`; sus jobs pueden acceder al daemon y, por tanto, a logs. CI de Fragments usa runners GitHub-hosted. No se puede confirmar que el acceso del runner quede dentro del perímetro autorizado; es un riesgo de infraestructura pendiente de su propietario. No se imprimieron usernames ni contenido de logs.
- Barrido efímero en memoria de los logs Docker activos API/web: cero query keys OAuth (`state`, `code`, token/client credentials); un registro de `state` correspondió a la sonda sintética ya conocida; cero otras ocurrencias de `state`/`code`. No se imprimió ni guardó ningún valor. Solo había un archivo activo por contenedor, sin archivos rotados; esto no permite certificar logs de contenedores anteriores.
- Validación local final: `pnpm exec turbo run test typecheck lint build` — 10/10 tareas exitosas; API 133/133; contracts 19/19; la integración OAuth nueva pasa junto con el resto de la suite. `git diff --check` — limpio.
- Revisiones Goldfish independientes: R1 encontró dos aspectos P2 de cobertura de respuestas públicas; se ampliaron las pruebas a todos los marcadores en Location/cuerpo/logs. R2 security + OAuth: CLEAN. R3 security + OAuth consecutivas: CLEAN. Sin cambios de los revisores.
- No hay evidencia retenida de `code`, token o cookie de sesión reales; no se recomienda invalidar sesiones ni rotar credenciales por esta sonda. Los valores de `state` y `code` OAuth son de corta vida y no se guardaron. Se mantiene como límite que logs previos de v0.4.7 con formato Nginx antiguo pudieron incluir URI/Referer; su contenido histórico ya no está en el conjunto Docker activo revisado.
- Release: `v0.4.8` es el último release y `v0.4.9` aún no existe (ni tag ni release al consultar GitHub).
- No se modificaron producción, F16.5, pipeline, ledger de IA ni revisiones históricas.

## Pendiente

Pendiente de registrar SHA de commit y URL/estado del PR. No se ha hecho merge, release, tag ni despliegue.
