# Especificación CU-13 — Tres etapas persistidas

## Criterio

- El borrador y la versión publicada conservan tres entregas en orden estable: `proposal`, `progress`, `final`.
- Cada entrega conserva requisitos, criterio, y fecha opcional; la fecha del final se recupera exactamente tras publicar.
- Al completar Reviews fake de propuesta y avance, el siguiente identificador es la entrega final; al completar final no hay siguiente entrega.
- Las tres etapas pertenecen al mismo proyecto/repositorio. No se crean repositorios automáticamente.
- La respuesta de historial no revela score, findings ni análisis privado.

## Validación

Prueba unitaria del repositorio memory/fake y prueba de integración HTTP con PostgreSQL desechable `fragments_test` y proveedor Review etiquetado fake. Sin migraciones ni llamadas IA reales. Producción autenticada por Ego Lite queda separada y no puede declararse PASS sin sesión disponible.
