# F03 — Intent
Owner: W3

Problema: no hay API ni persistencia confiable para soportar los slices de Fragments.
Objetivo: entregar S0 de plataforma: Node/TypeScript HTTP, health, SQLite WAL, base de cola persistente y auth docente mínima preparada con fake drivers.
No objetivos: no llamar AI Gateway ni GitHub durante S0; no ejecutar código remoto; no implementar lógica Mentor, Review o Inspector.
Skills: aplicar `backend-architecture` para límites delgados y puertos/adaptadores, TDD para persistencia/validación y `verification-before-completion` para evidencia; reducir capas sin utilidad comprobada.
Límite de archivos: `apps/api/src/{platform,db,auth,queue,http}`, `migrations`, `docker/`, archivos Compose y tests/fixtures propios; no modificar contratos ni root workspace/tooling.
