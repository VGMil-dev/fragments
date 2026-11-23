import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { StudentMe } from "@fragments/contracts";
import { StudentDashboard } from "./StudentDashboard";

const student: StudentMe = { authenticated: true, id: "fixture-student", githubLogin: "fixture-student", avatarUrl: null, profileUrl: "https://github.com/fixture-student", registeredAt: "2026-11-19T12:00:00.000Z" };
const proposal = { id: "fixture-proposal", version: 2, proposal: { title: "Bitácora de jardín" }, updatedAt: "2026-11-19T12:00:00.000Z" };
const defaultProps = { student, classrooms: [], classroomRequests: [], classroomsLoading: false, classroomsError: null, onRetryClassrooms: vi.fn(), proposals: [], proposalsLoading: false, proposalsError: false, onRetryProposals: vi.fn(), submissions: { status: "empty" as const }, onRetrySubmissions: vi.fn(), onContinueProposal: vi.fn(), onCreateProposal: vi.fn(), onNavigate: vi.fn() };

describe("StudentDashboard", () => {
  it("uses the student's saved proposal and renders truthful classroom and empty states", () => {
    const html = renderToStaticMarkup(<StudentDashboard {...defaultProps} proposals={[proposal]} />);

    expect(html).toContain("@fixture-student");
    expect(html).toContain('href="https://github.com/fixture-student"');
    expect(html).toContain('target="_blank" rel="noreferrer"');
    expect(html).toContain("CENTRO DE MISIONES");
    expect(html).toContain("Siguiente paso");
    expect(html).toContain("Bitácora de jardín");
    expect(html).toContain("Siguiente paso · borrador v2");
    expect(html).toContain("Aún no tienes aulas activas");
    expect(html).toContain("Aún no tienes entregas generadas");
    expect(html).toContain("Explorar Galería");
    expect(html).not.toContain("Programación Móvil");
    expect(html.match(/class="button button--primary"/g)).toHaveLength(1);
    expect(html).not.toContain("% completado");
    expect(html).not.toContain("racha");
  });

  it("summarizes authorized classes and pending enrollment truthfully", () => {
    const html = renderToStaticMarkup(<StudentDashboard {...defaultProps} classrooms={[{ id: "fixture-room", title: "Aula de prueba", subject: "Ciencias", groupLabel: "7A", period: null, status: "active", createdAt: "2026-11-19T12:00:00.000Z", updatedAt: "2026-11-19T12:00:00.000Z" }]} classroomRequests={[{ id: "fixture-request", status: "pending", source: "join_code", requestedAt: "2026-11-19T12:00:00.000Z", decidedAt: null }]} />);
    expect(html).toContain("Tienes 1 aula activa y solicitudes pendientes de aprobación");
  });

  it("offers one create action when no proposal exists and shows a real latest submission", () => {
    const html = renderToStaticMarkup(<StudentDashboard {...defaultProps} submissions={{ status: "success", data: [{ id: "fixture-submission", kind: "mentor", sourceId: "fixture-proposal", label: "Bitácora evaluada", score: 72, rubricVersion: "fake-rubric-v1", createdAt: "2026-11-19T13:00:00.000Z" }] }} />);

    expect(html).toContain("Crear mi primer proyecto");
    expect(html).toContain("Bitácora evaluada");
    expect(html).toContain("72/100");
    expect(html).toContain("no es aprobación docente");
    expect(html.match(/class="button button--primary"/g)).toHaveLength(1);
  });

  it("keeps the GitHub identity and one real first action when data is empty", () => {
    const html = renderToStaticMarkup(<StudentDashboard {...defaultProps} />);

    expect(html).toContain("@fixture-student");
    expect(html).toContain("Tu primer proyecto");
    expect(html).toContain("Crear mi primer proyecto");
    expect(html.match(/class="button button--primary"/g)).toHaveLength(1);
    expect(html).not.toContain("0 puntos");
    expect(html).not.toContain("0% de progreso");
  });
});
