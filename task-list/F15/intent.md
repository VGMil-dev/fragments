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

## Addendum — ejecución del piloto autorizado — 2026-11-13

La autorización del propietario y del estudiante recibida en esta misión habilitó una propuesta auténtica y una evaluación real única en producción. Esta autorización acotada supersede para ese piloto la restricción anterior contra propuestas reales; no habilita despliegue, reinicios, tags ni cambios de infraestructura. El piloto verificó guardado, persistencia, evaluación y publicación de una revisión elegible. F15 continúa INCONCLUSIVE: faltan vista docente real del proyecto, aislamiento productivo con segunda cuenta, integridad/estado de SQLite productiva y verificación del SHA productivo. Véase `evidencie.md`.

## Addendum — recuperación de fallos de carga — 2026-11-13

La revisión independiente del PR #33 detectó que un fallo de lectura podía presentarse como ausencia de propuestas y que elegir una inspiración podía conservar la selección de una propuesta previa. La recuperación muestra un error con reintento y limpia la selección previa al iniciar una propuesta desde inspiración. Véase `evidencie.md`.

## Addendum — QA productivo v0.4.5 — 2026-11-14

La cuenta estudiantil propietaria `MilordV` pudo reabrir su única propuesta, recuperar la evaluación existente de la versión 1 y guardar una edición mínima como versión 2 conservando el mismo identificador. La publicación elegible existente sigue en la galería. No se evaluó la versión 2. F15 permanece INCONCLUSIVE hasta validar SQLite mediante `PRAGMA integrity_check` con evidencia directa y, si existe una cuenta estudiantil B autorizada, el aislamiento entre estudiantes.
