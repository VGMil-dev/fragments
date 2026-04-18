# Auth System Design — Login & Register

**Date:** 2026-04-18  
**Stack:** Next.js 15 · NestJS 10 · PostgreSQL 16 · Better Auth · TailwindCSS · Docker · Playwright

---

## Instructions for AI Agents (Claude, Gemini, Copilot)

This document is the single source of truth for implementing this system. Follow it exactly.

- Implement **one section at a time** in the order listed.
- Do **not** add features not described here (no email verification, no refresh tokens, no UI polish).
- Every file path mentioned is relative to the repo root `fragments/`.
- All commands assume `bash` on the host machine unless inside a Docker context.
- After completing each section, run the associated verification step before moving to the next.
- Use **TypeScript strict mode** in both `apps/web` and `apps/api`.
- Use **named exports** (no default exports) except for Next.js page components, which must be default exports.

---

## 1. Goal

Build a functional login and register system (no aesthetic polish required). Support email/password and OAuth via Google and GitHub. After login, redirect to a simple `/dashboard` showing the user's name. Playwright tests cover the critical UI flows for debugging.

The system must support future non-web clients (mobile, desktop) by centralizing auth in NestJS — Next.js is a client like any other.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────┐
│                Docker Compose                   │
│                                                 │
│  ┌──────────────┐      ┌──────────────────────┐ │
│  │  Next.js     │─────▶│  NestJS              │ │
│  │  :3000       │      │  :3001               │ │
│  │  (web client)│      │  Better Auth handler │ │
│  └──────────────┘      └──────────┬───────────┘ │
│                                   │             │
│                        ┌──────────▼──────────┐  │
│                        │  PostgreSQL :5432    │  │
│                        └─────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Services

| Service | Technology | Port | Role |
|---------|-----------|------|------|
| `web` | Next.js 15 (App Router) | 3000 | Web frontend — UI only, no auth logic |
| `api` | NestJS 10 | 3001 | Auth backend — Better Auth + future APIs |
| `db` | PostgreSQL 16 | 5432 | Persistent storage for users and sessions |

### Key decisions

- **Better Auth lives in NestJS** (`apps/api`). It handles all auth: email/password, OAuth, sessions. This makes NestJS the single auth server for any future client.
- **Next.js uses Better Auth's browser client** (`better-auth/client`) configured to point to `http://localhost:3001`. It never touches the database directly.
- **Sessions** are stored in PostgreSQL by Better Auth. An `httpOnly` cookie carries the session token between browser and NestJS.
- **Route protection** is handled by `apps/web/middleware.ts`. It calls `GET http://localhost:3001/api/auth/get-session` and redirects unauthenticated users to `/login`.

---

## 3. Folder Structure

```
fragments/
├── docker-compose.yml
├── .env.example                        # Root-level example env file
├── apps/
│   ├── web/                            # Next.js 15 app
│   │   ├── app/
│   │   │   ├── layout.tsx              # Root layout with TailwindCSS
│   │   │   ├── page.tsx                # Redirects to /login
│   │   │   ├── login/
│   │   │   │   └── page.tsx            # Login form + OAuth buttons
│   │   │   ├── register/
│   │   │   │   └── page.tsx            # Register form
│   │   │   └── dashboard/
│   │   │       └── page.tsx            # Protected: shows user name + logout
│   │   ├── lib/
│   │   │   └── auth-client.ts          # Better Auth browser client instance
│   │   ├── middleware.ts               # Protects /dashboard
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   └── api/                            # NestJS 10 app
│       ├── src/
│       │   ├── auth/
│       │   │   ├── auth.module.ts      # Auth module
│       │   │   ├── auth.controller.ts  # Wildcard route → Better Auth handler
│       │   │   └── better-auth.ts      # Better Auth server instance
│       │   ├── app.module.ts
│       │   └── main.ts                 # Bootstrap, CORS, cookie parser
│       ├── tsconfig.json
│       ├── package.json
│       └── Dockerfile
│
└── e2e/                                # Playwright tests (run on host)
    ├── playwright.config.ts
    ├── tests/
    │   ├── register.spec.ts
    │   ├── login.spec.ts
    │   └── dashboard.spec.ts
    └── package.json
```

---

## 4. Auth Flows

