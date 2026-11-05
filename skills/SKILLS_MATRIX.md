# Skills verificadas y política de uso — Fragments

Este archivo es el primer paso obligatorio. Las skills NO equivalen a dependencias de producción; son instrucciones de trabajo para Codex. Leer primero el SKILL.md original, su ámbito y advertencias. No cargar todas las skills indiscriminadamente.

| Skill oficial / fuente | Uso | Agentes | Modo |
|---|---|---|---|
| `frontend-design` — `anthropics/skills` | Dirección visual distintiva adaptada al brief pixel/retro | W1, W2 | Aplicar directamente al diseño, no copiar plantillas |
| `vercel-react-best-practices` — `vercel-labs/agent-skills` | Performance, waterfalls, React/TS | W1, W2 | Revisión y aplicación selectiva, no optimizar prematuramente |
| `web-design-guidelines` — `vercel-labs/agent-skills` | Accesibilidad, focus, formularios, estados vacíos, motion | W1, W2, planner | Auditoría de UI tras cada slice |
| `backend-architecture` — `we-are-singular/skills` | Límites limpios, adaptadores, repositorios y pruebas | W3–W6 | Aplicación directa, simple, sin capas ceremoniales |
| `test-driven-development` — `obra/superpowers` | Red → Green → Refactor en dominio y API | W3–W6 | Directa para lógica nueva |
| `verification-before-completion` — `obra/superpowers` | Evidencia fresca antes de decir DONE | Todos | Obligatoria en cada tarea |
| `dispatching-parallel-agents` — `obra/superpowers` | Orquestación concurrente | Planner | Directa después de contratos |
| `using-git-worktrees` — `obra/superpowers` | Isolar ediciones concurrentes | Planner y workers | Directa solo si el harness no aísla ya |
| `ego-browser` — `ego(lite)` | Navegación, screenshots, pruebas exploratorias y E2E reales en Windows | W1, W2, W6 y planner | Uso directo obligatorio; verificar conexión e instalación ya disponible, sin instalar otro navegador |

Instalación selectiva (revisar procedencia de los repositorios y permisos antes de instalar):

```bash
npx skills add https://github.com/anthropics/skills --skill frontend-design
npx skills add https://github.com/vercel-labs/agent-skills --skill vercel-react-best-practices
npx skills add https://github.com/vercel-labs/agent-skills --skill web-design-guidelines
npx skills add https://github.com/we-are-singular/skills --skill backend-architecture
npx skills add https://github.com/obra/superpowers --skill test-driven-development
npx skills add https://github.com/obra/superpowers --skill verification-before-completion
npx skills add https://github.com/obra/superpowers --skill dispatching-parallel-agents
npx skills add https://github.com/obra/superpowers --skill using-git-worktrees
```

Para ego(lite): https://lite.ego.app/document/en/docs/skills . El usuario indica que ya tiene ego(lite) en Windows. Verificar la skill `ego-browser` y el puente disponibles en ese entorno. No reinstalar ni usar Playwright u otro navegador. Ante imposibilidad técnica, documentar bloqueo y continuar únicamente pruebas unitarias/API que no requieran navegador.

Para Promptfoo: no inventar una skill oficial. Leer documentación https://www.promptfoo.dev/docs/configuration/expected-outputs/model-graded/ e implementar fixture evaluations con reglas JSON deterministas y, opcionalmente, `llm-rubric` con grader explícito. No utilizar LLM como juez único.

Fuentes: https://github.com/anthropics/skills , https://github.com/vercel-labs/agent-skills , https://www.skills.sh/we-are-singular/skills/backend-architecture , https://www.skills.sh/obra/superpowers , https://lite.ego.app/document/en/docs/skills , https://www.promptfoo.dev/docs/

Regla: aplicar skills para mejorar criterio cuando su receta es excesiva para MVP; aplicar directamente cuando asegura accesibilidad, seguridad, evidencia o corrección. Registrar skill leída y decisión en `evidencie.md`.
