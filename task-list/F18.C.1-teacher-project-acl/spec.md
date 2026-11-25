# Especificación F18.C.1

## Reglas

1. La lista de proyectos de un docente incluye únicamente propuestas con `assignmentVersionId` que apunte a una versión publicada de una misión cuyo aula esté activa y pertenezca a ese docente.
2. La propuesta solo es visible mientras el estudiante tenga matrícula `active` en esa misma aula activa.
3. Propuestas personales, ligadas a otra aula/docente, de estudiantes retirados, y propuestas históricas sin propietario no se exponen a un docente no relacionado.
4. Una consulta por estudiante no relacionado responde como recurso inexistente, sin revelar si la identidad existe.
5. El número de proyectos del directorio refleja solo las propuestas que ese docente puede consultar; no revela actividad privada global.
6. El panel de seguimiento lista solo estudiantes matriculados en aulas activas propias. La búsqueda de identidades GitHub verificadas para asignación directa conserva un endpoint separado y no expone conteos de proyectos.
7. Retirar una publicación solo se permite al docente de un aula activa donde el propietario del proyecto mantenga matrícula activa y la misión esté publicada.
8. No se reescriben membresías ni se agregan migraciones. El listado histórico docente deja de enumerar contenido anónimo.

## Pruebas de aceptación

- Docente A solo ve una propuesta vinculada a misión publicada en aula A con matrícula activa.
- Docente A no ve borradores personales, proyectos en aula B, aula archivada, matrícula retirada ni proyectos sin `assignmentVersionId`.
- Docente B obtiene resultado genérico de inexistente al consultar estudiante/proyecto no relacionado con sus aulas.
- Una propuesta histórica sin propietario no aparece ni en el endpoint ni en la UI docente.
- El endpoint de identidades asignables conserva candidatos GitHub verificados pero omite conteos de actividad privada.
- Un docente de otra aula no puede retirar una publicación, aunque conozca el ID; la publicación sigue intacta.
- Un estudiante sigue pudiendo leer todas sus propuestas propias; las páginas de Review por aula conservan su ACL vigente.

## Verificación

TDD con PostgreSQL local aislado `fragments_test`; verificar `current_database()` antes de insertar fixtures. Usar Ego Lite solo para validar estado productivo posterior a una release F14 autorizada, sin seleccionar identidades de terceros. Ejecutar tests API, typecheck, build y `git diff --check`. No ejecutar IA real.
