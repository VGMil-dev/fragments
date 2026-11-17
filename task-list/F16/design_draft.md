# F16 Design Draft — Experiencia Pixel Night

**Estado:** Borrador para revisión EGM independiente. **Base funcional:** `origin/main` en `60e31bfb4781693b2310b7cd22cfc45e9aa1cdd2`.

## 1. Objetivos visuales

Fragments debe verse como una sola herramienta educativa, con una personalidad pixel-art nocturna y controles contemporáneos. Night, Cobalt y Lime son los tres colores de marca aprobados. Superficies, texto, bordes y estados restantes se definen como tokens F16 propuestos y no se fijan hasta revisar contraste y estados en contexto. El texto funcional permanece nítido, en tipografía sans-serif de sistema. El pixel-art representa identidad y progreso; nunca lleva información que falte en texto.

## 2. Usuarios y tareas

- **Visitante:** comprender el propósito y llegar al acceso/galería existente.
- **Estudiante autenticado por GitHub:** consultar galería, inspirarse, crear/editar/evaluar propuestas, usar Review sobre repositorio/commit, recibir retos Trainer, descargar entregas y conservar el progreso.
- **Docente autenticado:** acceder a Inspector, administrar configuración Mentor, revisar estudiantes/proyectos y restablecer contraseña.

La UI no cambia políticas de sesión, permisos, publicación, evaluación, persistencia ni contratos actuales.

## 3. Arquitectura de información y navegación

Las once rutas actuales se conservan exactamente. Landing enlaza a la galería y al área docente ya existente. StudentShell marca la ruta activa y conserva la navegación actual. Gallery y Mentor continúan usando la comprobación de sesión ya existente; Review y Trainer se renderizan como hoy, sin inferir ni añadir un gate compartido, y no se presentan como protegidos por este shell. La salida de sesión aparece según identidad cargada y comportamiento existente. TeacherShell agrupa Inspector, Control Mentor, Estudiantes/proyectos y cuenta/restablecimiento donde el código ya permita navegar. Los flujos de login y callback usan un layout de identidad compartido. No se añade una página para las tres ilustraciones conceptuales sin ruta.

El router liviano de `App.tsx` no se sustituye en F16. Se mantienen rutas y la conducta de fallback del código, salvo que una inspección demuestre un defecto de navegación directamente causado por el nuevo layout; cualquier corrección debe preservar URLs, permisos y estado.

## 4. Layouts

### Public Layout

Header editorial con marca, navegación por anclas existente y CTA hacia galería. Hero con copy y arte, secciones de pasos existentes y footer con enlaces docentes existentes. La proporción de dos columnas se apila en móvil; no ocultar navegación crítica. No inventar cifras o beneficios no sustentados.

### Student Layout

Header/topbar y navegación única compartida; ancho de lectura hasta 1280 px y contenido por feature. Se usa un encabezado común con navegación superior visible en todos los anchos; en móvil la fila de navegación tiene scroll horizontal propio. No se usa sidebar, drawer ni menú oculto. Mantiene skip link, contexto de sección, cuenta y acciones de salida. Los formularios de Mentor y Review preservan scroll, valores, borrador y CTA de retorno.

### Teacher Layout

Shell administrativo con contexto y navegación docente, vistas con densidad suficiente para tareas tabulares, formularios de edición y acciones sensibles con confirmación solo donde exista hoy. En móvil tabla y detalle se transforman en bloques semánticos/apilados sin esconder acciones.

### Auth Layout

Panel de ancho legible y feedback visible para login, callback OAuth y restablecimiento. No agrega controles al callback que alteren redirects, cookies o identidad.

## 5. Jerarquía y composición

Cada página tiene un solo H1, título de contexto, acción principal clara y contenido agrupado por tarea. Formularios, resultados y estados ocupan superficies semánticas; los acentos gráficos no compiten con la lectura. La vista de Review muestra secuencia/estado y evidencias disponibles. Trainer prioriza reto, pista y progreso existentes. Inspector prioriza autorización, identidad del estudiante y evidencia sin exponer la información privada que ya protege backend.

