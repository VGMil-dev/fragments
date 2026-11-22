# Especificación F22.6 — Filtro en feed admin de actividad

- La pantalla conserva la lectura existente de `/api/admin/audit-log?limit=50`.
- Un control `<select>` con etiqueta visible permite elegir todos los eventos o uno de los tipos permitidos por la UI.
- El filtrado se calcula en el cliente únicamente sobre los eventos actualmente recibidos; cambiar el filtro no llama a la API.
- Si la muestra contiene eventos pero el filtro seleccionado no encuentra coincidencias, la pantalla informa que no hay eventos de ese tipo en la muestra actual.
- `Actualizar` vuelve a leer el feed y conserva el filtro seleccionado.
- Si la API devuelve una muestra vacía, se conserva el estado vacío general existente; carga y error mantienen su comportamiento.
- El filtro es usable por teclado y tiene foco visible.

## Verificación

- Prueba focal UI con Vitest/jsdom para filtrado, vacío, no solicitar al cambiar el control y actualización conservando selección.
- `pnpm --filter @fragments/web typecheck`.
- `git diff --check`.
