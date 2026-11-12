# F13 — Identificación visual de versión

## Problema
Fragments no indica al usuario qué build está usando y no ofrece una forma comprobable de relacionarlo con el commit exacto publicado.

## Objetivo
Mostrar una etiqueta discreta en las superficies web y permitir que un build de release incorpore versión y SHA solo después de verificar tag anotada, commit construido y pertenencia a `origin/main`. Un build local sin datos de release muestra `dev`.

## No objetivos
No modificar tags históricos, publicar o desplegar, cambiar releases existentes ni añadir credenciales al frontend. No afirmar `v0.3.1` a partir del checkout actual sin demostrar su relación exacta.

## Owner y criterio
PLANNER. Respetar `AGENTS.md`, los documentos de diseño y el prompt F14 adjunto: el código de workflow confiable debe vivir en `main`, y esta tarea no accede a producción. Usar `ego-browser` exclusivamente para QA visual.
