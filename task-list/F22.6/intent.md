# F22.6 — Filtro local del feed de actividad

## Problema

El feed `/admin/audit-log` muestra los eventos recientes sin permitir acotar la lectura por tipo, lo que dificulta revisar la muestra disponible.

## Objetivo

Agregar un filtro accesible por tipo de evento que opere únicamente sobre la muestra devuelta por `/api/admin/audit-log`, distinga cuando no hay coincidencias y conserve la acción manual `Actualizar`.

## No objetivos

- Cambiar endpoint, respuesta, contratos, rutas compartidas, esquema o migraciones.
- Añadir persistencia, retención nueva o prometer historial duradero.
- Cambiar límites del feed o cargar eventos adicionales por filtro.

## Owner y criterio

- Owner: worker F22.6 (UI admin de actividad).
- Aplicar `vercel-react-best-practices` selectivamente: derivar resultados filtrados desde el estado ya cargado y mantener el estado de selección local.
- TDD UI: cubrir filtro, estado vacío y actualización manual; typecheck y `git diff --check`.
