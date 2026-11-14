# Plan de pantallas — cobertura total

Se han extraído las **11 rutas** explícitas del archivo de código `apps/web/src/App.tsx` en la rama principal consultada, más **6 estados internos** con relevancia visual y **3 conceptos sin ruta validada**. Ver `design/screens.json` y el Excel.

La ruta genérica `path.startsWith('/student/')` representa un *fallback de código*, no una pantalla distinta ni permiso para inventar más rutas; agregar not-found si procede, con pruebas.

No cambiar semántica de sesión OAuth, acceso docente, privacidad, evaluaciones, descargar archivos o flujo del estudiante. Mantener URLs como contratos.

**Fases**
1. Landing y design system (público)
2. Login/OAuth/Galería y detalle
3. Mentor/Review/Trainer y sus estados
4. Inspector/Control Mentor/Estudiantes/Restablecer contraseña
5. E2E visual, teclado, móvil y regresión

Para cada ruta: captura baseline 1440/768/390, revisar permisos, pantalla vacía/error/carga/éxito y scroll. Implementar con feature flags si la migración lo requiere. No fusionar funcionalidades existentes por conveniencia de layout.
