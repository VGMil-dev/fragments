import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmod, mkdtemp, mkdir, readFile, rm, stat, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const backupScript = path.resolve(directory, "../backup.sh");
const restoreScript = path.resolve(directory, "../restore-verify.sh");
const shell = process.env.FRAGMENTS_TEST_SHELL ?? "sh";
const canRunShell = process.platform !== "win32" || Boolean(process.env.FRAGMENTS_TEST_SHELL);

async function withTemp(callback) {
  const root = await mkdtemp(path.join(os.tmpdir(), "fragments-f21-backup-"));
  try { await callback(root); } finally { await rm(root, { recursive: true, force: true }); }
}

async function fakePostgresTools(binDirectory) {
  await mkdir(binDirectory, { recursive: true });
  const pgDump = path.join(binDirectory, "pg_dump");
  const pgRestore = path.join(binDirectory, "pg_restore");
  await writeFile(pgDump, "#!/bin/sh\nset -eu\nout=\nfor arg in \"$@\"; do case \"$arg\" in --file=*) out=${arg#--file=};; esac; done\n[ -n \"$out\" ]\nprintf 'PGDMP synthetic archive\\n' > \"$out\"\n");
  await writeFile(pgRestore, "#!/bin/sh\nset -eu\nif [ \"$1\" = --list ]; then archive=$2; else for arg in \"$@\"; do archive=$arg; done; fi\nhead -c 5 \"$archive\" | grep -q PGDMP\n");
  for (const name of ["createdb", "dropdb"]) await writeFile(path.join(binDirectory, name), "#!/bin/sh\nexit 0\n");
  await writeFile(path.join(binDirectory, "psql"), "#!/bin/sh\nprintf 't\\n'\n");
  await Promise.all(["pg_dump", "pg_restore", "createdb", "dropdb", "psql"].map(name => chmod(path.join(binDirectory, name), 0o755)));
  return `${binDirectory}${path.delimiter}${process.env.PATH ?? ""}`;
}

test("backup script validates a PostgreSQL archive, hashes it, and prunes only expired dumps", { skip: !canRunShell }, async () => {
  await withTemp(async (root) => {
    const backupDirectory = path.join(root, "backups");
    const binDirectory = path.join(root, "bin");
    await mkdir(backupDirectory);
    const envPath = await fakePostgresTools(binDirectory);
    const expired = path.join(backupDirectory, "fragments-expired.dump");
    const retained = path.join(backupDirectory, "fragments-retained.dump");
    const unrelated = path.join(backupDirectory, "unrelated.dump");
    await Promise.all([writeFile(expired, "expired fixture"), writeFile(retained, "recent fixture"), writeFile(unrelated, "unrelated fixture")]);
    const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await utimes(expired, old, old);

    const result = spawnSync(shell, [backupScript], { encoding: "utf8", env: { ...process.env, PATH: envPath,
      BACKUP_PROD_DATABASE_URL: "postgresql://fixture.invalid/fragments_prod", BACKUP_TEST_DATABASE_URL: "postgresql://fixture.invalid/fragments_test", BACKUP_DIRECTORY: backupDirectory, RETENTION_DAYS: "14" } });
    assert.equal(result.status, 0, result.stderr);
    const matches = [...result.stdout.matchAll(/^backup_ok file=(fragments-(?:prod|test)-[^ ]+\.dump) bytes=(\d+) sha256=([0-9a-f]{64}) retention_days=14\r?$/gm)];
    assert.equal(matches.length, 2, result.stdout);
    const match = matches[0];
    assert.ok(match, result.stdout);
    const snapshot = path.join(backupDirectory, match[1]);
    const bytes = await readFile(snapshot);
    if (process.platform !== "win32") assert.equal(Number(match[2]), bytes.length);
    assert.equal(match[3], createHash("sha256").update(bytes).digest("hex"));
    assert.equal(bytes.subarray(0, 5).toString(), "PGDMP");
    assert.equal(await stat(expired).then(() => true, () => false), false);
    assert.equal(await stat(retained).then(() => true, () => false), true);
    assert.equal(await stat(unrelated).then(() => true, () => false), true);
    if (process.platform !== "win32") {
      assert.equal((await stat(backupDirectory)).mode & 0o777, 0o700);
      assert.equal((await stat(snapshot)).mode & 0o777, 0o600);
    }
  });
});

test("restore verification restores a PostgreSQL archive into a temporary database", { skip: !canRunShell }, async () => {
  await withTemp(async (root) => {
    const backupDirectory = path.join(root, "backups"), binDirectory = path.join(root, "bin");
    await mkdir(backupDirectory);
    const envPath = await fakePostgresTools(binDirectory);
    await Promise.all(["prod", "test"].map(kind => writeFile(path.join(backupDirectory, `fragments-${kind}-fixture.dump`), "PGDMP synthetic archive\n")));
    const result = spawnSync(shell, [restoreScript], { encoding: "utf8", env: { ...process.env, PATH: envPath,
      RESTORE_DATABASE_URL: "postgresql://restore:fixture@postgres:5432/postgres", BACKUP_DIRECTORY: backupDirectory } });
    assert.equal(result.status, 0, result.stderr);
    assert.equal((result.stdout.match(/^restore_ok database=fragments_restore_(?:prod|test)_\d+_\d+ sha256=[0-9a-f]{64}\r?$/gm) ?? []).length, 2, result.stdout);
  });
});

test("backup script rejects missing connection settings before creating a snapshot directory", { skip: !canRunShell }, async () => {
  await withTemp(async (root) => {
    const backupDirectory = path.join(root, "never-created");
    const result = spawnSync(shell, [backupScript], { encoding: "utf8", env: { ...process.env, BACKUP_PROD_DATABASE_URL: "", BACKUP_DIRECTORY: backupDirectory } });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /BACKUP_PROD_DATABASE_URL/);
    assert.equal(await stat(backupDirectory).then(() => true, () => false), false);
  });
});
