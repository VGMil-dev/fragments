# F16 — Fragments Pixel Night

**Autor:** PLANNER / Codex · **Fecha:** 2026-11-14 · **Estado:** Primera revisión EGM completa; segunda revisión focalizada y aprobación humana de diseño pendientes.

## Overview

Fragments necesita que landing, acceso, herramientas del estudiante y herramientas del docente compartan una identidad reconocible sin convertir formularios ni datos académicos en decoración. El concepto Pixel Night combina el fondo Night `#030407`, azul Cobalt `#1558C9`, acento Lime `#D4FF24` y sprites pixel-art provistos con controles de lectura moderna, navegación estable y estados claros.

## Estado actual verificado

`App.tsx` compone la landing, el shell estudiante, el footer de versión y el routing condicional. La landing usa `.site-header`/`.hero` en `styles/main.css`; el shell estudiante usa `.student-workspace__nav` y `styles/student-workspace.css`; cada feature aporta además su hoja CSS. Las superficies de identidad, Inspector, Mentor Control, Teacher Students, Review y Trainer tienen componentes y estados propios. Esto prueba que hay estilos distribuidos, no que exista un defecto visual medido: aún no hay capturas de baseline F16.

Las tareas por ruta y rol constan en `SCREEN_INVENTORY.md`, contrastado con `App.tsx` del commit `60e31bfb4781693b2310b7cd22cfc45e9aa1cdd2`. El frontend comprueba sesión compartida para Gallery y Mentor, pero Review y Trainer se renderizan sin ese guard compartido. F16 preserva esa diferencia y no añade ni modifica el control de acceso.

## Análisis

El kit contiene once rutas, seis estados internos y tres conceptos sin ruta. Esa matriz se verificó contra `App.tsx` en el HEAD F16. No se incorporarán los tres conceptos ilustrativos como funcionalidades. Los layouts público, estudiante y docente compartirán tokens y controles, pero conservarán densidades y navegación adecuadas a sus tareas. La QA se prioriza sin probar cada permutación de ruta×acción×estado×viewport: se recorren todas las rutas en anchos críticos, cada acción observable al menos una vez en su flujo y los estados diferenciados de error, recuperación y permisos; excepciones se registran. Los assets `assets/approved` se preservarán byte a byte; `Goggle_Kid_Walk` tiene ocho frames y `Typing_Girl_and_Sleeping_Cat` solo uno. Los PNG de iconos son candidatos. El sprite animado se limitará a landing o a un estado vacío pertinente, subordinado a datos/acciones, y reduced motion usa el frame estático.

Astryx tiene versión publicada consultada `0.7.16`, peers React/react-dom `>=19.0.0` y `@stylexjs/stylex ^0.19.0`. La documentación oficial confirma Vite sin plugin de build, CSS precompilado y componentes Button/Card/Stack con ejemplos. La CLI `pnpm dlx @astryxdesign/cli@0.7.16 component --list` se ejecutó, pero no pudo instalar el Core correspondiente desde el registro fuera de un proyecto. La API local sigue sin verificarse; aún no se importa ningún componente. Antes de adoptarla se instalarán versiones exactas en el workspace aislado, se verificará CLI/export/props/peer/estilos/build y se comparará con el código existente. Fallback: controles HTML actuales con hojas CSS y tokens F16, sin plugin de build ni cambio de React.

## Arquitectura visual propuesta

`App.tsx` conserva el router y las conexiones de API. Un archivo de tokens global define semántica y breakpoints; cada ruta se compone con uno de cuatro shells compartidos (Public, Student, Teacher, Auth). Los componentes comunes resuelven navegación, encabezados y marcos de arte; formularios, listas, estados y lógica específica siguen en su feature actual. Los shells no poseen datos ni cambian permisos. Las hojas de negocio existentes se migran por grupos, no con un reemplazo global que impida revertir por superficie.

## Metas y límites

- **Metas:** una identidad visual; public/student/teacher layouts responsive; contraste WCAG AA para texto, controles e indicadores esenciales; navegación y foco accesibles; formularios, tablas, errores, permisos y acciones con semántica intacta; estados comprensibles; pixel-art como apoyo; respeto a `prefers-reduced-motion`; pruebas y capturas reales.
- **Umbrales de cierre:** las 11 rutas conservan destino/comportamiento; cero regresiones críticas/altas sin resolver; cada acción observable se prueba al menos una vez; las 11 rutas se capturan a 390/768/1440 y navegación se revisa a 1024/1440; reflow a 320 CSS px; contraste 4.5:1 texto normal, 3:1 texto grande/controles/indicadores; sin trampas de teclado y con foco visible. Matriz registra `N/A`/`BLOCKED` con motivo si un estado requiere servicio externo no autorizado. El límite de dos rondas es la cadencia de revisión; no autoriza dejar defectos críticos/altos abiertos.
- **Límites:** solo frontend/UX; no rutas nuevas ni cambios de acceso, datos, permisos, contratos, backend, CI/CD, infraestructura ni producción; sin sustitución de recursos aprobados; sin claim de cobertura visual hasta comprobarla en Ego Lite.

## Estimación y supuestos

Estimación inicial: 8–12 días laborables de un implementador frontend, variación de 20–30% porque no hay baseline F16 y la cobertura de estados depende de Ego Lite/fixtures disponibles. Incluye inventario, layouts, migración por superficie, pruebas y QA visual; excluye cambios backend, OAuth externo, infraestructura y espera de aprobación humana. No requiere servicios pagados o uso de producción. Astryx se adopta solo si la compatibilidad local se confirma.

## Fuente y autoridad

