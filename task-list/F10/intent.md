# F10 — Trainer

**Problema:** Review produce evidencia de una funcionalidad ya implementada, pero no ofrece un recorrido estudiantil para practicarla con retos repetibles e historial privado.

**Objetivo:** conectar Trainer con revisiones completadas, generar una vez un banco variado de hasta cinco retos inversos desde hallazgos verificados distintos, ofrecer pistas locales progresivas, sortear retos nuevos/pendientes/de repaso, y guardar el progreso por sesión anónima.

**No objetivos:** cuentas estudiantiles nuevas, ejecución o carga de código, evaluación académica, llamadas de IA por sorteo, revelar registros privados de Inspector, despliegue o gasto de IA sin presupuesto explícito de desarrollo.

**Owner:** PLANNER.

**Criterio:** flujo vertical Review → sorteo → reto → pistas → registro → historial → repetición, UI responsive en español y evidencia visual real de Ego Lite. Contratos compartidos congelados; API propia de Trainer con validación local.

**Skills:** `ego-browser` v2.2.0 leído y ejecutado para el QA visual/E2E requerido.

## F10.1 — Variedad y validación

Completar bancos F10 existentes, conservando retos anteriores e intentos; crear como máximo un reto por funcionalidad verificada distinta; coordinar generación concurrente con SQLite; mostrar cuántos retos compatibles tiene la revisión y ofrecer repaso si solo hay uno. Validar la ruta real de Review con el repositorio fixture público, su SHA exacto y una barrera aislada de USD 0.05. Capturas visuales usan la fixture local etiquetada y un proveedor fake; el recorrido de Review público quedó separado en el log de prueba real.
