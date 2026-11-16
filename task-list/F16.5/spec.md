# F16.5 — especificación

## Criterios de aceptación

1. El isotipo público usa byte por byte `fragments-isotipo-recto.svg` (viewBox 0 0 100 80, proporción 1.25, recto, simétrico, Lime #D4FF24); el lockup conserva el wordmark y el enlace accesible a inicio.
2. El mismo isotipo mantiene proporción y legibilidad a 16/24/32/48 px. No se modifica BrandMark de otras superficies ni favicon/app icon/PWA.
3. Los tres beneficios conservan sus labels y semántica de lista y usan Lucide Rocket, Lightbulb y UsersRound con un solo trazo 1.8, color Lime y aria-hidden.
4. La portada da jerarquía ligeramente mayor a Fragments, Sueña · Crea · Conecta y la descripción, manteniendo contraste, legibilidad y protagonismo del arte.
5. No hay overflow horizontal, texto cortado ni reflow defectuoso en 320/375/390/768/1024/1440 CSS px; se mantienen focus visible, navegación de teclado, links de auth y CTA.
6. WebM/MP4, poster, bucle, `prefers-reduced-motion`, selección responsive y fallback quedan sin cambios.
7. Tests pertinentes, typecheck, build, auditoría del diff y capturas antes/después pasan. Se realizan dos rondas consecutivas Goldfish limpias si están disponibles; cualquier límite se declara.
8. No hay cambios fuera del scope público especificado. La publicación sigue la autorización explícita de F16.5 Autónoma recibida el 2026-11-16 y solo ocurre cuando pasan los quality gates, checks y protecciones existentes; no se eluden controles.
