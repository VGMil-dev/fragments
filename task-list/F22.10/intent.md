# F22.10 — Frontera segura para logs operativos de Review

## Problema

El worker Review emite eventos operativos reales con una forma TypeScript acotada, pero el serializador final enviaba directamente cualquier propiedad presente en tiempo de ejecución. Una propiedad adicional, un identificador malformado o un código upstream con saltos de línea podía terminar en stdout.

## Objetivo

Validar y proyectar eventos `review.*` al emitirlos: conservar solo campos operativos aprobados, limitar identificadores y valores numéricos, retirar detalles provider inseguros y evitar que un fallo del writer cambie el resultado del trabajo.

## Límites

- No registrar prompts, mensajes crudos de error, cabeceras, cuerpos de requests, contenido de repositorios, correos o tokens.
- No persistir eventos, cambiar APIs/contracts, migraciones, worker scheduling, infraestructura o configuración del host.
- No consultar producción ni afirmar retención/rotación stdout.
- Un evento inválido se descarta; un fallo del sink no interrumpe el trabajo Review.
