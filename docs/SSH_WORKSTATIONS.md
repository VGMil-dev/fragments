# SSH desde estaciones Windows

La identidad de administración de Fragments debe abrirse desde un sistema de archivos que aplique controles de acceso efectivos. En estas estaciones, usa una copia local en `C:\Users\<usuario>\.ssh` sobre NTFS. **No configures OpenSSH para leer la clave desde `D:\Servidor`**: esa unidad es exFAT y no conserva ACL de Windows; `icacls` puede informar éxito sin cambiar el acceso real.

## Preparación de cada estación autorizada

1. Confirma el usuario y el sistema de archivos del destino:

   ```powershell
   $stationProfilePath = [Environment]::GetFolderPath('UserProfile')
   $stationDriveLetter = [System.IO.Path]::GetPathRoot($stationProfilePath).Substring(0,1)
   Get-Volume -DriveLetter $stationDriveLetter | Select-Object DriveLetter, FileSystem
   Test-Path (Join-Path $stationProfilePath '.ssh')
   ```

   Continúa solo si el volumen que contiene `.ssh` es NTFS.

2. Busca una copia local existente. No la sobrescribas. Compara su huella OpenSSH (`ssh-keygen -lf`) con la identidad autorizada, sin imprimir ni copiar el contenido privado. Si no hay una copia válida, el propietario puede copiarla desde la ubicación autorizada a `.ssh`; deja intacto el original y nunca coloques la copia en el repositorio, una carpeta sincronizada o una unidad exFAT.

3. Protege el archivo en NTFS y deshabilita herencia. Otorga acceso de lectura a la cuenta autorizada; concede a SYSTEM o Administrators solo si la política de esa estación lo requiere. No incluyas `Everyone`, `Users` ni `Authenticated Users`. No cambies el propietario salvo que haya una razón documentada.

4. Comprueba el DACL efectivo, no solo el código de salida de `icacls`: debe estar protegido, no heredado, sin SID amplio y con lectura para la cuenta actual. Abre el archivo en modo lectura sin leer ni mostrar bytes y confirma que `ssh-keygen` puede analizarlo. Si el volumen no admite ACL o cualquier ACE inesperada permanece, detente antes de conectar.

## Conexión y huella del servidor

Usa exclusivamente la identidad local protegida, `IdentitiesOnly yes`, `BatchMode yes` y `StrictHostKeyChecking yes`, apuntando al `known_hosts` local con la huella confiable preestablecida. Confirma la huella ED25519 del handshake antes de ofrecer la clave privada. No aceptes automáticamente una huella nueva, no uses credenciales alternativas y no cambies `authorized_keys` remoto.

La configuración OpenSSH puede referir la copia por `~/.ssh/ssh-key-2026-10-25.key`; nunca por `D:/Servidor/ssh-key-2026-10-25.key`.

## Registro seguro

Registra solo la ruta local, tipo de sistema de archivos, estado de protección/ACE, resultado de lectura, huellas públicas comparadas como igualdad, huella de host, estado de autenticación y salidas SQLite redactadas. No imprimas, envíes, registres ni incluyas en Git el contenido de una clave privada, credenciales, cookies o filas académicas personales.
