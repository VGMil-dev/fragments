# F09 — Evidencia

Estado: implementado y verificado localmente en `codex/mentor-docx-import`, creada desde `main` (`4553ae204160f95dfcb0886fe9741566441f3cbc`).

- Plantilla original: `D:\Dev\Trabajo\Fragments\Fragments_Mentor_Plantilla_Propuesta.docx`; 40 128 bytes, ZIP válido, 18 partes, 844 351 bytes expandidos, sin macros ni relaciones externas.
- Recurso público: `apps/web/public/templates/fragments-mentor-propuesta.docx`; SHA-256 `0F76A7525D2FD8717033CE9252D4392C686AFB3CB3B27019F270A0BECFA8E5A6`, coincide con el original.
- Importador local valida extensión, tamaño comprimido, estructura OOXML/ZIP, cantidad y expansión de partes; rechaza macros y objetos incrustados; extrae con Mammoth y conserva respuestas en campos existentes como texto editable. No retiene el archivo ni lo envía al servidor.
- `pnpm test`: pasa; 3 paquetes, 35 archivos de prueba, 145 tests (18 contratos, 78 API, 49 web).
- `pnpm typecheck`: pasa en los 3 paquetes.
- `pnpm build`: pasa en los 3 paquetes; Mammoth queda en chunk diferido de 491.75 kB (118.68 kB gzip).
- Pruebas F09: plantilla oficial vacía, DOCX sintético completo con respuestas, extensión incorrecta, ZIP corrupto, límite de 2 MB, expansión >8 MB, objeto incrustado, edición y guardar/evaluar por callbacks existentes.
- Ego Lite local: abrió `/student/mentor`, descargó `fragments-mentor-propuesta.docx` y confirmó la importación de la plantilla vacía con mensaje claro; no se ejecutó guardar ni evaluación contra API.
- `git diff --check`: sin errores.
- Sin llamadas a AI Gateway; producción y el tag `v0.1.0-mvp` no se modificaron ni desplegaron.

Commit de implementación: pendiente de registrar tras el commit.