## 6. Tokens de diseño

El contrato detallado está en `DESIGN_SYSTEM_CONTRACT.md`. Tokens aprobados: Night `#030407`, Cobalt `#1558C9`, Lime `#D4FF24`. Propuestas: superficies azul-negras; texto blanco frío y gris azulado; estados informativos/éxito/advertencia/error; espaciado base múltiplo de 4; radios discretos; foco lime con contorno visible; sombra contenida; movimiento 140–220 ms, eliminado bajo reducción; breakpoints 320, 375, 768, 1024 y 1440 px. Todo color de texto/feedback se verifica contra superficie con WCAG 2.2 AA. Sin fuentes externas nuevas.

## 7. Alternativas de componentes y sistema

La app corre React 19 y Vite. Se consultaron Astryx CLI/Core 0.7.16 y sus rutas/APIs para Button, Card, Stack y TextInput. La herramienta confirma 174 componentes; Button requiere `label`, Card se reserva para elementos que sean objetos independientes y Stack organiza layout en un eje.

**Alternativas evaluadas:** (1) mantener estilos/componentes actuales: menor riesgo de integración, pero perpetúa la paleta y patrones divergentes; (2) migrar a Astryx: ofrece una librería amplia, pero introduce tema, StyleX y capa CSS externa mientras se cambia el sistema entero; (3) sistema local con React semántico y CSS tokenizado: crea una sola fuente visual sin alterar API/render y evita runtime/bundle adicional. Se elige (3), tras consultar la opción (2); Astryx no se adopta y sus paquetes temporales se retiran. Los componentes actuales se restilan, y solo se crearán componentes de presentación pequeños si eliminan duplicación real. No se actualiza React ni se agrega librería de animación.

**Alternativas de navegación:** barra superior etiquetada con tabs/rutas frente a sidebar. Sidebar funciona en escritorio amplio, pero consume ancho de trabajo para Mentor, Review y las tablas docentes; en móvil exige otro patrón y duplica superficies. Se elige un encabezado común con navegación superior visible y etiquetada, una sola línea que permite desplazamiento horizontal en ancho angosto; no se añade menú oculto ni sidebar. La selección usa `aria-current="page"`. Shells ligeros comparten marca, skip link y navegación, mientras el contenido/lógica permanece en cada ruta.

## 8. Componentes propios reutilizables

- `PublicLayout`, `StudentLayout`, `TeacherLayout`, `AuthLayout` como shells de composición.
- `PageHeader` y navegación activa con etiquetas de texto.
- `PixelArtFrame` con dimensiones explícitas, ratio, descripción apropiada y alternativa estática.
- `AsyncStateView` solo cuando unifica la estructura sin borrar el mensaje ni la recuperación específica de la feature.
- Controles de formulario existentes conservan etiquetas, restricciones, ayudas y validaciones.

No crear una biblioteca abstracta mayor que los patrones reales.

## 9. Formularios

Mantener inputs, valores, labels, required/maxlength, schemas y mensajes actuales. Errores junto al campo con `aria-invalid`/`aria-describedby`; resultado de envío con `role=status` o `role=alert`; estados ocupados deshabilitan solo la acción afectada. Login mantiene OAuth GitHub estudiante y mensaje de cuenta sin vincular. Teacher mantiene email/contraseña, sesión, vinculación GitHub confirmada y guardado/publicación. Password reset confirma la contraseña. DOCX en Mentor mantiene importación/plantilla. No convertir formularios en mock ni enviar datos distintos.

## 10. Tablas, listas y detalles

Preservar filtros, orden, paginación y selección que existan. En móvil usar overflow indicado o tarjetas que retengan encabezados de campo y acciones. El detalle de proyecto y de alumno conserva selección, historial y enlaces. Las acciones sensibles mantienen límites de permiso y confirmación actuales.

