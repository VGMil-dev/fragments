# Fragments agent instructions

## Source of truth
- Follow `SYSTEM_PROMPT_CODEX.md`, `docs/SYSTEM_DESIGN.md`, `docs/CONTRACTS.md`, `docs/DESIGN_TOKENS.md` and `task-list/TASKS.md`.
- Do only the task and paths assigned to you. Each task must keep `intent.md`, `spec.md` and `evidencie.md` current.
- The planner alone edits `packages/contracts`, root workspace/tooling, shared TypeScript config, task list and general routing.
- Contracts are frozen for a worker batch. Propose any required change to the planner before editing a shared interface.

## Repository and commits
- Work on the assigned task branch/worktree. Codex may create and work on `codex/*` branches.
- Codex may publish only its own work branch with a normal `git push`, and may open or update a Pull Request targeting `main`.
- Codex may consult and wait for GitHub Actions checks, and may merge the PR normally only when all required checks pass and repository protections permit the merge.
- Never push directly to `main`; keep `main` protected and integrate changes through Pull Requests.
- Never use `git push --force`, rewrite history, delete tags, bypass reviews/checks/branch protections, or use administrative permissions to evade restrictions.
- Do not create release tags without specific authorization. Preserve the F14 rule that a release starts only from a deliberately published annotated SemVer tag; branch publication and PR merge do not deploy.
- Before each commit, inspect `git status` and stage only files owned by the task. Never stage `.env`, database files, generated reports, credentials or unrelated changes.
- Commit each completed task with this format:

  ```text
  type(scope): descripcion

  - Cambio importante
  - Cambio importante
  ```

- A task is complete only when fresh verification output and its commit hash are recorded in `task-list/<ID>/evidencie.md` and `task-list/TASKS.md` is updated.

## Secrets and services
- Never read out, print, log, copy, commit, send to workers, or include `.env` values in evidence.
- Never put server credentials in `VITE_*` variables. Do not contact AI Gateway, GitHub, Moodle, or deploy targets unless the user explicitly authorizes that specific external operation.
- Tests must use labelled fake providers. Never execute student repository code.

## Testing and browser
- Use TDD for application behavior and verify commands before claiming success.
- `ego(lite)` is the only allowed browser for visual checks and E2E in this project. Read and run the installed `ego-browser` skill before any browser task.
- Do not add, install, invoke or configure Playwright, Puppeteer, Cypress or browser fallbacks.

## Style
- Use Spanish plain language in the product. Follow the existing palette and art direction; avoid decorative elements that do not help navigation or learning.
- Keep backend boundaries useful and small. Do not add Redis or execute code from student repositories.
