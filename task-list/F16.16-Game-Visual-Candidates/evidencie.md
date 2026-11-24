# Evidencia F16.16 — Candidatos visuales

## Estado

Tres ilustraciones generadas y optimizadas en WebP. Permanecen **Candidatas**; no se integraron en las pantallas ni se desplegaron. Las versiones aprobables no contienen patrón de transparencia incrustado.

## Archivos

| Superficie | Archivo | Dimensiones | Bytes | SHA-256 |
|---|---|---:|---:|---|
| Mentor · idea | `task-list/F16/resources/candidates/mentor-idea-candidate.webp` | 512×512 | 101836 | `3B12DA3C29FF3BDC95BCC6EE2801B61B76F81CC0668ED0F8B6CDFFC5A773BCAA` |
| Trainer · laboratorio | `task-list/F16/resources/candidates/trainer-lab-candidate.webp` | 512×512 | 70958 | `7ECEB3813A3B4907ED9E623081D5E629F60A59797BD9263E738684DFECE87F8B` |
| Dashboard · centro de misiones | `task-list/F16/resources/candidates/dashboard-mission-hub-candidate.webp` | 512×512 | 94400 | `4FFC75AB802A1CFA2012B71EE04EE13E97D392EE2D697823A852BEFD78E323B2` |

## Verificación

- `ffprobe` confirmó 512×512 y `argb` en los tres WebP.
- `ffmpeg` comprobó canal alfa con rango 0–255 en cada archivo; el patrón cuadriculado de las primeras iteraciones fue eliminado en Mentor y Dashboard antes de sustituir los archivos del paquete.
- Los archivos se optimizaron como WebP lossless con remuestreo de vecino más cercano; todos pesan menos de 250 KB.
- `Get-FileHash -Algorithm SHA256` produjo los hashes listados.
- No se ejecutaron pruebas de aplicación: no hubo cambios de código.
- QA visual en pantalla y aceptación del propietario: **PENDIENTE**. Los archivos no se consumen desde la aplicación.
