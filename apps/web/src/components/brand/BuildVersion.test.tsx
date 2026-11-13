import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const metadata = vi.hoisted(() => ({
  version: "v0.3.1",
  commit: "50e2ace697afc125bb3bfdd9a705f0e383796a83" as string | null,
}));

vi.mock("../../build/metadata", () => ({
  releaseMetadata: metadata,
}));

import { BuildVersion } from "./BuildVersion";

describe("BuildVersion", () => {
  beforeEach(() => {
    metadata.version = "v0.3.1";
    metadata.commit = "50e2ace697afc125bb3bfdd9a705f0e383796a83";
  });

  it("shows the verified release version and exposes its exact commit accessibly", () => {
    const html = renderToStaticMarkup(<BuildVersion />);
    expect(html).toContain('>v0.3.1<span class="build-version__commit"> · 50e2ace</span></span>');
    expect(html).toContain('title="Commit exacto: 50e2ace697afc125bb3bfdd9a705f0e383796a83"');
    expect(html).toContain('aria-label="Versión v0.3.1; commit 50e2ace697afc125bb3bfdd9a705f0e383796a83"');
  });

  it("keeps development metadata honest without a release commit", () => {
    metadata.version = "dev";
    metadata.commit = null;
    const html = renderToStaticMarkup(<BuildVersion />);
    expect(html).toContain(">dev</span>");
    expect(html).not.toContain("build-version__commit");
    expect(html).not.toContain("title=");
  });
});
