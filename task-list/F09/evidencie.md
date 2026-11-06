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

## Intento de release y rollback (2026-11-06)

- Se configuró el remoto autorizado `https://github.com/VGMil-dev/fragments.git`; `origin/main` era ancestro del candidato. Push normal, sin force, avanzó `main` de `4553ae204160f95dfcb0886fe9741566441f3cbc` a `6a2bd4b2e1fcb83016cff6d3ac3c8242a5602cda`. El tag remoto `v0.2.0` no existía. `v0.1.0-mvp` permaneció apuntando a `4553ae204160f95dfcb0886fe9741566441f3cbc`.
- Backup predespliegue generado con el servicio Compose de mantenimiento, sin dependencias ni reinicios: `/var/backups/fragments/fragments-2026-11-06T05-04-13-902Z.sqlite`, 188416 bytes, SHA-256 `d25e033db793eeadf34c9f4a7814bbc15b8cf951cce53dccc727e85373f68d27`, modo `0600`; el script verificó `PRAGMA integrity_check=ok`.
- Se construyeron imágenes `linux/arm64` desde el tar del commit publicado y se actualizaron únicamente `fragments-api-1` y `fragments-web-1`, con etiquetas de versión `v0.2.0` y revisión `6a2bd4b2e1fcb83016cff6d3ac3c8242a5602cda`. Ambos healthchecks pasaron.
- Por Ego Lite, HTTPS respondió 200 con TLS válido. Mentor descargó la plantilla oficial; su SHA-256 coincidió con el recurso del commit. La plantilla vacía mostró el aviso esperado; una propuesta DOCX sintética importó campos, permitió editar y se guardó en SQLite.
- Se autorizó y realizó una sola evaluación real. El ledger registró una reserva estimada de USD 0.00087 y un coste asentado de USD 0.00014, sin reserva incierta. La evaluación persistida fue 72/100 con el modelo `alibaba/qwen3.7-flash`; el POST terminó HTTP 200, pero Mentor mostró el estado genérico de error y no presentó el resultado. No se reintentó.
- Debido a que el resultado no fue visible para el usuario en Mentor, se aplicó rollback con el Compose anterior, sin restaurar ni sobrescribir SQLite. API y web volvieron a `0.1.0-mvp-arm64` / revisión `4553ae204160f95dfcb0886fe9741566441f3cbc`, ambos `healthy`. Pits y PostgreSQL permanecieron `healthy`; `fragments-backup.timer` quedó activo y habilitado. `/health` devolvió `ok`, Better Auth respondió 200 y el endpoint Inspector sin sesión devolvió 401. Review cargó en Ego Lite. En Inspector había una sesión docente activa; el cierre de sesión fue confirmado por `get-session` sin sesión.
- Tras el rollback, producción ejecuta `4553ae204160f95dfcb0886fe9741566441f3cbc`. GitHub `main` avanzó luego a `46795f8e604f8a9ed20c509c2d7c5872d8019b83` para publicar esta evidencia; ese commit documental sigue al código candidato `6a2bd4b2e1fcb83016cff6d3ac3c8242a5602cda`. No se creó ni publicó el tag `v0.2.0`; no se modificó Pits, PostgreSQL, el runner ni el túnel.

## Corrección de recuperación de Mentor (2026-11-06)

- Causa: el cliente HTTP común abortaba a los 15 s, mientras Mentor AI Gateway puede tardar 30 s y Nginx espera hasta 35 s. La API siguió procesando y persistió la evaluación antes de emitir HTTP 200; al perder el frontend la respuesta, Mentor solo mostraba un error genérico. No existía un GET para recuperar el resultado guardado y el botón de reintento repetía el POST, con riesgo de consumir IA otra vez. Los logs conservados no incluyen duración por solicitud, así que no permiten demostrar que la solicitud histórica superó exactamente 15 s; sí documentan el HTTP 200 y la persistencia.
- Corrección: el POST de Mentor usa timeout de 40 s; se añadió `GET /api/proposals/:id/review`, limitado a la cookie propietaria y a la versión actual, para devolver la evaluación persistida. Ante respuesta perdida, la pantalla intenta recuperación GET y el reintento manual vuelve a consultar sin repetir el POST.
- Regresión: API verifica igualdad del recibo recuperado, exactamente una ejecución del evaluador, denegación sin cookie y rechazo de resultados de una revisión vieja. Web simula el POST con timeout, la recuperación inicial 404 y la recuperación final del recibo 72/100; el POST ocurre una sola vez.
- `pnpm exec turbo run test typecheck build lint --force` → 10/10 tareas; contratos 18/18, API 79/79, web 51/51; typecheck, build y lint correctos. `git diff --check` correcto.
- Ego Lite local, con API y SQLite temporales y sin credencial AI Gateway: guardó una propuesta y mostró evaluación local fake completa de 79/100. Sin llamadas externas de IA. No se usó Playwright.
- Publicación inicial de la corrección: commit `3936886900ac71a2a3900ca8c520335651b9b56d` en `main`, con push normal fast-forward desde `6ca18b3262e4930e93f9aa42725be052248f78a6`. `6a2bd4b2e1fcb83016cff6d3ac3c8242a5602cda` es ancestro preservado. No hubo reescritura ni force push.
- Backup de producción anterior al despliegue: `/var/backups/fragments/fragments-2026-11-06T05-51-07-472Z.sqlite`, 188416 bytes, SHA-256 `0f5449776485259fb47b1dc44247e5122d45a90ae719c8ea25d74d694a4f2df6`, `root:root 0600`; el job `VACUUM INTO` informó `integrity_check=ok`.
- Despliegue ARM64 desde el commit `3936886900ac71a2a3900ca8c520335651b9b56d`; solo se recrearon `fragments-api-1` y `fragments-web-1`. Ambos quedaron `healthy` con etiqueta de revisión exacta. No hubo migraciones SQLite ni cambios a volúmenes, Pits, PostgreSQL, runner, túnel o servicios ajenos.
- Producción: `https://fragments.gavanti.org/` y `/health` devolvieron HTTP 200 con `ssl_verify_result=0`. Better Auth `get-session` respondió 200 (sesión no iniciada en este navegador); Review mostró el formulario; el API de Inspector devolvió 401 sin sesión, según su protección esperada.
- Ego Lite descargó `fragments-mentor-propuesta.docx`, 40128 bytes, SHA-256 `0f76a7525d2fd8717033ce9252d4392c686afb3cb3b27019f270a0becfa8e5a6`; coincide con el recurso publicado. Un DOCX sintético se importó a campos editables y se guardó como propuesta de prueba.
- Con una sola acción de evaluación real y sin reintento, Mentor mostró la evaluación persistida 72/100. Un GET posterior de recuperación devolvió HTTP 200 y el mismo puntaje. La propuesta de prueba tiene una evaluación en su versión actual. La barrera registró USD 0.000118 adicionales asentados (total histórico USD 0.000258), reservas USD 0 y `blocked=false`, dentro del máximo autorizado USD 0.05.
- Estado final tras smoke tests: API/web Fragments `healthy`; Pits y PostgreSQL `healthy`; `fragments-backup.timer` `active`. No se necesitó rollback.
- Tag anotado `v0.2.0` publicado sin sobrescribir tags; su commit destino es `3936886900ac71a2a3900ca8c520335651b9b56d`. `v0.1.0-mvp` sigue apuntando a `4553ae204160f95dfcb0886fe9741566441f3cbc`.
