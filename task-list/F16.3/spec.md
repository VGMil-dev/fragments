# F16.3 — especificación

## Criterios de aceptación

1. En 320, 375 y 390 px, la altura del hero se deriva de su contenido y el dock deja 24–40 px después del CTA (más inset de área segura cuando exista). La siguiente sección comienza inmediatamente después del hero; sin contenido oculto ni saltos.
2. La ilustración conserva sus proporciones naturales y muestra completa a la protagonista, el gato y la luna en 320/375/390/768/1024/1440 px. No se editan ni regeneran los archivos de imagen.
3. En tablet 768 px, la separación entre el texto introductorio y la escena baja a un espacio moderado (objetivo 24–40 px); la escena completa queda seguida por el dock, sin solapamiento ni vacío artificial.
4. Se conserva el contenido, logo, tipografía, paleta, lema, beneficios, bienvenida, CTA, cabecera y comportamiento/rutas de F16.2.
5. No hay desbordamiento horizontal y los controles siguen siendo alcanzables con foco visible y objetivos táctiles actuales.
6. Las seis capturas finales Ego Lite se comparan con las capturas de F16.2 antes del cambio. Las pruebas pertinentes, suite, typecheck, build y `git diff --check` pasan.
7. Revisiones independientes (responsive, visual y accesibilidad) y dos rondas Goldfish frescas consecutivas se documentan. Zoom real/lector de pantalla deben marcarse como no verificados cuando no haya herramienta adecuada.
