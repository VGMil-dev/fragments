# Phase 2 — The Classroom: Design Spec

**Fecha:** 2026-04-21
**Estado:** Aprobado — listo para implementación
**Rama:** `feat/phase-2-the-classroom`
**Visión:** `docs/superpowers/specs/2026-04-19-fragments-vision.md`
**Roadmap:** `docs/superpowers/specs/2026-04-19-fragments-roadmap.md`

---

## Narrativa

El docente diseña el camino. Los estudiantes lo recorren juntos, y el docente puede ver quién necesita ayuda antes de que sea demasiado tarde.

---

## Alcance de Phase 2

| Feature | Estado |
|---------|--------|
| Registro de docente con golden ticket | ✅ En scope |
| Guard de rol `teacher` en NestJS | ✅ En scope |
| Editor de retos con preview en vivo | ✅ En scope |
| Material didáctico con Lexical + menú estilo Notion | ✅ En scope |
| Componentes `::quiz` y `::code-sandbox` funcionales | ✅ En scope |
| Componentes `::diagrama-flujo` y `::fragmento` (placeholder) | ✅ En scope |
| Analytics del docente en tiempo real via WebSocket | ✅ En scope |
| Middleware de sesión real en Learning Loop | ❌ Fuera de scope (Phase 3) |
| Sistema de grupos / clases formales | ❌ Fuera de scope (Phase 3) |

---

## Arquitectura

### Enfoque: módulos nuevos por feature (Opción A)

Tres módulos NestJS nuevos e independientes que no modifican los módulos de Phase 1. El módulo `challenges` existente se extiende solo con nuevos endpoints protegidos por `TeacherGuard`.

### Módulos NestJS nuevos

| Módulo | Responsabilidad |
|--------|----------------|
| `teacher` | Guard de rol, registro con golden ticket |
| `materials` | CRUD de materiales, parsing de componentes Lexical |
| `analytics` | Queries de progreso + WebSocket Gateway |

### Route group Next.js

```
app/
  (student)/
    dashboard/
    challenges/
    settings/
  (teacher)/
    teacher/
      challenges/          ← listado de retos del docente
        new/               ← editor + preview
        [id]/edit/
      materials/
        new/
        [id]/edit/
      analytics/
```

El layout `(teacher)/layout.tsx` verifica `role === 'teacher'` server-side y redirige a `/dashboard` si no aplica.

---

## Base de Datos

### Migración: `002-phase2.sql`

```sql
-- Rol de usuario
ALTER TABLE "user" ADD COLUMN role TEXT NOT NULL DEFAULT 'student';

-- Materiales didácticos
CREATE TABLE course_material (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  TEXT NOT NULL REFERENCES "user"(id),
  title       TEXT NOT NULL,
  content_md  TEXT NOT NULL,
  version     INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Versiones de materiales (snapshots para no perder historial)
CREATE TABLE material_version (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID REFERENCES course_material(id) ON DELETE CASCADE,
  content_md  TEXT NOT NULL,
  version     INTEGER NOT NULL,
  saved_at    TIMESTAMPTZ DEFAULT now()
);

-- Componentes parseados del material
CREATE TABLE material_component (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID REFERENCES course_material(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,   -- 'quiz' | 'code-sandbox' | 'diagram' | 'fragment'
  config      JSONB NOT NULL,  -- preguntas, código inicial, etc.
  position    INTEGER NOT NULL
);

-- Eventos de analytics del docente
CREATE TABLE teacher_analytics (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL REFERENCES "user"(id),
  challenge_id UUID REFERENCES challenge(id),
  event_type   TEXT NOT NULL,  -- 'submission' | 'hint' | 'phase_complete' | 'challenge_complete'
  phase_id     UUID,
  metadata     JSONB,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Estado de publicación de retos (extiende tabla existente)
ALTER TABLE challenge ADD COLUMN status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE challenge ADD COLUMN teacher_id TEXT REFERENCES "user"(id);
```

---

## Feature 1: Registro de Docente con Golden Ticket

### Flujo

