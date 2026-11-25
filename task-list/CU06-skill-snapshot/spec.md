# Especificación — CU-06

## Dado
Una identidad docente QA, un estudiante matriculado, una habilidad propia habilitada en un aula y una misión borrador con snapshot de esa habilidad.

## Cuando
Se publica la misión, se deshabilita y habilita la habilidad para el aula, se renombra/archiva, y se intenta crear otra misión que la referencie.

## Entonces
- La habilidad aparece y desaparece de la lista estudiantil según su disponibilidad.
- La misión publicada conserva el nombre original en su versión y contexto Mentor.
- La habilidad archivada no aparece al estudiante ni puede seleccionarse para una misión nueva.
- No se modifica la identidad ni los datos de otros usuarios.

Solo `fragments_test` local puede recibir fixtures. CI ejecutará la misma prueba contra PostgreSQL efímero.
