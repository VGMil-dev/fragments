# F16 Screen Inventory — verificada contra HEAD F16

**Fuente de rutas:** `apps/web/src/App.tsx` en `60e31bfb4781693b2310b7cd22cfc45e9aa1cdd2`. Los diseños del kit eran propuestas; esta lista se debe actualizar si la implementación de F16 descubre una ruta real distinta.

**Ego Lite:** cada ruta se capturó a 1440/1024/768/390/320 px en `screenshots/current/`. La API local no se inició: rutas con sesión/datos pueden mostrar login o error; esas capturas solo documentan la presentación de esos estados y no validan acciones autenticadas.

## Rutas

| Ruta | Audiencia/layout | Vista real | Acciones y estados a conservar | Cobertura |
|---|---|---|---|---|
| `/` | pública | landing editorial | anclas de contenido, CTA galería, enlaces de pie docente | Ego Lite 5 tamaños; `home-*` |
| `/student/login` | identidad estudiante | login OAuth GitHub | continuar OAuth, sesión ya iniciada, `account_not_linked`, errores, volver a landing | tests de login; Ego Lite 5 tamaños; API offline |
| `/auth/complete` | identidad estudiante | callback de OAuth | progreso, éxito/redirect, error y recuperación presentes; no agregar control que cambie el callback | tests de callback; Ego Lite 5 tamaños; API offline |
| `/student/gallery` | Student | galería paginada; `getMe()` gate actual | comprobar sesión, cargar, retry, vacío, error, cargar más, elegir proyecto, abrir detalle, usar proyecto como inspiración, crear propuesta | tests de galería; Ego Lite 5 tamaños; `getMe()` redirige sin API |
| `/student/mentor` | Student | propuestas Mentor; `getMe()` gate actual | importar DOCX/descargar plantilla, elegir/crear/editar propuesta, validar/guardar, evaluar/reevaluar/recuperar evaluación, generar entrega, descargar README/PDF, volver; errores, loading y éxito | tests de Mentor/DOCX; Ego Lite 5 tamaños; `getMe()` redirige sin API |
| `/student/review` | Student | formulario Review y resultado; sin gate de sesión compartido en `App.tsx` | enviar repo + commit SHA, validar, consultar progreso/resultado, reintentar caminos existentes, crear y descargar PDF, volver a Mentor | tests de Review; Ego Lite 5 tamaños; sin gate compartido |
| `/student/trainer` | Student | reto Trainer; sin gate de sesión compartido en `App.tsx` | ver reto, revelar pistas, recorrer progreso/historial y acciones reales del componente | test de Trainer; Ego Lite 5 tamaños; sin gate compartido |
| `/teacher/inspector` | Teacher | TeacherGate e Inspector | estado de sesión/rol, login docente, cargar estudiantes/evaluaciones, acciones de selección/registro disponibles, errores y confirmación sensible si existe | Ego Lite 5 tamaños; TeacherGate muestra login; API offline |
| `/teacher/mentor-control` | Teacher | control de contexto y rúbrica | login, cargar configuración/cuenta, vincular GitHub tras confirmación, editar criterios, añadir/quitar, guardar borrador, publicar con pesos = 100, errores/éxito | tests MentorControl; Ego Lite 5 tamaños; formulario sin enviar |
| `/teacher/students` | Teacher | estudiantes y proyectos | comprobar identidad docente, cargar lista, seleccionar alumno/proyecto, navegar a reset, errores/carga; la lista y proyectos no tienen estado vacío explícito actualmente | Ego Lite 5 tamaños; error de API visible; sin datos autenticados |
| `/teacher/reset-password` | Auth docente | restablecer contraseña | validar contraseña/confirmación, enviar, ocupado, éxito/error, retorno | tests reset; Ego Lite 5 tamaños; API offline |

## Estados internos registrados

| ID | Contexto | Presentación propuesta para F16 | Fuente/evidencia |
|---|---|---|---|
| ST-01 | Detalle galería/proyecto | panel lateral en desktop; detalle de pantalla completa en móvil con cerrar/volver | `StudentWorkspace.selectedId/selectedDetail` y matriz F16 |
| ST-02 | Mis propuestas y evaluación | lista + editor y resultados en secciones; mantener selección y revisión guardada | `StudentWorkspace.selectedProposal`, `MentorScreen` |
| ST-03 | Progreso/descarga Review | cronología de proceso y hallazgos; descarga solo al estado real permitido | `ReviewScreen` y componentes submissions |
| ST-04 | Reto, pistas e historial Trainer | reto principal primero; pistas graduadas e historial secundario | `TrainerScreen` y matriz F16 |
| ST-05 | Inspector detalle/evidencia | panel de evidencia y separación visual para acción sensible | `TeacherGate`, `TeacherWorkspace`; validar comportamiento específico antes de añadir confirmación |
| ST-06 | Detalle de alumno | panel responsive con identidad, proyectos y enlaces existentes | `TeacherStudentsWorkspace` |

## Conceptos sin ruta

EcoCampus, Bitácora independiente y Análisis independiente son ilustraciones/conceptos en `design/screens.json`. No son destinos de navegación ni features autorizadas en F16. Pueden aparecer únicamente como ejemplos editoriales si ya existen en el contenido aprobado y sin CTA que implique funcionalidad; por defecto no se incorporan.

## Contraste con matriz inicial del kit

Las once rutas de la hoja `Pantallas` coinciden con los casos explicitados por `App.tsx`. La matriz aporta seis estados internos válidos, no rutas adicionales. Su nota de fuente decía rama principal consultada antes del HEAD F16, por lo que la verificación fuente de verdad es el commit indicado arriba. La navegación y las acciones concretas se comprobaron en `App.tsx` y archivos `apps/web/src/features/**`; revisar dinámicamente en Ego Lite antes de marcar cobertura completa.

## Estados transversales

Registrar por feature y no inventar simulaciones: carga inicial y progreso; lista vacía; error de red/API con recuperación; sin sesión/rol; campos inválidos; operación ocupada; éxito; permisos denegados; detalle seleccionado; descarga bloqueada/error. `App.tsx` llama `getMe()` solo para Gallery/Mentor; Review/Trainer se montan sin esa comprobación frontend compartida. La autorización backend no se infiere y queda fuera de F16. `TeacherStudentsWorkspace` no muestra vacío explícito para estudiantes/proyectos; agregar una explicación visual para respuesta válida vacía es una mejora candidata F16, no un estado ya existente. Si el código no produce un estado, no se agrega lógica funcional como parte del rediseño; se deja anotado para decisión posterior.

## Nuevas rutas descubiertas

Ninguna adicional durante la inspección de `App.tsx`. El prefijo `/student/*` es una regla de render y no una ruta explícita. Los paths no reconocidos fuera de ese prefijo se muestran como landing por el fallback actual. El contrato visual no debe crear un `NotFound` ni cambiar esa conducta por iniciativa propia.
