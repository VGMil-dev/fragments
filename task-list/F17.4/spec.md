# Especificación — F17.4 / UX-08

## Fuentes

- Notion: [UX-08 aprobada](https://app.notion.com/p/41ecd5fa7ed78103b292e02164f01c1c), [F17](https://app.notion.com/p/41ccd5fa7ed781fcacc5cd8bc29d182f), [F18](https://app.notion.com/p/41ccd5fa7ed781e8b161f1dc5bbb0abc), sistema visual.
- Referencia: `Fragments_F17_UX08_Referencia_Aprobada.png`, 1672×941, SHA-256 `c632b2ad72bf78b99d22137ad9eb7071ea08581f7603ced548ca5fa5d5a61fbe`.
- Contratos vigentes: `docs/CONTRACTS.md`, `packages/contracts/src/index.ts`; Prisma/PostgreSQL F21.

## Contrato implementado por Planner

- `TechnologyCatalogEntry`: `id`, `slug`, `name`, `description`.
- `TechnologyCatalogPage`: 50 filas por página y cursor estable; el total no queda limitado por UI.
- `GET /api/mentor/technology-catalog?q=&cursor=&selectedIds=` requiere sesión de estudiante.
- `GET /api/mentor/suggested-technologies?cursor=` requiere sesión de estudiante y obtiene solo tecnologías habilitadas en aulas activas con matrícula `active` del estudiante autenticado. Ninguna ruta recibe IDs de aula del cliente.
- Borrador: `technologyIds?` añade identidades estables y `technologies?` conserva compatibilidad con datos históricos, evaluaciones y DOCX. El API valida IDs y resuelve nombres desde el catálogo.
- Tecnología global `TechnologyCatalogItem`; asociación de recomendación `ClassroomTechnologyAvailability`.

## Criterios de aceptación

1. Dado un borrador con varios objetivos, al abrir UX-08 se muestra un control por objetivo; agregar, editar, quitar y guardar conserva orden y validaciones actuales.
2. Dado un estudiante con matrículas `active` en una o más aulas activas, al abrir «Sugeridas por tu aula» ve recomendaciones deduplicadas de esas aulas.
3. Dado una matrícula `pending`, `rejected` o `removed`, o un aula ajena enviada de forma manipulada, la sugerencia no se filtra al estudiante.
4. Dado un catálogo con datos, buscar por nombre devuelve resultados del API/PostgreSQL; agregar una opción selecciona su ID canónico y la etiqueta queda visible.
5. Al quitar una selección propia y guardar, tras recargar no aparece seleccionada; los campos históricos ajenos al catálogo se conservan hasta que el estudiante los quite explícitamente.
6. Dado un catálogo vacío, breve o extenso, se muestran estados vacíos/carga/error accesibles y la lista permite explorar sin límites visuales inventados.
7. «Condiciones propias del proyecto» no aparece; borradores previos conservan `constraints` y DOCX mantiene importación/exportación compatible.
8. Las tarjetas MVP/resultado se alinean y se apilan si el viewport no permite dos paneles legibles.
9. La composición se compara con Ego Lite a 320, 390, 768, 1024, 1440 y 1672 CSS px; teclado, foco, errores y desbordamientos quedan revisados por Agente B.
10. Pruebas con fixtures sintéticos y escrituras reales se limitan a una base cuyo nombre efectivo sea `fragments_test`; ninguna prueba ni migración toca `fragments_prod`.
11. La evidencia distingue implementación, verificación, CI, PR y despliegue. Una migración pendiente de aprobación no se ejecuta en producción.