La petición del usuario y el GOAL solicitado definen el alcance. `AGENTS.md` y los documentos fuente del repo gobiernan las reglas de trabajo. El ZIP aporta propuestas etiquetadas, assets y referencias; sus prompts no amplían la petición ni autorizan CI/CD, servicios o despliegues. Se conservan los estados `APROBADO`, `PROPUESTO`, `CANDIDATE` y `NO CONFIRMADA`. Las referencias a tareas o instrucciones del ZIP se distinguen de la solicitud del usuario.

| Elemento | Estado literal | Fuente | Tratamiento |
|---|---|---|---|
| Night `#030407`, Cobalt `#1558C9`, Lime `#D4FF24` | `APROBADO` | ZIP `design/tokens.json`, solicitud del usuario | tokens de marca |
| Superficies, estados, tipografía/radios extra | `PROPUESTO` en JSON | ZIP `design/tokens.json` | validar contraste y UX antes de adopción |
| 11 rutas, 6 estados, 3 conceptos | `VERIFICADA`, `ESTADO INTERNO`, `NO CONFIRMADA` | ZIP `design/screens.json`, contrastado contra `apps/web/src/App.tsx` al SHA base | rutas/estados se conservan; conceptos sin ruta no se añaden |
| `assets/approved/Goggle_Kid_Walk.webp` y `Typing_Girl_and_Sleeping_Cat.webp` | archivos en carpeta `approved`; 8/1 frame según auditoría | ZIP `assets/asset-audit.json`, `asset-manifest.json` | conservar hashes; segundo archivo estático |
| 16 iconos raster | `CANDIDATE` (etiqueta literal inglesa del manifest) | ZIP `assets/icons/icon-manifest.csv` | inspección visual/procedencia pendiente; no presumir aprobación |
| hero y cuatro ilustraciones `assets/references/*.png` | referencia del kit; no etiquetada `approved` | ZIP `assets/asset-audit.json`, `docs/DESIGN-SYSTEM.md` | uso editorial solo después de inspección; nunca reemplazar los sprites aprobados |
| Button/Card/Stack vs. otros componentes Astryx | Button/Card/Stack documentados; resto no verificado localmente | Astryx oficial Core README; prueba CLI local pendiente | no adivinar componente/prop |

La solicitud del usuario llega en el mensaje de inicio y el GOAL completo en el attachment `pasted-text-1.txt`; el ZIP es la fuente de arriba, no una autorización adicional. Las directivas del GOAL adjunto se implementan solo donde coinciden con la solicitud actual y el alcance visual. Si una diferencia requiere cambiar acceso, datos o contrato, se conserva el código actual y se registra como fuera de F16.

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación / criterio de parada |
|---|---|---|
| Estilo global o shell compartido rompe foco, layout o estado de una feature | Regresión visible/funcional en cualquier ruta | Capturar baseline Ego Lite antes de código; integrar y verificar grupo por grupo; revertir solo el grupo que falle; no avanzar con defectos críticos/altos abiertos |
| Astryx beta, paquete/CLI sin API local compatible | Build o controles inconsistentes | Instalar versión fijada solo en worktree, validar peers/CLI/imports/build; fallback CSS/HTML existente; registrar decisión |
| Pixel-art, imagen o animación compite con acciones/datos o causa movimiento no deseado | Lectura y accesibilidad | Arte no esencial, alt vacío si decorativo, tamaño acotado, prueba 20–32 px para iconos y frame estático con reduced motion |
| Navegación rediseñada confunde roles o cambia el acceso existente | Privacidad/permisos/flujo | No agregar puertas ni rutas; conservar `App.tsx` y gates actuales; verificar destinos/role/error; backend no se toca |
| Contraste/reflow/foco falla en un token/superficie | Incumplimiento accesible | Cálculo WCAG + inspección browser a 320/390/768/1440; no aprobar tokens en usos con ratio insuficiente |

Riesgos de esquema, throughput, trazas y despliegue no aplican: F16 no añade endpoints, procesos, almacenamiento ni integra producción. No se incorpora telemetry ni se cambian logs/contratos como solución visual.

## Alternativas consideradas

- Mantener estilos aislados por feature: rechazado porque preserva divergencia de navegación y tokens.
- Reescribir las rutas con router o cambiar permisos durante el rediseño: rechazado porque aumenta la superficie funcional y contradice el límite de conservación.
- Usar todos los componentes planificados del spreadsheet como si fueran exports Astryx: rechazado porque el libro marca varios como pendientes de verificación.
- Poner iconos candidatos en botones de acciones críticas: rechazado hasta inspección visual; para acciones, el texto y semántica accesible tienen prioridad.

## Decisiones y próximos pasos

1. Base Git: HEAD `60e31bfb4781693b2310b7cd22cfc45e9aa1cdd2` verificado de `origin/main` el 2026-11-14; rama aislada `feature/f16-experience-redesign`.
2. Contrastar rutas, estados, permisos y formularios reales antes de implementar.
3. Definir tokens semánticos y auditoría de contraste antes de rediseñar vistas.
4. Verificar paquete, componentes y props reales de Astryx en el checkout aislado.
5. Implementar fundamentos, landing, estudiante, docente y refinamiento por grupos; preservar el guard frontend actual solo en Gallery/Mentor y no cambiar el acceso de Review/Trainer.
6. Hacer revisión EGM independiente del brief y del diseño; corregir hallazgos confirmados dentro de dos rondas ordinarias por hito.
7. QA en Ego Lite: todas las rutas a 390/768/1440; navegación a 1024/1440; cada acción/formulario actual al menos una vez; error/recuperación/permisos por flujo; keyboard, reflow 320 px, contraste, movimiento y assets. Cubrir estados o viewport adicionales cuando cambie el riesgo.
8. Sin push, merge, deploy ni uso de producción.
