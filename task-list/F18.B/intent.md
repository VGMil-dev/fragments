# F18.B — Misiones versionadas por aula

Owner: PLANNER

## Problema y objetivo

Después de crear aulas y habilitar habilidades, falta el núcleo pedagógico que conecte el trabajo del docente con el proyecto del estudiante. F18.B permite crear tareas por aula, reutilizar habilidades del catálogo privado, conservar versiones publicadas y mostrarlas solo a matrículas activas.

## Objetivos de este incremento

- Crear y editar borradores de tarea con título, consigna, objetivos y habilidades requeridas/optativas.
- Publicar una versión inmutable con snapshots de las habilidades seleccionadas y versión de contexto Mentor F11.
- Al editar una tarea publicada, crear un nuevo borrador/versionado sin cambiar la versión previa.
- Listar tareas del docente dueño y tareas publicadas de aulas activas del estudiante autenticado.
- Integrar UI docente en el detalle del aula y lectura estudiantil en Mis aulas, preservando shells/rutas existentes.

## No objetivos

Review/Inspector, entregas oficiales, nota/F26, fechas, archivos adjuntos, co-docencia, importación DOCX, banco Trainer, cambios de rúbrica, ejecución de código estudiantil, escrituras productivas manuales, migración de producción fuera del F14 autorizado.

## Seguridad y datos

- La autoridad docente deriva exclusivamente de Better Auth; jamás aceptar `teacherId` del cliente.
- Estudiante: consulta basada en sesión, matrícula `active` y aula `active`; IDs manipulados no filtran otras aulas.
- Usar PostgreSQL de prueba `fragments_test` con preflight `current_database()` para tests de integración; no tocar `fragments_prod` desde pruebas.
- Snapshot versionado debe conservar texto, orden, nombres/descripciones de habilidades y `mentorContextVersion`; nunca modificar versiones publicadas.
- No sumar notas ni crear motor de rúbrica: F11 sigue siendo la fuente versionada de Mentor.

## Criterio de cierre

Contrato, pruebas unitarias/integración con fakes, typecheck/lint/build, aislamiento docente/estudiante, recorrido Ego Lite de perfiles disponibles y evidencia actualizada. Distinguir bloqueos de sesión o recursos de QA; no declarar despliegue ni recorrido productivo sin evidencia real.

## Corrección derivada de QA v0.5.10

El contexto de Mentor debe conservar el snapshot académico completo de la versión publicada: objetivos, habilidades obligatorias y optativas, además de todos los requisitos de F11. Ningún criterio puede truncarse silenciosamente. La configuración editable F11 conserva su límite original; el límite ampliado se aplica únicamente al contexto efectivo de evaluación.
