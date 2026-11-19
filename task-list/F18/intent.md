# F18 — Intent

Owner: PLANNER

## Problema y objetivo

Review rechaza algunos nombres de archivo válidos de GitHub porque el esquema compartido limita rutas a caracteres ASCII. En la versión desplegada, esa validación termina registrada como `GITHUB_UNAVAILABLE`, ocultando que es un snapshot inválido. La tarea debe aceptar rutas relativas imprimibles con Unicode y espacios, conservar sus nombres exactos y clasificar correctamente los snapshots inválidos.

## Fuera de alcance

- Acceso a repositorios privados, cambios de permisos o nuevas integraciones GitHub.
- Cambios a la forma pública de los DTOs, rúbrica, UI o presupuesto de lectura.
- Modificación manual de filas SQLite existentes.

## Criterio y skills

- Aplicar TDD para cubrir primero la ruta Unicode/espacio y confirmar el fallo antes de cambiar producción.
- Aplicar verificación antes de cierre, commit, PR o release.
- `backend-architecture` se revisó y se descarta como guía activa: la skill excluye arreglos localizados con causa y archivos identificados.

## Release objetivo

`v0.4.11`, siguiendo el flujo protegido F14, después de integrar en `main` y superar las verificaciones requeridas.
