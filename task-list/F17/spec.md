# Especificación F17 — Portal estudiantil

## Entradas, autoridad y límites
- La sesión GitHub/Better Auth y `accountId` estable autorizan al estudiante; identidad, propietario y rol nunca vienen de campos del cliente.
- Reutilizar Mentor, Review, Trainer, Galería y contratos actuales. Cualquier ajuste en `packages/contracts` lo coordina únicamente el agente principal antes de editar consumidores.
- F18 es dueño futuro de aulas, membresías, códigos, actividades, habilidades autorizadas y rúbricas. F17 solo conectará read DTOs tras acordar nombre de ruta y forma exacta con F18; el contrato compartido revisado es una propuesta sin esos detalles cerrados. La ausencia de ese contrato/backend se muestra como no disponible; no se adivinan rutas ni se agregan tablas/servicios académicos.
- F15 publica automáticamente cuando persisten una evaluación elegible y versionada y coinciden revisión, digest y configuración versionada; `/gallery-opt-in` responde `410 PUBLICATION_AUTOMATIC`. El propietario aprobó la opción A para F17: conservar la política F15 y el backend actual, con disclosure previo; no añadir opt-in ni cambiar la API. El aviso explica que guardar una evaluación elegible publica esa versión.
- La Galería expone propuesta, metas, habilidades, etiquetas/temas, alcance, restricciones, perfil GitHub y contexto versionado de materia/consigna/rúbrica; no expone puntaje ni comentarios privados. Consultan estudiantes autenticados y docentes. El estudiante no tiene opt-out ni puede retirar una publicación existente desde el portal; editar una propuesta no retira la versión publicada, una nueva revisión requiere su propia evaluación elegible y el docente puede retirar con registro de auditoría. Las publicaciones existentes permanecen sin migración, republicación ni retirada retroactiva.
- Portada: generación de prompt local determinista y portada predeterminada, sin proveedor de imágenes. La carga queda deshabilitada hasta que se demuestre volumen persistente, permisos, compatibilidad con contenedor read-only, autorización/validación de contenido/límites, backup+restore, limpieza de huérfanos, cuota/abuso y compatibilidad de rollback F14.

## Rutas y navegación
- `/student/dashboard`: Mi espacio; accesible solo con sesión estudiantil. Perfil GitHub real y un CTA: continuar una propuesta recuperable o crear la primera.
- Destinos principales: `/student/dashboard`, `/student/classrooms`, `/student/projects`, `/student/submissions`. Herramientas secundarias: `/student/gallery`, `/student/mentor`, `/student/review`, `/student/trainer`.
- Referencias visuales canónicas recibidas en `Fragments_F17_Pantallas_2026-11-19.zip`: cinco pantallas en `01_canonicas/` (dashboard, vistas principales del portal, Mentor idea, Mentor habilidades y Mentor consolidado); las cuatro exploratorias no son criterio canónico. El shell adopta navegación lateral en escritorio y barra inferior Inicio/Aulas/Entregas/Más en móvil. El dashboard prioriza continuar/crear proyecto, actividad persistida y estado honesto de F18 no disponible.
- Mentor admite una sola sección activa: idea, contexto, habilidades, objetivos y alcance, evaluación o portada. La navegación por etapa es accesible, con selector y controles Anterior/Siguiente en móvil.
- Móvil usa Inicio, Aulas, Entregas y Más. No añadir destinos superiores de Actividades/Solicitudes/Retos/Prácticas.

## Datos y contratos
- Mi espacio no presenta métricas, fechas, notas ni resúmenes sin fuente persistida autorizada. Los avisos son contextuales y no duplican listas.
- Propuestas: mantener una sola tabla/identidad/repository de Mentor. Añadir contrato Zod para contenido de borrador parcial, respuesta parcial y guardado condicionado por `expectedVersion`; la versión completa seguirá requerida para evaluar/emitir entregas. El progreso «Borrador completado: X %» cuenta solo campos obligatorios editables válidos; visitas, notas, evaluación y portada no cuentan. Las propuestas históricas incompletas deben poder recuperarse sin borrar campos.
- Mis entregas consulta `GET /api/me/submissions` autenticado y muestra resúmenes de registros reales de Mentor y Review con su fecha, puntaje orientativo y descarga. Una entrega no es aprobación docente. Propuestas guardadas están en Mis proyectos; historiales Review sin propietario persistido no se exponen.
- Read DTO de F18: dejar nombres/rutas como contrato coordinado antes de congelarlo. La ausencia/404/503 de F18 produce un estado de indisponibilidad; no un aula vacía ficticia ni acciones exitosas simuladas. No implementar matrícula.
- Contexto de aula y habilidades docentes son de solo lectura; sin misión asociada se explica que el proyecto es personal. Selecciones optativas solo pueden venir del catálogo autorizado; si no existe, indicar indisponibilidad sin texto libre que aparente aprobación docente.

