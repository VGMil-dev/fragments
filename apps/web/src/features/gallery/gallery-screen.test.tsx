import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GalleryScreen } from "./gallery-screen";

const entry = {
  id: "garden-notes",
  title: "Diario de plantas",
  summary: "Una bitácora sencilla para observar cambios en el jardín.",
  problem: "No se registran cambios.",
  solution: "Una bitácora sencilla para observar cambios en el jardín.",
  goals: ["Registrar cambios"],
  skills: ["HTML", "CSS"],
  tags: ["Naturaleza"],
  scope: "Una pantalla.",
  constraints: ["Sin conexión"],
  author: { login: "garden-student", profileUrl: "https://github.com/garden-student", avatarUrl: null },
  subject: "Ciencias",
  theme: "Jardín escolar",
  assignment: "Describe una idea de proyecto.",
  proposalVersion: 2,
  rubricVersion: 3,
  rubricTitle: "Rúbrica de proyectos",
  publishedAt: "2026-11-01T00:00:00.000Z",
  academicStatus: "Evaluada" as const,
};

describe("GalleryScreen", () => {
  it("renders public author and academic context without private grades", () => {
    const html = renderToStaticMarkup(
      <GalleryScreen state={{ status: "success", data: [entry] }} onChoose={vi.fn()} />,
    );

    expect(html).toContain("Diario de plantas");
    expect(html).toContain("Una bitácora sencilla");
    expect(html).toContain("HTML");
    expect(html).toContain("@garden-student");
    expect(html).toContain("Consigna");
    expect(html).toContain("Rúbrica de proyectos");
    expect(html).not.toContain("nota");
  });

  it("shows an empty state with a route-neutral next action", () => {
    const html = renderToStaticMarkup(
      <GalleryScreen state={{ status: "empty" }} onChoose={vi.fn()} onCreateProposal={vi.fn()} />,
    );

    expect(html).toContain("Todavía no hay contenido");
    expect(html).toContain("Crear una propuesta");
  });

  it("labels fake data clearly when the caller selects the development mode", () => {
    const html = renderToStaticMarkup(
      <GalleryScreen state={{ status: "success", data: [entry] }} onChoose={vi.fn()} mode="fake" />,
    );

    expect(html).toContain("Datos de ejemplo (fake)");
  });
});
