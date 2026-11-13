# F15 — Identidad GitHub y galería académica

## Problema

Mentor hoy crea propuestas asociadas únicamente a una cookie anónima y la galería depende de una publicación voluntaria de la versión actual. Eso no acredita autoría académica ni conserva la relación visible entre proyecto, evaluación y rúbrica histórica.

## Alcance de aceptación del piloto — 2026-11-13

Validar el primer proyecto académico auténtico sin crear datos de prueba en producción. Separar el guardado y los controles de propiedad (sin IA) de una única evaluación productiva que requiere consentimiento explícito del estudiante, aprobación del propietario y presupuesto vigente comprobado.

## Objetivo

Ampliar Better Auth con GitHub para estudiantes y mantener el acceso actual de docentes. Vincular propuestas nuevas con el usuario autenticado en el servidor; publicar automáticamente versiones evaluadas con contexto inmutable; exponer una galería para estudiantes autenticados y un panel docente protegido. Conservar los proyectos anónimos históricos y permitir reclamarlos solo con su cookie original y una sesión GitHub.

## Alcance de validación final

- Verificar credenciales OAuth únicamente con un canal privado ya configurado o proporcionado fuera de logs; no escribir secretos en el repositorio, CI ni evidencia.
- Inspeccionar la configuración persistente del VPS sin reiniciar, recrear o desplegar servicios. La activación de credenciales o prueba OAuth real queda pendiente si no hay una vía segura de instalación.
- Recorrer la superficie docente con Ego Lite en escritorio y móvil usando cuentas y datos sintéticos, y validar migraciones sobre SQLite temporal.
- Revisar compatibilidad con F13/F14 sin merge, push, tag ni despliegue.

## Fuera de alcance

- Cambios a F14, tags, workflows, despliegue o infraestructura.
- Cambios de producción, reinicios, recreación de contenedores, despliegue o pruebas con datos reales.
- Recalcular evaluaciones, exponer notas privadas, habilitar acceso a repositorios o cambiar Review, Trainer e Inspector.
- Asociar proyectos anónimos por correo, título, username o semejanza textual.

## Owner

PLANNER — rama `codex/f15-github-gallery`, basada en `origin/main`.

## Skills y criterio

- `ego-browser`: lectura obligatoria para QA visual; usar únicamente ego(lite), sin navegador alternativo.
- Backend: aplicar los límites ligeros ya establecidos por los repositorios SQLite y Better Auth existentes.
- Verificación: registrar comandos y resultados reales antes de cerrar.
