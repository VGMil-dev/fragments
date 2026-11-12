# Configuración local

Usa `.env.example` como plantilla y guarda los valores reales solo en `.env`, que Git ignora. No copies valores de `.env` a commits, capturas, logs o evidencias. Las variables `VITE_*` son públicas.

| Variable | Necesidad | Dónde obtener o definirla | Uso |
|---|---|---|---|
| `AI_GATEWAY_API_KEY` | Requerida para IA real; optativa para fakes offline | Crear una clave desde la sección AI Gateway del panel de Vercel. Guardarla solo en `.env` local o en el gestor de secretos del servidor. | Autenticar solicitudes desde el backend. |
| `AI_GATEWAY_MODEL` | Requerida para IA real; optativa para fakes offline | Elegir un identificador de modelo que el AI Gateway tenga disponible, consultando su catálogo. Mantenerlo configurable hasta comparar calidad, latencia y coste. | Selección de modelo del lado servidor. |
| `AI_GATEWAY_PROVIDER_ONLY` | Requerida para IA real con tarifas de presupuesto | Slug de proveedor fijado en la llamada. Debe coincidir con el proveedor del catálogo usado para declarar las tarifas. | Evita que una ruta alternativa invalide el cálculo de reserva. |
| `AI_GATEWAY_MAX_INPUT_USD_PER_MILLION` | Solo IA real; opcional para fakes | Tarifa verificada de entrada por millón de tokens del proveedor fijado. En la configuración local del 2026-11-04: Qwen 3.7 Flash vía Alibaba Cloud, USD 0.03/M. | Estimar y reservar el coste antes de una llamada. |
| `AI_GATEWAY_MAX_OUTPUT_USD_PER_MILLION` | Solo IA real; opcional para fakes | Tarifa verificada de salida por millón de tokens del proveedor fijado. En la configuración local del 2026-11-04: Qwen 3.7 Flash vía Alibaba Cloud, USD 0.13/M. | Estimar y reservar el coste antes de una llamada. |
| `GITHUB_TOKEN` | Optativa para repositorios públicos; requerida para operaciones autorizadas sobre repos privados | Crear un token de mínimo alcance en GitHub Settings → Developer settings → Personal access tokens. No conceder acceso a repos privados salvo que esa integración se autorice expresamente. | Aumentar cuota de API y, si se autoriza aparte, acceder a repos privados. |
| `GITHUB_CLIENT_ID` | Solo OAuth estudiantil, requerida junto con el secreto | Client ID de una GitHub OAuth App creada para Fragments. | Inicia el flujo GitHub de Better Auth. No es un token de API de repositorios. |
| `GITHUB_CLIENT_SECRET` | Solo OAuth estudiantil, requerida junto con el ID | Secreto de la misma GitHub OAuth App. Guardarlo solo en el backend runtime; no usar `VITE_*`. | Intercambio del código OAuth en el servidor Better Auth. |
| `BETTER_AUTH_SECRET` | Requerida antes de habilitar autenticación docente | Generar localmente al menos 32 bytes aleatorios. No reutilizar claves de otros sistemas. | Cifra y firma sesiones Better Auth en el backend. |
| `BETTER_AUTH_URL` | Solo autenticación local/producción | URL base del backend, por ejemplo `http://localhost:3000`. | Base URL de rutas `/api/auth/*`. |
| `TEACHER_TEST_EMAIL` | Solo provisioning local de pruebas | Correo de una cuenta docente local de prueba. | Identifica la cuenta que crea el comando `pnpm --filter @fragments/api provision:teacher`. |
| `TEACHER_TEST_PASSWORD` | Solo provisioning local de pruebas | Contraseña temporal de al menos 12 caracteres; no reutilizar una contraseña personal. El comando no la imprime. | Better Auth deriva y persiste su hash. |
| `DATABASE_URL` | Requerida | Definir una ruta SQLite local (`file:./data/fragments.sqlite`) o la ruta del volumen persistente en Docker. No es una credencial. | Ubicación de la base de datos. |
| `PUBLIC_APP_URL` | Requerida en despliegue; localmente puede apuntar a `http://localhost:5173` | Usar la URL local durante desarrollo y la URL HTTPS pública asignada al desplegar. | Enlaces absolutos y configuración del origen público. |
| `API_PORT` | Requerida | Elegir un puerto TCP libre entre 1 y 65535; `3000` es el valor local documentado. | Puerto HTTP del backend. |

Para comprobar configuración local sin mostrar valores, consulta únicamente los nombres ausentes y el estado de formato. Nunca uses `Get-Content .env`, `cat .env`, `printenv` ni `env` en logs o evidencias. Una comprobación de presencia no prueba conectividad ni validez de una clave. No se prueba el Gateway ni GitHub hasta que el usuario pida una prueba opt-in con presupuesto controlado.

