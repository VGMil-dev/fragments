# F16.4 — especificación

## Criterios de aceptación

1. El original recibido se conserva byte por byte y su SHA-256 se registra. Solo se integra tras confirmar visualmente que coincide con la escena F16.3 aprobada.
2. Derivados sin audio: WebM VP9 principal, MP4 H.264 respaldo y poster/fallback WebP. La variante principal prioriza <2 MB sin degradación visual perceptible; variante móvil solo si mejora materialmente el peso y mantiene nitidez suficiente.
3. El video es decorativo, silencioso, inline, automático y en bucle. La unión se revisa; cualquier fundido mínimo debe superar revisión visual sin imágenes fantasma, salto o cambio de brillo.
4. El contenedor, layout y proporciones aprobadas de F16.3 permanecen intactos. El video usa `contain`; no se recortan sujeto, gato ni luna. La discrepancia de ratio entre origen 16:9 y contenedor 2:1 se valida visualmente antes de cerrar.
5. Con `prefers-reduced-motion: reduce` solo se monta/solicita el poster, sin fuentes ni descargas de video. El WebP permanece como fallback ante error o bloqueo de autoplay.
6. Sin CLS, sin bloquear texto, sin descargar ambas resoluciones, el video pausa al salir de viewport y vuelve a reproducirse al regresar.
7. Revisar 320/375/390/768/1024/1440 px, navegar por teclado, CTA/rutas, reducción de movimiento, poster/error, selección de fuente y tres ciclos completos.
8. Suite pertinente, typecheck, build y auditoría diff pasan; capturas antes/después y Goldfish documentados con dos rondas limpias consecutivas.

## Archivos de medios propuestos

- `task-list/F16.4/source/hero.mp4`: copia intacta del original recibido, solo como evidencia/origen; no se publica.
- `apps/web/public/f16-4/hero-poster.webp`: poster generado desde un fotograma del video.
- `apps/web/public/f16-4/hero-motion.webm`, `hero-motion.mp4`: variantes principales sin audio.
- Variantes móviles solo si las mediciones justifican su existencia.
