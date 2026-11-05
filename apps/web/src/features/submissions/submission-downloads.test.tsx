import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SubmissionDownloads } from "./submission-downloads";

const submission = {
  id: "submission-1",
  kind: "mentor" as const,
  sourceId: "proposal-1",
  score: 72,
  snapshotJson: {},
  contentHash: "a".repeat(64),
  verificationCode: "verify-code-with-enough-length-1234",
  rubricVersion: "v1",
  createdAt: "2026-11-04T12:00:00.000Z",
};

describe("SubmissionDownloads", () => {
  it("offers the Mentor README and PDF from the returned submission id", () => {
    const html = renderToStaticMarkup(
      <SubmissionDownloads submission={submission} onReadme={vi.fn()} onPdf={vi.fn()} />,
    );

    expect(html).toContain("Descargar README");
    expect(html).toContain("Descargar PDF");
    expect(html).not.toContain(submission.verificationCode);
  });

  it("offers only the contracted PDF for a Review submission", () => {
    const reviewSubmission = { ...submission, kind: "review" as const };
    const html = renderToStaticMarkup(
      <SubmissionDownloads submission={reviewSubmission} onReadme={vi.fn()} onPdf={vi.fn()} />,
    );

    expect(html).toContain("Descargar PDF");
    expect(html).not.toContain("Descargar README");
  });
});
