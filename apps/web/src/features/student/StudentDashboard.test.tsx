import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { StudentMe } from "@fragments/contracts";
import { StudentDashboard } from "./StudentDashboard";

const student: StudentMe = { authenticated: true, id: "fixture-student", githubLogin: "fixture-student", avatarUrl: null, profileUrl: "https://github.com/fixture-student", registeredAt: "2026-11-19T12:00:00.000Z" };
const proposal = { id: "fixture-proposal", version: 2, proposal: { title: "Bitácora de jardín" }, updatedAt: "2026-11-19T12:00:00.000Z" };
const defaultProps = { student, proposals: [], proposalsLoading: false, proposalsError: false, onRetryProposals: vi.fn(), submissions: { status: "empty" as const }, onRetrySubmissions: vi.fn(), onContinueProposal: vi.fn(), onCreateProposal: vi.fn(), onNavigate: vi.fn() };

describe("StudentDashboard", () => {
  it("uses the student's saved proposal and renders truthful unavailable and empty states", () => {
    const html = renderToStaticMarkup(<StudentDashboard {...defaultProps} proposals={[proposal]} />);

    expect(html).toContain("@fixture-student");
    expect(html).toContain("Bitácora de jardín");
    expect(html).toContain("Borrador guardado · versión 2");
    expect(html).toContain("F18 esté conectado");
    expect(html).toContain("Aún no tienes entregas generadas");
    expect(html).toContain("Explorar Galería");
    expect(html).not.toContain("Programación Móvil");
    expect(html.match(/class="button button--primary"/g)).toHaveLength(1);
  });

  it("offers one create action when no proposal exists and shows a real latest submission", () => {
    const html = renderToStaticMarkup(<StudentDashboard {...defaultProps} submissions={{ status: "success", data: [{ id: "fixture-submission", kind: "mentor", sourceId: "fixture-proposal", label: "Bitácora evaluada", score: 72, rubricVersion: "fake-rubric-v1", createdAt: "2026-11-19T13:00:00.000Z" }] }} />);

    expect(html).toContain("Crear mi primer proyecto");
    expect(html).toContain("Bitácora evaluada");
    expect(html).toContain("72/100");
    expect(html).toContain("no es aprobación docente");
    expect(html.match(/class="button button--primary"/g)).toHaveLength(1);
  });
});