## 11. Estados

Cubrir estado inicial, espera, carga progresiva, vacío real, error recuperable, validación, éxito y falta de permiso donde estén presentes. Nunca mostrar vacío si la carga falló. Cada error ofrece explicación y una recuperación existente (reintentar, volver, login). No usar spinner infinito en solicitudes cuyo contrato ya finaliza en error. No fabricar datos, puntuaciones, progreso ni respuestas.

## 12. Recursos pixel-art

Mantener el ZIP de entrada intacto y conservar los SHA-256 del manifiesto. Se copian al public únicamente assets seleccionados y sin transformación. `Typing_Girl_and_Sleeping_Cat.webp` tiene 1 frame: usar como ilustración estática, no anunciarla como animada, y mantener el frame PNG explícito para reduced-motion. `Goggle_Kid_Walk.webp` tiene 8 frames, pero su frame visible tiene streaks horizontales que lo hacen inadecuado para producción en este diseño; no se copia ni usa. Los PNG de iconos son candidatos: revisar contacto/alpha a tamaño real antes de uso; etiquetas de navegación y acciones siempre textuales. No suavizar, re-pixelar, reescalar de forma fraccionaria ni reemplazar originales.

## 13. Responsive

Diseño mobile-first: 390 px móvil, 768 px tablet, 1024+ escritorio; también verificar 1440 px. Evitar scroll horizontal global, elementos fijos que cubran campos, navegación recortada y modales inaccesibles. Targets interactivos apuntan a 44×44 px cuando el espacio lo permita. Filas complejas se apilan en orden de lectura y sus acciones siguen disponibles.

## 14. Accesibilidad

WCAG 2.2 AA aplicable: estructura semántica y encabezados, landmarks, skip link, navegación por teclado, orden de foco, foco visible/no oculto, etiquetas y errores vinculados, nombres accesibles, contraste texto 4.5:1 y texto grande/controles 3:1, estados no transmitidos solo por color, reduced motion, zoom/reflow a 320 CSS px y alt text apropiado. No añadir roles ARIA redundantes; mantener botones/enlaces nativos.

## 15. Interacciones

Mantener rutas y efectos de cada CTA, volver, elegir detalle/proyecto, guardar/editar/evaluar, exportar, actualizar, cerrar sesión y confirmar permisos. Feedback visual acompaña operaciones sin crear una acción nueva. Transiciones cortas de color/estado; entrada por desplazamiento solo cuando apoya jerarquía, sin autoplay decorativo. Soportar `prefers-reduced-motion` y no activar sprites continuos bajo esta preferencia.

## 16. Criterios de aceptación

1. Las once rutas de `SCREEN_INVENTORY.md` se conservan y se contrastan con el código.
2. Cada layout responde a 320, 375, 768, 1024 y 1440 px sin recortes ni solapamientos; 320 CSS px valida el criterio de reflow WCAG.
3. La navegación, CTA, retorno, formularios, descarga, estados de sesión y permisos conservan su destino/comportamiento.
4. Todos los estados catalogados tienen mensaje y recuperación pertinentes.
5. Contraste y foco satisfacen AA en componentes visibles; las acciones pueden recorrerse con teclado.
6. Reduced motion presenta contenido estático y no depende del WebP de un frame para fingir animación.
7. Hashes de assets originales aprobados no cambian; candidatos se etiquetan correctamente.
8. Tests web, typecheck y build pasan sin fallos; warnings previos y cambios se reportan.
9. Ego Lite confirma dimensiones e interacciones; evidencia real se vincula en la matriz.
10. Revisiones EGM concluidas, hallazgos altos/críticos resueltos o declarados con trazabilidad; no se afirma aprobación pendiente.
11. No hay cambios backend/API/CI/CD/deploy ni publicación.

## 17. Riesgos y mitigaciones

