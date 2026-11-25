// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminConsoleNavigation } from "./AdminConsoleNavigation.js";

describe("AdminConsoleNavigation", () => {
  it("hides all admin links after an authentication or permission denial", () => {
    const html = renderToStaticMarkup(<AdminConsoleNavigation current="diagnostics" accessDenied />);
    expect(html).toBe("");
  });

  it("keeps navigation visible while access is authorized or recoverable", () => {
    const html = renderToStaticMarkup(<AdminConsoleNavigation current="diagnostics" accessDenied={false} />);
    expect(html).toContain('aria-label="Herramientas de administración"');
    expect(html).toContain('href="/admin/diagnostics" aria-current="page"');
  });
});
