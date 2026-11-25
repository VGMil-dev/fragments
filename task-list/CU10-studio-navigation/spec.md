# CU-10 — Especificación

## Alcance

En el detalle docente de un aula, mostrar navegación contextual a Datos del aula, Estudiantes, Habilidades y Misiones y rúbricas. Cada enlace apunta a una sección única de la misma vista, mantiene el aula y su estado, y permite enfocar la sección al activarlo por teclado.

Los enlaces deben conservar una altura mínima de 44 px, envolver en pantallas estrechas y usar tokens visuales existentes. No aplicar desplazamiento animado que ignore preferencias de movimiento reducido.

## Aceptación

- La navegación aparece solo en el detalle de un aula ya cargado.
- Cada enlace tiene un destino existente e identificable; no navega a otra aula o módulo.
- El destino recibe foco y el desplazamiento deja visible su encabezado/sección.
- Enlaces y destinos siguen siendo accesibles desde teclado y conservan el estilo F16.

## Verificación

- Vitest: destinos y enlaces presentes, asociación exacta y destino enfocable.
- Suite web, typecheck y build.
- Ego Lite docente: revisar desktop y ancho móvil en la sesión autorizada; no crear otro Space. Si no está disponible, producción/E2E quedan NO COMPROBADOS.
