import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GalleryScreen } from "./gallery-screen";

const entry = {
  id: "garden-notes",
  title: "Diario de plantas",
  summary: "Una bitácora sencilla para observar cambios en el jardín.",
  skills: ["HTML", "CSS"],
  tags: ["Naturaleza"],
  estimatedMinutes: 180,
};

describe("GalleryScreen", () => {
  it("renders only gallery fields provided by the contract response", () => {
    const html = renderToStaticMarkup(
      <GalleryScreen state={{ status: "success", data: [entry] }} onChoose={vi.fn()} />,
    );

    expect(html).toContain("Diario de plantas");
    expect(html).toContain("Una bitácora sencilla");
    expect(html).toContain("HTML");
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
