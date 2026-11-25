# CU-15 · Especificación de verificación

## Dado / Cuando / Entonces

- Dado que el estudiante está en `/student/classrooms`, tiene una matrícula activa, aparece una misión publicada y no hay propuesta propia vinculada.
- Cuando elige «Iniciar propuesta» para esa misión.
- Entonces se abre `/student/mentor` con el aula, el contexto versionado y las habilidades requeridas de esa misión; no se selecciona una propuesta previa ni se guarda una automáticamente.

## Límites

- Prueba de interfaz con APIs y datos fixture. No equivale a autenticación real, persistencia PostgreSQL ni prueba de producción.
- No realizar operaciones productivas ni llamadas a proveedores de IA.
- Mantener el CU global parcial mientras falte la revalidación autenticada actual y la cobertura QA integral de persistencia.
