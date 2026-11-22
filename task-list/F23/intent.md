# F23 — Intención

Unificar las herramientas docentes existentes de Fragments en un espacio común en `/teacher/dashboard`, con navegación accesible y coherente con Pixel Night. Mostrar aulas, solicitudes, proyectos y actividad únicamente cuando sus fuentes persistidas y permisos permitan verificarlos.

Las aulas nuevas deben poder agrupar estudiantes de distintos cursos según la temática, sin requerir un paralelo escolar ni generar aulas duplicadas por grupo. Se preservan los registros históricos; Review e Inspector siguen trabajando sobre evidencia individual de cada estudiante.

El alcance incluye la revisión del acceso de la identidad docente autorizada en producción, sin usar la contraseña expuesta previamente, y el envío comprobable de recuperación por correo. Todo QA con datos sintéticos pertenece a `fragments_test`; despliegue, si supera gates F14, usa la ruta de release protegida.

Referencia visual aprobada: imagen adjunta de 1671 × 941 px, SHA-256 `95853ad8066e204408b223cf38db8ab43c146cddc8bd25c61520c72fa5b43584`.
