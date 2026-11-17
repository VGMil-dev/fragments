# INC-OAUTH-LOG-LEAK — intención

Eliminar la exposición de parámetros OAuth en los registros de la API sin desactivar Better Auth, cambiar las respuestas públicas, debilitar rate limiting ni registrar solicitudes o excepciones completas.

La investigación parte de una sonda anterior con datos exclusivamente ficticios que apareció en los logs del contenedor API tras publicar v0.4.8. No se copiarán logs productivos ni valores OAuth reales a Git o al informe.

El alcance de este hotfix es la salida de diagnóstico de Better Auth y las pruebas de integración asociadas. No incluye merge, tag, release, despliegue, cambios a F16.5, al sistema de despliegue, al ledger de IA ni a las seis revisiones históricas.
