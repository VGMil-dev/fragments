import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, stat, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const backupScript = path.resolve(directory, "../backup.mjs");
const isPosix = process.platform !== "win32";

async function withTemp(callback) {
  const root = await mkdtemp(path.join(os.tmpdir(), "fragments-f16-backup-"));
  try {
    await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function runBackup(source, destination, retentionDays = "14") {
  return spawnSync(process.execPath, [backupScript], {
    encoding: "utf8",
    env: {
      ...process.env,
      DATABASE_PATH: source,
      BACKUP_DIRECTORY: destination,
      RETENTION_DAYS: retentionDays,
    },
  });
}

test("backup script writes an integral synthetic SQLite copy, verifies an independent hash, and prunes only expired snapshots", async () => {
  await withTemp(async (root) => {
    const source = path.join(root, "source.sqlite");
    const backupDirectory = path.join(root, "backups");
    await mkdir(backupDirectory);
    const db = new DatabaseSync(source);
    try {
      db.exec("CREATE TABLE fixture (label TEXT NOT NULL)");
      db.prepare("INSERT INTO fixture (label) VALUES (?)").run("F16-CICD");
    } finally {
      db.close();
    }

    const expired = path.join(backupDirectory, "fragments-expired.sqlite");
    const retained = path.join(backupDirectory, "fragments-retained.sqlite");
    const unrelated = path.join(backupDirectory, "unrelated.sqlite");
    await Promise.all([writeFile(expired, "expired fixture"), writeFile(retained, "recent fixture"), writeFile(unrelated, "unrelated fixture")]);
    const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await utimes(expired, old, old);
    await utimes(unrelated, old, old);

    const result = runBackup(source, backupDirectory);
    assert.equal(result.status, 0, result.stderr);
    const match = result.stdout.match(/^backup_ok file=(fragments-[^ ]+\.sqlite) bytes=(\d+) sha256=([0-9a-f]{64}) retention_days=14\r?$/m);
    assert.ok(match, result.stdout);
    const snapshot = path.join(backupDirectory, match[1]);
    const snapshotBytes = await readFile(snapshot);
    assert.equal(Number(match[2]), snapshotBytes.length);
    assert.equal(match[3], createHash("sha256").update(snapshotBytes).digest("hex"));

    const snapshotDb = new DatabaseSync(snapshot, { readOnly: true });
    try {
      assert.equal(snapshotDb.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
      assert.deepEqual(snapshotDb.prepare("SELECT label FROM fixture").all().map((row) => row.label), ["F16-CICD"]);
    } finally {
      snapshotDb.close();
    }

    assert.equal(await stat(expired).then(() => true, () => false), false);
    assert.equal(await stat(retained).then(() => true, () => false), true);
    assert.equal(await stat(unrelated).then(() => true, () => false), true);
    if (isPosix) {
      assert.equal((await stat(backupDirectory)).mode & 0o777, 0o700);
      assert.equal((await stat(snapshot)).mode & 0o777, 0o600);
    }

    const sourceDb = new DatabaseSync(source, { readOnly: true });
    try {
      assert.deepEqual(sourceDb.prepare("SELECT label FROM fixture").all().map((row) => row.label), ["F16-CICD"]);
    } finally {
      sourceDb.close();
    }
  });
});

test("missing source fails without creating a destination or an empty snapshot", async () => {
  await withTemp(async (root) => {
    const source = path.join(root, "missing.sqlite");
    const destination = path.join(root, "never-created");
    const result = runBackup(source, destination);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /no existe/);
    assert.equal(await stat(destination).then(() => true, () => false), false);
  });
});
