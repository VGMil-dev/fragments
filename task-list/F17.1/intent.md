# F17.1 — Pulido visual de Mentor

## Problema
Mentor ya ofrece el flujo de seis etapas de F17, pero su composición no sigue la referencia visual aprobada por el propietario para Idea. Además, `icon.svg` todavía sirve un símbolo anterior y la ruta del favicon mantiene una versión distinta del isotipo vigente.

## Objetivo
Pulir la experiencia de las seis etapas de Mentor siguiendo la composición de la captura proporcionada, conservando Pixel Night, datos reales, permisos, validaciones y acciones existentes. Sustituir el contenido de `apps/web/public/icon.svg` por el SVG canónico A-003 y asegurar que cabecera y favicon presenten la identidad oficial.

## No objetivos
- Cambiar contratos, persistencia, API, permisos, cálculos o integraciones de F21.
- Inventar datos, habilitar funciones de portada no disponibles o interpretar el progreso de la captura como dato real.
- Alterar el archivo fuente A-003 u otros assets de marca.
- Publicar o desplegar sin verificación y sin que F21 permita una integración segura.

## Owner
Planner, con Agente A para la implementación UI y Agente B para la revisión visual independiente.

## Criterio y skills
- `ego-browser` v2.2.1: revisión visual real exclusivamente con Ego Lite; sin Playwright.
- `verification-before-completion`: informar solo resultados observados y evidencia fresca.
- Referencias funcionales: F17 y UX-05 a UX-10; referencia de composición: imagen aportada en este encargo.
