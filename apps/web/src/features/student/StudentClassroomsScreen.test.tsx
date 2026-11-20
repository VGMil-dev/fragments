import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StudentClassroomsScreen } from "./StudentClassroomsScreen";

const room = { id: "fixture-room", title: "Aula de prueba", subject: "Ciencias", groupLabel: "7A", period: null, status: "active" as const, createdAt: "2026-11-19T12:00:00.000Z", updatedAt: "2026-11-19T12:00:00.000Z" };
const pending = { id: "fixture-request", status: "pending" as const, source: "join_code" as const, requestedAt: "2026-11-19T12:00:00.000Z", decidedAt: null };

describe("StudentClassroomsScreen", () => {
  it("renders active authorized classes, a join form, and pending status without fictitious activities", () => {
    const html = renderToStaticMarkup(<StudentClassroomsScreen classrooms={[room]} requests={[pending]} loading={false} error={null} onRefresh={() => undefined} />);
    expect(html).toContain("Aula de prueba");
    expect(html).toContain("Código de incorporación");
    expect(html).toContain("Pendiente de aprobación");
    expect(html).toContain("queda pendiente hasta que el docente la apruebe");
    expect(html).not.toMatch(/misiones|prácticas|rúbrica/i);
  });

  it("renders honest loading, error, and empty states", () => {
    const loading = renderToStaticMarkup(<StudentClassroomsScreen classrooms={[]} requests={[]} loading error={null} onRefresh={() => undefined} />);
    const failed = renderToStaticMarkup(<StudentClassroomsScreen classrooms={[]} requests={[]} loading={false} error="No pudimos cargar tus aulas." onRefresh={() => undefined} />);
    const empty = renderToStaticMarkup(<StudentClassroomsScreen classrooms={[]} requests={[]} loading={false} error={null} onRefresh={() => undefined} />);
    expect(loading).toContain("Cargando tus aulas y solicitudes");
    expect(failed).toContain("No pudimos cargar tus aulas");
    expect(empty).toContain("Aún no tienes matrículas activas");
  });
});
