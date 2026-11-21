# QA UX-06

## Ego Lite

- Contexto académico: respuesta sintética local etiquetada QA; presenta los datos publicados en solo lectura.
- Contexto personal: `CONFIG_UNAVAILABLE`; aparece «Modo personal» y no aparecen tarjetas académicas.
- Teclado: navegación Idea → Contexto → Habilidades → Contexto con Enter; foco visible en navegación, borde sólido de 3 px.
- Guardado: borrador de QA creado con proveedor local sintético; mensaje de éxito mostrado y el borrador reapareció tras recargar la vista.
- Accesibilidad observada: controles de formulario etiquetados; ningún campo sin etiqueta detectado. No se registraron errores de consola en la sesión funcional.
- Responsive: 320 (scrollWidth 305), 390 (375), 768 (753), 1024 (1009), 1440 (1425), 1672 (1657). La diferencia de 15 px corresponde a scrollbar del navegador; ninguna resolución excede el viewport.

## Comandos locales

| Comando | Resultado |
|---|---|
| `pnpm exec turbo test --force` | PASS: contratos 26/26, web 121/121, API 71 passed/62 skipped (runtime PostgreSQL requerido por las omitidas). |
| `pnpm exec turbo typecheck --force` | PASS: 5 tareas. |
| `pnpm exec turbo lint --force` | PASS: 1 tarea. |
| `pnpm exec turbo build --force` | PASS: 4 tareas; avisos no bloqueantes del bundle y directivas de lucide-react. |
| `git diff --check` | PASS, sin errores. |

La sesión QA usó Ego Lite y un proveedor temporal local; no accedió ni modificó datos productivos. PostgreSQL, Prisma y F21 no fueron modificados.