### 4.1 Email + Password — Register

```
1. User fills /register (name, email, password)
2. web calls: POST http://localhost:3001/api/auth/sign-up/email
   Body: { name, email, password }
3. Better Auth creates user in PostgreSQL (table: user)
4. Better Auth creates session in PostgreSQL (table: session)
5. Response sets httpOnly cookie: better-auth.session_token
6. web redirects to /dashboard
```

### 4.2 Email + Password — Login

```
1. User fills /login (email, password)
2. web calls: POST http://localhost:3001/api/auth/sign-in/email
   Body: { email, password }
3. Better Auth validates credentials
4. Better Auth creates session in PostgreSQL
5. Response sets httpOnly cookie: better-auth.session_token
6. web redirects to /dashboard
```

### 4.3 OAuth — Google / GitHub

```
1. User clicks "Login con Google" on /login
2. web calls: authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" })
3. Better Auth redirects browser to Google OAuth consent screen
4. Google redirects to: GET http://localhost:3001/api/auth/callback/google
5. Better Auth creates/updates user and session in PostgreSQL
6. Better Auth redirects browser to /dashboard (via callbackURL)
7. httpOnly cookie is set
```

Replace `google` with `github` for GitHub OAuth flow.

### 4.4 Logout

```
1. User clicks logout button on /dashboard
2. web calls: authClient.signOut()  →  POST http://localhost:3001/api/auth/sign-out
3. Better Auth deletes session from PostgreSQL
4. Cookie is cleared
5. web redirects to /login
```

### 4.5 Route Protection

```
Request to /dashboard
  → middleware.ts reads cookie better-auth.session_token
  → GET http://localhost:3001/api/auth/get-session (forwards cookie)
  → 200 with user data → allow request
  → 401 / null session → NextResponse.redirect(/login)
```

---

## 5. Pages

All pages use minimal TailwindCSS (flex, padding, gap, basic input/button classes). No design system, no component library.

### 5.1 `/login`

Elements:
- `<input type="email" name="email" placeholder="Email" />`
- `<input type="password" name="password" placeholder="Contraseña" />`
- `<button type="submit">Iniciar sesión</button>`
- `<button>Login con Google</button>`
- `<button>Login con GitHub</button>`
- Link to `/register`

Behavior:
- On submit: call `authClient.signIn.email({ email, password })`
- On success: `router.push("/dashboard")`
- On error: show inline error message below the form

### 5.2 `/register`

Elements:
- `<input type="text" name="name" placeholder="Nombre" />`
- `<input type="email" name="email" placeholder="Email" />`
- `<input type="password" name="password" placeholder="Contraseña" />`
- `<button type="submit">Registrarse</button>`
- Link to `/login`

Behavior:
- On submit: call `authClient.signUp.email({ name, email, password })`
- On success: `router.push("/dashboard")`
- On error: show inline error message below the form

### 5.3 `/dashboard`

Elements:
- `<p>Bienvenido, {session.user.name}</p>`
- `<button>Cerrar sesión</button>`

Behavior:
- Page is server component. Fetch session server-side via `GET /api/auth/get-session`.
- If no session: redirect to `/login` (middleware handles this before page renders).
- Logout button: client component that calls `authClient.signOut()` then `router.push("/login")`.

---

## 6. NestJS Implementation Details

### 6.1 `better-auth.ts` — Server instance

```typescript
import { betterAuth } from "better-auth";
import { Pool } from "pg";

export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
});
```

### 6.2 `auth.controller.ts` — Wildcard handler

```typescript
import { All, Controller, Req, Res } from "@nestjs/common";
import { auth } from "./better-auth";
import { Request, Response } from "express";
import { toNodeHandler } from "better-auth/node";

@Controller("api/auth")
export class AuthController {
  @All("*")
  async handler(@Req() req: Request, @Res() res: Response) {
    return toNodeHandler(auth)(req, res);
  }
}
```

### 6.3 `main.ts` — Bootstrap requirements

- Enable CORS: `origin: "http://localhost:3000"`, `credentials: true`
- Enable cookie parser: `app.use(cookieParser())`
- Global prefix: none (Better Auth routes must be at `/api/auth/...`)
- Body parser: must NOT disable it globally (Better Auth needs raw body for some endpoints)