1. El docente va a `/register/teacher` (link discreto desde `/register`)
2. Llena nombre, email, password + campo "Código de acceso"
3. El API valida el código contra `TEACHER_GOLDEN_TICKET` en `.env`
4. Si válido: crea usuario vía Better Auth y hace `UPDATE "user" SET role = 'teacher'`
5. Sesión normal — redirige a `/teacher/challenges`

### Endpoints

```
POST /api/auth/sign-up/teacher
  body: { name, email, password, ticket }
  → 201 { session } | 403 { error: 'invalid_ticket' }
```

### Guard

`TeacherGuard` — decorator `@UseGuards(TeacherGuard)` en todos los endpoints exclusivos de docente:

```typescript
// Extrae userId de la sesión → query role en DB → si no es 'teacher' → throw ForbiddenException
```

### Variable de entorno nueva

```env
TEACHER_GOLDEN_TICKET=<string secreta — el admin la comparte manualmente>
```

---

## Feature 2: Editor de Retos con Preview en Vivo

### Layout

Pantalla dividida en dos paneles (50/50, colapsables):

```
┌─────────────────────┬─────────────────────┐
│   FORM (izquierda)  │  PREVIEW (derecha)  │
│                     │                     │
│ Título              │  [Vista del         │
│ Descripción         │   estudiante]       │
│ Dificultad (1-5)    │                     │
│ Tema                │  Fase 1: Conceptual │
│                     │  ┌───────────────┐  │
│ ── Fases ──         │  │ pregunta...   │  │
│  + Fase conceptual  │  └───────────────┘  │
│  + Fase código      │                     │
│                     │  Fase 2: Código     │
│ ── Casos de prueba  │  ┌───────────────┐  │
│ ── Pistas (1-5)     │  │ Monaco editor │  │
│                     │  └───────────────┘  │
│ [Guardar borrador]  │                     │
│ [Publicar]          │                     │
└─────────────────────┴─────────────────────┘
```

### Estado del reto

`status: 'draft' | 'published'` — solo retos publicados son visibles para estudiantes.

### Preview

Componente React que consume el estado local del form directamente — **sin llamadas al API**. El `ChallengeShell` de Phase 1 se refactoriza para aceptar props además de fetchear, garantizando que el preview es idéntico a la vista del estudiante.

### Endpoints nuevos en `challenges` (requieren `TeacherGuard`)

```
POST   /api/v1/challenges                           ← crear reto en borrador
PUT    /api/v1/challenges/:id                       ← editar reto
PATCH  /api/v1/challenges/:id/publish               ← publicar
DELETE /api/v1/challenges/:id                       ← solo borradores
POST   /api/v1/challenges/:id/phases                ← agregar fase
PUT    /api/v1/challenges/:id/phases/:phaseId       ← editar fase
DELETE /api/v1/challenges/:id/phases/:phaseId
```

---

## Feature 3: Material Didáctico con Lexical

### Editor

**Lexical** (Meta) como editor rico. El menú de componentes se implementa via `LexicalTypeaheadMenuPlugin` — al escribir `::` en una línea vacía, aparece un popup flotante:

```
┌─────────────────────────────────┐
│  Insertar componente            │
│  ─────────────────────────────  │
│  ⬜ Quiz                        │
│  ⬜ Code Sandbox                │
│  ░░ Diagrama de flujo  · pronto │
│  ░░ Fragmento de reto  · pronto │
└─────────────────────────────────┘
```

Al seleccionar `Quiz`, inserta el bloque:

```
::quiz
pregunta: "¿Qué hace un bucle for?"
opciones:
  - "Repite código N veces"
  - "Define una función"
  - "Declara una variable"
respuesta: 0
::end
```

Al seleccionar `Code Sandbox`, inserta:

```
::code-sandbox lang="python"
# código inicial aquí
::end
```

### Serialización

Lexical serializa su estado interno a JSON (`EditorState`). Para persistencia se usa `@lexical/markdown` para convertir a Markdown con los bloques `::` como texto plano. `course_material.content_md` almacena el Markdown resultante. Al guardar, `MaterialsService` parsea los bloques `::...::end` con regex y popula `material_component`. Al cargar en el editor, el Markdown se convierte de vuelta a `EditorState` via `@lexical/markdown`.

### Versionado

