# F10.6 — Recuperación de acciones de práctica

Alcance: sortear un reto y registrar el estado propio son acciones de Trainer conectadas al servidor. Si el transporte falla, la pantalla debe salir del estado ocupado y ofrecer recuperación comprensible. Se conserva el reto y el historial ya mostrados. Los reintentos manuales de un registro ambiguo deben reutilizar una clave idempotente que el servidor deduplica por sesión para no duplicar escrituras.

No se cambian la semántica de retos, puntuaciones, rúbricas ni llamadas IA. Se añade solo almacenamiento aditivo de la clave idempotente por intento.