---

## 7. Next.js Implementation Details

### 7.1 `lib/auth-client.ts`

```typescript
import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL, // http://localhost:3001
});
```

### 7.2 `middleware.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const sessionRes = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/auth/get-session`,
    { headers: { cookie: request.headers.get("cookie") ?? "" } }
  );
  const session = await sessionRes.json();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard"],
};
```

---

## 8. Playwright Tests (`e2e/`)

Playwright runs on the **host machine** (not inside Docker). It targets `http://localhost:3000`.

Install: `cd e2e && npm install`  
Run: `npx playwright test`  
UI mode (for debugging): `npx playwright test --ui`

### 8.1 `playwright.config.ts`

```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
  },
  webServer: undefined, // Services started via Docker Compose manually
});
```

### 8.2 Test: `register.spec.ts`

Covers:
- Navigate to `/register`
- Fill name, email, password
- Submit form
- Assert redirect to `/dashboard`
- Assert "Bienvenido" text is visible

### 8.3 Test: `login.spec.ts`

Covers:
- Navigate to `/login`
- Fill email, password of a pre-existing user
- Submit form
- Assert redirect to `/dashboard`
- Assert "Bienvenido" text is visible

Negative case:
- Fill wrong password
- Assert error message is visible
- Assert still on `/login`

### 8.4 Test: `dashboard.spec.ts`

Covers:
- Unauthenticated access to `/dashboard` → assert redirect to `/login`
- Authenticated access → assert "Bienvenido" text
- Click logout → assert redirect to `/login`
- After logout, access `/dashboard` again → assert redirect to `/login`

### 8.5 Test data strategy

Tests use a **fixed seed user** created via API before the test suite runs:

```typescript
// In a global setup file: e2e/global-setup.ts
await fetch("http://localhost:3001/api/auth/sign-up/email", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Test User",
    email: "test@example.com",
    password: "Test1234!",
  }),
});
```

Run `globalSetup` once per test run. Tests reuse this user. No DB teardown required for local dev.

---

## 9. Environment Variables

### `apps/api/.env`

```env
DATABASE_URL=postgresql://postgres:postgres@db:5432/fragments
BETTER_AUTH_SECRET=supersecret-change-in-production
BETTER_AUTH_URL=http://localhost:3001
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### `apps/web/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

> OAuth providers (Google, GitHub) require credentials from their developer consoles. For local dev, set the callback URL to `http://localhost:3001/api/auth/callback/google` (and `/github`).

---

## 10. Docker Compose

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: fragments
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  api:
    build: ./apps/api
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/fragments
      BETTER_AUTH_SECRET: supersecret-change-in-production
      BETTER_AUTH_URL: http://localhost:3001
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      GITHUB_CLIENT_ID: ${GITHUB_CLIENT_ID}
      GITHUB_CLIENT_SECRET: ${GITHUB_CLIENT_SECRET}
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/auth/ok"]
      interval: 5s
      timeout: 3s
      retries: 5

  web:
    build: ./apps/web
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001
    depends_on:
      api:
        condition: service_healthy

volumes:
  postgres_data:
```

---

## 11. Implementation Order

An AI agent must implement in this exact order and verify each step before proceeding:

1. **Docker Compose + PostgreSQL** — `docker compose up db` works, can connect with psql.
2. **NestJS scaffold** — `apps/api` boots on :3001 with `npm run start:dev`.
3. **Better Auth in NestJS** — `GET http://localhost:3001/api/auth/ok` returns `{ ok: true }`.
4. **Next.js scaffold** — `apps/web` boots on :3000.
5. **Register page** — form submits and creates user in DB.
6. **Login page** — form submits and sets session cookie.
7. **Dashboard page** — shows user name when authenticated, redirects when not.
8. **OAuth (Google + GitHub)** — redirect flow works end-to-end.
9. **Dockerfiles** — both services build and run inside Docker Compose.
10. **Playwright setup** — `e2e/` folder, config, global setup.
11. **Playwright tests** — register, login, dashboard specs pass.

---

## 12. Out of Scope

- Email verification
- Password reset / forgot password
- Role-based access control
- Production deployment / HTTPS
- UI polish or design system
- Mobile or desktop clients (architecture supports them, but not implemented here)
