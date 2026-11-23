# F17.11 — Dashboard inicia una misión publicada

## Problema
El Dashboard permite crear o continuar una propuesta, pero el primer paso de una misión docente obliga a navegar a Mis aulas.

## Objetivo
Cuando no hay un borrador que continuar, mostrar una misión publicada de un aula con matrícula activa y abrir Mentor con esa misma versión, contexto y habilidades.

## No objetivos
- Crear, editar o publicar misiones.
- Cambiar contratos, endpoints, persistencia, permisos o rutas compartidas.
- Inventar progreso, recompensas o evaluación.

## Responsable
Planner/arquitecto en `codex/f17-student-mission-priority`.

## Criterio aplicado
Skill `vercel-react-best-practices`: mantener el flujo en el componente dueño del estado y no introducir estado persistido ni dependencias.
