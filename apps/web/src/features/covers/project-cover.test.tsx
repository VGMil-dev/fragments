import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { coverTemplateFor, ProjectCover } from "./project-cover";

describe("ProjectCover", () => {
  it.each([
    ["", "generic"],
    ["app móvil", "mobile-app"],
    ["Android", "mobile-app"],
    ["sitio web", "web-project"],
    ["servicio REST", "api-service"],
  ] as const)("maps existing project wording %s to %s", (value, expected) => {
    expect(coverTemplateFor(value)).toBe(expected);
  });

  it("serves optimized WebP with a PNG fallback and accessible cover label", () => {
    const html = renderToStaticMarkup(<ProjectCover className="cover" title="Mi aplicación" template="mobile-app" />);

    expect(html).toContain('aria-label="Portada aplicación móvil para Mi aplicación"');
    expect(html).toContain('<source srcSet="/covers/project-mobile-app.webp" type="image/webp"/>');
    expect(html).toContain('<img src="/covers/project-mobile-app.png" alt="" width="1200" height="675" loading="lazy" decoding="async"/>');
  });
});
