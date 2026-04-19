# Fragments — Auth System

## Git Conventions

- No `Co-Authored-By` lines in commits.

## What this is

Full-stack authentication system (login + register) built as a foundation for future multi-client apps (web, mobile, desktop). Functional only — no UI polish.

**Spec:** `docs/superpowers/specs/2026-04-18-auth-design.md`

---

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js (App Router) | 16.x |
| Backend | NestJS | 11.x |
| Auth | Better Auth | 1.6.x |
| Database | PostgreSQL | 16 |
| Styling | TailwindCSS | 4.x |
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

---

## Ports

| Service | Port |
|---------|------|
| Next.js (web) | 3000 |
| NestJS (api) | 3001 |
| PostgreSQL (db) | 5432 |

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

> Requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` in a `.env` file at the repo root.

---

## Running Tests

Requires all services running first.

```bash
# Headed (browser visible)
cd e2e && npx playwright test --headed

# UI mode (visual debugger)
cd e2e && npx playwright test --ui

# Specific test file
cd e2e && npx playwright test tests/login.spec.ts --headed

# Debug mode (step by step)
cd e2e && npx playwright test tests/login.spec.ts --debug
```

### Test seed user
`global-setup.ts` creates this user before each test run:
- **Email:** `test@example.com`
- **Password:** `Test1234!`
- **Name:** `Test User`

---

## Project Structure

```
fragments/
├── docker-compose.yml
├── .env.example
├── apps/
│   ├── web/                        # Next.js — pure UI client
│   │   └── src/
│   │       ├── app/
│   │       │   ├── login/page.tsx
│   │       │   ├── register/page.tsx
│   │       │   └── dashboard/
│   │       │       ├── page.tsx        # Server component
│   │       │       └── logout-button.tsx  # Client component
│   │       ├── lib/auth-client.ts      # Better Auth browser client
│   │       └── middleware.ts           # Protects /dashboard
│   │
│   └── api/                        # NestJS — auth server
│       └── src/
│           ├── auth/
│           │   ├── better-auth.ts      # Auth instance (Google, GitHub, email)
│           │   ├── auth.controller.ts  # Wildcard → toNodeHandler(auth)
│           │   └── auth.module.ts
│           ├── app.module.ts
│           └── main.ts                 # CORS, cookieParser, port 3001
│
└── e2e/                            # Playwright tests
    ├── playwright.config.ts
    ├── global-setup.ts             # Seeds test@example.com
    └── tests/
        ├── register.spec.ts
        ├── login.spec.ts
        └── dashboard.spec.ts
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

## TypeScript

Both projects run `"strict": true`. Named exports everywhere except Next.js page components (which must be default exports).

---

## Out of Scope (intentionally not built)

- Email verification
- Password reset
- Role-based access control
- Production deployment / HTTPS
- UI design system
- Mobile / desktop clients (architecture supports them, not yet implemented)

---

## Docs & Reports

| File | Description |
|------|-------------|
| `docs/superpowers/specs/2026-04-18-auth-design.md` | Full design spec — source of truth |
| `docs/superpowers/code-review-report.md` | Gemini CLI code review report |
