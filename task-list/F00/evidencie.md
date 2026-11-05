# F00 — Evidence / evidencie
Estado: IN PROGRESS — configuration gate passed; shared contracts implemented
Owner: PLANNER

## Skills
- Leída: `skills/SKILLS_MATRIX.md`.
- Leída: `C:\Program Files\Citro Labs\ego lite\Application\0.6.2.7\ego-skills\ego-browser\SKILL.md` (v2.2.0). Decisión: usar ego(lite) exclusivamente para futuras tareas de navegador; todavía no se invocó el navegador.
- Skills originales leídas desde sus repositorios oficiales, sin instalar paquetes ni ejecutar scripts de terceros:
  - `frontend-design` (Anthropic): adoptar plan visual breve, decisiones ligadas al dominio y autocrítica; descartar libertad para alterar los tokens ya aprobados.
  - `react-best-practices` (Vercel): aplicar reglas críticas de waterfalls y bundle; no optimizar por adelantado.
  - `web-design-guidelines` (Vercel): aplicar auditoría de accesibilidad, foco, formularios, motion e imágenes; descargar reglas vigentes al hacer la revisión.
  - `backend-architecture` (we-are-singular): rutas delgadas, workflows en servicios y puertos/adaptadores; evitar capas ceremoniales que el MVP no necesite.
  - `test-driven-development` (obra/superpowers): RED-GREEN-REFACTOR para comportamiento; archivos de configuración siguen la excepción documentada.
  - `verification-before-completion` (obra/superpowers): ejecutar comandos completos y registrar salidas antes de afirmar DONE.
  - `dispatching-parallel-agents` (obra/superpowers): delegar solo superficies independientes, con alcance y salida concretos.
  - `using-git-worktrees` (obra/superpowers): preferir aislamiento administrado nativo; evitar worktrees manuales si el host ya gestiona el estado.
- Decisión de instalación: no instalar estas skills; se leyeron directamente desde las fuentes verificadas y no requieren scripts.

## Rutas preparadas
- `docs/ENV_SETUP.md`: ahora clasifica variables, describe su obtención y documenta comprobaciones sin revelar valores.
- `task-list/F00/intent.md`: objetivo, límites y criterio de skills/repo.
- `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `pnpm-lock.yaml` y `packages/contracts/`: scaffold base del workspace y contrato Zod compartido.
- `AGENTS.md`: límites de archivos, protección de secretos, verificación y formato de commits por tarea.
- `.env.example`, `.gitignore`, `task-list/F00/spec.md`: plantilla presente, `.env` excluido y criterios conservados.
- `.env`: presente localmente; no leído ni copiado a esta evidencia.

## Comandos y resultados
- `git status --short --branch` al inicio → falló: esta carpeta no estaba dentro de un repositorio Git.
- Inspección de `.gitignore` → `.env` excluido y `.env.example` permitido.
- Preflight local redactado → salida resumida: variables base presentes, formato válido, configuración AI Gateway y GitHub presente, longitud de `SESSION_SECRET` suficiente para continuar; conexiones externas no probadas. No se imprimieron valores.
- Inspección del kit → no se encontró `AGENTS.md` en el árbol del proyecto.
- Inspección visual de `assets/hero-fragments.png` → arte pixel art azul sobre fondo crema; consistente con los tokens de diseño.
- `git init -b codex/fragments-mvp` → código de salida 0; checkout local nuevo porque el directorio kit no tenía `.git`. No se configuró remoto.
- Estado Git actual → rama `codex/fragments-mvp`, sin remoto; `.env` no aparece en los archivos sin seguimiento y `git check-ignore .env` lo confirma.
- `node --version` → `v24.21.0`; `pnpm --version` → `11.25.0`.
- Skill sources: leídos `SKILL.md` de `frontend-design`, `react-best-practices`, `web-design-guidelines`, `backend-architecture`, `test-driven-development`, `verification-before-completion`, `dispatching-parallel-agents` y `using-git-worktrees`; también `ego-browser` local v2.2.0.
- TDD RED: `npm test --prefix packages/contracts` → falló porque `src/index.ts` aún no existía.
- Iteración intermedia: 7/9 pruebas pasaron; dos casos de `ApiResultSchema` fallaron porque el test inicial le pasó un objeto plano en vez de un schema Zod. Se corrigió el test para usar `z.object`.
- TDD GREEN: `npm test --prefix packages/contracts` → 9/9 pruebas aprobadas.
- Typecheck: `npm run typecheck --prefix packages/contracts` → código de salida 0.
- Build de contratos: `npm run build --prefix packages/contracts` → código de salida 0.
- `pnpm install --lockfile-only --ignore-scripts` → código de salida 0; lockfile generado y política de supply chain reportada verificada.
- Instalación inicial con tienda global → `ERR_PNPM_EPERM` al importar archivos desde `D:\.pnpm-store`; los reintentos con `--package-import-method=copy` y linker hoisted dieron el mismo bloqueo. Se resolvió usando una tienda local de usuario separada; no se modificaron permisos de la tienda global.
- `pnpm install --frozen-lockfile --ignore-scripts --store-dir C:\Users\vgmil\.cache\pnpm\fragments` → código de salida 0.
- `pnpm build` → Turbo: 1 paquete exitoso.
- `pnpm typecheck` → Turbo: 1 paquete exitoso.
- `pnpm test` → 1 archivo, 9/9 pruebas exitosas.
- `pnpm lint` → Turbo: 1 paquete exitoso.
- Las pruebas iniciales también se ejecutaron con `npm --ignore-scripts --no-save --package-lock=false`; no se generó package-lock. La verificación final se hizo con pnpm.
- Conectividad de AI Gateway y GitHub → no probada; no se enviaron solicitudes externas.

## Capturas, hash y limitaciones
- Capturas: no aplica en la fase de configuración.
- Hash/commit: implementación F00 `279f08f0f53ea1e66eba51b373128a7825e990b9`; este registro de cierre se incluye en un commit de documentación F00.
- La inicialización local se hizo en la carpeta activa del producto nuevo; no se creó remoto ni se borró contenido.
- Contratos base creados desde `docs/CONTRACTS.md`; teacher hint ahora queda excluido del esquema público de Inspector y cada finding contiene referencias de evidencia tipadas.
- No se despacharon agentes. El host ofrece hasta tres slots de agentes incluyendo al coordinador, por debajo de los seis solicitados; se usarán lotes después de cerrar y registrar el contrato base.
- Workaround del entorno: dirigir pnpm a una tienda local de usuario evita el `EPERM` de la tienda global; el comando y salida están registrados arriba.
- Gate de configuración: pasó con la confirmación del usuario de que el `.env` está rellenado y su instrucción de continuar.

**Regla:** nunca cambiar a DONE sin evidencia fresca de la implementación y sus verificaciones.
