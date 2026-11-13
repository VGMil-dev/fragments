# F14 — Especificación obligatoria

## Regla de activación — invariante

El workflow de release se activa exclusivamente al publicar mediante `push` una tag nueva, anotada y con formato semántico estricto `vMAJOR.MINOR.PATCH`.

- No activar por push de ramas, commits, merge a `main`, cambios en otras ramas ni pull requests.
- No añadir triggers `workflow_dispatch`, `schedule` ni `release`.
- No crear una vía manual, programada o por publicación de Release como alternativa a la tag.
- El filtro de tag del workflow debe ser lo más estrecho que permita GitHub Actions; una validación sin privilegios debe rechazar cualquier candidato que no cumpla exactamente la forma semántica, antes de acceder a entornos protegidos, secretos o runner de producción.
- Solo la publicación de una nueva versión válida inicia el proceso. La existencia de una tag no autoriza por sí sola producción.

## Verificación de procedencia

- Confirmar que el evento pertenece a `VGMil-dev/fragments`, que la referencia es una tag y que la versión cumple `^v(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$`.
- Exigir tag anotada; comprobar el objeto tag y el commit pelado.
- Obtener el SHA completo desde el objeto Git; comprobar que coincide con el checkout exacto que se construirá.
- Comprobar ascendencia del commit etiquetado en `origin/main`. Nunca sustituir el SHA del tag por `HEAD` de `main` ni por `git describe`.
- La definición de workflow que controla privilegios debe ser confiable y protegida; el código de una tag arbitraria no puede sustituir esa definición ni relajar verificaciones.

## Bundles de atestación

- El job que firma el archivo debe conservar el `bundle-path` de `actions/attest` y publicarlo como un asset adicional `fragments-images.attestation.jsonl` en releases nuevos.
- El agente acepta un único bundle acotado (máximo 1 MB) descargado por HTTPS desde el release aprobado. En un release histórico que no contenga dicho asset, solo puede usarse un bundle provisionado en `/var/lib/fragments-release/attestations/<releaseId>.jsonl`, propiedad de root y con permisos privados.
- Verificar el bundle local con `gh attestation verify --bundle` y un trust root TUF actualizado con `gh attestation trusted-root`. Usar un `GH_CONFIG_DIR` vacío, sin token GitHub. No aceptar un trust root transportado junto con el bundle ni reemplazar la verificación criptográfica por hashes solos.
- Exigir repositorio, workflow, SHA del workflow, ref, digest de fuente y sujeto exactos; el resultado debe incluir timestamps verificados y runner hospedado, y se debe pasar `--deny-self-hosted-runners`.
- Cachear el paquete grande únicamente si su tamaño y digest coinciden con el manifiesto. Retenerlo ante fallos de atestación para que los reintentos no vuelvan a descargarlo. Limitar y limpiar archivos parciales, rechazar enlaces y fallar cerrado si falta material.

## Autorización y privilegios

- El push válido inicia solamente la verificación. Antes del acceso a producción se requiere autorización del propietario mediante un entorno protegido o control equivalente cuya configuración efectiva se haya comprobado en GitHub.
- Aplicar permisos mínimos a `GITHUB_TOKEN`; no usar secretos de producción durante validación/build no privilegiados.
- No ejecutar PRs, forks ni código de ramas en un runner con acceso a producción.
- No guardar llaves SSH privadas, archivos `.env` ni secretos de producción en GitHub.
- No activar el runner self-hosted de producción hasta verificar usuario no-root, aislamiento, permisos efectivos, socket Docker, sudo, credenciales, servicios vecinos y red. No alterar ni reutilizar el runner compartido existente.
- Si no se demuestra aislamiento, detener el despliegue por runner y proponer un agente pull-based local, fijo y de privilegios limitados; no abrir SSH entrante.

## Idempotencia, operación y rollback

- Registrar de forma persistente tag, SHA y resultado de releases desplegados; rechazar/requerir revisión para repeticiones accidentales del mismo identificador.
- Evitar despliegues concurrentes.
- Antes del cambio, crear un backup SQLite consistente, comprobar `PRAGMA integrity_check=ok` y validar que exista una ruta de rollback.
- Construir ARM64 desde el SHA verificado; recrear solo API/web de Fragments. No tocar Pits, PostgreSQL, Cloudflare Tunnel ni servicios del runner.
- En rollback ordinario volver a la imagen anterior sin restaurar ni sobrescribir SQLite.
- Verificar HTTP, contenedores, persistencia y salud de Pits/PostgreSQL, sin revelar secretos ni datos académicos.
- El procedimiento debe reportar tag, SHA, versión resultante y estado.

## Flujo de usuario y detención

1. Integrar y validar cambios en `main`.
2. Crear y publicar una tag anotada nueva `vX.Y.Z` sobre el commit exacto ya integrado.
3. El evento tag inicia verificaciones no privilegiadas.
4. Tras aprobarlas, pedir autorización protegida del propietario antes de cualquier acceso a producción.
5. Desplegar únicamente con el mecanismo aislado comprobado y registrar resultado/rollback.

Para detener, deshabilitar el único workflow tag-triggered o el mecanismo local de pull. Preparar y documentar rollback de artefactos antes de producción; nunca mover tags históricas.

## Validaciones obligatorias antes de habilitar

- Validación de formato, evento, tag anotada, SHA, pertenencia a `main`, repositorio equivocado y checkout discrepante.
- Probar que pushes a `main`, ramas, PR/forks, `workflow_dispatch`, `schedule` y `release` no pueden iniciar un release.
- Probar rechazo de tag ligera, repetida, inválida y tag cuyo commit no esté contenido en `origin/main`.
- Verificar permisos efectivos y protección de entorno; no inferir settings a partir del YAML.
- Probar build y rollback simulados sin acceso a producción; comprobar backups y ledger.
- Confirmar aislamiento real del runner antes de que cualquier job privilegiado pueda seleccionarlo. Si está en duda, no activar despliegue automático.
- Conservar evidencia privada fuera de Git, máximo 20 archivos, sin secretos ni datos académicos.

## Relación con F13

`.github/workflows/release-build-candidate.yml` es un build manual preliminar, sin acceso de producción. No es un trigger de release ni una ruta de despliegue. No modificarlo ni eliminarlo como parte de F14 sin justificar por escrito el cambio y preservar su carácter no privilegiado.
