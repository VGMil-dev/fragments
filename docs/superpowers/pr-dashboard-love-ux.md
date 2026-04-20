# PR — fix(web): corregir bugs críticos del dashboard y elevar calidad

> **Rama:** `feat/dashboard-love-ux` → `main`
> **Fecha:** 2026-04-19

---

## ¿Qué hace esta PR?

Corrige bugs críticos en el dashboard implementado (runtime error en Lumen, blink loop sin cleanup, logout sin signOut, overrides del design system) y eleva la calidad: springs visibles con bounce explícito, tests Playwright reescritos con auth real, y CLAUDE.md actualizado.

---

## Cambios importantes

- **Bug de runtime corregido**: `SPRING_SOFT` declarado después de su uso en `lumen.tsx` — `ReferenceError` en producción que impedía renderizar Lumen
- **Bug de animación corregido**: blink loop de `LumenFace` usaba `setTimeout` recursivo sin flag de cancelación — múltiples loops simultáneos al cambiar de estado causaban flickering en la cara
- **Design system restaurado**: eliminado override `--base: #09090b` (incorrecto vs `#12121A`) y redefiniciones duplicadas de `ambient-grid`, `shimmer`, `soft-stroke`, `custom-scrollbar` — centralizadas en `globals.css`
- **Logout real**: `sidebar.tsx` ahora llama `authClient.signOut()` — antes solo hacía `router.push('/login')` sin limpiar la cookie de sesión
- **Springs visibles**: valores de scale aumentados y `transition` con `bounce: 0.4–0.5` añadido explícitamente — Framer Motion v12 usa `bounce: 0` por defecto (amortiguado, parece ease)
- **Tests Playwright reescritos**: 35 tests con auth real via login, selectores verificados contra código real, suite visual con screenshots, `data-testid` añadidos a todos los componentes interactivos
- **CLAUDE.md actualizado**: framer-motion en stack, estructura de archivos del dashboard, out-of-scope actualizado

---

## Archivos clave

| Archivo | Por qué importa |
|---------|----------------|
| `apps/web/src/components/dashboard/lumen.tsx` | Fix `SPRING_SOFT` + fix blink loop con `cancelled` flag + `motion.div` con springs en contenedor |
| `apps/web/src/app/globals.css` | Centraliza `.shimmer`, `.animate-shake`, `.custom-scrollbar` — eliminadas definiciones duplicadas |
| `apps/web/src/components/dashboard/sidebar.tsx` | Logout real con `authClient.signOut()` + spring en "Invocar IA" y nav items |
| `apps/web/src/app/dashboard/dashboard-shell.tsx` | Eliminado bloque `style jsx global` con overrides incorrectos del design system |
| `e2e/tests/dashboard.spec.ts` | Reescritura completa — 35 tests, auth real, cobertura de todos los flujos |
| `CLAUDE.md` | Stack actualizado (framer-motion), estructura de archivos, out-of-scope |

---

## Cómo probarlo

```bash
# 1. Levantar servicios
docker compose up

# 2. Abrir http://localhost:3000
#    Login con: test@example.com / Test1234!
```

- [ ] Hover sobre **Lumen** → scale con bounce perceptible, no lineal
- [ ] Click en **Lumen** → scale down 0.93 y rebota al soltar
- [ ] Click en **"Alimentar a Lumen"** / **"Jugar"** → spring visible en botones
- [ ] Click **"Jugar"** → seleccionar opción correcta → Lumen celebra **sin flickering** en la cara
- [ ] Seleccionar opción incorrecta → toast rojo, Lumen triste, vuelve a idle limpiamente
- [ ] Hover sobre **fragment cards** → suben 2px con rebote
- [ ] Click **"Logout"** → redirige a `/login`, la sesión queda limpia (volver a `/dashboard` redirige a login)
- [ ] Toggle **ES/EN** → UI cambia idioma, persiste al recargar

### Tests automáticos
```bash
cd e2e && npx playwright test tests/dashboard.spec.ts --headed
```

---

## Decisiones técnicas

**`cancelled` flag en lugar de `useRef` para el blink**: el flag de closure es suficiente porque cada re-render del efecto crea un nuevo scope. `useRef` sería necesario si necesitáramos el timeout ID fuera del efecto.

**Springs con `transition` explícito en cada elemento**: Framer Motion v12 usa `bounce: 0` por defecto. Para el "Love UX" el bounce debe especificarse en cada `motion.*` interactivo — no hay forma de sobreescribir el default globalmente sin romper otras animaciones.

---

## Estado del checklist

- [x] Tests E2E pasan *(41/41 — ejecutados con Docker levantado)*
- [x] No hay `console.log` ni código debug
- [x] `CLAUDE.md` actualizado
- [x] Sin `Co-Authored-By` en los commits
