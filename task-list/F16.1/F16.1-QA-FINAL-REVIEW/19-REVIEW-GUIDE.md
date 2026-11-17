# F16.1 — Guía de revisión visual externa

Este paquete contiene 18 capturas PNG de las mismas rutas y estados de revisión seleccionados en el paquete F16, con sus mismos nombres, y esta guía y `20-QA-STATUS.md`. Las capturas F16.1 se copiaron directamente de archivos PNG producidos con Ego Lite; no se reconstruyeron ni retocaron. La carpeta F16 original permanece intacta en `task-list/F16/F16-QA-FINAL-REVIEW/`.

## Capturas y estados

Desktop corresponde a 1440×900; móvil corresponde a 320×900. Las cuatro vistas públicas/de acceso se conservan byte por byte desde F16 porque F16.1 no cambió esas pantallas. Las 14 restantes son capturas F16.1 actualizadas. Consulte hashes y estado de cada imagen en `20-QA-STATUS.md`.

| Archivo | Ruta | Viewport | Estado capturado / punto de revisión |
|---|---|---:|---|
| `01-landing-desktop.png` | `/` | 1440×900 | Visitante; portada pública F16, sin cambios F16.1. |
| `02-landing-mobile.png` | `/` | 320×900 | Visitante; portada móvil F16, sin cambios F16.1. |
| `03-login-desktop.png` | `/student/login` | 1440×900 | Sin sesión; vista de acceso F16, sin cambios F16.1. |
| `04-login-mobile.png` | `/student/login` | 320×900 | Sin sesión; vista de acceso móvil F16, sin cambios F16.1. |
| `05-gallery-desktop.png` | `/student/gallery` | 1440×900 | Fixture de estudiante y proyecto sintético `Huerto de aula · fixture F16.1`; revisar tarjeta, estado y acción de detalle. |
| `06-gallery-mobile.png` | `/student/gallery` | 320×900 | Mismo fixture; revisar jerarquía de tarjeta, legibilidad y controles en ancho móvil. |
| `07-mentor-desktop.png` | `/student/mentor` | 1440×900 | Fixture estudiantil; aviso completo de compartición, propuesta guardada y acciones de Mentor. |
| `08-mentor-mobile.png` | `/student/mentor` | 320×900 | Mismo fixture; aviso de privacidad y formulario adaptados a móvil. |
| `09-review-desktop.png` | `/student/review` | 1440×900 | Formulario inicial, campos vacíos; sin SHA ni repositorio real. |
| `10-review-mobile.png` | `/student/review` | 320×900 | Formulario inicial, campos vacíos; revisar labels, ayuda y botones en ancho móvil. |
| `11-trainer-desktop.png` | `/student/trainer` | 1440×900 | Reto sintético interactivo; pista consultada, progreso “En progreso” e historial de un intento. |
| `12-trainer-mobile.png` | `/student/trainer` | 320×900 | El mismo reto sintético; revisar tarjeta, pista, acciones y progreso con scroll móvil. |
| `13-inspector-desktop.png` | `/teacher/inspector` | 1440×900 | Sesión de fixture docente; selector de revisión y panel sin selección real. |
| `14-inspector-mobile.png` | `/teacher/inspector` | 320×900 | Mismo estado sintético; revisar reflow y disposición de acciones. |
| `15-mentor-control-desktop.png` | `/teacher/mentor-control` | 1440×900 | Configuración docente sintética; versión activa de fixture y GitHub desconectado. |
| `16-mentor-control-mobile.png` | `/teacher/mentor-control` | 320×900 | Mismo fixture; revisar encabezado común y agrupación de controles. |
| `17-students-desktop.png` | `/teacher/students` | 1440×900 | Lista con `@f16-student-fixture`; estudiante y proyecto sintéticos. |
| `18-students-mobile.png` | `/teacher/students` | 320×900 | Mismo fixture a 320 px; revisar lectura, selección y secciones. |

## Cinco refinamientos F16.1

1. **Navegación móvil:** enlaces de estudiante visibles a 320 px, objetivos táctiles adecuados, estado activo identificable y separación interior que evita recortar el foco.
2. **Tipografía:** tokens de escala compartidos; navegación y texto funcional usan 16 px como mínimo, mientras que metadatos secundarios pueden usar 14 px.
3. **Privacidad en Mentor:** el aviso previo a guardar/evaluar conserva toda la explicación de qué datos se comparten y se acomoda al ancho móvil.
4. **Galería:** el estado aparece una vez junto al título; consigna, metadatos y acción de detalle tienen jerarquía propia. El flujo de inspiración se conserva.
5. **Trainer y espacios docentes:** reto, pistas, acciones, progreso e historial se distinguen visualmente; Inspector, Control de Mentor y Estudiantes comparten encabezado y ancho de lectura.

## Privacidad y uso

Revisión de contenido visual realizada: las imágenes muestran únicamente fixtures marcados, campos vacíos, texto de ejemplo y estados sintéticos locales. No se observan credenciales, tokens, direcciones personales ni datos de producción. Los identificadores visibles `@f16-student-fixture`, `fixture-total`, el SHA reducido `aaaaaaa` y la fecha de la versión docente pertenecen al fixture de QA. GitHub aparece desconectado en Control de Mentor. No usar estas capturas como evidencia de una sesión real.

Las imágenes documentan apariencia y estado visual; no sustituyen QA funcional. Para limitaciones, verificaciones y hashes SHA-256, consulte `20-QA-STATUS.md`.
