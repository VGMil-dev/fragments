# CU-33 — Ocultar navegación admin ante denegación

Las pantallas de administración deben reflejar el resultado de autorización de sus propias lecturas. Cuando el backend confirma `AUTH_REQUIRED` o `FORBIDDEN`, ocultar la navegación administrativa en todas las rutas; conservarla ante fallos recuperables de red/servidor. Los endpoints y su autorización backend no cambian.
