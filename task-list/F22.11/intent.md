# F22.11 — Feed operativo de Review para administración

## Problema

El worker ya emite eventos operativos de Review a stdout, pero la consola Fragments no puede ver los intentos, etapas ni errores del proceso actual. El equipo debe recurrir al host para correlacionar problemas, y la retención real del host sigue por separado sin comprobar.

## Objetivo

Mantener una muestra acotada y volátil de los mismos eventos redactados emitidos por el worker, y mostrarla en una vista de solo lectura exclusiva para admin con registro previo de cada lectura.

## Límites

- No guardar prompts, mensajes de error, cabeceras, cuerpos de requests, contenido de repositorios, puntajes ni datos de estudiantes.
- No persistir en PostgreSQL ni prometer historial anterior al arranque o recuperación tras reinicio.
- No agregar acciones administrativas, migraciones ni acceso directo del navegador a la base/host.
- Sin sesión Better Auth admin disponible, UI admin real y eventos de producción quedan NO COMPROBADOS.
