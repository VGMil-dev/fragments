# F16.2 — especificación

## Criterios de aceptación

1. La portada pública conserva el encabezado, identidad visual, introducción, pasos y pie existentes; las rutas privadas mantienen sus manejadores previos.
2. La sección inferior integra una sola vez los tres beneficios, el mensaje «Un nuevo capítulo comienza…» y el botón verde «Comenzar».
3. El CTA y los accesos de autenticación usan el flujo GitHub existente (`/student/login`) y comunican ese destino.
4. La ilustración coincide con el archivo estático de la plantilla (1774×887, SHA-256 `0E10BF9115A4022DD1CD7AEE917A4B9E44B30CBE2841CE34A3CF5800CCF6B2AB`); es decorativa para tecnologías de asistencia. No se incluye animación no aprobada.
5. A 1440, 1024, 768, 390, 375 y 320 px, el encuadre y jerarquía siguen las referencias, el CTA conserva al menos 52 px de alto y no hay desbordamiento horizontal.
6. Los beneficios conservan nombres completos accesibles en móvil; abreviaturas visuales no duplican esos nombres para lectores de pantalla.
7. Tab permite alcanzar los enlaces y CTA con indicador visible. Con `prefers-reduced-motion`, no hay animación de fondo y se reduce la transición decorativa.
8. Las pruebas de portada, suite, typecheck y build pasan; las capturas y hallazgos quedan documentados.
