# Especificación F16.15 — Review Pixel Night

- Align Review with F16's approved Pixel Night direction using existing tokens and icons; do not add dependencies or unapproved image assets.
- Give the actual repository/owner, exact commit SHA, current queue/running/failed/completed state, and returned analysis/findings a clear hierarchy.
- Preserve the existing GitHub-only submission, exact commit validation, permissions, current CTAs, Retry/Refresh/PDF/Trainer behavior, and all backend/API/contract semantics.
- Render only values supplied by the existing response. Do not invent evidence, citations, progress, results, or claim that IA score quality has been validated.
- Keep queue, running, failed, completed, and no-result states understandable and accessible; retain their actual state-specific actions.
- Reflow at 320, 390, 768, 1024, and 1440 CSS px without horizontal overflow; keyboard focus stays visible and reduced motion is respected.
- Scope is limited to `apps/web/src/features/review/review-screen.tsx`, `review-screen.css`, `review-screen.test.tsx`, and this task's `intent.md`, `spec.md`, `evidencie.md`. No shared routing, contracts, API, data, prompts, rubrics, provider calls, or production writes.
- Add/update focused component tests for the touched hierarchy and states. Run focal tests, web typecheck/build, and `git diff --check`.
- Ego Lite visual validation only if an existing authorized student session is available; do not create or close sessions. Otherwise record visual QA as NO COMPROBADO.
