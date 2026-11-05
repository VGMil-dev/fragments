import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DataSourceBadge } from "./data-source-badge";

describe("DataSourceBadge", () => {
  it("marks fake provider results even if the caller requested the real mode", () => {
    const html = renderToStaticMarkup(<DataSourceBadge mode="real" modelId="fake/local-heuristic-v1" />);

    expect(html).toContain("Datos de ejemplo (fake)");
  });

  it("does not label a real provider result as fake", () => {
    const html = renderToStaticMarkup(<DataSourceBadge mode="real" modelId="gateway:mentor-model" />);

    expect(html).toBe("");
  });
});
