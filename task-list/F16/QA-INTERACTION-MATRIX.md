# F16 — QA Interaction Matrix

**Estado:** Ejecución final registrada en `evidencie.md`; los estados limitados por API se identifican como bloqueados y no implican cobertura autenticada.

| ID | Ruta/superficie | Acción/estado | Resultado esperado | Método y viewport | Resultado/evidencia | Estado |
|---|---|---|---|---|---|---|
| QA-01 | `/` | CTA principal y enlaces | Navega a `/student/gallery`; anclas llevan a sus secciones | Ego Lite, href/snapshot, click CTA y teclado a 390/320 px | Click con destino `/student/gallery`; sin API, el gate actual redirige a `/student/login`. Anclas visibles y enfocables | PASS, con limitación API |
| QA-02 | `/student/login` | OAuth/estados de cuenta | Mensajes y destinos actuales; no mostrar secreto | 85 tests existentes; captura Ego Lite | Suite completa pasa; captura sin sesión. OAuth real no ejercido | PASS unitario; OAuth E2E no ejecutado |
| QA-03 | `/auth/complete` | progreso, éxito/error | Callback intacto | 85 tests existentes; ruta capturada | Suite completa pasa; callback real no iniciado | PASS unitario; callback E2E no ejecutado |
| QA-04 | `/student/gallery` | carga/vacío/error/retry/cargar más | Distinguir error de vacío; mantener retry/paginación | Tests existentes + captura; API local no disponible | Gate de sesión conservado; estado observado conduce al login; datos reales no comprobados | BLOCKED por API local |
| QA-05 | Galería detalle | elegir, cerrar, usar inspiración | Mantener selección y callback Mentor | Tests existentes y código inspeccionado | Tests pasan; flujo con catálogo de servidor no ejecutado | BLOCKED por API local |
| QA-06 | `/student/mentor` | editar/validar/importar/guardar | Mantener campos, importación y feedback | Tests existentes | Suite completa pasa; guardado real no enviado | PASS unitario; submit E2E no ejecutado |
| QA-07 | Mentor evaluación | evaluar/recuperar/entrega | Mantener busy, resultado, permisos y CTA | Tests existentes | Suite completa pasa; provider real no ejecutado | PASS unitario; servicio local no disponible |
| QA-08 | Descargas Mentor | README/PDF/error | Mantener descarga efímera y retry | Tests existentes | Suite completa pasa; no descarga real | PASS unitario; descarga E2E no ejecutada |
| QA-09 | `/student/review` | validar repo/SHA/enviar/esperar | Mantener errores y cola existentes | Tests y ruta Ego Lite; API local no disponible | Ruta se monta sin gate `getMe()`; links Review/Trainer conservan selección activa. Envío no iniciado | BLOCKED por API local |
| QA-10 | Review resultado | refrescar/findings/PDF | Respetar estado permitido | Tests existentes | Suite completa pasa; resultado depende del servicio | BLOCKED por API local |
| QA-11 | `/student/trainer` | reto/pistas/progreso/historial | Mantener contenido/progreso real | Tests y ruta Ego Lite; API local no disponible | Ruta se monta sin gate `getMe()`; no se añadió sesión compartida. No se fingieron datos | BLOCKED por API local |
| QA-12 | `/teacher/inspector` | gate, rol, carga, evaluar | Mantener gate docente/privacidad | Captura + código actual | Captura del estado API indisponible; autorización conservada en código; rol real no probado | BLOCKED por API local |
| QA-13 | `/teacher/mentor-control` | login/recuperación | Mantener credenciales y destinos | Tests existentes + captura en viewport | Suite completa pasa; sin autenticar/submit | PASS unitario; login E2E no ejecutado |
| QA-14 | Control Mentor | criterios/pesos/publicar | Mantener confirmación y validación actual | Tests existentes + código inspeccionado | Suite completa pasa; publicar no ejecutado | PASS unitario; backend no disponible |
| QA-15 | `/teacher/students` | sesión/lista/detalle | Mantener permisos/selección | Capturas; código inspeccionado | API 3000 indisponible; pantalla de error/retry conservada | BLOCKED por API local |
| QA-16 | `/teacher/reset-password` | formulario/éxito/error | Mantener validación y mensaje genérico | Tests existentes + captura sin datos | Suite completa pasa; envío no iniciado | PASS unitario; submit E2E no ejecutado |
| QA-17 | Públicas y login docente | teclado, orden, skip, foco | Orden lógico, visible, sin trampa | Ego Lite keyboard-only 390 px home y control docente | Home alcanza marca, ambas anclas, CTA y footer; formulario docente alcanza campos/acciones. Foco visible | BLOCKED para cobertura teclado completa; muestra PASS |
| QA-18 | Todas | contraste y zoom/reflow | WCAG AA y reflow a 320 CSS px | Cálculo sRGB + Ego Lite 320/390 px | Pares primarios AA anotados; muted sobre Cobalt 3.31:1 queda prohibido para texto normal. Reflow landing 320 comprobado; zoom no probado | BLOCKED por zoom y auditoría no textual |
| QA-19 | Landing + Student + Teacher | responsive | Sin overflow ni acciones tapadas | Ego Lite 11 rutas × 1440/1024/768/390/320 y capturas | 55 combinaciones previas sin overflow; landing 320/390 recapturadas tras fix de nav; CSS scroll horizontal solo en fila de enlaces | PASS; navegación pública recapturada |
| QA-20 | Landing + rutas con arte | reduced-motion | Imagen estática, información conservada | Ego Lite prefers-reduced-motion | `matchMedia=true`, `currentSrc` PNG aprobado; cero animaciones CSS | PASS |
| QA-21 | Review/Trainer | rutas directas y back/forward | URL y selección activa corresponden | Ego Lite navegación | Review→Trainer, atrás→Review, adelante→Trainer; `aria-current` cambia correctamente | PASS |
| QA-22 | Arte F16 | hashes | Copias idénticas al master kit | SHA-256 | WebP `CDDAD20E…52174A5`; PNG `0AF55AA4…7170E4B`; ambos coinciden entre kit/copia | PASS |
| QA-23 | Build | tests/typecheck/build | Gates verdes y warnings registrados | pnpm | contracts build PASS; web 20 files/85 tests PASS; typecheck PASS; build PASS. Warning existente chunks 491.75/525.11 kB | PASS |

## Procedimiento

Usar solamente Ego Lite para toda navegación visual, interacción E2E y captura. Ejecutar flows con providers fake claramente etiquetados, sin producción o llamadas reales a IA/GitHub/Moodle. Guardar screenshots bajo `task-list/F16/screenshots/` con ruta, viewport y estado. Agregar una fila cuando el código revele una acción actual que no esté en la lista, y justificar por qué es existente con archivo/símbolo. No declarar cobertura completa con inspección de código solamente.
