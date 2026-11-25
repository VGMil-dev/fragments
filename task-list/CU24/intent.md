# CU-24 — Verificación segura de Trainer

## Problema

El código de Trainer prueba persistencia PostgreSQL, aislamiento de intentos, claves idempotentes y banco asociado a commit. Sus suites de integración aceptan `DATABASE_URL` sin comprobar en runtime que la base abierta sea `fragments_test`; una configuración local equivocada podría escribir fixtures fuera del entorno QA.

## Objetivo

Hacer que las pruebas HTTP y Prisma de Trainer consulten `current_database()` y se detengan antes de fixtures/limpieza si la conexión no es `fragments_test`.

## No objetivos

- No alterar el comportamiento del producto, rúbricas, prompts, datos ni infraestructura.
- No disparar IA ni crear intentos en producción.
- No afirmar que un Review real, reto generado o interacción autenticada pasó.

## Responsable / criterio

PLANNER. Tests locales fake ejecutan; integración PostgreSQL aislada confirma la guarda en CI. Ego Lite autenticado se mantiene NO COMPROBADO si el Space autorizado no está disponible.
