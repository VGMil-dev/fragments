import { describe, expect, it } from "vitest";
import { validateReviewRequest } from "./review-validation";

describe("validateReviewRequest", () => {
  it("explains when the commit is not a full Git object id", () => {
    const result = validateReviewRequest({ owner: "classroom", repo: "demo", commitSha: "abc123" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.commitSha).toContain("40 o 64 caracteres");
  });

  it("normalizes owner, repository, and the exact commit from the shared contract", () => {
    const commitSha = "a".repeat(40);
    const result = validateReviewRequest({ owner: " classroom ", repo: "demo-app", commitSha });

    expect(result).toEqual({
      ok: true,
      data: { owner: "classroom", repo: "demo-app", commitSha },
    });
  });
});
