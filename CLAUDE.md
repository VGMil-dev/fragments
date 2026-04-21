# Fragments — Learning Platform

## Git Conventions

- No `Co-Authored-By` lines in commits.
- PR template: `.github/pull_request_template.md` — se carga automáticamente en GitHub al abrir una PR.

## What this is

Plataforma educativa de programación donde los estudiantes enseñan a **Lumen** (una mascota IA) a programar resolviendo retos de código. Incluye auth completa, dashboard con economía ACH, y un loop de aprendizaje con fases conceptuales + código evaluadas por IA.

**Vision spec:** `docs/superpowers/specs/2026-04-19-fragments-vision.md`
**Roadmap:** `docs/superpowers/specs/2026-04-19-fragments-roadmap.md`
**Auth spec:** `docs/superpowers/specs/2026-04-18-auth-design.md`

---

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js (App Router) | 16.x |
| Backend | NestJS | 11.x |
| Auth | Better Auth | 1.6.x |
| Database | PostgreSQL | 16 |
| Styling | TailwindCSS | 4.x |
| Icons | lucide-react | 1.x |
| Animation | framer-motion | 12.x |
| Code editor | Monaco Editor | latest |
| AI SDK | @google/genai | 0.14.x |
| Code runner | Piston API (emkc.org) | v2 |
| Testing | Playwright | 1.59.x |
| Container | Docker Compose | — |

---

## Key Architecture Decisions

### Better Auth lives in NestJS (not Next.js)
**Why:** Future mobile and desktop clients need a single auth server. If auth were in Next.js API routes, non-web clients would have to depend on a web framework. NestJS at `:3001` is the single auth server for any client.

### Next.js is a pure client
Next.js never touches the database. All auth calls go to `http://localhost:3001/api/auth/...` via Better Auth's browser client (`better-auth/client`).

### Session via httpOnly cookie
Better Auth stores sessions in PostgreSQL and sets an `httpOnly` cookie (`better-auth.session_token`). The middleware reads this cookie and validates the session by calling `GET /api/auth/get-session` on NestJS.

### Two API URL env vars in web
- `NEXT_PUBLIC_API_URL=http://localhost:3001` — used by the browser (client components, OAuth redirects)
- `API_INTERNAL_URL=http://api:3001` — used by server-side code (middleware, server components) when running inside Docker

Server-side code always uses: `process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL`

### AI con claves del estudiante
El estudiante provee sus propias keys de Google AI Studio y/o OpenRouter. Se almacenan cifradas en la DB con AES-256-GCM. La plataforma no paga por AI.
- Primario: `gemini-2.5-flash` via `@google/genai`
- Fallback: OpenRouter (`google/gemini-flash-1.5`)
- `ENCRYPTION_KEY` (64-char hex) en `.env` — obligatorio para arrancar el API

### userId en endpoints de la Learning Loop
Los endpoints `/api/v1/challenges`, `/api/v1/settings`, `/api/v1/economy` usan `(req as any).user?.id ?? 'anonymous'`. Better Auth no tiene middleware global en NestJS aún — todos los usuarios comparten el slot `'anonymous'`. Pendiente para Phase 2: middleware de sesión real.

---

## Ports

| Service | Port |
|---------|------|
| Next.js (web) | 3000 |
| NestJS (api) | 3001 |
| PostgreSQL (db) | 5432 |

---

## Required env vars

`.env` en la raíz del repo (Docker Compose lo carga automáticamente):

```env
# OAuth (GitHub + Google login)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Encriptación de API keys de estudiantes
ENCRYPTION_KEY=<64-char hex — genera con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# URLs (para desarrollo local sin Docker)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fragments
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Running Locally (without Docker)

```bash
# Terminal 1 — Database only via Docker
docker compose up db

# Terminal 2 — API
cd apps/api
npm run start:dev

# Terminal 3 — Web
cd apps/web
npm run dev
```

## Running Full Stack (Docker)

```bash
docker compose up
```

---

## Running Tests

Requires all services running first.

```bash
# Headed (browser visible)
cd e2e && npx playwright test --headed

# UI mode (visual debugger)
cd e2e && npx playwright test --ui

# Challenge flow (Phase 1)
cd e2e && npx playwright test tests/challenge-flow.spec.ts --headed

