# Fragments — MVP 0.1.0

Fragments es una plataforma académica para acompañar trabajo de programación sin ejecutar código de estudiantes ni conectarse a Moodle. Este MVP integra tres flujos:

- **Mentor:** formular una propuesta, recibir una evaluación formativa y generar una entrega descargable cuando el estudiante lo decide.
- **Review:** revisar un repositorio público de GitHub a partir de un commit, con hallazgos y pistas progresivas.
- **Inspector:** espacio privado para docentes con retos basados en evidencia y seguimiento de defensas.

La aplicación se compone de una web React/Vite, una API Node/TypeScript y contratos compartidos. El API usa SQLite para estado y persistencia. Better Auth protege las funciones docentes; el registro público está deshabilitado. El proveedor IA local puede operar con fixtures fake; las llamadas reales requieren configuración explícita del servidor y están sujetas al límite presupuestario local.

## Requisitos

- Node.js 24.10 o posterior.
- pnpm 11.25 (`corepack prepare pnpm@11.25.0 --activate`).
- Docker Compose, solo si se prefiere ejecutar el API en contenedor.

## Inicio local

```powershell
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
Copy-Item .env.example .env
```

Completa solo la configuración necesaria para el entorno local siguiendo [`docs/ENV_SETUP.md`](docs/ENV_SETUP.md). `.env.example` contiene nombres de variables y valores locales no sensibles; nunca publiques `.env`. Las pruebas automatizadas usan proveedores fake y no necesitan llamar al AI Gateway.

Inicia API y web desde la raíz:

```powershell
pnpm dev
```

La web queda en `http://127.0.0.1:5173`, el API en `http://127.0.0.1:3000` y su comprobación de salud en `/health`.

Para ejecutar el API con Docker Compose:

```powershell
docker compose up --build
```

Compose usa el volumen `fragments-data` para conservar la base SQLite entre reinicios. No es un despliegue de producción.

## Docencia local

El registro público está cerrado. Para crear una cuenta docente únicamente en el entorno local, configura `TEACHER_TEST_EMAIL`, `TEACHER_TEST_PASSWORD` y las variables Better Auth descritas en [`docs/ENV_SETUP.md`](docs/ENV_SETUP.md), activa `AUTH_ENABLED=true` y ejecuta:

```powershell
pnpm --filter @fragments/api provision:teacher
```

El comando no imprime credenciales. No reutilices contraseñas personales.

## Verificación

```powershell
pnpm --filter @fragments/api test
pnpm --filter @fragments/contracts test
pnpm --filter @fragments/web exec vitest run src
pnpm typecheck
pnpm build
pnpm lint
```

La evaluación Promptfoo local con fixtures fake se ejecuta desde `evals/`:

```powershell
npx.cmd --yes promptfoo@0.125.1 eval --config promptfooconfig.yaml --no-cache --no-progress-bar --no-table
```

## Estado

El alcance funcional y las evidencias F00–F07 están en [`task-list/TASKS.md`](task-list/TASKS.md) y [`task-list/F07/evidencie.md`](task-list/F07/evidencie.md). La versión objetivo de este release es `v0.1.0-mvp`. Publicar el repositorio no despliega la aplicación ni valida un entorno de producción.

`MANIFEST.sha256.json` contiene el SHA-256 de cada archivo rastreado en el release, excepto el propio manifiesto.
