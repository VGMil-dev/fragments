# Especificación

- Fuente persistente `trainer` con proyector allowlist, retención existente y límite compartido.
- Emitir éxito tras persistir un intento y fallo solo después de iniciar la operación, sin registrar cuerpos ni errores arbitrarios.
- Endpoint GET `/api/admin/trainer-events?limit=1..50`, auth admin, actor identificable y auditoría aceptada antes de leer.
- UI `/admin/trainer-events` con estados de carga/error/vacío, reintento y filtros locales de etapa/resultado.
- No añadir migración ni modificar contratos compartidos.
