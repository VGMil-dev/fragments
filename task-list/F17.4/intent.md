# F17.4 — UX-08 Objetivos y alcance

## Problema

La etapa 4 de Mentor no presenta objetivos individuales ni un catálogo real de tecnologías. El campo de tecnologías acepta texto libre, y la etapa expone «Condiciones propias» aunque la referencia aprobada ya no lo muestra. El API y PostgreSQL tampoco tienen catálogo de tecnologías ni asociación de sugerencias por aula.

## Objetivo

Implementar la etapa 4 de Mentor según la referencia aprobada del 2026-11-21, conservando el flujo actual de borradores, evaluación e importación/exportación DOCX. Añadir catálogo y recomendaciones deduplicadas desde aulas activas autorizadas, búsqueda por API, selección por identidad estable y persistencia comprobable en una base local `fragments_test`.

## No objetivos

- No construir administración docente del catálogo ni nuevas funciones de F18.
- No cambiar evaluaciones, snapshots históricos ni requisitos académicos.
- No escribir datos, ejecutar migraciones ni hacer pruebas en `fragments_prod`.
- No integrar simultáneamente con UX-07; actualizar esta rama después de que F17.3 se integre.
- No desplegar una migración nueva en producción sin autorización específica y gate F14/F21.

## Propietarios

- Coordinación, contratos, rutas generales y task list: Planner.
- Implementación React/API/persistencia: Agente A.
- Revisión visual y funcional independiente: Agente B, sin modificar código.

## Criterios profesionales

- Vercel React Best Practices: cargar estados remotos sin duplicar waterfalls, derivar estado y evitar renders innecesarios; adaptar las reglas a React/Vite.
- Ego Lite: única herramienta permitida para capturas y recorridos de navegador.
- Formularios accesibles, datos del servidor, controles de sesión y permisos verificados en backend.
