// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "./App.js";

describe("admin audit log route", () => {
  it("mounts the redacted activity screen and its admin navigation", () => {
    window.history.replaceState({}, "", "/admin/audit-log");
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("Registro de actividad administrativa");
    expect(html).toContain('href="/admin/audit-log" aria-current="page"');
    expect(html).toContain("Cola de trabajos</a>");
    expect(html).toContain("Cargando registro de actividad");
    expect(html).not.toContain("Iniciar sesión</a>");
  });
});
