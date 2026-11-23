# F22.13 — Historial persistente de eventos operativos

## Problema

F22.11 y F22.12 exponen eventos Review/Mentor reales en un buffer por proceso y stdout. El feed admin pierde la muestra al reiniciar la API, por lo que no permite consultar una ventana operativa estable.

## Objetivo

Persistir una proyección redactada de los eventos Review y Mentor en PostgreSQL y permitir que los feeds admin actuales consulten la muestra más reciente con retención acotada. Las evaluaciones deben continuar aunque falle el sink de observabilidad.

## Límites

- Reutilizar las rutas y controles admin existentes; sin mutaciones ni contratos nuevos.
- Persistir solo después de las proyecciones allowlisted ya existentes; no almacenar payloads originales, IDs académicos, texto libre, prompt, modelo/proveedor, cookies ni secretos.
- Mantener stdout estructurado y buffers locales para pruebas.
- Aplicar retención temporal y límite de filas.
- No efectuar lecturas/escrituras de producción manuales ni generar eventos IA de prueba.
- Registrar con claridad que ejecución productiva, sesión admin y retención real no quedan verificadas por pruebas fake/locales.

## Skill y método

La matriz del repo prescribe backend-architecture, test-driven-development y verification-before-completion, pero sus SKILL.md originales no están instalados en las rutas consultadas. Seguiré los límites equivalentes locales de AGENTS.md y el método red-green-refactor sin instalar dependencias.
