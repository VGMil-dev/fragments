# INC-REVIEW-2026-11-16 — Incidente Review y seguridad de logs

## Problema

Seis trabajos Review fallaron en producción el 2026-11-16 entre 12:35 y 12:37, hora de Bogotá. La API siguió saludable, pero no entregó retroalimentación. El backend descartaba excepciones y el proxy registraba URLs con query strings OAuth.

## Objetivo

Preservar SQLite y los metadatos mínimos del incidente; identificar lo que la evidencia sí y no permite concluir; añadir diagnóstico estructurado que no filtre datos de estudiantes; habilitar reintento manual, atómico y acotado solo para fallos transitorios clasificados; proteger logs OAuth y corregir IP de cliente confiable en Better Auth.

## No objetivos

- No desplegar ni reiniciar servicios de producción.
- No reejecutar los seis trabajos originales sin autorización y revisión individual.
- No registrar contenido de repositorios, mensajes de excepción, tokens, cookies, OAuth codes/state, códigos de verificación, query strings, IPs de estudiantes ni cabeceras Referer.
- No modificar la portada F16.5.

## Owner

PLANNER.

## Criterio aplicado

TDD, leases SQLite y transiciones condicionales; error codes allowlist con reintento iniciado por el estudiante y límite fijo; fallo ambiguo de IA requiere conciliación manual para evitar cobros duplicados. Configuración y código permanecen en una rama local hasta autorización explícita de despliegue.
