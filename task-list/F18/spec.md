# F18 — Especificación

## Entradas y salidas

- Entradas: rutas de archivos relativas recibidas en el árbol del commit de GitHub y usadas en snapshots, referencias de evidencia y hallazgos.
- Salida: la misma cadena de ruta, sin normalización, cuando sea relativa, no vacía, mida hasta 512 unidades de texto y no incluya controles, barras invertidas, segmentos vacíos, `.` o `..`.
- Aceptar Unicode imprimible, espacios y puntuación normal de nombres de archivo. Rechazar rutas absolutas y nombres sobre el límite.

## API y datos

- Mantener sin cambios los DTOs y sus campos.
- Un snapshot que incumple el esquema se informa internamente como etapa `snapshot_validation`, código `SNAPSHOT_INVALID`, clase `permanent`; no debe registrarse como `GITHUB_UNAVAILABLE`.
- Los logs siguen usando únicamente los campos operativos permitidos y no incluyen rutas, contenido del repositorio ni secretos.
- Actualizar `evaluatorVersion` de `gateway-structured-v1` a `gateway-structured-v2` para dar al mismo commit una clave idempotente nueva; preservar sus filas previas.

## Criterios de aceptación

- GIVEN una ruta relativa válida con tildes y espacios WHEN se valida un snapshot THEN se acepta y conserva exactamente la ruta.
- GIVEN una ruta absoluta, traversal, segmentos vacíos, punto, barra invertida, control o más de 512 caracteres WHEN se valida THEN se rechaza.
- GIVEN una respuesta GitHub con una ruta válida Unicode WHEN el adaptador crea el snapshot THEN conserva ruta, contenido y SHA.
- GIVEN un snapshot inválido WHEN el adaptador lo rechaza THEN produce `SNAPSHOT_INVALID` permanente y no clasifica el evento como caída de GitHub.
- GIVEN el mismo commit revisado bajo `gateway-structured-v2` WHEN se encola THEN usa una clave nueva sin alterar el resultado anterior.

## Release y verificación

- Usar pruebas offline con respuestas GitHub sintéticas y proveedores IA falsos.
- Ejecutar pruebas, typecheck, lint y build del release exacto.
- Tras merge protegido, publicar tag anotada `v0.4.11`; cumplir gates F14 y autorización protegida antes de producción.
- Desplegar mediante F14, comprobar salud y ejecutar una evaluación real única del mismo commit; registrar calificación, gasto y evidencia sin secretos ni datos de rutas.
