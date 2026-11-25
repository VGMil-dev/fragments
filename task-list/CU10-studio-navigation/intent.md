# CU-10 — Navegación contextual de Classroom Studio

Owner: PLANNER

## Problema y objetivo

El detalle de un aula muestra sus datos, miembros, habilidades, misiones y rúbricas en una página larga. El recorrido no ofrece atajos entre esas secciones, de modo que el docente debe desplazarse manualmente para encontrar cada acción académica.

Añadir navegación contextual por anclas que conserve el aula abierta y permita llegar directamente a datos, estudiantes, habilidades, misiones y rúbricas.

## No objetivos

- No mover ni duplicar flujos existentes ni introducir rutas o contratos nuevos.
- No cambiar permisos, datos, persistencia, misiones o rúbricas.
- No modificar aulas reales ni generar contenido.

## Restricciones

- Mantener el diseño Pixel Night, controles de teclado y prefers-reduced-motion.
- Validar en CI y con Ego Lite si el perfil autorizado está disponible; registrar producción como NO COMPROBADA si no está disponible.
