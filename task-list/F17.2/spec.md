# F17.2 — Especificación

## Entradas

- `MentorPublishedConfig` real devuelto por `GET /api/mentor/context`.
- Resultado `CONFIG_UNAVAILABLE` para contexto personal.
- Errores transitorios/inesperados de consulta para recuperación explícita.
- Etapas, borrador y acciones existentes de Mentor.

## Salidas

- Estado académico de solo lectura con materia, tema, consigna, objetivos/criterios y restricciones de la configuración docente publicada.
- Estado personal alternativo sin campos académicos de ejemplo.
- Estado de carga y error recuperable sin confundirlo con el modo personal.
- Navegación y acciones existentes Anterior, Guardar borrador y Continuar; acciones Word secundarias.

## Criterios GIVEN / WHEN / THEN

- GIVEN una configuración publicada válida WHEN se abre Contexto THEN se presentan únicamente sus datos de solo lectura y no aparece Modo personal.
- GIVEN `CONFIG_UNAVAILABLE` WHEN se abre Contexto THEN aparece Modo personal sin tarjetas académicas de ejemplo.
- GIVEN un error diferente de `CONFIG_UNAVAILABLE` WHEN se consulta el contexto THEN se muestra un error recuperable, no se infiere ausencia de contexto.
- GIVEN cualquiera de los estados WHEN el usuario navega con teclado o viewport de 320, 390, 768, 1024 y 1440 CSS px THEN la navegación, el foco y las acciones siguen accesibles sin overflow.
- GIVEN la pantalla WHEN se compara en Ego Lite a 1672 × 941 con la referencia SHA verificada THEN el revisor independiente documenta PASS o diferencias concretas y el desarrollador corrige hasta PASS.
- GIVEN el merge autorizado WHEN pasan CI y gates F14 THEN el release se despliega por F14 y su salud/versionado se comprueban con Ego Lite.

## Archivos en alcance

- `apps/web/src/App.tsx` — carga del contexto y manejo explícito de sus estados.
- `apps/web/src/features/mentor/mentor-screen.tsx` y `mentor-screen.css` — composición Contexto.
- Pruebas de web y documentación/evidencia F17.2.

No se editan contratos, API, PostgreSQL, Prisma, F14 ni otras funciones.