Cada `PUT /api/v1/materials/:id` incrementa `version` en `course_material` e inserta un snapshot en `material_version`. Sin UI de historial en Phase 2 — solo se persiste.

### Vista del estudiante

`GET /api/v1/materials/:id` retorna Markdown + componentes parseados. Next.js renderiza:

| Bloque | Render |
|--------|--------|
| Markdown puro | `react-markdown` |
| `::quiz` | Componente interactivo con opciones + feedback inmediato |
| `::code-sandbox` | Monaco Editor + ejecución via Piston (Phase 1) |
| `::diagrama-flujo` | Card "Próximamente" |
| `::fragmento` | Card "Próximamente" |

### Endpoints

```
POST   /api/v1/materials          ← crear material (TeacherGuard)
GET    /api/v1/materials          ← listar materiales del docente (TeacherGuard)
GET    /api/v1/materials/:id      ← ver material (estudiante + docente)
PUT    /api/v1/materials/:id      ← editar + versionar (TeacherGuard)
DELETE /api/v1/materials/:id      ← eliminar (TeacherGuard)
```

---

## Feature 4: Analytics en Tiempo Real (WebSocket)

### Infraestructura

`@nestjs/websockets` + `socket.io`. Un `AnalyticsGateway` en el módulo `analytics`.

```
WebSocket: ws://localhost:3001
Namespace: /analytics

Rooms:
  teacher:{teacherId}   ← el docente se une al conectar
```

Cuando ocurre un evento relevante, `AnalyticsService`:
1. Inserta en `teacher_analytics`
2. Emite al room `teacher:{teacherId}` del reto correspondiente

### Eventos WebSocket

```typescript
analytics:submission     { userId, challengeId, phaseId, passed, timestamp }
analytics:hint           { userId, challengeId, phaseId, level, timestamp }
analytics:phase_done     { userId, challengeId, phaseId, timestamp }
analytics:challenge_done { userId, challengeId, achEarned, timestamp }
```

### Vista del docente — `/teacher/analytics`

**Por estudiante** — tabla: nombre, retos completados, ACH ganado, última actividad, pistas pedidas. Click → detalle.

**Por reto** — lista de retos publicados con: % completación, fase con más abandonos, pistas más solicitadas.

**Alertas** — estudiantes sin actividad en +3 días, o atascados en el mismo reto +2 días. Badge rojo en sidebar cuando hay alertas activas.

### Conexión en Next.js

`socket.io-client` en un `AnalyticsProvider` (Context) que vive en `(teacher)/layout.tsx`. Se conecta al montar, se desconecta al desmontar. Cada evento actualiza estado local — sin re-fetch completo.

---

## Dependencias nuevas

| Paquete | Dónde | Para qué |
|---------|-------|----------|
| `lexical` + `@lexical/react` | `apps/web` | Editor de materiales |
| `@lexical/markdown` | `apps/web` | Serialización a Markdown |
| `react-markdown` | `apps/web` | Render de materiales en vista estudiante |
| `socket.io` | `apps/api` | WebSocket server |
| `@nestjs/websockets` | `apps/api` | Gateway de NestJS |
| `socket.io-client` | `apps/web` | WebSocket client |

---

## Tests Playwright — Phase 2

| Test | Flujo |
|------|-------|
| `teacher-register.spec.ts` | Registro con golden ticket válido e inválido |
| `challenge-editor.spec.ts` | Crear reto, editar fases, preview en vivo, publicar |
| `materials.spec.ts` | Crear material, insertar `::quiz`, ver como estudiante |
| `analytics.spec.ts` | Docente ve evento en tiempo real cuando estudiante hace submit |

---

## Criterio de éxito

- Un docente puede registrarse con el golden ticket y acceder a su panel
- Un docente puede crear un reto con fases, previsualizarlo y publicarlo
- Un estudiante solo ve retos publicados
- Un docente puede crear material con `::quiz` funcional y `::code-sandbox` funcional
- El menú `::` estilo Notion aparece y funciona en el editor de materiales
- El docente ve eventos en tiempo real en el dashboard de analytics sin refrescar

---

## Variables de entorno nuevas

```env
TEACHER_GOLDEN_TICKET=<string secreta>
```
