# F15.2 — Identidad GitHub permanente y acceso según rol

## Problema

En producción `v0.4.3`, una cuenta GitHub personal llegó a una pantalla que afirmaba que no tenía perfil estudiantil habilitado. Por separado, la ruta de control docente devolvía 404 aunque la API de estado de cuenta respondía. La evidencia previa no determinaba la condición de elegibilidad del alumno ni distinguía un fallo temporal de API.

## Objetivo

Diagnosticar y corregir el flujo OAuth, autorizar estudiantes mediante la asociación estable de GitHub y la identidad de servidor, informar motivos de rechazo seguros, mantener protegidas las rutas docentes y hacer que el panel docente llegue a su handler real.

## No objetivos

- No exigir correo, dominio, organización ni repositorio institucional.
- No activar vinculación implícita ni conceder roles por correo.
- No solicitar permisos de acceso a repositorios GitHub.
- No modificar identidades, datos académicos o servicios compartidos en producción para hacer pasar pruebas.
- No desplegar con bypass ni tocar tags históricas.

## Owner

PLANNER / responsable de integración F15.

## Skills y criterio

- `ego-browser`: leer y ejecutar la guía instalada antes de QA visual; usar solo Ego Lite.
- TDD/verification: añadir primero regresiones que demuestren los fallos; conservar pruebas con cuentas y proveedores sintéticos; no declarar F15 terminada sin OAuth real productivo.
- Auditoría de seguridad: revisiones paralelas independientes, sin PII, cookies o secretos.
