# F16-CICD — diseño de endurecimiento verificable

## Objetivo y límites

Reducir regresiones silenciosas en CI/CD y aumentar la confianza en el backup SQLite mediante pruebas sintéticas repetibles. También cerrar la ventana en que el agente puede reiniciarse con un despliegue parcialmente aplicado y una transacción pendiente. No se amplía la autoridad de GitHub Actions ni del agente local.

La tarea no despliega ni opera servicios productivos, no crea releases ni tags, no añade credenciales y no cambia la aplicación o sus migraciones. El backup permanece en la misma VPS; proteger la pérdida total del host requiere una política y destino externo fuera del alcance actual.

## Contexto

La base actual ya tiene releases por tag anotada, procedencia verificada, builds ARM64 hospedados, atestación, aprobación de entorno y un agente pull aislado. CI no cubre aún de forma directa toda la política estructural de workflows, el script de backup ni la suite existente del agente. La copia de SQLite está en el mismo host donde corre producción. El agente registra `deploying` antes de completar los cambios, por lo que una caída puede dejar una transacción sin resultado verificado.

## Decisiones de arquitectura

- Añadir regresiones locales para la estructura efectiva de los workflows y para `backup.mjs`; usar únicamente una base SQLite sintética y los proveedores falsos ya disponibles. Conectar las suites relevantes a CI, build candidato y release sin cambiar triggers ni permisos.
- Tratar el despliegue como una transacción observable: persistir suficiente baseline antes de mutar y, tras reinicio, comparar el estado real con las dos configuraciones completas conocidas. Solo una coincidencia exacta permite cerrar la transacción sin Compose; toda divergencia exige `recovery_required` y diagnóstico operativo.
- Mantener límites de autoridad: los cambios Docker del agente se serializan, los requests son señales que se revalidan contra estado actual y los estados ambiguos no se corrigen automáticamente. El rollback afecta imágenes de código y conserva SQLite.
- Hacer que fallos transitorios reconocidos permitan revalidar la misma release sin mutar Docker, y que fallos permanentes o estados terminales no creen despliegues repetidos. Los detalles exactos de procedencia, clasificación de errores, hosts, ledger, locks, transiciones y fixtures pertenecen a la especificación.

Las decisiones verificables y sus criterios de aceptación se mantienen en [task-list/F16-CICD/spec.md](task-list/F16-CICD/spec.md): validación CI/backup en decisiones 2–5; transacción, recuperación, errores y rollback en decisiones 6–11; alcance operativo y criterios de pruebas en el resto del documento. Esa especificación es la fuente detallada para implementación.

## Alternativas

Se conserva el flujo existente de publicación y aprobación porque ya tiene controles de procedencia; el cambio agrega pruebas de regresión, no una ruta de publicación nueva. La validación usa un parser YAML estructural en vez de búsqueda de texto, y las pruebas de backup usan SQLite temporal en vez de datos productivos. No se agrega almacenamiento externo sin destino, retención y controles operativos definidos. No se restaura automáticamente SQLite como rollback porque podría perder escrituras posteriores al snapshot.

## Riesgos aceptados

Los backups locales no protegen contra pérdida de la VPS. Los fallos remotos persistentes de `git fetch` y `gh attestation trusted-root` pueden reintentarse sin fin cada cinco minutos; la operación detiene nuevas activaciones, deja terminar el apply en curso, corrige la causa y reanuda la misma tag. Estados productivos que no coincidan con un baseline completo requieren intervención manual. Las migraciones actuales no forman parte de esta tarea; cualquier tarea futura que las modifique debe demostrar compatibilidad del binario anterior con el nuevo esquema o definir un rollout y rollback compatibles.

## Gate de diseño

La implementación comienza después de dos rondas limpias consecutivas de revisión independiente. Tras implementar, la evidencia recoge verificaciones locales y CI disponible; un CI exitoso no se presenta como prueba de despliegue en la VPS.