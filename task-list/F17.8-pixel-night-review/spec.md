# Especificación F17.8 — Review Pixel Night

## Fuente y alcance

- Ruta: `/student/review`; feature Review con flujo académico existente.
- Dirección: F16 Pixel Night; ficha UX-12 «Review · Commit» permanece pendiente y no ofrece maqueta verificable. El asset de código vinculado es candidato y no se incorporó.
- Alcance: ajuste visual limitado a la pantalla y hoja de estilos existente; conservar datos, copy funcional, acciones y estados del contrato.

## Criterios

1. La composición distingue repositorio/commit, acción principal, carga, error, resultado e historial según los datos existentes.
2. Los estados de criterios son veraces: `verified` éxito, `not_verified` neutral y `failed` advertencia con el texto actual de revisión.
3. No se modifican contratos, API, rutas, permisos ni persistencia.
4. Prueba focal, typecheck y build pasan.
5. La propuesta queda candidata hasta revisión visual del propietario y QA Ego Lite posterior a una release autorizada.
