# F22.1 — Diagnósticos admin de solicitudes API

## Problema

Fragments carece de una vista verificable de errores recientes. Los operadores necesitan correlacionar solicitudes API por hora sin revisar a ciegas el servidor ni exponer información personal, secretos, payloads o sesiones.

## Objetivo

Registrar eventos reales de finalización de solicitudes API con un conjunto pequeño de campos redactados, exponer los eventos recientes mediante una lectura exclusiva para admin y mostrar esa lectura en una pantalla privada de diagnóstico.

## Decisión

Comenzar por observabilidad de solo lectura. La ruta y cualquier dato dinámico se reducirán a una familia conocida; no se conservarán URL completas, query strings, IDs de usuario, cookies, headers, body, stack traces ni prompts. Cada solicitud obtiene un request ID generado en servidor. Los eventos se escriben como JSON estructurado a stdout y se mantienen en un buffer acotado en memoria para la vista reciente. No agregar persistencia ni dependencias en este incremento.

## Fuera de alcance

Gestión de usuarios/roles, acciones privilegiadas, acceso a PostgreSQL o Docker desde el navegador, lectura de producción, costos AI, logs de proveedor, cambios de F14 o migraciones.
