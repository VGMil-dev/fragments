# CU-22 — Reintento concurrente de Review sin duplicados

Comprobar que dos solicitudes simultáneas de reintento ante un fallo transitorio retomen el mismo trabajo idempotente. Ninguna debe producir una entrega o evaluación duplicada; el worker debe registrar un solo segundo intento con el mismo SHA/contexto.
