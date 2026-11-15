# Quality gates de F16

G0: Repo y matriz confirmados contra HEAD (ruta, estado, permiso, componentes, tests). Ningún cambio funcional accidental.
G1: Design system: tokens semánticos, tipografías, colores contraste, focus/hover, responsive shells.
G2: Prototipo landing escritorio + móvil (1440, 390). Aprobación visual antes de afectar rutas internas.
G3: Estudiante: acceso, galería, mentor, review, trainer; loading/empty/error y caminos reales.
G4: Docente: acceso y permisos, estudiantes, inspector, mentor control, reset.
G5: Assets: SHA de aprobados intacto, 8 frames kid / 1 frame girl **en el WebP recibido**, alternativas estáticas y performance.
G6: QA: build, typecheck, pruebas existentes, visual screenshots, teclado, accesibilidad; comparar baseline y ejecutar con fixtures; no datos ni accesos reales de producción.
G7: Informe de cobertura ruta×viewport×estado, diferencias, incidentes; no push/PR/merge/deploy sin permiso.

Aprobación = técnica + visual humana, con WARNs transparentes. No inferir que un auditor de pixels garantiza calidad artística.
