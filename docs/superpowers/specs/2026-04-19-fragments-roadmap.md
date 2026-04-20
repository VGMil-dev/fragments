# Fragments — Roadmap de Desarrollo

**Fecha:** 2026-04-19
**Estado:** Documento vivo — cada fase se actualiza al completarse
**Visión:** `docs/superpowers/specs/2026-04-19-fragments-vision.md`

---

## Resumen de fases

| Fase | Nombre | Estado | Descripción corta |
|------|--------|--------|-------------------|
| 0 | Foundation | ✅ Completo | Auth + Dashboard + Lumen mascota |
| 1 | The Learning Loop | 🔄 Siguiente | Retos + IA + ACH básico |
| 2 | The Classroom | ⏳ Pendiente | Editor docente + material didáctico |
| 3 | Everywhere | ⏳ Pendiente | App móvil + desktop interceptor |
| E | Endgame | ⏳ Pendiente | Post-graduación + portfolio + suscripción |

---

## Phase 0 — Foundation ✅

**Narrativa:** Lumen existe. El estudiante puede entrar, ver su mascota y sentir que hay algo vivo esperándolo.

### Qué se construyó
- Sistema de autenticación completo: email/password + OAuth (Google, GitHub)
- Dashboard con diseño "Love UX": bento-grid, Lumen con 6 estados emocionales, sidebar, momentum card, constellation, summon bar
- Economía visual (racha, XP) con datos mock
- Sesión protegida por middleware
- Tests Playwright: register, login, dashboard

### Stack establecido
- Next.js 15 (App Router) · NestJS 11 · PostgreSQL 16
- Better Auth 1.6 · TailwindCSS 4 · Framer Motion 12
- Docker Compose · Playwright

### Decisiones técnicas clave
- Better Auth vive en NestJS (no en Next.js) — NestJS es el auth server único para cualquier cliente futuro
- Next.js es cliente puro — nunca toca la base de datos directamente
- Sesión via httpOnly cookie + validación server-side en middleware
- `API_INTERNAL_URL` para Docker, `NEXT_PUBLIC_API_URL` para el browser

---

## Phase 1 — The Learning Loop 🔄

**Narrativa:** El estudiante le enseña algo a Lumen por primera vez. Resuelve un reto, Lumen lo absorbe y crece. El loop de aprendizaje queda establecido.

### Features

#### Sistema de retos
- Reto con dos fases obligatorias en secuencia:
  1. **Fase conceptual**: preguntas de comprensión, diagrama mental o pseudocódigo — evaluada por IA
  2. **Fase de código**: editor en browser con ejecución en sandbox (Piston API) — evaluada por casos de prueba
- Cada reto tiene: título, descripción, nivel de dificultad (1–5), tema, fases definidas, casos de prueba, y set de pistas progresivas
- El estudiante solo puede avanzar a la fase de código si completa la fase conceptual

#### Sistema de pistas (Lumen IA)
- Lumen detecta inactividad (sin interacción en N segundos, configurable por nivel)
- Al detectarla: cambia al estado `curious`, aparece un botón "¿Lumen quiere ayudarte?"
- Si el estudiante lo acepta: la IA genera una pista usando el contexto del reto + nivel del estudiante
- Las pistas son progresivas: nivel 1 recibe orientaciones conceptuales, nivel 5 recibe hints técnicos concretos
- Cada pista consumida registra un evento (para analytics del docente en Phase 2)
- Límite de pistas por reto (configurable): evita que se convierta en un resolver automático

#### Economía ACH (v1 simplificada)
- ACH se gana por:
  - Completar la fase conceptual correctamente: +10 ACH
  - Completar la fase de código (todos los tests pasando): +25 ACH
  - Completar sin pedir pistas: +15 ACH bonus
  - Mantener racha diaria: +5 ACH/día
- ACH se gasta en:
  - Comida para Lumen (sube el nivel de la mascota)
  - Un nivel de comida = cantidad fija de ACH (ej. comida básica = 20 ACH)
- Sin tienda completa — solo comida en v1
- Balance de ACH persiste en base de datos por usuario

