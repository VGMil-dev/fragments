# F13 — Especificación

## Entradas
- Build local: sin `FRAGMENTS_RELEASE_TAG` ni `FRAGMENTS_RELEASE_SHA`.
- Build de release: tag `vX.Y.Z` y SHA completo proporcionados por el pipeline después de seleccionar el commit exacto.
- Repositorio Git disponible durante el build para validar HEAD, tag anotada, árbol limpio y ascendencia en `origin/main`.

## Salidas
- Metadata pública embebida en el bundle: versión y SHA completo, obtenidos de la verificación del checkout.
- Workflow manual disparado desde `main` que valida tag anotada, ascendencia y SHA antes de compilar el workspace y guardar `apps/web/dist`; no despliega ni recibe secretos de producción.
- Indicador compacto y legible en escritorio y móvil; SHA completo disponible como `title`/nombre accesible.
- Un build de release falla si sus entradas o verificaciones no son válidas. No se usa `git describe`.

## Aceptación
- GIVEN un build de `v0.3.1` desde el SHA etiquetado WHEN el pipeline construye THEN el indicador muestra `v0.3.1` y el SHA del checkout exacto.
- GIVEN un build local sin variables WHEN se compila THEN la versión mostrada es `dev` y no se inventa un SHA.
- GIVEN una tag ligera, mal formada, fuera de `origin/main`, discrepante con HEAD o un árbol modificado WHEN se solicita un build de release THEN el build falla.
- GIVEN escritorio o móvil WHEN se visita una pantalla web THEN el indicador se lee sin cubrir navegación ni contenido.
- GIVEN ausencia del workflow confiable de releases WHEN se integra F13 THEN no se añade automatización de despliegue ni se despliega.
