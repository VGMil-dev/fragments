### FRAGMENTS F17 — RESULTADO FINAL

**Estado:** DESPLEGADO; paquete visual completo (20/20 capturas auténticas).
**PR:** [#51 integrado](https://github.com/VGMil-dev/fragments/pull/51)
**Release:** [v0.4.12](https://github.com/VGMil-dev/fragments/releases/tag/v0.4.12)
**Commit:** `3ef4cc8e7a501949adf291724dea15765815b727`
**Servidor:** https://fragments.gavanti.org

**Implementación**

Portal F17 con dashboard, aulas con estado F18 honesto, proyectos, entregas, Galería, seis etapas de Mentor, Review y Trainer. Se añadieron portadas geométricas deterministas para Galería y Mentor. La carga personalizada de portadas continúa deshabilitada porque no se ha demostrado recuperación de medios. El fixture local usado en QA contenía solo datos sintéticos.

**Verificaciones**

- PR #51: merge normal. CI `verify` exitoso en run [129](https://github.com/VGMil-dev/fragments/actions/runs/44656486440), para el HEAD de la rama; suite local: 10/10 tareas, contracts 22/22, web 112/112, API 159/159; typecheck, lint y build PASS.
- F14 run [13](https://github.com/VGMil-dev/fragments/actions/runs/44657723806): verificó la tag anotada y SHA exactos; tests, typecheck, lint, build, metadata, build ARM64 y atestación Sigstore pasaron. El job protegido publicó el paquete y el release.
- Producción consultada el 2026-11-20: `/health` 200 con `database=ready`; `/student/login` 200; `/api/me` 200 con `authenticated=false`, `reason=session_required` y `githubOAuthConfigured=true` sin sesión.
- El JavaScript servido en `/assets/index-CDxNxB6W.js` contiene `v0.4.12` y el SHA completo esperado; no contiene el indicador anterior `v0.4.11`. Las cuatro portadas `/covers/*.webp` responden 200 con `image/webp`.
- No se verificaron por SSH el ledger, backup ni estado de contenedores del agente F14; la confirmación de runtime se basa en HTTP público, metadata exacta del bundle y recursos servidos.

**Evidencia visual**

La carpeta `task-list/F17/evidence/screenshots/` contiene las 20 PNG solicitadas, tomadas del frontend en Ego Browser con un usuario y datos sintéticos locales. Las capturas 01–13 son ventanas del navegador de 1366×728; la captura 14 es de 902×609. Las capturas 15–20 son emulación responsive de 400×593 dentro de la ventana de 902×609, con la barra de emulación visible. El equipo no permitió obtener una ventana más grande al capturar la 14 ni ocultar esa barra en las vistas móviles. `screenshots-manifest.json` registra ruta, estado, tamaños y SHA-256 de cada PNG. La copia entregable `Fragments_F17_Final_Evidence.zip` incluye las capturas, este informe y el manifiesto.

**Limitaciones conocidas**

No se comprobó una sesión OAuth válida; F18 no está implementado; el ledger/backup del agente no se observaron directamente. Las capturas verifican los estados visibles, no sustituyen una sesión OAuth real. La resolución de la captura 14 es menor que las capturas desktop y el marco de emulación aparece en las vistas móviles.

**Resultado**

F17 está integrado y desplegado como `v0.4.12` sobre el commit `3ef4cc8e7a501949adf291724dea15765815b727`; web, health API y recursos de portada responden con la versión esperada. El paquete visual contiene 20 PNG auténticas y el ZIP de evidencia.