# Debug mode (step by step)
cd e2e && npx playwright test tests/login.spec.ts --debug
```

### Test seed user
`global-setup.ts` creates this user before each test run:
- **Email:** `test@example.com`
- **Password:** `Test1234!`
- **Name:** `Test User`

> El test `correct conceptual answer advances to code phase` requiere que el usuario `anonymous` tenga una Google AI key guardada en `user_api_keys`. Configurarla una vez via `/settings` en el browser es suficiente.

---

## Project Structure

```
fragments/
├── docker-compose.yml
├── .env
├── apps/
│   ├── web/                        # Next.js — pure UI client
│   │   └── src/
│   │       ├── app/
│   │       │   ├── globals.css             # Design tokens, .bento, .soft-stroke, keyframes
│   │       │   ├── login/page.tsx
│   │       │   ├── register/page.tsx
│   │       │   ├── dashboard/
│   │       │   │   ├── page.tsx            # Server component — sesión + economía ACH
│   │       │   │   └── dashboard-shell.tsx # 'use client' — layout, animaciones
│   │       │   ├── challenges/
│   │       │   │   ├── page.tsx            # Listado de retos
│   │       │   │   └── [id]/
│   │       │   │       ├── page.tsx
│   │       │   │       └── challenge-shell.tsx  # Flujo conceptual → código
│   │       │   └── settings/
│   │       │       ├── page.tsx
│   │       │       └── settings-shell.tsx  # Formulario de API keys
│   │       ├── components/
│   │       │   ├── challenges/             # ConceptualPhase, CodePhase, LumenHintTrigger
│   │       │   ├── dashboard/              # Lumen, Sidebar, CompanionCard, etc.
│   │       │   ├── settings/               # ApiKeysForm
│   │       │   ├── auth-orb.tsx
│   │       │   └── ambient-particles.tsx
│   │       ├── lib/
│   │       │   ├── auth-client.ts          # Better Auth browser client
│   │       │   ├── challenges-service.ts   # fetch wrappers para challenges API
│   │       │   ├── dashboard-service.ts    # getLumenEconomy() → API real
│   │       │   └── dashboard-types.ts
│   │       └── middleware.ts               # Protects /dashboard
│   │
│   └── api/                        # NestJS — auth + learning API
│       └── src/
│           ├── auth/               # Better Auth (Google, GitHub, email)
│           ├── database/
│           │   ├── database.module.ts      # Global pg Pool
│           │   ├── migrations/001-phase1.sql
│           │   └── seeds/001-challenges.sql
│           ├── ai-provider/        # GoogleGenAI + OpenRouter, AES-256-GCM encryption
│           ├── settings/           # CRUD de API keys cifradas
│           ├── challenges/         # CRUD + submission + Piston + PhaseEvaluator
│           ├── hints/              # Pre-defined hints + AI fallback
│           ├── economy/            # ACH balance + feedLumen
│           ├── app.module.ts
│           └── main.ts
│
└── e2e/                            # Playwright tests
    ├── playwright.config.ts
    ├── global-setup.ts             # Seeds test@example.com
    └── tests/
        ├── register.spec.ts
        ├── login.spec.ts
        ├── dashboard.spec.ts
        ├── dashboard-visual.spec.ts
        └── challenge-flow.spec.ts  # Phase 1 — 6 tests
```

---

## Auth Flows

### Email/Password Register
`POST /api/auth/sign-up/email` → creates user + session → sets cookie → redirect `/dashboard`

### Email/Password Login
`POST /api/auth/sign-in/email` → validates → creates session → sets cookie → redirect `/dashboard`

### OAuth (Google / GitHub)
`authClient.signIn.social({ provider, callbackURL: "/dashboard" })` → redirects to provider → callback to NestJS → session cookie → redirect `/dashboard`

### Logout
`authClient.signOut()` → `POST /api/auth/sign-out` → deletes session → clears cookie → redirect `/login`

### Route Protection
`middleware.ts` → `GET /api/auth/get-session` → no session → redirect `/login`

---

## Learning Loop (Phase 1)

### Challenge submission
`POST /api/v1/challenges/:challengeId/phases/:phaseId/submit`
- `kind === 'code'` → Piston API → compara stdout con expected → +25 ACH
- `kind === 'conceptual'` → Gemini 2.5 Flash evalúa con rubric → +10 ACH
- Deduplicación: `ON CONFLICT (user_id, reason) DO NOTHING` en `ach_transaction`

### Hints
`POST /api/v1/challenges/:challengeId/phases/:phaseId/hint`
- Busca hint pre-definido por `level` en `challenge_hint`
- Si no hay → genera con AI usando el rubric y la pregunta

### Lumen economy
- `GET /api/v1/economy/balance` → `{ balance, level }`
- `POST /api/v1/economy/feed` → descuenta 20 ACH, sube level +1

---

## TypeScript

Both projects run `"strict": true`. Named exports everywhere except Next.js page components (which must be default exports).

---

## Out of Scope (intentionally not built)

- Email verification / password reset
- Role-based access control
- Production deployment / HTTPS
- Middleware de sesión real en endpoints de la Learning Loop (Phase 2)
- Panel de Tweaks del dashboard (hue, mascot species, density, bounce, particles)
- Canvas de variantes de mascota (Crystal, Nebula, Jelly)
- Mobile / desktop clients (architecture supports them, not yet implemented)

---

## Docs & Reports

| File | Description |
|------|-------------|
| `docs/superpowers/specs/2026-04-19-fragments-vision.md` | Product vision — source of truth |
| `docs/superpowers/specs/2026-04-19-fragments-roadmap.md` | 5-phase product roadmap |
| `docs/superpowers/specs/2026-04-18-auth-design.md` | Auth design spec |
| `docs/superpowers/plans/2026-04-19-phase1-learning-loop.md` | Phase 1 implementation plan |
| `docs/superpowers/code-review-report.md` | Gemini CLI code review report |