## Mentor
- Idea: título, problema, solución, descripción y propósito.
- Contexto: datos reales de una misión F18 versionada y autorizada, read-only; sin misión, estado personal sin contenido docente inventado.
- Habilidades: requeridas bloqueadas; optativas seleccionables solo desde catálogo real autorizado.
- Objetivos/alcance: objetivos personales agregables, MVP, tecnologías previstas y resultado esperado, separados de las condiciones propias del proyecto y de restricciones docentes. Tecnologías y resultado esperado son opcionales para compatibilidad con borradores existentes y aparecen en la entrega generada.
- Evaluación: resumen, validación, botón explícito. Borrador nunca llama al evaluador. La evaluación persistida identifica la revisión exacta; no implica aprobación académica.
- Portada: disponible solo tras evaluación persistida para la versión actual. Prompt determinista y copiable, fallback Fragments; carga externa deshabilitada hasta superar los controles de infraestructura anteriores.

## Galería, Review y Trainer
- Galería conserva las reglas ejecutables actuales de F15 conforme a la decisión A del propietario. La UI informa la publicación automática, los datos expuestos y los controles limitados del estudiante; no sugiere consentimiento.
- «Tomar como inspiración» inicia una propuesta propia y no copia contenido ni propiedad. Portadas de galería solo si la revisión fue publicada por las reglas actuales.
- Review conserva solo GitHub autorizado + SHA exacto, descarga y comportamiento Unicode; no ZIP/carga de código ni cambios a Gateway.
- Trainer tiene Retos/Prácticas. Retos salen de Review real del estudiante y conservan muestreo 45/35/20. Prácticas que requieren F18 quedan no disponibles hasta recibir contexto real.

## Seguridad, fallos y privacidad
- `401/403` respetan sesión/rol; error transitorio permite reintento. No autorizar por correo/login visible.
- Consultas/ediciones de propuesta y artefactos siempre se filtran por ID de usuario autenticado; IDs ajenos no filtran existencia (404).
- Conflictos de versión devuelven estado recuperable sin sobrescribir la versión del servidor.
- Ninguna portada privada se expone en Galería o por URL pública. La ruta opt-in no debe sugerirse como operativa mientras devuelva 410.
- UI F16 Pixel Night en español, foco/teclado/reflow 320 CSS px/WCAG AA/reduced motion, sin claims de fidelidad completa a maquetas no disponibles.

## Aceptación GIVEN / WHEN / THEN
- GIVEN OAuth estudiantil válido, WHEN se abre `/student/dashboard`, THEN aparece perfil del servidor y un único CTA basado en propuesta propia recuperable.
- GIVEN usuario anónimo/docente, WHEN visita rutas student, THEN sesión/rol se resuelven según las rutas existentes y no aparece información de otro rol.
- GIVEN borrador parcial propio, WHEN se guarda y recarga, THEN campos y versión persisten; un usuario B no puede leer ni modificarlo.
- GIVEN una entrega Mentor/Review persistida, WHEN se abre Mis entregas, THEN solo aparecen registros de la identidad estudiante propietaria y sus PDFs requieren la misma sesión.
- GIVEN actualización concurrente con versión antigua, WHEN se guarda, THEN se obtiene conflicto sin sobrescribir servidor.
- GIVEN propuesta incompleta, WHEN se pulsa Evaluar, THEN no se llama al proveedor; al completar campos válidos y confirmar, se persiste evaluación de la versión exacta.
- GIVEN ausencia de aula/actividad F18, WHEN se abre Mis aulas/Contexto, THEN se explica que el servicio/contexto no está disponible y no se crean datos/solicitudes ficticios.
- GIVEN una evaluación elegible persistida, WHEN se consulta Galería, THEN se publica la revisión exacta según la política automática aprobada y el aviso describe datos, audiencia, controles del estudiante y retirada docente; no se finge consentimiento.
- GIVEN etapa Portada, WHEN aún no se demostró almacenamiento/recovery seguro, THEN prompt/copiar/fallback funcionan y carga permanece deshabilitada.
- GIVEN Review/Trainer, WHEN se usa flujo, THEN Review conserva GitHub/SHA y Trainer solo muestra retos basados en análisis real con pesos 45/35/20.
- GIVEN viewport 320/390/768/1440 y navegación por teclado/reduced motion, WHEN se recorren shell y Mentor, THEN no hay overflow ni pérdida de foco/función.

## Verificación y operación
- TDD; pruebas contracts, API/SQLite, auth/ownership/versionado, UI y regresiones. Fakes etiquetados; nada de IA pagada ni ejecución de proyectos estudiantiles.
- `pnpm install --frozen-lockfile`; `pnpm exec turbo run test typecheck lint build --force`; `git diff --check`.
- ego(lite) exclusivamente para QA visual/E2E tras ejecutar skill `ego-browser`; capturas reales a 320/390/768/1440, consola limpia y sin datos sensibles. Sin Playwright/Puppeteer/Cypress.
- Revisión Goldfish enfocada en privacidad, contrato de Galería, borradores/migración, F18, autorización y portadas.
- PR hacia `main`; CI del HEAD definitivo; merge normal solo con protecciones satisfechas. Release únicamente vía F14, tag anotada SemVer autorizada, pruebas de backup/rollback y verificación productiva real.
- Actualizar Notion con evidencia observada; distinguir código local, CI, PR, release y producción.