#### Documentación (Docusaurus en NestJS)
- Docusaurus instalado como app estática servida desde NestJS en `/docs`
- Swagger habilitado en NestJS para todos los endpoints nuevos de Phase 1
- Estructura inicial de Docusaurus:
  - Introducción a Fragments (extrae del vision doc)
  - Guía de la API (sincronizada con Swagger)
  - Roadmap público (esta misma estructura, simplificada)

### Decisiones técnicas

| Decisión | Elección | Razón |
|----------|----------|-------|
| Sandbox de código | Piston API (self-hosted o cloud) | Open source, soporta 20+ lenguajes, sin vendor lock-in |
| IA para pistas | Claude API (claude-haiku-4-5 por costo) | Integración directa, costo mínimo por hint |
| Editor de código | Monaco Editor (mismo que VS Code) | Familiar para estudiantes, fácil de integrar en Next.js |
| Evaluación fase conceptual | IA con prompt estructurado + rubrica | Más flexible que regex, consistente con la narrativa de Lumen |

### Endpoints NestJS nuevos
```
POST   /api/challenges              — crear reto (docente)
GET    /api/challenges              — listar retos disponibles
GET    /api/challenges/:id          — detalle de reto
POST   /api/challenges/:id/submit   — enviar solución (fase conceptual o código)
POST   /api/challenges/:id/hint     — solicitar pista a Lumen
GET    /api/economy/balance         — balance ACH del usuario
POST   /api/economy/feed            — gastar ACH en comida para Lumen
GET    /api/progress                — progreso del usuario (retos completados, nivel Lumen)
```

### Criterio de éxito
- Un estudiante puede completar un reto de inicio a fin sin instrucciones externas
- Lumen reacciona visualmente a cada evento del reto (correcto, incorrecto, pista pedida)
- El balance ACH sube y se puede gastar para que Lumen suba de nivel
- Los tests Playwright cubren el flow completo de un reto

### Fuera de scope en esta fase
- Editor de retos para el docente (Phase 2)
- Progreso de compañeros / vista social
- App móvil
- Desktop interceptor
- Tienda de items más allá de comida

---

## Phase 2 — The Classroom ⏳

**Narrativa:** El docente diseña el camino. Los estudiantes lo recorren juntos, y el docente puede ver quién necesita ayuda antes de que sea demasiado tarde.

### Features

#### Editor de retos para el docente
- Interfaz dentro de Fragments para crear retos con fases
- Plantillas: el docente elige una plantilla base (ej. "Reto de algoritmos", "Comprensión de datos") y personaliza
- Define: fases del reto, casos de prueba, pistas pre-definidas por nivel, tiempo estimado, puntos ACH
- Previsualización del reto antes de publicarlo

#### Material didáctico progresivo
- El docente escribe material en Markdown con componentes llamados por sintaxis especial:
  ```md
  ::diagrama-flujo
  ::quiz id="q1"
  ::code-sandbox lang="python"
  ::fragmento id="challenge-3"
  ```
- Los componentes se renderizan interactivos en la vista del estudiante
- El material se versiona: el docente puede actualizar sin perder el historial

#### Vista del docente (analytics)
- Por estudiante: retos completados, pistas pedidas, tiempo por fase, ACH ganado
- Por reto: tasa de completación, punto de mayor abandono, pistas más solicitadas
- Alertas: estudiantes que llevan N días sin actividad o que están atascados en el mismo reto

### Fuera de scope en esta fase
- App móvil
- Desktop interceptor
- Sistema de grupos / clases formales (los estudiantes son individuales por ahora)

---

## Phase 3 — Everywhere ⏳

**Narrativa:** Fragments está donde el estudiante está — en el celular cuando quiere revisar, en la clase cuando está programando en serio.

### Features

#### App móvil
- Stack: React Native (comparte lógica con Next.js web)
- Features v1 móvil:
  - Ver y cuidar a Lumen (darle de comer, ver su estado)
  - Preguntas rápidas de repaso: flashcards y quizzes cortos de conceptos ya vistos
  - Racha diaria: notificación push si no ha interactuado en el día
  - Balance ACH y nivel de Lumen
- Auth: mismo sistema Better Auth en NestJS (httpOnly cookie o token según plataforma)