Si falta la configuración completa del Gateway, Mentor usa una evaluación demostrativa `fake/local-heuristic-v1` con `limitations` explícitas. Con modelo, proveedor, tarifas y clave configurados, Mentor usa el Gateway y el ledger SQLite compartido. Los PDF y README se generan bajo demanda y no se persisten.

Las tarifas deben volver a verificarse antes de cambiar el modelo o proveedor. Para la configuración actual, el catálogo de [Qwen 3.7 Flash en Vercel AI Gateway](https://vercel.com/ai-gateway/models/qwen3.7-flash) indica USD 0.03/M de entrada y USD 0.13/M de salida para Alibaba Cloud. El código fija ese proveedor con `AI_GATEWAY_PROVIDER_ONLY=alibaba`; los máximos se aplican con la reserva SQLite acumulada de USD 1.

### Acceso docente local

Better Auth almacena usuarios y sesiones en SQLite. `BETTER_AUTH_SECRET` debe tener al menos 32 caracteres, y `BETTER_AUTH_URL` y `PUBLIC_APP_URL` definen los dos orígenes confiables. El registro público está deshabilitado en la aplicación. Para el bootstrap local de pruebas, configura `TEACHER_TEST_EMAIL` y `TEACHER_TEST_PASSWORD` (al menos 12 caracteres) en `.env` y ejecuta `pnpm --filter @fragments/api provision:teacher`; el comando es explícito, idempotente y no imprime credenciales. Habilita `AUTH_ENABLED=true` únicamente en el entorno local que tenga el secreto y la cuenta provisionada.

### OAuth estudiantil GitHub

`GITHUB_CLIENT_ID` y `GITHUB_CLIENT_SECRET` deben pertenecer a la misma OAuth App y estar presentes juntos. El ID no es secreto, pero ambas variables se mantienen en la configuración runtime del backend. Better Auth solicita únicamente `read:user` y `user:email`; no se solicita `repo`, `admin:repo_hook`, `workflow` ni repositorios privados. Cambiar el login de GitHub no cambia el ID de propiedad almacenado.

La configuración de producción documenta `https://fragments.gavanti.org` como hostname público. `deploy/production/nginx.conf` reenvía `/api/*` al API sin reescritura, y Better Auth usa su ruta base `/api/auth`; por ello la URL de callback para registrar en GitHub es `https://fragments.gavanti.org/api/auth/callback/github`. El proxy TLS y el hostname están descritos en `deploy/production/README.md`; OAuth real no se valida hasta que la OAuth App exista y las credenciales estén configuradas.

En producción, configura `BETTER_AUTH_URL=https://fragments.gavanti.org` y `PUBLIC_APP_URL=https://fragments.gavanti.org`. En desarrollo local, usa `BETTER_AUTH_URL=http://localhost:3000` y `PUBLIC_APP_URL=http://localhost:5173`; el callback local es `http://localhost:3000/api/auth/callback/github`. Better Auth confía solo en esos orígenes normalizados. La interfaz solo manda destinos de callback relativos y fijos.

### Límite local de IA

La aplicación conserva un ledger SQLite con coste estimado, coste reportado por Gateway y reservas activas. Una solicitud se rechaza si falta una tarifa máxima configurada, no puede reservarse el límite, hay un coste anterior desconocido o Gateway no devuelve un recibo de coste. Una reserva no resuelta después de un reinicio bloquea nuevas llamadas hasta revisión manual. Este mecanismo contiene concurrencia y errores de reporte; no sustituye una garantía del proveedor. Vercel describe sus presupuestos como límites blandos: una petición que cruza el límite puede completarse y el gasto puede superarlo; además, el gasto BYOK queda fuera de esos presupuestos. La aplicación persiste costes, no el desglose de tokens.

No exponer `AI_GATEWAY_API_KEY`, `GITHUB_TOKEN`, `BETTER_AUTH_SECRET` o contraseñas mediante `VITE_*` ni respuestas HTTP. En Docker Compose, las variables llegan al contenedor en runtime y no se incorporan a la imagen.

## Fuentes oficiales
- Vercel AI Gateway: [crear y administrar claves](https://vercel.com/docs/ai-gateway/authentication-and-byok) y [comenzar](https://vercel.com/docs/ai-gateway/getting-started).
- Better Auth: [SQLite](https://better-auth.com/docs/adapters/sqlite), [base de datos y validación](https://better-auth.com/docs/concepts/database) y [email/contraseña](https://better-auth.com/docs/authentication/email-password).
- GitHub: [administrar tokens de acceso personal](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).
