# F18.A — Intent

Owner: PLANNER

## Problema y objetivo

Fragments no tiene persistencia académica para aulas, matrículas ni habilidades docentes. Implementar el primer incremento vertical de Classroom Studio para que el docente pueda organizar aulas y estudiantes y mantener habilidades reutilizables; F17 consumirá datos autorizados desde el mismo contrato.

## Objetivos

- Crear, consultar, editar y archivar aulas, con propiedad docente derivada de Better Auth.
- Admitir ingreso por código con solicitud pendiente y aprobación docente explícita, y asignación docente directa registrada como matrícula activa con procedencia distinta.
- Restringir vistas estudiantiles a sus propias solicitudes, aulas activas y habilidades habilitadas.
- Mantener un catálogo privado por docente, con IDs estables y archivado no destructivo.
- Entregar UI docente persistida, accesible y basada en F16.
- Mantener el acceso al catálogo de habilidades visible en la navegación docente de escritorio y móvil, sin depender del estado del aula actual.

## No objetivos

Misiones, versiones/rúbricas por actividad, prácticas/Trainer, F19, autenticación nueva, migración de base de datos, identidad global de habilidades, despliegue o cambios en producción.

## Criterios de trabajo

- Seguir `SYSTEM_PROMPT_CODEX.md`, `docs/SYSTEM_DESIGN.md`, `docs/CONTRACTS.md`, `docs/DESIGN_TOKENS.md` y el task list.
- Usar TDD con bases SQLite temporales y fixtures explícitamente sintéticos; no usar proveedores reales.
- Reutilizar Better Auth, SQLite WAL, contratos Zod, tokens F16 y Lucide existentes.
- QA web exclusivamente con Ego Lite; dejar `NOT_VERIFIED` para cualquier herramienta o revisión no disponible.
