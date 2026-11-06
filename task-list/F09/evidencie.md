# F09 — Evidencia

Estado: COMPLETA y verificada localmente en `codex/mentor-docx-import`, creada desde `main` (`4553ae204160f95dfcb0886fe9741566441f3cbc`).

- Plantilla original: `D:\Dev\Trabajo\Fragments\Fragments_Mentor_Plantilla_Propuesta.docx`; 40 128 bytes, ZIP válido, 18 partes, 844 351 bytes expandidos, sin macros ni relaciones externas.
- Recurso público: `apps/web/public/templates/fragments-mentor-propuesta.docx`; SHA-256 `0F76A7525D2FD8717033CE9252D4392C686AFB3CB3B27019F270A0BECFA8E5A6`, coincide con el original.
- Importador local valida extensión, tamaño comprimido, estructura OOXML/ZIP, cantidad y expansión de partes; rechaza macros y objetos incrustados; extrae con Mammoth y conserva respuestas en campos existentes como texto editable. No retiene el archivo ni lo envía al servidor.
- `pnpm test`: pasa; 3 paquetes, 35 archivos de prueba, 145 tests (18 contratos, 78 API, 49 web).
- `pnpm typecheck`: pasa en los 3 paquetes.
- `pnpm build`: pasa en los 3 paquetes; Mammoth queda en chunk diferido de 491.75 kB (118.68 kB gzip).
- Pruebas F09: plantilla oficial vacía, DOCX sintético completo con respuestas, extensión incorrecta, ZIP corrupto, límite de 2 MB, expansión >8 MB, objeto incrustado, edición y guardar/evaluar por callbacks existentes.
- Chequeo inicial Ego Lite local: abrió `/student/mentor`, descargó `fragments-mentor-propuesta.docx` y confirmó la importación de la plantilla vacía con mensaje claro.
- Recorrido completo posterior solicitado: Ego Lite importó un DOCX sintético completo, confirmó la vista editable, guardó y recibió una evaluación real del AI Gateway: viable, 78/100, con cinco hallazgos y seis ideas para continuar. Una primera corrida detectó repetición en los datos de prueba; se corrigió el fixture y se repitió con valores únicos. Fueron dos llamadas Gateway, coste registrado total USD 0.000261.
- La API usó una SQLite temporal aislada en el worktree; el DOCX de prueba y la base se eliminaron al terminar. No se usó ni modificó producción.
- `git diff --check`: sin errores.
- Producción y el tag `v0.1.0-mvp` no se modificaron ni desplegaron.

Commit de implementación: `3fa3d49` (`feat(mentor): importar propuestas DOCX`).

## Revalidación para el candidato v0.2.0 (2026-11-05)

- Integrados en una rama candidata local los historiales de F08 (runtime ARM64 ya instalado) y F09 (DOCX), preservando los commits de origen. El commit de integración del código DOCX es `0af66f0`.
- La instalación limpia encontró que `pnpm-workspace.yaml` tenía `allowBuilds.esbuild` como marcador de texto; pnpm rechazó ejecutar el install script. Se cambió a `true` para permitir únicamente el script de `esbuild@0.25.12`, requerido por Vite.
- `CI=true pnpm install --frozen-lockfile` → correcto; Lockfile vigente y script de esbuild completado.
- `pnpm exec turbo run test typecheck build lint --force` → 10/10 tareas sin caché; contratos 18/18, API 78/78, web 49/49 (145 tests); typecheck y build de los tres paquetes correctos; lint correcto.
- `docker compose -f deploy/production/docker-compose.yml --env-file deploy/production/.env.example config --quiet` → correcto, con una copia temporal local del archivo de ejemplo que se retiró inmediatamente.
- Preflight SSH de solo lectura mediante el perfil `servidor`: Fragments API y web `healthy`, imágenes `0.1.0-mvp-arm64`, revisión `4553ae204160f95dfcb0886fe9741566441f3cbc`; Pits y PostgreSQL también `healthy`. `fragments-backup.timer` activo y habilitado; backups observados de 188416 bytes. No se modificó ni reinició ningún contenedor ni se creó un backup nuevo.
- `git diff --check` → sin errores.
- Commit que habilita instalación y registra la verificación: `70e00fbd52ae70ae2585128cd26f1f5a9ccffae8`.
- Estado: verificación local del candidato correcta. Publicación, backup, despliegue y validación de la versión v0.2.0 siguen pendientes. No se contactó GitHub; la inspección de producción fue de solo lectura.
