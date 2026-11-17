# Plan de recuperación productiva — INC-AI-GATEWAY-429

## Estado y responsables

Este plan no se ejecutó. Owner operativo: mantenedor autorizado de Fragments. Requiere autorización explícita del propietario para publicar una versión y, en un paso separado, para intervenir el ledger o ejecutar una evaluación facturable. PR/merge no despliegan. F14 exige release desde una tag SemVer anotada y aprobación protegida.

## Puertas previas

1. Aprobar la revisión del PR y obtener `verify` exitoso en su HEAD final; confirmar que no quedan comentarios Blocker/Major sin resolver.
2. Confirmar que `origin/main` contiene el PR, elegir una versión y obtener autorización específica para crear/publicar la tag anotada. No reutilizar ni mover tags.
3. Confirmar salud de API/web, SHA e imágenes productivas actuales, capacidad de rollback y disponibilidad de una persona con acceso de solo lectura a Gateway y al ledger.
4. Correlacionar el ID `gen_01M7K1YVAMRVX1VXNKJ1E661T7` con la solicitud del API mediante logs históricos del Gateway y del proveedor. La igualdad temporal no basta. Registrar el ID de solicitud común, estados Gateway/proveedor, costo y uso facturable; no copiar prompts, respuestas, key IDs completos ni datos de estudiante al informe.
5. Si no hay ID común o el proveedor no confirma costo/uso de forma concluyente, detenerse: conservar `973ffb70-13c8-4445-b551-0a52ec75042a` en `uncertain`, sin despachar otra evaluación.

## Backup y preflight de integridad

1. Verificar que no haya otra operación de release/backup en curso y tomar el backup con el mecanismo establecido: `sudo systemctl start fragments-backup.service`.
2. Confirmar el resultado exitoso del servicio, anotar ubicación, tamaño y SHA-256 del nuevo archivo. No leer ni copiar valores de `.env`.
3. Abrir una copia de solo lectura del backup y exigir `PRAGMA integrity_check = ok`. Comparar conteos y checksums de tablas críticas (propuestas, evaluaciones, sesiones y `ai_budget_reservations`) con la base viva. Registrar valores de conteo, nunca filas privadas.
4. Si el backup, integridad, SHA o comparación fallan, detener el release y preservar el estado actual.

## Publicación y despliegue

1. Publicar el branch propio por push normal y completar PR contra `main`; no fusionar durante este GOAL.
2. Después de aprobación y merge normal, repetir el preflight de main y crear una nueva tag anotada solamente con autorización de release. Seguir el agente F14 y su entorno protegido; no ejecutar `docker compose` manual en el VPS.
3. El cambio aplica las migraciones SQLite aditivas v12/v13; mantiene la migración Review v11. La v13 agrega `rate_limit_active` con valor inicial cero al control singleton creado en v12. El rollback de F14 debe volver a las imágenes API/web previas sin restaurar la base completa. El binario anterior tolera las columnas/tablas aditivas, pero se debe comprobar en CI la imagen API previa contra el esquema v13 antes de ejecutar el release.
4. Tras recrear API y web secuencialmente según F14, comprobar ambos contenedores `healthy`, revisión de imagen igual a la autorizada, `/health` HTTP 200, web HTTP 200, sesiones/auth y errores de arranque. No reconciliar todavía: con la fila incierta presente el comportamiento esperado es bloquear un despacho nuevo.

## Conciliación de 870 microUSD

La fila debe coincidir por **ID de generación común**, ser Mentor, tener estado `uncertain`, costo nulo y monto reservado exacto de 870 microUSD. Tomar un segundo backup justo antes de resolverla.

- **Proveedor y Gateway confirman sin uso/costo para ese mismo ID:** con aprobación explícita del propietario, cambiar únicamente esa fila de `uncertain` a `released`, conservar `actual_microusd=NULL`, y exigir que la operación condicional afecte exactamente una fila. Guardar fuera de la base el actor, timestamp UTC, generación verificada, enlace/identificador de evidencia y razón de la decisión, sin payloads privados. Si afecta cero o más de una fila, hacer rollback.
- **Costo facturable confirmado:** no liberar. Con aprobación explícita, registrar el costo exacto convertido a microUSD y cerrar la reserva como `settled`; no reintentar esa clave idempotente. Si no hay resultado de evaluación recuperable por ID, detenerse para decisión del propietario sobre una nueva operación y su posible costo.
- **Evidencia contradictoria o incompleta:** no escribir nada; mantener la reserva incierta y detener la recuperación.

La implementación actual no incluye un endpoint ni una CLI administrativa de conciliación. Por eso la escritura, si alguna vez se autoriza, debe ejecutarse como operación manual revisada de dos personas sobre una transacción SQLite con backup probado, `BEGIN IMMEDIATE`, predicado por ID+estado+monto+tipo, verificación de una única fila afectada, lectura de comprobación y `COMMIT` solo después de verificar. No usar `UPDATE` amplio ni liberar por timestamp. Hasta que exista un mecanismo operativo auditado, el estado es NO-GO para liberar la fila.

## Smoke test autorizado y control de consumo

Después de una conciliación probada y autorización separada de gasto:

1. Usar una propuesta sintética controlada, nunca ejecutar código de estudiante. Confirmar antes que la clave Gateway conserve presupuesto suficiente y fijar un máximo monetario explícito.
2. Enviar exactamente una evaluación y capturar status HTTP, generación, estado/costo/uso del Gateway y liquidación del ledger. Confirmar resultado de Mentor persistido una sola vez.
3. Repetir el mismo POST lógico y confirmar recuperación de caché/idempotencia: mismo ID de evaluación, sin nuevo ID de generación ni segundo costo.
4. Consultar el GET de recuperación y verificar mismo resultado sin despacho. Comparar suma de costo Gateway contra costos settled de la prueba; confirmar cero reservas inciertas nuevas.
5. Confirmar que un 429 sintético/observado se informa como rate limit, conserva `Retry-After` e ID seguro, y no aparece como agotamiento de presupuesto. No inducir 429 en producción deliberadamente.

## Rollback y criterios de parada

Iniciar rollback de código vía agente F14 si API/web no quedan `healthy`, `/health` o `/` fallan, aparecen errores 5xx sostenidos, duplicidad de evaluación, diferencias de costo o una reserva queda incierta sin correlación. No restaurar SQLite completa por defecto.

Si el ledger ya fue conciliado y se revierte a código anterior, detener nuevas evaluaciones y volver a marcar **solo la fila de este incidente** como `uncertain` mediante acción condicional autorizada antes de reabrir tráfico; así el código anterior conserva su bloqueo financiero. Preservar los backups y los nuevos datos legítimos.

## Evidencia para declarar producción recuperada

- Backup pre-release y pre-conciliación íntegros, SHA registrados, conteos críticos conservados.
- PR y release exactos, CI exitoso, autorización del release y operador de conciliación registrados.
- Evidencia de Gateway/proveedor ligada por ID compartido y disposición autorizada de la reserva.
- API/web saludables y smoke test único persistido/recuperable.
- Un solo ID de generación/costo para la prueba; ledger liquidado coincide con Gateway y no hay incertidumbres nuevas.
- Observación posterior sin duplicados, errores sostenidos ni desviaciones presupuestarias. Solo entonces el owner puede declarar recuperado el servicio.
