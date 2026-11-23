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
    expect(html).toContain('class="gallery-entry__status"');
    expect(html).toContain("Evaluada");
    expect(html).toContain('class="gallery-entry__action"');
    expect(html).toContain('/covers/project-generic.webp');
    expect(html).toContain('width="1200" height="675"');
    expect(html).toContain('class="gallery-publication-note"');
    expect(html).toContain("se publican automáticamente");
    expect(html).toContain("El estudiante no puede retirar una ficha desde el portal");
    expect(html).toContain("Ver alcance y privacidad");
    expect(html).not.toContain("<details open=");
    expect(html).toContain("metas, habilidades, etiquetas y temas, alcance, restricciones");
    expect(html).toContain("no muestra puntaje ni comentarios privados");
    expect(html).toContain("El estudiante no tiene opt-out");
    expect(html).toContain("Un docente puede retirar una publicación con registro de auditoría.");
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

  it("keeps the loading state visible while the gallery request is pending", () => {
    const html = renderToStaticMarkup(<GalleryScreen state={{ status: "loading" }} onChoose={vi.fn()} />);

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Cargando información");
  });

  it("preserves retry in the error state", () => {
    const retry = vi.fn();
    const html = renderToStaticMarkup(<GalleryScreen state={{ status: "error", retry, message: "Sin conexión" }} onChoose={vi.fn()} />);

    expect(html).toContain('role="alert"');
    expect(html).toContain("Sin conexión");
    expect(html).toContain("Intentar de nuevo");
  });

  it("renders the selected project details and its primary inspiration action", () => {
    const onUseProject = vi.fn();
    const html = renderToStaticMarkup(
      <GalleryScreen state={{ status: "success", data: [entry] }} selected={{ project: entry, history: [entry] }} onChoose={vi.fn()} onUseProject={onUseProject} />,
    );

    expect(html).toContain('aria-labelledby="gallery-detail-title"');
    expect(html).toContain("Diario de plantas");
    expect(html).toContain("Tomar como inspiración");
    expect(html).toContain("no muestra puntaje ni comentarios privados");
  });
});
