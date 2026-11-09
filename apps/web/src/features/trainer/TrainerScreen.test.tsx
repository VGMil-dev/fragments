import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createTrainerApi } from "../../lib/api/trainer-api";
import { TrainerScreen } from "./TrainerScreen";

describe("TrainerScreen", () => {
  it("shows the student practice entry point without inventing a Review or a challenge", () => {
    const html = renderToStaticMarkup(<TrainerScreen api={createTrainerApi()} />);
    expect(html).toContain("No memorices el reto. Domina tu código.");
    expect(html).toContain("Sortear reto");
    expect(html).toContain("Historial de práctica");
    expect(html).toContain("Buscando análisis completados");
    expect(html).not.toContain("teacherHint");
  });
});
