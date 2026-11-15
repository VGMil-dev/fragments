# F16.1 — Estado de QA y manifiesto de capturas

## Procedencia y rama

- Rama del trabajo: `feature/f16-experience-redesign`.
- Commit de implementación y capturas originales F16.1: `11f9f56a253a28040a2f9a1b50c32403d9c6eda1` (`fix(f16.1): refina legibilidad y jerarquia visual`).
- Commit documental F16.1: `74ff839` (`docs(f16.1): registra QA y revisiones UX`).
- Capturas actuales de las 14 rutas afectadas: archivos PNG Ego Lite de `task-list/F16/screenshots/f16.1/`, copiados byte por byte a este paquete. Se seleccionó el estado de Trainer con reto sintético y progreso para hacer visible el refinamiento de pistas e historial.
- Cuatro capturas de landing/login son idénticas a las del paquete F16 porque esas pantallas no cambiaron en F16.1. Se conservaron sus bytes originales.
- Paquete F16 de origen: `task-list/F16/F16-QA-FINAL-REVIEW/`, no modificado.
- No se modificaron frontend, CI/CD, servicios o producción durante la preparación de este paquete. No hubo push, merge o despliegue.

## Verificaciones de F16.1

- `pnpm --filter @fragments/web test`: PASS, 20 archivos y 85 pruebas.
- `pnpm --filter @fragments/web typecheck`: PASS.
- `pnpm --filter @fragments/web build`: PASS; 160 módulos transformados. Permanece la advertencia de bundle >500 kB: `mammoth.browser` 491.75 kB y bundle principal 525.49 kB.
- QA Ego Lite F16.1 documentado en `task-list/F16.1/evidencie.md`: rutas de estudiante y docente a 320/375/768/1440 px, sin desbordamiento horizontal; 14/14 imágenes cargadas en la galería comparativa. Se recorrieron Galería→detalle→inspiración→Mentor y Trainer con proveedor fake y datos sintéticos.
- Revisión de este paquete: exactamente 18 PNG y 2 Markdown; 20 archivos planos y 0 subcarpetas. PNG: 1440×900 para desktop, 320×900 para móvil. SHA-256 se registra abajo.
- Privacidad: inspección visual de las capturas y estados/fixtures. Los campos de Review están vacíos; nombres y resultados restantes están identificados como sintéticos. No se observan secretos, credenciales ni datos reales.

## Revisiones Goldfish y límites

- Microauditoría funcional/readiness inicial y revalidación: sin Blocker/Major/Nit en galerías, privacidad, Mentor, Review, Trainer, navegación y áreas docentes.
- Microauditoría UX encontró texto funcional y enlaces de navegación a 14 px y posible recorte del foco. Se actualizaron a 16 px los textos funcionales y la navegación, y se añadió padding al scrollport; revalidación estática confirmó foco no recortado y tipografía de 16 px.
- No se declara convergencia formal EGM. Los revisores no pudieron verificar el modelo/esfuerzo de sus propias sesiones. Las solicitudes iniciales se hicieron con `gpt-6-luna` / `medium`; revalidadores usaron estándares EGM disponibles. La ruta `task-list/F16/EGM_REVIEW_FLOW.md` indicada no existe en este worktree.
- Screenshots son evidencia visual, no prueba de interacciones. Fixture sintético/fake provider solamente; no se probaron OAuth/GitHub ni proveedores externos reales. No es una certificación WCAG completa.
- No se ejecutó código de repositorios estudiantiles ni se contactaron servicios externos.

## Manifiesto de SHA-256

Las dimensiones se leen del encabezado PNG IHDR. “Sin cambio” significa que el SHA-256 coincide con el archivo del paquete F16 con el mismo nombre.

| Archivo | Viewport | Estado vs. F16 | SHA-256 |
|---|---:|---|---|
| `01-landing-desktop.png` | 1440×900 | Sin cambio | `a69035995e77a27ddd635ddbcfc28fafb752c154aad7176539d869ab234c4413` |
| `02-landing-mobile.png` | 320×900 | Sin cambio | `543e8082afd41f4d7794906ed6ec942cac1b023d4ad7863a39060438a28030ef` |
| `03-login-desktop.png` | 1440×900 | Sin cambio | `8e100db572be6f5f0a712adc7599dd3ef5c7680944b6592f496e6461e84cbc16` |
| `04-login-mobile.png` | 320×900 | Sin cambio | `d8c122c411f7bba90da38ca398031af8befe42370a71f53a683e96a028bc99b1` |
| `05-gallery-desktop.png` | 1440×900 | Actualizada | `7c0ef7558e9cb34e891506c2b471142f90248200107e23aa4c7b1cc622fa73ea` |
| `06-gallery-mobile.png` | 320×900 | Actualizada | `f9d141f56231113aa34554cfe846d81998873bc3d7099a064b6cb86e74ef8e37` |
| `07-mentor-desktop.png` | 1440×900 | Actualizada | `e1c83f5737beb62d074023b1e3b93975c5171a45e0f61a94d4eb74004061ab12` |
| `08-mentor-mobile.png` | 320×900 | Actualizada | `c2aad5932fa9db0d3660bad46878af8dc9e58e09f3aa13e18028bc4f92c81ec1` |
| `09-review-desktop.png` | 1440×900 | Actualizada | `36e94a8e3aa2e8c0ce19a6905665609b29972dd7eb0d2b541e8dc703886f7c28` |
| `10-review-mobile.png` | 320×900 | Actualizada | `dca9881bf6d2186fd8d2ccb1216bc30e755f08a7fd4b6b28a4234c284122ba2b` |
| `11-trainer-desktop.png` | 1440×900 | Actualizada | `dd50ddb44454fb628bbec2f09edffe12e42d769ef2e6df52a0f454ba493d5963` |
| `12-trainer-mobile.png` | 320×900 | Actualizada | `96de14598e3ae3d466e2b74f4d262fc36b450196a1e36a3d58912d3c2690211c` |
| `13-inspector-desktop.png` | 1440×900 | Actualizada | `ce2f0f9bc0141c80680ccde72556b41a3dbc61102e8eae40191f82d94a564eb3` |
| `14-inspector-mobile.png` | 320×900 | Actualizada | `af3551b9c4e5885faf078738774eea985dee931ebad9a5120900e6e8e1017137` |
| `15-mentor-control-desktop.png` | 1440×900 | Actualizada | `776ad07091b18ecb4e33d738f7c84d9a54b3bfe13975b5e130cb2a1ab3a8c17a` |
| `16-mentor-control-mobile.png` | 320×900 | Actualizada | `925c0d01b501f854cf0ca639a6cc2bc4bacee91fe112095fc3ff77465791e84d` |
| `17-students-desktop.png` | 1440×900 | Actualizada | `595a6786e6f3793bb2c15ddabb33723cb35d38911c43bd0927ef96bf3e394e53` |
| `18-students-mobile.png` | 320×900 | Actualizada | `cdcc63c6b32120e9bbeaa92411eefe7aaeae4f8eff950b2a839d62a14da1944f` |

## Resultado

Paquete listo para copiar/compartir con ChatGPT: **20 archivos exactos, sin subcarpetas; 14 capturas actualizadas y 4 sin cambio**. Se conserva la carpeta original de revisión F16.
