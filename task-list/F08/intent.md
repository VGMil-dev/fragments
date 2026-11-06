# F08 — Intención

Preparar y desplegar Fragments `v0.1.0-mvp` (`4553ae204160f95dfcb0886fe9741566441f3cbc`) en la VPS Oracle ARM64 existente. Reutilizar Docker y Cloudflare Tunnel; preservar Pits y sus datos; habilitar la web y Better Auth; mantener SQLite en almacenamiento persistente local; configurar snapshots verificables; limitar recursos y validar acceso y salud.

## Límites

- No cambiar historia remota ni publicar ramas/tags.
- No modificar ni reiniciar la aplicación Pits; cualquier recarga del túnel debe conservar su ruta.
- No revelar secretos en salida, archivos versionados o evidencia.
- No enviar solicitudes de evaluación al AI Gateway durante el smoke check.
- No acceder a Moodle ni ejecutar repositorios estudiantiles.
