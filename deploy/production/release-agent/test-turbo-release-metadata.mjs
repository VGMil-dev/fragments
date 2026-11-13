import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { copyFile, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const testTag = "v99.98.97";
const overlayFiles = [
  "turbo.json",
  "deploy/production/release-agent/verify-release-bundle.mjs",
];
const tagPattern = new RegExp(`["'\\x60]?version["'\\x60]?:["'\\x60]${testTag}["'\\x60],["'\\x60]?commit["'\\x60]?:["'\\x60][0-9a-f]{40}["'\\x60]`);
const developmentPattern = /["'\x60]?version["'\x60]?:["'\x60]dev["'\x60],["'\x60]?commit["'\x60]?:null/;

async function run(command, args, cwd, env = process.env) {
  const windowsBatch = process.platform === "win32" && command === "pnpm";
  const executable = windowsBatch ? process.env.ComSpec ?? "cmd.exe" : command;
  const executableArgs = windowsBatch ? ["/d", "/s", "/c", `pnpm ${args.join(" ")}`] : args;
  try {
    const { stdout, stderr } = await execFileAsync(executable, executableArgs, {
      cwd,
      env,
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
      shell: false,
    });
    return `${stdout}${stderr}`;
  } catch (error) {
    const output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    throw new Error(`${command} ${args.join(" ")} failed in ${cwd}:\n${output}`, { cause: error });
  }
}

async function readBundles(root) {
  const assets = path.join(root, "apps", "web", "dist", "assets");
  const files = (await readdir(assets)).filter((file) => file.endsWith(".js"));
  assert.ok(files.length > 0, "Turbo build must emit JavaScript bundles");
  return (await Promise.all(files.map((file) => readFile(path.join(assets, file), "utf8")))).join("\n");
}

test("Turbo passes exact release metadata into the Vite bundle", { timeout: 600_000 }, async (t) => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "fragments-turbo-metadata-"));
  const isolatedRepo = path.join(tempRoot, "repo");

  try {
    const safeRepository = `${repositoryRoot.replaceAll("\\", "/")}/.git`;
    await run("git", [
      "-c", `safe.directory=${safeRepository}`,
      "clone", "--quiet", "--no-hardlinks", "--no-tags", repositoryRoot, isolatedRepo,
    ], repositoryRoot);
    for (const file of overlayFiles) {
      await copyFile(path.join(repositoryRoot, file), path.join(isolatedRepo, file));
    }
    await run("git", ["add", "--", ...overlayFiles], isolatedRepo);
    const stagedFiles = await run("git", ["diff", "--cached", "--name-only"], isolatedRepo);
    if (stagedFiles.trim()) {
      await run("git", [
        "-c", "user.name=Fragments Release Test",
        "-c", "user.email=release-test@example.invalid",
        "commit", "--quiet", "-m", "Isolated Turbo metadata test source",
      ], isolatedRepo);
    }
    const sha = (await run("git", ["rev-parse", "HEAD"], isolatedRepo)).trim();

    // Give the disposable clone a self-contained main ref and annotated test tag.
    await run("git", ["update-ref", "refs/remotes/origin/main", sha], isolatedRepo);
    await run("git", [
      "-c", "user.name=Fragments Release Test",
      "-c", "user.email=release-test@example.invalid",
      "tag", "-a", testTag, sha,
      "-m", "Isolated Turbo release metadata regression",
    ], isolatedRepo);

    await run("pnpm", ["install", "--offline", "--frozen-lockfile"], isolatedRepo);

    const developmentEnv = { ...process.env };
    delete developmentEnv.FRAGMENTS_RELEASE_TAG;
    delete developmentEnv.FRAGMENTS_RELEASE_SHA;
    await run("pnpm", ["exec", "turbo", "run", "build", "--filter=@fragments/web", "--force"], isolatedRepo, developmentEnv);
    const developmentBundle = await readBundles(isolatedRepo);
    assert.ok(developmentPattern.test(developmentBundle), "a build without release refs must stay marked dev");

    const releaseEnv = {
      ...developmentEnv,
      FRAGMENTS_RELEASE_TAG: testTag,
      FRAGMENTS_RELEASE_SHA: sha,
      EXPECTED_TAG: testTag,
      EXPECTED_SHA: sha,
    };
    await run("pnpm", ["exec", "turbo", "run", "build", "--filter=@fragments/web", "--force"], isolatedRepo, releaseEnv);
    assert.ok(tagPattern.test(await readBundles(isolatedRepo)), "Turbo must pass the annotated tag and exact SHA to Vite");
    const verification = JSON.parse(await run("node", ["deploy/production/release-agent/verify-release-bundle.mjs"], isolatedRepo, releaseEnv));
    assert.equal(verification.version, testTag);
    assert.equal(verification.commit, sha);
    assert.ok(verification.bundles > 0);
    t.diagnostic(`bundle metadata verified: ${verification.version} ${verification.commit} (${verification.bundles} JS bundles)`);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
