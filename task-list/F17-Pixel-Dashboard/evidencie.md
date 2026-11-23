# F17 Pixel Night Dashboard — Evidencia

## Implementación y verificación de código

- `apps/web/src/features/student/StudentDashboard.tsx`: jerarquía del centro de misiones con los mismos datos y estados existentes.
- `apps/web/src/features/student/StudentDashboard.css`: estilos Pixel Night aislados, responsive, foco visible y reduced-motion; sin modificar estilos globales.
- `apps/web/src/features/student/StudentDashboard.test.tsx`: jerarquía, identidad, CTA único y ausencia de KPI ficticio.
- PR #182 integrada como `75e548314b81df35bf960c245fac3594ea830c35`; CI `45170211839` SUCCESS. Commit de código `66b29aada6630943e423cb817d88ff007653646c`.
- Pruebas focales **4/4 PASS**; contracts build, typecheck, build web y `git diff --check` PASS.
- Typecheck pasó tras generar `@fragments/contracts`; la ejecución previa no halló los tipos generados.
- Revisión reflexiva independiente: sin defecto funcional encontrado.

Release F14 `v0.5.39`, aplicada con imagen/SHA `e202ec6302b9f35727673e2c6f34a74b4ce2d540`.

## QA visual Ego Lite — producción v0.5.39

- Fecha: 2026-11-23. Página autenticada `/student/dashboard`; UI `v0.5.39`, SHA `e202ec6302b9f35727673e2c6f34a74b4ce2d540`.
- Viewports emulados 320, 390, 768, 1024 y 1440 px: página cargó en todos; `scrollWidth <= innerWidth`.
- Teclado: 13 pulsaciones Tab alcanzaron «Continuar en Mentor»; `:focus-visible` activo, outline sólido lima de 3 px.
- `prefers-reduced-motion: reduce`: media query activa y pantalla cargada.
- Datos renderizados: dos aulas activas, cero entregas y un borrador. No se crearon ni modificaron recursos.
- Capturas PNG originales Ego Lite fuera del repositorio: `C:\Users\vgmil\ego\pixel-night-dashboard-1440.png` SHA-256 `609C47755D397AEEDDCBD7E5B20C90A2F6A24ADDF780B031957FC00D75B81E14`; `C:\Users\vgmil\ego\pixel-night-dashboard-390.png` SHA-256 `7B8C0AE0D74A9AC7B3AA893FD29A47E0E8354B831CF0A7525E7407920BA01AB9`.

## Límites

- Zoom al 200 %, lector de pantalla y contraste formal: **NO COMPROBADOS**.
- Validez de datos no se reconsultó por API; la evidencia cubre el render y la navegación observados.
- Referencia visual candidata, pendiente de revisión del propietario. Sesión preservada; no hubo escrituras.