| Riesgo | Control / reversión |
|---|---|
| Inconsistencia residual con CSS/tokens legacy | Inventariar consumidores antes de borrar reglas; test/build y captura por superficie tras cada fase; si cambia una feature, restaurar solo la hoja del checkpoint y corregir selectores. |
| Shell compartido altera foco, ancho o estado | Shell solo presenta navegación; no reubica estado feature. Validar foco activo, scroll/selección y rutas afectadas; revertir solo el shell si cambia comportamiento. |
| Navegación docente aparece a estudiantes | Renderizar enlaces dentro de la condición de ruta/rol actual; probar acceso anónimo y estudiante; no añadir gate ni cambiar permisos. |
| Tabla/detail móvil pierde encabezados, orden o selección | Conservar semántica/DOM cuando sea posible; verificar 320/375 px, teclado y selección antes de sustituir por bloques; rollback de esa superficie ante pérdida. |
| Reduced-motion conserva sprite/scroll animado | `prefers-reduced-motion` sustituye sprite por frame estático y desactiva transición; comprobar preferencia y respuesta del DOM. |
| Main avanzó desde la matriz | Matriz cita SHA F16 de partida; actualizar rutas desde `App.tsx` y registrar cualquier diferencia antes de implementar. |

## 18. Estrategia de implementación

Se usará React semántico, CSS local tokenizado y composición propia. Astryx 0.7.16 se consultó, pero se descarta porque su theme/StyleX no reduce el riesgo de una sustitución integral y agregaría capa de estilos/peso. Los componentes existentes se restilan; no se migran contratos.

Las alternativas de navegación fueron header superior vs. sidebar. Se seleccionó un header común de enlaces visibles con scroll horizontal solo en la fila de navegación para móvil/tablet. Sidebar consumiría ancho en formularios y detalle; un menú oculto añade pasos y estado. No se añadirá drawer.

Los shells comparten marca, skip-link y navegación; los componentes, estado y acciones de cada feature quedan en su archivo. El allowlist exacto, fases, tests y rollback están en `spec.md` §§ “Límites exactos de archivos” y “Fases estables”. Cada fase tiene commit checkpoint; si falla un gate de fase, `git revert` de ese commit, documentar salida, corregir en nuevo commit. Solo el planner autoriza una corrección de routing fuera del alcance visual; debe quedar en `decisions.md` antes de editar `App.tsx`. No modificar handlers ni estado para cerrar un criterio visual.

## 19. Estrategia de verificación

- Inventario estático contra `App.tsx`, rutas, permisos y tests.
- Contraste calculado para pares token/fondo y medición visual en aplicación.
- Tests dirigidos a conservación de flujos, etiquetas, errores y rutas.
- `pnpm --filter @fragments/contracts build`, test web, typecheck y build web.
- Ego Lite para landing y cada superficie en 320/375/768/1024/1440; keyboard-only y reduced-motion.
- QA Interaction Matrix enlaza acción, estado inicial, resultado esperado, viewport, comando/observación y evidencia.
- Auditoría EGM de especificación y readiness; rondas ordinarias limitadas a dos por hito y pendientes señaladas.
- `egm-drift-report` contra diseño final después de implementar.
- Verificar hashes de archivos originales de kit antes y después.

## 20. Protección de funcionalidad

No se borra ni cambia ninguna ruta, permiso, schema, endpoint, mensaje de error, validación, estado del servidor, fuente de identidad, dato o semántica. Si un requisito visual requiere comportamiento funcional nuevo, no se incorpora automáticamente; se documenta como bloqueo o propuesta posterior. La tabla de estudiantes puede explicar una respuesta vacía ya recibida por UI, si se distingue de carga/error; no se simulan alumnos ni proyectos.

## Apéndices de aceptación

- Inventario completo: `SCREEN_INVENTORY.md`.
- Tokens, contraste, breakpoints y componentes: `DESIGN_SYSTEM_CONTRACT.md`.
- Acciones, resultados y evidencia: `QA-INTERACTION-MATRIX.md`.
- Decisiones y procedencia: `decisions.md`.
