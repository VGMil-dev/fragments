# INC-OAUTH-LOG-LEAK — especificación

## Criterios

- Identificar mediante código y reproducción local qué componente emite los logs OAuth y qué objeto transporta datos sensibles.
- Configurar un registrador de Better Auth que preserve severidad y códigos OAuth permitidos, sin serializar mensajes, URLs, cabeceras, objetos de error, detalles ni causas anidadas.
- Probar callbacks ficticios con estado inválido, código inválido, error anidado y éxito mediante el adaptador Node.
- Verificar que stdout/stderr capturados no contienen valores de prueba, que las respuestas no reflejan parámetros, que se persiste una sesión simulada y que rate limiting sigue habilitado.
- Revisar los destinos y permisos de logs productivos sin leer su contenido. Conservar solo hallazgos agregados y hashes/metadata no sensibles.
- Ejecutar tests, typecheck, lint y build; solicitar dos rondas consecutivas de revisión independiente limpias.
- Crear un PR aislado sobre el `main` vigente, sin merge/release/deploy. Confirmar que no existe v0.4.9 antes de proponerlo como siguiente PATCH.

## Límites

No usar códigos, tokens, cookies, secretos o cuentas OAuth reales. No inspeccionar repositorios de estudiantes. No modificar F16.5, pipelines, producción ni las seis revisiones históricas. No resolver ni liberar reservas inciertas del ledger.
