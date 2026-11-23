# Especificación F22.14 — Filtros locales en feeds Mentor/Review

## Comportamiento

- Las vistas `/admin/mentor-events` y `/admin/review-events` ofrecen selectores de etapa y resultado cuando existe una muestra.
- La combinación se aplica en memoria a las filas cargadas por el feed actual, sin nuevas llamadas de red.
- La interfaz informa cuántas filas de la muestra se muestran y comunica cuando no hay coincidencias.
- Los estados de carga, error, permisos y muestra vacía conservan su comportamiento actual.

## Verificación

- Pruebas de interfaz comprueban filtrado por etapa y resultado y ausencia de consultas adicionales.
- Ejecutar pruebas focales, typecheck del paquete web y `git diff --check`.
- Acceso admin real, eventos persistidos visibles y retención productiva permanecen NO COMPROBADOS.
