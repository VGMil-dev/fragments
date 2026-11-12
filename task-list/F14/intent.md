# F14 — Release seguro por tag

## Problema
El build candidato manual de F13 no despliega y no acredita aislamiento, aprobación ni controles de producción. F14 debe permitir publicar versiones deliberadamente sin que cambios ordinarios del repositorio inicien releases.

## Objetivo
Definir y preparar un flujo de release cuyo único evento de entrada sea publicar una tag anotada nueva con formato `vMAJOR.MINOR.PATCH`; validar procedencia y SHA exacto antes de cualquier autorización protegida o privilegio de despliegue.

## No objetivos
No activar el runner de producción hasta auditar su aislamiento real. No desplegar, modificar tags históricas, alterar SQLite/producción, habilitar llaves SSH en GitHub ni cambiar el workflow build-candidate de F13 sin justificación.

## Owner y criterio
PLANNER. Seguir el prompt F14 adjunto, `AGENTS.md` y los contratos de seguridad del proyecto. Las reglas de activación de `spec.md` son obligatorias para cualquier implementación y no pueden relajarse por conveniencia del workflow.

## Implementación prevista
Usar runners hospedados ARM64 para verificar y construir desde el commit exacto de la tag. Un job del entorno `fragments-production` publica el artefacto aprobado; un agente pull local, separado del runner compartido, valida manifiesto, atestación y procedencia antes de operar solo API/web. Si no se verifica cualquiera de estas barreras, no se activa el agente ni se publica una versión.
