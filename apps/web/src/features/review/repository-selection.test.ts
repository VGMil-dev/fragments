import { describe, expect, it } from "vitest";
import { parseCommitReference, parsePublicGitHubRepository, repositoryLookupError } from "./repository-selection";

describe("Review repository selection", () => {
  it.each([
    ["https://github.com/student/mobile-app", { owner: "student", repo: "mobile-app" }],
    ["https://github.com/student/mobile-app.git", { owner: "student", repo: "mobile-app" }],
    ["student/mobile-app", { owner: "student", repo: "mobile-app" }],
  ] as const)("parses an allowed repository reference", (value, expected) => {
    expect(parsePublicGitHubRepository(value)).toEqual(expected);
  });

  it.each([
    "http://github.com/student/mobile-app",
    "https://github.com.evil.example/student/mobile-app",
    "https://github.com/student/mobile-app?token=secret",
    "https://user@github.com/student/mobile-app",
    "https://github.com/student/mobile-app/tree/main",
  ])("rejects unsafe or non-repository URL %s", (value) => {
    expect(parsePublicGitHubRepository(value)).toBeNull();
  });

  it("accepts a complete SHA or a same-repository commit URL", () => {
    const sha = "A".repeat(40);
    expect(parseCommitReference(sha, { owner: "student", repo: "mobile-app" })).toBe("a".repeat(40));
    expect(parseCommitReference(`https://github.com/student/mobile-app/commit/${sha}`, { owner: "student", repo: "mobile-app" })).toBe("a".repeat(40));
    const sha256 = "B".repeat(64);
    expect(parseCommitReference(sha256, { owner: "student", repo: "mobile-app" })).toBe("b".repeat(64));
    expect(parseCommitReference(`https://github.com/student/mobile-app/commit/${sha256}`, { owner: "student", repo: "mobile-app" })).toBe("b".repeat(64));
  });

  it.each([
    [`https://github.com/other/mobile-app/commit/${"a".repeat(40)}`, "student", "mobile-app"],
    [`https://github.com/student/mobile-app/commit/${"a".repeat(7)}`, "student", "mobile-app"],
    [`https://github.com/student/mobile-app/commit/${"a".repeat(40)}?x=1`, "student", "mobile-app"],
  ])("rejects a commit reference that does not match the selected repository", (reference, owner, name) => {
    expect(parseCommitReference(reference, { owner, repo: name })).toBeNull();
  });

  it("maps known backend errors to recoverable Spanish messages", () => {
    expect(repositoryLookupError("EMPTY_REPOSITORY")).toContain("todavía no tiene commits");
    expect(repositoryLookupError("RATE_LIMITED")).toContain("limitado");
    expect(repositoryLookupError("unknown")).toContain("verificar la información");
  });
});
