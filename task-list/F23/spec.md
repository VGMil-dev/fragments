# F23 — Especificación de trabajo

## Alcance

- Ruta de inicio docente `/teacher/dashboard` y shell compartido para Inicio, Mis aulas, Estudiantes, Classroom Studio, Control de Mentor, Review, Inspector y Configuración.
- Mantener rutas anteriores y una sesión Better Auth; conservar aislamiento de API y pantallas estudiante/docente.
- Reutilizar Classroom Studio F18.A, directorio de estudiantes/proyectos, Control de Mentor F11 e Inspector. No duplicar motores, LMS, ni mostrar Review sin relación y permiso verificables.
- Total de aulas propias incluyendo el historial; solicitudes pendientes solo de ingreso a aulas propias; proyectos y actividad solo cuando se puedan relacionar con registros persistidos autorizados. Sin métricas ficticias.
- `groupLabel` deja de ser obligatorio para crear aulas temáticas transversales. Aceptar estudiantes autorizados de distintos paralelos. No fusionar ni borrar aulas/matrículas/evaluaciones históricas.
- Provisionamiento/check idempotente limitado a `vgmiltonisaac@gmail.com`; comprobar colisiones, Better Auth y Resend sin exponer secretos. No modificar identidades ajenas ni ejecutar seeds o migraciones experimentales en `fragments_prod`.
- QA de datos sintéticos exclusivamente en `fragments_test`; comprobar `current_database()` antes de escritura.
- QA visual con Ego Lite en 320, 390, 768, 1024, 1440 y 1671 px, perfiles docente/estudiante aislados, teclado, foco, desbordamiento y permisos.
- Entregar `F23_EVIDENCIAS/` con máximo 20 archivos, incluido `INFORME_FINAL.md`; documentar fuente aprobada/hash, capturas, revisión independiente, limitaciones, QA DB, auth/email, PR/CI/release y despliegue realmente verificados.

## Criterios de aceptación

1. Docente autenticado entra al dashboard único y navega a herramientas existentes sin pedir sesión duplicada.
2. Estudiante no accede a herramientas docentes; rutas previas y portal estudiantil funcionan.
3. Indicadores no filtran ni inventan información; errores/vacíos son claros.
4. Aulas nuevas no exigen paralelo; las aulas y relaciones previas siguen intactas.
5. No se muestran resultados Review ajenos ni seguimiento sin vínculo comprobable.
6. Reviewer independiente Ego Lite emite PASS o REVISAR con hallazgos objetivos; toda revisión requerida se corrige hasta PASS o se deja explícitamente limitada.
7. Tests, typecheck, lint y build pasan; gates CI/F14, release y producción solo se declaran si sus evidencias reales lo confirman.
8. Informe y Notion reflejan implementación, límites y operaciones completadas; ningún secreto se registra.

## Referencia

Imagen aprobada 1671 × 941 px, SHA-256 `95853ad8066e204408b223cf38db8ab43c146cddc8bd25c61520c72fa5b43584`.
