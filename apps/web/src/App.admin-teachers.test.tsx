// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "./App.js";

describe("admin teacher directory route", () => {
  it("mounts the read-only directory and its admin navigation", () => {
    window.history.replaceState({}, "", "/admin/teachers");
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("Cuentas docentes");
    expect(html).toContain('href="/admin/teachers" aria-current="page"');
    expect(html).toContain("Cargando cuentas docentes");
    expect(html).not.toContain("Iniciar sesión</a>");
  });
});
