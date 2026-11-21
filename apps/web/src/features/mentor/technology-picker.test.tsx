// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TechnologyCatalogEntry, TechnologyCatalogPage } from "@fragments/contracts";
import { TechnologyPicker } from "./technology-picker";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement | undefined;
let root: Root | undefined;
afterEach(() => { if (root) act(() => root?.unmount()); container?.remove(); root = undefined; container = undefined; });

const page = (items: TechnologyCatalogEntry[]): TechnologyCatalogPage => ({ items, nextCursor: null });
const tech: TechnologyCatalogEntry = { id: "technology-a", slug: "technology-a", name: "Technology A", description: "Fixture de prueba" };

describe("TechnologyPicker", () => {
  it("shows loading, exposes catalog results, and reports add and remove selections", async () => {
    let resolveCatalog!: (result: { ok: true; data: TechnologyCatalogPage }) => void;
    const pending = new Promise<{ ok: true; data: TechnologyCatalogPage }>((resolve) => { resolveCatalog = resolve; });
    const search = vi.fn(() => pending);
    const suggestions = vi.fn(async () => ({ ok: true as const, data: page([tech]) }));
    const onChange = vi.fn();
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<TechnologyPicker selectedIds={[]} onSelectedIdsChange={onChange} searchCatalog={search} loadSuggestions={suggestions} />); });
    expect(container.querySelector('[role="status"]')?.textContent).toContain("Cargando");
    await act(async () => { resolveCatalog({ ok: true, data: page([tech]) }); await pending; });
    expect(container.textContent).toContain("Technology A");
    expect(container.querySelector('input[type="text"]')).toBeNull();
    const option = container.querySelector<HTMLButtonElement>('.technology-picker__option');
    expect(option?.getAttribute("aria-pressed")).toBe("false");
    await act(async () => option?.click());
    expect(onChange).toHaveBeenCalledWith(["technology-a"], [tech], undefined);
    await act(async () => { root?.render(<TechnologyPicker selectedIds={["technology-a"]} onSelectedIdsChange={onChange} searchCatalog={async () => ({ ok: true, data: page([tech]) })} loadSuggestions={suggestions} />); });
    const remove = Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find((button) => button.getAttribute("aria-label") === "Quitar Technology A");
    await act(async () => remove?.click());
    expect(onChange).toHaveBeenLastCalledWith([], [], tech);
  });

  it("keeps catalog errors distinct from an empty result", async () => {
    const failure = async () => ({ ok: false as const, error: { message: "Sin conexión" } });
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<TechnologyPicker selectedIds={[]} onSelectedIdsChange={vi.fn()} searchCatalog={failure} loadSuggestions={failure} />); });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Sin conexión");
    expect(container.textContent).not.toContain("No hay resultados");
  });

  it("explains empty classroom suggestions and an empty catalog", async () => {
    const empty = async () => ({ ok: true as const, data: page([]) });
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<TechnologyPicker selectedIds={[]} onSelectedIdsChange={vi.fn()} searchCatalog={empty} loadSuggestions={empty} />); });
    expect(container.textContent).toContain("No tienes tecnologías sugeridas de tus aulas activas.");
    expect(container.textContent).toContain("El catálogo todavía no tiene tecnologías disponibles.");
  });

  it("keeps the search focused while refreshing and distinguishes no matches from selected labels", async () => {
    const search = vi.fn(async (query: string) => ({ ok: true as const, data: page(query ? [tech] : [tech]) }));
    const suggestions = async () => ({ ok: true as const, data: page([]) });
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<TechnologyPicker selectedIds={[]} onSelectedIdsChange={vi.fn()} searchCatalog={search} loadSuggestions={suggestions} />); });
    const input = container.querySelector<HTMLInputElement>('input[type="search"]')!;
    await act(async () => {
      input.focus();
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, "SinResultadoXYZ");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(container.querySelector('input[type="search"]')).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(container.textContent).toContain("No hay resultados para esta búsqueda.");
  });
});
