import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const manifestScript = path.join(directory, "create-release-manifest.mjs");
const bundleScript = path.join(directory, "verify-release-bundle.mjs");
const releaseWorkflow = path.resolve(directory, "../../../.github/workflows/release.yml");
const sha = "1".repeat(40);
const tagObject = "2".repeat(40);

async function withTemp(callback) {
  const root = await mkdtemp(path.join(os.tmpdir(), "fragments-f14-"));
  try {
    await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("manifest binds the archive digest, tag, tag object, commit and repository", async () => {
  await withTemp(async (root) => {
    const archive = path.join(root, "fragments-images.tar.gz");
    const manifestPath = path.join(root, "release-manifest.json");
    await writeFile(archive, "synthetic arm64 image archive");
    const result = spawnSync(process.execPath, [manifestScript, archive, manifestPath, "123", "v0.4.0", tagObject, sha], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    assert.equal(manifest.repository, "VGMil-dev/fragments");
    assert.equal(manifest.tag, "v0.4.0");
    assert.equal(manifest.tagObject, tagObject);
    assert.equal(manifest.commit, sha);
    assert.equal(manifest.archiveSha256, createHash("sha256").update("synthetic arm64 image archive").digest("hex"));
    assert.deepEqual(manifest.images, { api: `fragments-api:sha-${sha}`, web: `fragments-web:sha-${sha}` });
  });
});

test("manifest generator rejects non-release tags and invalid Git objects", async () => {
  await withTemp(async (root) => {
    const archive = path.join(root, "fragments-images.tar.gz");
    await writeFile(archive, "fixture");
    for (const [tag, object] of [["v0.4.0-rc.1", tagObject], ["v00.4.0", tagObject], ["v0.4.0", "bad"]]) {
      const result = spawnSync(process.execPath, [manifestScript, archive, path.join(root, "manifest.json"), "123", tag, object, sha], { encoding: "utf8" });
      assert.notEqual(result.status, 0);
    }
  });
});

test("bundle verifier accepts only the expected tag and exact built SHA", async () => {
  await withTemp(async (root) => {
    const assets = path.join(root, "apps", "web", "dist", "assets");
    await mkdir(assets, { recursive: true });
    await writeFile(path.join(assets, "index.js"), `const build={version:"v0.4.0",commit:"${sha}"};`);
    const env = { ...process.env, EXPECTED_TAG: "v0.4.0", EXPECTED_SHA: sha };
    const valid = spawnSync(process.execPath, [bundleScript], { cwd: root, env, encoding: "utf8" });
    assert.equal(valid.status, 0, valid.stderr);
    const wrongSha = spawnSync(process.execPath, [bundleScript], { cwd: root, env: { ...env, EXPECTED_SHA: "3".repeat(40) }, encoding: "utf8" });
    assert.notEqual(wrongSha.status, 0);
    const invalidTag = spawnSync(process.execPath, [bundleScript], { cwd: root, env: { ...env, EXPECTED_TAG: "v0.4.0-rc.1" }, encoding: "utf8" });
    assert.notEqual(invalidTag.status, 0);
  });
});

test("release workflow has only a tag-push trigger and no alternate activation path", async () => {
  const source = await readFile(releaseWorkflow, "utf8");
  const trigger = source.match(/^on:\r?\n((?:[ \t].*(?:\r?\n|$))*)/m)?.[1];
  assert.ok(trigger, "missing workflow trigger block");
  assert.match(trigger, /^\s{2}push:\s*$/m);
  assert.match(trigger, /^\s{6}- ['"]?v\*\.\*\.\*['"]?\s*$/m);
  assert.doesNotMatch(trigger, /pull_request|workflow_dispatch|schedule|release:/);
  assert.doesNotMatch(source, /^\s{2}(?:workflow_dispatch|schedule|release):/m);
  assert.match(source, /environment:\s*\r?\n\s+name: fragments-production/);
  assert.match(source, /steps\.attest\.outputs\.bundle-path/);
  assert.match(source, /fragments-images\.attestation\.jsonl/);
  assert.match(source, /gh attestation verify/);
  assert.match(source, /--deny-self-hosted-runners/);
  assert.match(source, /fragments-release-attestation-\$\{\{ github\.run_id \}\}/);
});
