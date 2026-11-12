# F14 — Evidence / evidencie

**Estado:** REQUISITOS FIJADOS; F14 no implementada (2026-11-12).

## Decisión registrada

La única activación admisible para un release es publicar con `push` una tag nueva, anotada y estrictamente `vMAJOR.MINOR.PATCH`. El push solo inicia verificación; producción requiere autorización protegida y privilegios mínimos. No se permiten triggers por ramas/commits/PR, `workflow_dispatch`, `schedule` ni `release`.

Los requisitos completos están en `task-list/F14/spec.md`. F14 permanece `[ ]` porque no se inspeccionaron aquí settings/aislamiento reales ni se implementó el mecanismo de despliegue.

## Alcance realizado en esta preparación

- Actualizada la fila F14 en `task-list/TASKS.md` y creados `intent.md`, `spec.md` y este archivo.
- No se cambió `.github/workflows/release-build-candidate.yml` de F13.
- No se contactó GitHub, no se activó ni instaló runner, no se ejecutó build/deploy de producción, no se tocaron tags, datos o servicios. `env` se conserva intacto.

## Verificación

- `git status --short --branch` antes de editar — rama `codex/f13-version-indicator`; único cambio preexistente no rastreado: `env`.
- Inspección local de `task-list/TASKS.md` — F13 completada; F14 no existía previamente.
- No se ejecutó workflow ni comando de despliegue: esta entrega fija el requisito antes de implementar F14.

## Commit

`3d0cbfe691e59a23b869d8d592fcee598e7cc7bc` — `docs(f14): fija activacion exclusiva por tag`. Este commit registra el requisito; no representa implementación de F14.
