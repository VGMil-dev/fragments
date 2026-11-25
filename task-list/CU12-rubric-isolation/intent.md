# CU-12 — Aislamiento de rúbricas entre misiones

Completar una comprobación de persistencia que falta en CU-12: publicar dos misiones propias con rúbricas distintas y verificar que publicar una versión nueva de la primera no modifica el snapshot de ninguna versión previa ni la rúbrica vigente de la segunda.

No cambiar código de ejecución, contratos, migraciones, rúbricas productivas, ni invocar IA. Usar únicamente el PostgreSQL desechable `fragments_test` de CI. La validación autenticada docente con Ego Lite se mantiene pendiente mientras el Space 44 no esté disponible.
