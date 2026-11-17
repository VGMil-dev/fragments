import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const directory = path.dirname(fileURLToPath(import.meta.url));
const manifestScript = path.join(directory, "create-release-manifest.mjs");
const bundleScript = path.join(directory, "verify-release-bundle.mjs");
const workflowDirectory = path.resolve(directory, "../../../.github/workflows");
const workflowPaths = {
  ci: path.join(workflowDirectory, "ci.yml"),
  candidate: path.join(workflowDirectory, "release-build-candidate.yml"),
  release: path.join(workflowDirectory, "release.yml"),
};
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

const approvedPins = new Map([
  ["actions/checkout", "fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09"],
  ["pnpm/action-setup", "fc06bc1257f339d1d5d8b3a19a8cae5388b55320"],
  ["actions/setup-node", "a0853c24544627f65ddf259abe73b1d18a591444"],
  ["actions/upload-artifact", "b7c566a772e6b6bfb58ed0dc250532a479d7789f"],
  ["actions/download-artifact", "37930b1c2abaa49bbe596cd826c3c89aef350131"],
  ["actions/attest", "1e69f48acb82d1966a394da916b4c1698aa569d6"],
]);
const allowedRunners = new Set(["ubuntu-24.04", "ubuntu-24.04-arm", "ubuntu-latest"]);
const releaseJobPermissions = {
  "verify-build": { contents: "read" },
  "attest-package": {
    actions: "read",
    contents: "read",
    attestations: "write",
    "id-token": "write",
    "artifact-metadata": "write",
  },
  "publish-approved-release": { actions: "read", contents: "write" },
};

function parseWorkflow(source, name) {
  try {
    return YAML.parse(source, { version: "1.2", uniqueKeys: true, prettyErrors: true });
  } catch (error) {
    throw new Error(`${name}: YAML inválido o con claves duplicadas: ${error.message}`);
  }
}

