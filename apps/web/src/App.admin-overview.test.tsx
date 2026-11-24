// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "./App.js";

describe("admin overview route", () => {
  it("mounts the summary and marks its navigation entry current", () => {
    window.history.replaceState({}, "", "/admin");
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("Resumen operativo");
    expect(html).toContain('href="/admin" aria-current="page"');
    expect(html).toContain('href="/admin/diagnostics"');
    expect(html).toContain("Cargando el resumen de administración");
    expect(html).not.toContain("Iniciar sesión</a>");
  });
});
