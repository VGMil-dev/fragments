import { describe, expect, it } from "vitest";
import { createPdfRenderer } from "./pdf-renderer.js";

describe("createPdfRenderer", () => {
  it("preserves Spanish characters with the standard WinAnsi font encoding", async () => {
    const pdf = new TextDecoder().decode(await createPdfRenderer().render("Solución: programación, niñez y acción."));

    expect(pdf).toContain("/Encoding /WinAnsiEncoding");
    expect(pdf).toContain("Soluci\\363n: programaci\\363n, ni\\361ez y acci\\363n.");
    expect(pdf).not.toContain("Soluci?n");
  });
});
