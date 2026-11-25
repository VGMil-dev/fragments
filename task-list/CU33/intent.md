# CU-33 — Ocultar navegación admin ante denegación

El resumen `/admin` puede mostrar enlaces administrativos a una sesión que recibe `FORBIDDEN` de las APIs de Diagnósticos y Cola. Ocultar la navegación cuando el servidor confirma `AUTH_REQUIRED` o `FORBIDDEN` para que la UI corresponda al permiso real. Los endpoints y su autorización backend no cambian.
