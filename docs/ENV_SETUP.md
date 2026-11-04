# Puerta 0A — configuración ambiental

Codex genera `.env.example` y un `.env` local SIN sobrescribir claves existentes, registra `.env` en `.gitignore` y **se detiene** hasta que el docente lo complete y confirme explícitamente. No subir el archivo `.env` a GitHub ni compartir su contenido con los agentes de frontend o en sus evidencias. `VITE_*` es público.

| Variable | Necesidad | Dónde obtener o definirla | Uso |
|---|---|---|---|
| `AI_GATEWAY_API_KEY` | Requerida para IA real; optativa para fakes offline | Crear una clave desde la sección AI Gateway del panel de Vercel. Guardarla solo en `.env` local o en el gestor de secretos del servidor. | Autenticar solicitudes desde el backend. |
| `AI_GATEWAY_MODEL` | Requerida para IA real; optativa para fakes offline | Elegir un identificador de modelo que el AI Gateway tenga disponible, consultando su catálogo. Mantenerlo configurable hasta comparar calidad, latencia y coste. | Selección de modelo del lado servidor. |
| `GITHUB_TOKEN` | Optativa para repositorios públicos; requerida para operaciones autorizadas sobre repos privados | Crear un token de mínimo alcance en GitHub Settings → Developer settings → Personal access tokens. No conceder acceso a repos privados salvo que esa integración se autorice expresamente. | Aumentar cuota de API y, si se autoriza aparte, acceder a repos privados. |
| `SESSION_SECRET` | Solo producción/autenticación; requerida antes de habilitar sesiones | Generar localmente un valor aleatorio criptográfico de al menos 32 bytes; por ejemplo, con `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`. No reutilizar claves de otros sistemas. | Firma y protección de sesiones en el backend. |
| `DATABASE_URL` | Requerida | Definir una ruta SQLite local (`file:./data/fragments.db`) o la ruta del volumen persistente en Docker. No es una credencial. | Ubicación de la base de datos. |
| `PUBLIC_APP_URL` | Requerida en despliegue; localmente puede apuntar a `http://localhost:5173` | Usar la URL local durante desarrollo y la URL HTTPS pública asignada al desplegar. | Enlaces absolutos y configuración del origen público. |
| `API_PORT` | Requerida | Elegir un puerto TCP libre entre 1 y 65535; `3000` es el valor local documentado. | Puerto HTTP del backend. |

Para comprobar configuración local sin mostrar valores, consulta únicamente los nombres ausentes y el estado de formato. Nunca uses `Get-Content .env`, `cat .env`, `printenv` ni `env` en logs o evidencias. Una comprobación de presencia no prueba conectividad ni validez de una clave. No se prueba el Gateway ni GitHub hasta que el usuario pida una prueba opt-in con presupuesto controlado.

Añadir otras variables **solo si son necesarias**. No usar credenciales de Moodle, ni exponer `AI_GATEWAY_API_KEY`/`GITHUB_TOKEN`/`SESSION_SECRET` mediante `VITE_*` o respuestas HTTP. Guardar valores solo en `.env` local o secretos del entorno de producción. En Docker Compose enlazar variables como secretos de runtime, sin incrustarlos en imágenes. Solo mostrar nombres de variables ausentes y resultados redactados del preflight.

**Orden obligatorio**: inspeccionar y leer skills → crear plantilla, `.env` y gitignore → presentar checklist de variables → **PARAR** → usuario completa el archivo en su PC → confirma «configuración lista, continúa» → validar sin imprimir secretos → iniciar scaffold/6 workers. No requerir claves reales para documentar contratos; el planner NO debe usar esa excepción para despachar workers antes del permiso.

## Fuentes oficiales
- Vercel AI Gateway: [crear y administrar claves](https://vercel.com/docs/ai-gateway/authentication-and-byok) y [comenzar](https://vercel.com/docs/ai-gateway/getting-started).
- GitHub: [administrar tokens de acceso personal](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).
