# Phase 2 — The Classroom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a complete teacher ecosystem including registration via golden ticket, a challenge editor with real-time preview, interactive materials using Lexical, and live analytics via WebSockets.

**Architecture:** Vertical modules in NestJS (`Teacher`, `Materials`, `Analytics`) and Route Groups in Next.js (`(teacher)`) to isolate administrative logic. Uses Socket.io for real-time data flow.

**Tech Stack:** NestJS, Next.js, PostgreSQL, Socket.io, Lexical Editor, Better Auth.

---

### Task 1: Database Schema & Seed
**Files:**
- Create: `apps/api/src/database/migrations/002-phase2.sql`

- [ ] **Step 1: Write migration SQL**
```sql
-- Role and teacher ownership
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student';
ALTER TABLE challenge ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE challenge ADD COLUMN IF NOT EXISTS teacher_id TEXT REFERENCES "user"(id);

-- Materials
CREATE TABLE IF NOT EXISTS course_material (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  TEXT NOT NULL REFERENCES "user"(id),
  title       TEXT NOT NULL,
  content_md  TEXT NOT NULL,
  version     INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS material_component (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID REFERENCES course_material(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  config      JSONB NOT NULL,
  position    INTEGER NOT NULL
);

-- Analytics
CREATE TABLE IF NOT EXISTS teacher_analytics (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL REFERENCES "user"(id),
  challenge_id UUID REFERENCES challenge(id),
  event_type   TEXT NOT NULL,
  phase_id     UUID,
  metadata     JSONB,
  created_at   TIMESTAMPTZ DEFAULT now()
);
```
- [ ] **Step 2: Run migration**
Run: `psql $DATABASE_URL -f apps/api/src/database/migrations/002-phase2.sql`
- [ ] **Step 3: Commit**
`git add apps/api/src/database/migrations/002-phase2.sql && git commit -m "db: add phase 2 schema"`

---

### Task 2: Teacher Registration & Role Guard
**Files:**
- Create: `apps/api/src/teacher/teacher.guard.ts`
- Modify: `apps/api/src/auth/auth.controller.ts`

- [ ] **Step 1: Implement TeacherGuard**
```typescript
import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class TeacherGuard implements CanActivate {
  constructor(private pool: Pool) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    if (!userId) return false;
    const { rows } = await this.pool.query('SELECT role FROM "user" WHERE id = $1', [userId]);
    if (rows[0]?.role !== 'teacher') throw new ForbiddenException('Teacher role required');
    return true;
  }
}
```
- [ ] **Step 2: Add teacher signup endpoint**
In `auth.controller.ts`, add `POST /teacher/signup` validating `TEACHER_GOLDEN_TICKET`.
- [ ] **Step 3: Test teacher signup**
Use curl to signup with valid/invalid ticket.
- [ ] **Step 4: Commit**
`git commit -m "feat: teacher registration and role guard"`

---

### Task 3: Challenge Editor Backend (CRUD)
**Files:**
- Modify: `apps/api/src/challenges/challenges.controller.ts`
- Modify: `apps/api/src/challenges/challenges.service.ts`

- [ ] **Step 1: Add Teacher CRUD endpoints**
Implement `PUT`, `DELETE`, and `PATCH /publish` in `ChallengesController` protected by `TeacherGuard`.
- [ ] **Step 2: Update findAll for students**
Ensure students only see `status = 'published'`.
- [ ] **Step 3: Commit**
`git commit -m "feat: challenge management endpoints for teachers"`

---

### Task 4: Challenge Editor UI & Live Preview
**Files:**
- Create: `apps/web/src/app/(teacher)/teacher/challenges/new/page.tsx`
- Modify: `apps/web/src/components/challenges/challenge-shell.tsx`

- [ ] **Step 1: Refactor ChallengeShell for Props**
Modify `ChallengeShell` to accept an optional `previewData` prop. If present, use it instead of fetching.
- [ ] **Step 2: Build Editor Page**
Create a split-pane layout: Left (Form), Right (`ChallengeShell` with live state).
- [ ] **Step 3: Commit**
`git commit -m "feat: challenge editor with live preview"`

---

### Task 5: Materials Editor (Lexical + Modals)
**Files:**
- Create: `apps/web/src/components/materials/editor/lexical-editor.tsx`
- Create: `apps/web/src/components/materials/editor/plugins/component-picker.tsx`

- [ ] **Step 1: Setup Lexical**
Install `@lexical/react`, `@lexical/markdown`. Implement basic editor with Markdown export.
- [ ] **Step 2: Add "::" Menu and Modals**
Implement a plugin that detects `::` and opens a modal to configure `Quiz` or `CodeSandbox`.
- [ ] **Step 3: Commit**
`git commit -m "feat: lexical material editor with interactive components"`

---

### Task 6: Real-time Analytics (WebSockets)
**Files:**
- Create: `apps/api/src/analytics/analytics.gateway.ts`
- Create: `apps/web/src/app/(teacher)/teacher/analytics/page.tsx`

- [ ] **Step 1: Create Socket.io Gateway**
Setup `@nestjs/websockets`. Implement `handleConnection` to join room `teacher:{id}`.
- [ ] **Step 2: Emit events on submission**
Update `SubmissionService` to emit events to the teacher's room via the Gateway.
- [ ] **Step 3: Build Analytics Dashboard**
Create a dashboard that listens to socket events and updates a live table of student progress.
- [ ] **Step 4: Commit**
`git commit -m "feat: real-time analytics with websockets"`
