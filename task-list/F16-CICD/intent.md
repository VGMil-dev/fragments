# F16-CICD — propósito

## Problema

El sistema de release ya valida tags, SHA, procedencia, atestación y aprobación, pero las reglas de seguridad de todos los workflows y el comportamiento del script de backup no tienen una regresión de CI conjunta. La recuperación productiva depende de un procedimiento manual y los backups quedan en la misma VPS que la base.

## Objetivo

Agregar comprobaciones automatizadas para evitar que cambien silenciosamente los límites de seguridad de GitHub Actions y para probar la creación, integridad, permisos, hash y retención de backups SQLite con datos sintéticos. Documentar con precisión el comportamiento del rollback y el límite de almacenamiento local.

## No objetivos

- No publicar tags/releases, desplegar ni conectarse a la VPS.
- No cambiar los requisitos de aprobación, protecciones de `main`/tags, credenciales, runners o units productivos.
- No añadir un proveedor remoto de backups ni enviar datos a servicios externos.
- No modificar contratos, workspace/tooling compartido ni código funcional de la aplicación.

## Owner y criterio

PLANNER. Aplicar `AGENTS.md`, `SYSTEM_PROMPT_CODEX.md` y la especificación F16-CICD. Revisar el diseño y los cambios con Goldfish de contexto nuevo antes de cerrar. Ejecutar solo pruebas locales que usan fixtures sintéticos etiquetados; registrar sus salidas reales.
