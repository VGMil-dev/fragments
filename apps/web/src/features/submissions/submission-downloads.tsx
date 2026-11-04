import { useState } from "react";
import type { ApiResult, MentorSubmissionResponse } from "@fragments/contracts";
import "./submission-downloads.css";

export interface SubmissionDownloadsProps {
  submission: MentorSubmissionResponse;
  onReadme?: (submissionId: string) => Promise<ApiResult<string>>;
  onPdf: (submissionId: string) => Promise<ApiResult<Blob>>;
}

type DownloadKind = "readme" | "pdf";

function saveDownload(content: string | Blob, filename: string, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function SubmissionDownloads({ submission, onReadme, onPdf }: SubmissionDownloadsProps) {
  const [busy, setBusy] = useState<DownloadKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(kind: DownloadKind) {
    setError(null);
    setBusy(kind);
    try {
      if (kind === "readme" && submission.kind === "mentor" && onReadme) {
        const result = await onReadme(submission.id);
        if (!result.ok) {
          setError("No pudimos preparar el README. Inténtalo de nuevo.");
          return;
        }
        saveDownload(result.data, "README.md", "text/markdown;charset=utf-8");
        return;
      }

      const result = await onPdf(submission.id);
      if (!result.ok) {
        setError("No pudimos preparar el PDF. Inténtalo de nuevo.");
        return;
      }
      saveDownload(result.data, `entrega-${submission.kind}.pdf`, "application/pdf");
    } catch {
      setError("No pudimos preparar la descarga. Revisa la conexión e inténtalo de nuevo.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="submission-downloads" aria-labelledby="submission-downloads-title" aria-busy={busy !== null}>
      <div>
        <p className="student-screen__eyebrow">ENTREGA LISTA</p>
        <h2 id="submission-downloads-title">Tu entrega está preparada</h2>
        <p>Descarga los archivos cuando los necesites. Se generan al momento.</p>
      </div>
      {error ? <p className="submission-downloads__error" role="alert">{error}</p> : null}
      <div className="submission-downloads__actions">
        {submission.kind === "mentor" && onReadme ? (
          <button className="button button--light" type="button" disabled={busy !== null} onClick={() => void download("readme")}>
            {busy === "readme" ? "Preparando README…" : "Descargar README"}
          </button>
        ) : null}
        <button className="button button--primary" type="button" disabled={busy !== null} onClick={() => void download("pdf")}>
          {busy === "pdf" ? "Preparando PDF…" : "Descargar PDF"}
        </button>
      </div>
    </section>
  );
}
