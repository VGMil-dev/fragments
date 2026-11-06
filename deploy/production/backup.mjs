import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const sourcePath = process.env.DATABASE_PATH ?? "/app/data/fragments.sqlite";
const backupDirectory = process.env.BACKUP_DIRECTORY ?? "/backups";
const retentionDays = Number(process.env.RETENTION_DAYS ?? "14");

if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 365) {
  throw new Error("RETENTION_DAYS debe estar entre 1 y 365.");
}
if (!existsSync(sourcePath)) throw new Error("La base SQLite no existe; no se creó un backup vacío.");

mkdirSync(backupDirectory, { recursive: true, mode: 0o700 });
chmodSync(backupDirectory, 0o700);

const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const backupPath = join(backupDirectory, `fragments-${timestamp}.sqlite`);
const source = new DatabaseSync(sourcePath, { readOnly: true });
try {
  source.exec(`VACUUM INTO '${backupPath.replaceAll("'", "''")}'`);
} finally {
  source.close();
}

chmodSync(backupPath, 0o600);
const backup = new DatabaseSync(backupPath, { readOnly: true });
let integrity;
try {
  integrity = backup.prepare("PRAGMA integrity_check").get();
} finally {
  backup.close();
}
if (integrity?.integrity_check !== "ok") {
  rmSync(backupPath, { force: true });
  throw new Error("El backup SQLite no superó integrity_check.");
}

const digest = createHash("sha256").update(readFileSync(backupPath)).digest("hex");
const now = Date.now();
const cutoff = now - retentionDays * 24 * 60 * 60 * 1000;
for (const entry of readdirSync(backupDirectory, { withFileTypes: true })) {
  if (!entry.isFile() || !/^fragments-.*\.sqlite$/.test(entry.name)) continue;
  const path = join(backupDirectory, entry.name);
  if (statSync(path).mtimeMs < cutoff) rmSync(path);
}

process.stdout.write(`backup_ok file=${basename(backupPath)} bytes=${statSync(backupPath).size} sha256=${digest} retention_days=${retentionDays}\n`);
