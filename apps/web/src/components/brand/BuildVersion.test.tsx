import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("../../build/metadata", () => ({
  releaseMetadata: { version: "v0.3.1", commit: "50e2ace697afc125bb3bfdd9a705f0e383796a83" },
}));

import { BuildVersion } from "./BuildVersion";

describe("BuildVersion", () => {
  it("shows the verified release version and exposes its exact commit accessibly", () => {
    const html = renderToStaticMarkup(<BuildVersion />);
    expect(html).toContain(">v0.3.1</span>");
    expect(html).toContain('title="Commit exacto: 50e2ace697afc125bb3bfdd9a705f0e383796a83"');
    expect(html).toContain('aria-label="Versión v0.3.1; commit 50e2ace697afc125bb3bfdd9a705f0e383796a83"');
  });
});
