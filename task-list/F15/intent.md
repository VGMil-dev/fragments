# F15 — Identidad GitHub y galería académica

## Problema

Mentor hoy crea propuestas asociadas únicamente a una cookie anónima y la galería depende de una publicación voluntaria de la versión actual. Eso no acredita autoría académica ni conserva la relación visible entre proyecto, evaluación y rúbrica histórica.

## Objetivo

Ampliar Better Auth con GitHub para estudiantes y mantener el acceso actual de docentes. Vincular propuestas nuevas con el usuario autenticado en el servidor; publicar automáticamente versiones evaluadas con contexto inmutable; exponer una galería para estudiantes autenticados y un panel docente protegido. Conservar los proyectos anónimos históricos y permitir reclamarlos solo con su cookie original y una sesión GitHub.

## Fuera de alcance

- Cambios a F14, tags, workflows, despliegue o infraestructura.
- OAuth real, creación de una GitHub OAuth App o uso de credenciales externas.
- Recalcular evaluaciones, exponer notas privadas, habilitar acceso a repositorios o cambiar Review, Trainer e Inspector.
- Asociar proyectos anónimos por correo, título, username o semejanza textual.

## Owner

PLANNER — rama `codex/f15-github-gallery`, basada en `origin/main`.

## Skills y criterio

- `ego-browser`: lectura obligatoria para QA visual; usar únicamente ego(lite), sin navegador alternativo.
- Backend: aplicar los límites ligeros ya establecidos por los repositorios SQLite y Better Auth existentes.
- Verificación: registrar comandos y resultados reales antes de cerrar.