#### Desktop interceptor
- App de escritorio (Electron o Tauri) que el estudiante instala
- En "modo sesión de clase" activado por el docente:
  - Intercepta el output de la aplicación que el estudiante está usando (IDE, terminal)
  - Detecta si el estudiante está copiando código de fuentes externas (clipboard monitoring opcional)
  - Bloquea o alerta ante uso de IA externa (detecta URLs conocidas de IA)
  - Registra eventos para el docente (sin grabar pantalla — solo metadata)
- El estudiante sabe que el interceptor está activo: transparencia total
- Solo se activa cuando el docente inicia una sesión de clase en Fragments

### Decisiones técnicas pendientes
- App móvil: React Native vs Flutter (decisión al iniciar Phase 3)
- Desktop interceptor: Electron vs Tauri (Tauri preferible por bundle size)
- Push notifications: servicio a definir (Firebase / APNs / OneSignal)

---

## Endgame — After Fragments ⏳

**Narrativa:** Te graduaste, pero Lumen aún tiene cosas que aprender de ti. La relación no termina — evoluciona.

### Features

#### Proyectos de portfolio
- Proyectos reales de complejidad mayor, diseñados para mostrar en un portfolio profesional
- Desbloqueados al graduarse (criterio de graduación: definido por el docente/institución)
- Cada proyecto tiene: brief, rúbrica de evaluación, feedback de IA, y sección de reflexión

#### Orientación de carrera
- Paths recomendados según las fortalezas del estudiante (basados en su historial en Fragments)
- Recursos curados: qué aprender después, qué certificaciones considerar, cómo buscar primer empleo
- Preguntas de entrevista técnica con práctica en Fragments

#### Transición a suscripción
- Al graduarse, el acceso gratuito se mantiene por N meses (período de gracia)
- Luego: suscripción mensual para acceso a contenido de post-graduación
- El acceso al dashboard y Lumen base siempre es gratuito — solo el contenido avanzado es de pago
- Lumen mantiene su nivel y personalidad acumulada — no se pierde nada

### Modelo de precios (tentativo)
```
Plan Estudiante activo:   Gratuito (requiere inscripción activa)
Plan Post-graduación:     $X/mes — acceso a proyectos portfolio + orientación de carrera
Plan Institucional:       $Y/mes por institución — incluye herramientas de docente + analytics
```

---

## Decisiones técnicas globales

### Monorepo
```
fragments/
├── apps/
│   ├── web/          — Next.js (web app)
│   ├── api/          — NestJS (auth + API + Docusaurus)
│   └── mobile/       — React Native (Phase 3)
├── packages/
│   └── desktop/      — Electron/Tauri interceptor (Phase 3)
└── e2e/              — Playwright tests
```

### API design
- REST para operaciones CRUD (retos, progreso, economía)
- WebSocket para eventos en tiempo real (estado de Lumen durante un reto, notificaciones del docente)
- Versioning: `/api/v1/...` desde Phase 1

### Base de datos (evolución)
| Fase | Tablas nuevas |
|------|---------------|
| 0 | `user`, `session` (Better Auth) |
| 1 | `challenge`, `challenge_phase`, `submission`, `hint_event`, `ach_transaction`, `lumen_state` |
| 2 | `course_material`, `material_component`, `teacher_analytics` |
| 3 | `mobile_session`, `class_session`, `interceptor_event` |
| E | `portfolio_project`, `career_path`, `subscription` |

### Seguridad
- El desktop interceptor es opt-in explícito por el estudiante, con consentimiento visible
- No se graba pantalla — solo metadata de eventos
- Los datos de analytics del docente no incluyen contenido del código del estudiante, solo métricas
- ACH no tiene valor monetario real — no aplica regulación financiera

---

## Criterios de graduación entre fases

Para avanzar de una fase a la siguiente, deben cumplirse:

| Condición | Phase 0→1 | Phase 1→2 | Phase 2→3 | Phase 3→E |
|-----------|-----------|-----------|-----------|-----------|
| Tests Playwright passing | ✅ | ✅ | ✅ | ✅ |
| Al menos 1 estudiante real usó el feature | — | ✅ | ✅ | ✅ |
| Docusaurus actualizado con nuevos endpoints | — | ✅ | ✅ | ✅ |
| Spec de siguiente fase escrita y aprobada | ✅ | ✅ | ✅ | ✅ |
