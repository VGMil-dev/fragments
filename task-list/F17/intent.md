# F17 — Portal estudiantil y Mentor de seis etapas

## Problema
El espacio autenticado actual entra directamente a herramientas aisladas. No hay dashboard estudiantil ni secciones reales de aulas, proyectos y entregas; Mentor presenta un formulario único y solo guarda propuestas completas. Esto dificulta recuperar el trabajo y distinguir datos académicos reales de funciones futuras de F18.

## Objetivo
Implementar un espacio estudiantil responsive y accesible sobre OAuth GitHub y servicios/persistencia existentes: Mi espacio, Mis aulas, Mis proyectos, Mis entregas, Galería, Mentor, Review y Trainer. Mentor debe permitir borradores recuperables y navegar seis vistas independientes. Las funciones académicas futuras deben quedar preparadas mediante contratos de lectura, sin crear el backend F18 ni mostrar datos ficticios.

## No objetivos
- Mantener la política automática existente de F15, aprobada expresamente para F17 con aviso previo claro. Documentar el disparador, contenido, audiencia y controles reales; sin consentimiento ficticio ni cambio de API.
- No desplegar carga de imágenes hasta demostrar persistencia, permisos, compatibilidad read-only, recuperación, limpieza, cuotas y rollback F14. Si no se demuestra, limitar etapa Portada a prompt copiable y portada determinista.
- No implementar aulas, códigos, matrículas, rúbricas, contexto docente ni servicios de F18.
- No implementar F19 (crear repositorios desde Mentor), F20 (likes/vistas), generación pagada de imágenes ni backend académico duplicado.

## Owner
PLANNER / agente principal. Contratos compartidos, migraciones y routing general quedan bajo el agente principal.

## Fuentes y criterio
- Solicitud F17 aprobada con ajustes obligatorios en el chat.
- F17 Notion (revisada 2026-11-18), F18 y contrato F17–F19 (revisados 2026-11-19).
- `AGENTS.md`, `SYSTEM_PROMPT_CODEX.md`, diseño/contratos F16 y árbol vigente en `origin/main`.
- `ego-browser` es obligatorio antes de cualquier QA de navegador. Tests con proveedores fake y sin código de estudiantes.
