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
| Registro de docente con golden ticket único (env) | ✅ En scope |
| Guard de rol `teacher` en NestJS | ✅ En scope |
| Editor de retos con preview en tiempo real (local) | ✅ En scope |
| Material didáctico con Lexical + modales de edición | ✅ En scope |
| Componentes `::quiz` y `::code-sandbox` funcionales | ✅ En scope |
| Componentes `::diagrama-flujo` y `::fragmento` (placeholder) | ✅ En scope |
| Analytics del docente en tiempo real via WebSocket | ✅ En scope |
| Middleware de sesión real en Learning Loop | ❌ Fuera de scope (Phase 3) |
| Sistema de grupos / clases formales | ❌ Fuera de scope (Phase 3) |

---

## Arquitectura

### Enfoque: Módulos Independientes

Implementación modular para asegurar que cada funcionalidad sea testeable y robusta antes de pasar a la siguiente.

### Módulos NestJS nuevos

| Módulo | Responsabilidad |
|--------|----------------|
| `teacher` | Guard de rol, registro con golden ticket (`TEACHER_GOLDEN_TICKET`). |
| `materials` | CRUD de materiales, modales Lexical, parsing de componentes. |
| `analytics` | Eventos en tiempo real via Socket.io Gateway. |

### Estructura Next.js (Route Groups)

```
app/
  (student)/
    dashboard/
    challenges/
    settings/
  (teacher)/
    teacher/
      challenges/          ← Listado de retos del docente
        new/               ← Editor + preview en tiempo real
        [id]/edit/
      materials/           ← Gestión de lecciones interactivas
        new/
        [id]/edit/
      analytics/           ← Dashboard WebSocket
```

El layout `(teacher)/layout.tsx` verificará el rol `teacher` mediante la sesión de Better Auth y redirigirá si el usuario no tiene permisos.

---

## Base de Datos (Migración: `002-phase2.sql`)

- **User Role:** Columna `role` ('student' | 'teacher').
- **Materials:** Tablas `course_material`, `material_version` y `material_component`.
- **Analytics:** Tabla `teacher_analytics` para persistencia de eventos.
- **Challenges:** Extensión de `challenge` con `status` ('draft' | 'published') y `teacher_id`.

---

## Detalles de Implementación Clave

### 1. Registro de Docente
- Endpoint: `POST /api/auth/sign-up/teacher`.
- Valida `ticket` contra `process.env.TEACHER_GOLDEN_TICKET`.
- Si es válido, crea el usuario y asigna `role = 'teacher'`.

### 2. Editor de Retos y Preview
- **Preview:** El componente `ChallengeShell` se refactoriza para aceptar datos por props.
- **Tiempo Real:** El editor de Next.js pasa su estado local directamente al `ChallengeShell` del panel derecho. Cero latencia de red.

### 3. Materiales con Lexical y Modales
- **Interacción:** Escribir `::` despliega un menú.
- **Edición:** Al insertar o clickear un componente (`quiz`, `code-sandbox`), se abre un **modal** para editar su configuración, protegiendo el flujo de escritura del documento principal.
- **Persistencia:** Se guarda como Markdown enriquecido.

### 4. Analytics en Tiempo Real
- **WebSockets:** Uso de `@nestjs/websockets` con namespaces y rooms por docente.
- **Feedback:** El docente recibe alertas visuales inmediatas cuando un estudiante interactúa con un reto.

---

## Criterio de éxito
- Un docente puede registrarse, crear un reto con preview instantáneo y publicarlo.
- El editor de materiales permite insertar quices mediante modales sin romper el formato.
- El docente ve las entregas de los alumnos en tiempo real en el dashboard de analytics.
