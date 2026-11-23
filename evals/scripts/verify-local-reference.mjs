import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const fixturePath = new URL("../fixtures/fragments-test-commits.json", import.meta.url);
const shaPattern = /^[a-f\d]{40}$/i;
const sourceExtension = /\.(?:ts|tsx|js|jsx|mjs|cjs)$/i;
const maxSourceBytes = 256 * 1024;

const behaviorDetectors = {
  required_validation: (files) => {
    const source = sourceText(files);
    return /export\s+function\s+validateLostItem\b/.test(source)
      && /!form\.name\.trim\(\)/.test(source)
      && /!form\.description\.trim\(\)/.test(source);
  },
  name_search: (files) => {
    const source = sourceText(files);
    return /export\s+function\s+filterLostItems\b/.test(source)
      && /query\.trim\(\)\.toLowerCase\(\)/.test(source)
      && /item\.name\.toLowerCase\(\)\.includes\(/.test(source);
  },
  recovered_status: (files) => {
    const source = sourceText(files);
    return /export\s+function\s+markLostItemRecovered\b/.test(source)
      && /status\s*:\s*['"]recovered['"]/.test(source);
  },
};

function sourceText(files) {
  return files.map((file) => file.content).join("\n");
}

function runGit(repoPath, args, { allowMissing = false } = {}) {
  const result = spawnSync("git", ["-C", repoPath, ...args], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.error || (result.status !== 0 && !allowMissing)) {
    throw new Error("LOCAL_GIT_READ_FAILED");
  }
  return { status: result.status, stdout: result.stdout ?? "" };
}

function validateCaseShape(item) {
  if (typeof item?.label !== "string" || !item.label.trim()) return ["invalid_case_label"];
  if (typeof item?.commitSha !== "string" || !shaPattern.test(item.commitSha)) return ["invalid_commit_sha"];
  if (!item.behaviorReference || typeof item.behaviorReference !== "object" || Array.isArray(item.behaviorReference)) {
    return ["missing_behavior_reference"];
  }
  const entries = Object.entries(item.behaviorReference);
  if (entries.length === 0 || entries.some(([id, present]) => !Object.hasOwn(behaviorDetectors, id) || typeof present !== "boolean")) {
    return ["invalid_behavior_reference"];
  }
  return [];
}

function readSourceFiles(repoPath, commitSha) {
  const listing = runGit(repoPath, ["ls-tree", "-r", "--name-only", commitSha]).stdout;
  const paths = listing.split(/\r?\n/).filter((path) => path && sourceExtension.test(path));
  const files = [];
  const skippedPaths = [];
  for (const path of paths) {
    if (path.startsWith("/") || path.includes("\\") || path.split("/").some((part) => part === ".." || part === ".")) {
      skippedPaths.push(path);
      continue;
    }
    const sizeResult = runGit(repoPath, ["cat-file", "-s", `${commitSha}:${path}`]);
    const size = Number(sizeResult.stdout.trim());
    if (!Number.isSafeInteger(size) || size < 0 || size > maxSourceBytes) {
      skippedPaths.push(path);
      continue;
    }
    const content = runGit(repoPath, ["show", `${commitSha}:${path}`]).stdout;
    files.push({ path, content });
  }
  return { files, skippedPaths };
}

function verifyCase(repoPath, item) {
  const blockers = validateCaseShape(item);
  if (blockers.length) return { label: item?.label ?? null, commitSha: item?.commitSha ?? null, status: "BLOCKED", blockers, checks: [] };
  const objectCheck = runGit(repoPath, ["cat-file", "-e", `${item.commitSha}^{commit}`], { allowMissing: true });
  if (objectCheck.status !== 0) {
    return { label: item.label, commitSha: item.commitSha, status: "BLOCKED", blockers: ["commit_object_missing"], checks: [] };
  }

  const { files, skippedPaths } = readSourceFiles(repoPath, item.commitSha);
  const checks = Object.entries(item.behaviorReference).map(([behaviorId, expectedPresent]) => {
    const detectedPresent = behaviorDetectors[behaviorId](files);
    return {
      behaviorId,
      expectedPresent,
      detectedPresent,
      status: expectedPresent === detectedPresent ? "MATCH" : "MISMATCH",
      basis: "STATIC_SOURCE_MARKERS_ONLY",
    };
  });
  const caseBlockers = skippedPaths.length ? ["source_path_not_checked"] : [];
  return {
    label: item.label,
    commitSha: item.commitSha,
    status: checks.some((check) => check.status === "MISMATCH") ? "REFERENCE_MISMATCH" : caseBlockers.length ? "BLOCKED" : "REFERENCE_MARKERS_MATCH",
    blockers: caseBlockers,
    sourceFilesScanned: files.length,
    sourceFilesSkipped: skippedPaths.length,
    checks,
  };
}

/** Reports fixture-order marker regressions; it does not assess behavior meaning. */
export function auditReferenceProgression(cases) {
  const items = Array.isArray(cases) ? cases : [];
  const blockers = [];
  if (items.length < 2) blockers.push("insufficient_cases");

  const firstChecks = Array.isArray(items[0]?.checks) ? items[0].checks : [];
  const behaviorIds = firstChecks.map((check) => check.behaviorId).sort();
  if (behaviorIds.length === 0 || behaviorIds.some((id) => typeof id !== "string" || !id.trim())
    || new Set(behaviorIds).size !== behaviorIds.length) {
    blockers.push("invalid_behavior_ids");
  }

  for (const item of items) {
    const checks = Array.isArray(item?.checks) ? item.checks : [];
    const ids = checks.map((check) => check?.behaviorId).sort();
    if (item?.status !== "REFERENCE_MARKERS_MATCH"
      || ids.length !== behaviorIds.length
      || ids.some((id, index) => id !== behaviorIds[index])
      || checks.some((check) => check?.status !== "MATCH"
        || typeof check.expectedPresent !== "boolean"
        || check.detectedPresent !== check.expectedPresent)) {
      blockers.push(`unverified_case:${item?.label ?? "unknown"}`);
    }
  }

  if (blockers.length) {
    return {
      status: "BLOCKED",
      blockers: [...new Set(blockers)],
      caseOrder: items.map((item) => item?.label ?? null),
      behaviors: [],
      regressions: [],
      basis: "STATIC_SOURCE_MARKERS_ONLY",
      semanticValidity: "NOT_VALIDATED",
    };
  }

  const behaviors = behaviorIds.map((behaviorId) => {
    const detectedPresent = items.map((item) => item.checks.find((check) => check.behaviorId === behaviorId).detectedPresent);
    return { behaviorId, detectedPresent };
  });
  const regressions = [];
  for (const behavior of behaviors) {
    for (let index = 1; index < behavior.detectedPresent.length; index += 1) {
      if (behavior.detectedPresent[index - 1] && !behavior.detectedPresent[index]) {
        regressions.push({ behaviorId: behavior.behaviorId, from: items[index - 1].label, to: items[index].label });
      }
    }
  }

  return {
    status: regressions.length ? "REFERENCE_PROGRESSION_MISMATCH" : "REFERENCE_PROGRESSION_MATCH",
    blockers: [],
    caseOrder: items.map((item) => item.label),
    behaviors,
    regressions,
    basis: "STATIC_SOURCE_MARKERS_ONLY",
    semanticValidity: "NOT_VALIDATED",
  };
}

export function verifyLocalReferenceCorpus({ repoPath, cases }) {
  if (typeof repoPath !== "string" || !repoPath.trim()) {
    return {
      status: "BLOCKED",
      blocker: "local_git_repo_required",
      semanticValidity: "NOT_VALIDATED",
      qualityComparison: "NOT_PERFORMED",
      execution: "SOURCE_NOT_EXECUTED",
      cases: [],
    };
  }
  try {
    runGit(repoPath, ["rev-parse", "--show-toplevel"]);
  } catch {
    return {
      status: "BLOCKED",
      blocker: "local_git_repo_unavailable",
      semanticValidity: "NOT_VALIDATED",
      qualityComparison: "NOT_PERFORMED",
      execution: "SOURCE_NOT_EXECUTED",
      cases: [],
    };
  }
  const inputCases = Array.isArray(cases) ? cases : [];
  const auditedCases = inputCases.map((item) => verifyCase(repoPath, item));
  const referenceProgression = auditReferenceProgression(auditedCases);
  const blockedCases = auditedCases.filter((item) => item.status === "BLOCKED" || item.status === "REFERENCE_MISMATCH");
  return {
    status: auditedCases.length > 0 && blockedCases.length === 0 ? "REFERENCE_MARKERS_MATCH" : "BLOCKED",
    referenceSource: "LOCAL_GIT_COMMIT_OBJECTS",
    referenceInterpretation: "FIXTURE_METADATA_CHECKED_AGAINST_STATIC_SOURCE_MARKERS",
    semanticValidity: "NOT_VALIDATED",
    qualityComparison: "NOT_PERFORMED",
    scoreComputed: false,
    execution: "SOURCE_NOT_EXECUTED",
    referenceProgression,
    cases: auditedCases,
    blockedLabels: blockedCases.map((item) => item.label),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const repoIndex = process.argv.indexOf("--repo-dir");
  const repoPath = repoIndex >= 0 ? process.argv[repoIndex + 1] : undefined;
  const corpus = JSON.parse(readFileSync(fixturePath, "utf8"));
  process.stdout.write(`${JSON.stringify(verifyLocalReferenceCorpus({ repoPath, cases: corpus.cases }), null, 2)}\n`);
}