function exactKeys(value, expected) {
  return value && typeof value === "object" && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function assertWorkflowPolicy(workflows) {
  const ci = workflows.ci;
  const candidate = workflows.candidate;
  const release = workflows.release;
  assert.ok(exactKeys(ci.on, ["pull_request"]), "CI must have only pull_request trigger");
  assert.deepEqual(ci.on.pull_request?.branches, ["main"]);
  assert.ok(exactKeys(candidate.on, ["workflow_dispatch"]), "candidate must have only workflow_dispatch trigger");
  assert.ok(exactKeys(release.on, ["push"]), "release must have only push trigger");
  assert.deepEqual(release.on.push?.tags, ["v*.*.*"]);
  assert.deepEqual(ci.permissions, { contents: "read" });
  assert.deepEqual(candidate.permissions, { contents: "read" });
  assert.deepEqual(release.permissions, { contents: "read" });

  assert.equal(candidate.jobs?.["build-web"]?.if, "github.ref == 'refs/heads/main'");
  assert.deepEqual(Object.keys(release.jobs ?? {}).sort(), ["attest-package", "publish-approved-release", "verify-build"]);
  assert.deepEqual(release.jobs["verify-build"].permissions, releaseJobPermissions["verify-build"]);
  assert.deepEqual(release.jobs["attest-package"].permissions, releaseJobPermissions["attest-package"]);
  assert.deepEqual(release.jobs["publish-approved-release"].permissions, releaseJobPermissions["publish-approved-release"]);
  assert.equal(release.jobs["publish-approved-release"].environment?.name, "fragments-production");

  for (const [name, workflow] of Object.entries(workflows)) {
    assert.ok(workflow && typeof workflow === "object", `${name}: workflow must be a mapping`);
    assert.ok(workflow.jobs && typeof workflow.jobs === "object" && Object.keys(workflow.jobs).length > 0, `${name}: jobs required`);
    for (const [jobName, job] of Object.entries(workflow.jobs)) {
      assert.ok(allowedRunners.has(job["runs-on"]), `${name}/${jobName}: runner is not approved`);
      if (name !== "release" && job.permissions !== undefined) {
        assert.deepEqual(job.permissions, { contents: "read" }, `${name}/${jobName}: job permissions may not exceed contents:read`);
      }
      for (const step of job.steps ?? []) {
        if (step.uses === undefined) continue;
        assert.equal(typeof step.uses, "string", `${name}/${jobName}: uses must be a literal string`);
        const separator = step.uses.lastIndexOf("@");
        assert.notEqual(separator, -1, `${name}/${jobName}: action must be pinned: ${step.uses}`);
        const repository = step.uses.slice(0, separator);
        const sha = step.uses.slice(separator + 1);
        assert.match(sha, /^[0-9a-f]{40}$/, `${name}/${jobName}: action must use a full commit SHA: ${step.uses}`);
        assert.equal(approvedPins.get(repository), sha, `${name}/${jobName}: action pin is not approved: ${step.uses}`);
      }
    }
  }
}

async function loadWorkflows() {
  const entries = await Promise.all(Object.entries(workflowPaths).map(async ([name, workflowPath]) => {
    const source = await readFile(workflowPath, "utf8");
    return [name, parseWorkflow(source, name)];
  }));
  return Object.fromEntries(entries);
}

test("all workflows satisfy the structural policy for triggers, effective permissions, runners, and action pins", async () => {
  const workflows = await loadWorkflows();
  assertWorkflowPolicy(workflows);
  assert.match(await readFile(workflowPaths.release, "utf8"), /gh attestation verify/);
  assert.match(await readFile(workflowPaths.release, "utf8"), /--deny-self-hosted-runners/);
});

test("policy fixtures reject extra triggers and broader tag filters", async () => {
  const workflows = await loadWorkflows();
  const extraTrigger = structuredClone(workflows.ci);
  extraTrigger.on.schedule = [{ cron: "0 * * * *" }];
  assert.throws(() => assertWorkflowPolicy({ ...workflows, ci: extraTrigger }));

  const broaderTags = structuredClone(workflows.release);
  broaderTags.on.push.tags = ["v*.*.*", "*"];
  assert.throws(() => assertWorkflowPolicy({ ...workflows, release: broaderTags }));
});

test("policy fixtures reject a missing candidate branch guard and self-hosted runner", async () => {
  const workflows = await loadWorkflows();
  const missingGuard = structuredClone(workflows.candidate);
  delete missingGuard.jobs["build-web"].if;
  assert.throws(() => assertWorkflowPolicy({ ...workflows, candidate: missingGuard }));

  const selfHosted = structuredClone(workflows.ci);
  selfHosted.jobs.verify["runs-on"] = "self-hosted";
  assert.throws(() => assertWorkflowPolicy({ ...workflows, ci: selfHosted }));
});

test("policy fixtures reject unpinned actions and excess permissions", async () => {
  const workflows = await loadWorkflows();
  const unpinned = structuredClone(workflows.ci);
  unpinned.jobs.verify.steps.find((step) => step.uses).uses = "actions/checkout@v4";
  assert.throws(() => assertWorkflowPolicy({ ...workflows, ci: unpinned }));

  const globalWrite = structuredClone(workflows.ci);
  globalWrite.permissions = { contents: "write" };
  assert.throws(() => assertWorkflowPolicy({ ...workflows, ci: globalWrite }));

  const jobWrite = structuredClone(workflows.release);
  jobWrite.jobs["verify-build"].permissions = { contents: "write" };
  assert.throws(() => assertWorkflowPolicy({ ...workflows, release: jobWrite }));
});

test("YAML parser rejects duplicate keys and malformed fixtures", () => {
  assert.throws(() => parseWorkflow("on:\n  push: {}\non:\n  schedule: []\n", "duplicate"));
  assert.throws(() => parseWorkflow("jobs: [unterminated", "malformed"));
});
