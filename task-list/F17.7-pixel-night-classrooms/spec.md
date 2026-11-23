# Especificación F17.7 — Mis aulas Pixel Night

## Fuente y alcance

- Ruta: `/student/classrooms`; feature F17, coordinación académica F18.A y dirección visual F16.
- Ficha UX canónica: Notion «Mis aulas · Estudiante» (UX-02), estado previo Pendiente y maqueta `02_portal_estudiante_vistas_principales.png` no adjunta/verificada; no hay assets vinculados.
- Aplicar los tokens y principios F16 en CSS aislado al feature; preservar la conducta y copy existente.

## Criterios de aceptación

1. Solo matrículas activas, solicitudes y recursos académicos reales que ya entregue el backend se representan.
2. El formulario de código mantiene etiqueta, validación, explicación de aprobación docente y acción funcional.
3. Aulas, habilidades y misiones tienen una jerarquía clara; sus estados de carga, error y vacío permanecen truthful.
4. No se modifica ningún DTO, endpoint, contrato, permiso, migración ni estado persistido.
5. La composición responde a 320, 390, 768, 1024 y 1440 px; foco visible por teclado y reduced-motion.
6. La propuesta visual queda candidata hasta revisión del propietario; no declarar fidelidad a una maqueta ausente.
