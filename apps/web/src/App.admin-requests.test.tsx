// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "./App.js";

describe("admin requests route", () => {
  it("mounts the academic requests screen and links the admin tools", () => {
    window.history.replaceState({}, "", "/admin/requests");
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("Solicitudes académicas");
    expect(html).toContain('href="/admin/diagnostics"');
    expect(html).toContain('href="/admin/requests" aria-current="page"');
    expect(html).toContain("Cargando solicitudes académicas");
    expect(html).not.toContain("Iniciar sesión</a>");
  });
});
