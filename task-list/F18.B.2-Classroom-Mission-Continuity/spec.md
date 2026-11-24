# Especificación F18.B.2

- Reutilizar `GET /api/me/proposals` y el `StudentAssignment` ya cargado; sin endpoints, contratos, rutas nuevas ni persistencia adicional.
- Comparar por igualdad exacta `proposal.assignmentVersionId === assignment.id`, igual que en F18.B.1. No reconstruir contexto desde el catálogo actual ni emparejar por título/aula.
- Si la consulta de propuestas está en carga o falla, no ofrecer una acción que pudiera duplicar una propuesta; mostrar estado y reintento.
- Si hay una propuesta vinculada, mostrar acción para abrirla en Mentor y conservar su versión/contexto/habilidades fijados. Si no existe, ofrecer iniciar propuesta con la misión elegida.
- Conservar separados callbacks «continuar propuesta» y «iniciar misión». No afirmar que la propuesta está en estado borrador: el DTO no lo garantiza.
- Pruebas con fixtures fake etiquetados: coincidencia exacta, otra versión/no vínculo, carga y error/reintento. Prueba de integración de ruta por el arquitecto.
- No probar ni escribir en producción. La UX visual de este flujo productivo queda NO COMPROBADA hasta una sesión Ego Lite autorizada.
