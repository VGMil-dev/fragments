# F00 — Intent
Owner: PLANNER

## Problema y objetivo
El kit Fragments contiene los contratos y decisiones del MVP, pero aún no existe una aplicación. Preparar la configuración local de forma segura, confirmar el entorno y después fijar contratos y scaffold para el producto nuevo.

## No objetivos
- No migrar ni borrar una aplicación anterior.
- No imprimir, registrar, enviar a agentes ni versionar valores del `.env`.
- No llamar servicios externos con credenciales sin prueba opt-in y presupuesto explícitos.
- No desplegar ni modificar repositorios remotos.

## Skills y criterio
Para la etapa de configuración se aplica el procedimiento de `ego-browser` solo si se inicia una tarea de navegador; aún no se requiere navegador. Las skills de arquitectura, TDD y UI se consultarán antes de sus respectivas implementaciones. Las skills remotas de la matriz no están instaladas localmente y no se instalarán ni ejecutarán sin revisar primero su contenido y procedencia.

## Límites de repositorio
Antes de editar código, comprobar checkout, rama y cambios locales. Si no existe Git, localizar el checkout previsto o acordar una inicialización local; no eliminar, sobrescribir ni publicar archivos.
